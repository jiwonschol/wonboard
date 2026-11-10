import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportLibraryBackup, restoreLibraryBackup, exportBackupCollection, limits, newDraft } from "@wonboard/document";
import { strFromU8, strToU8, unzipSync, zipSync } from "../../packages/document/node_modules/fflate";
import { openBrowserFileLibrary } from "../../apps/client/src/fileLibrary";
import { openDesktopFileLibrary } from "../../apps/client/src/desktopFileLibrary";
import { openDesktopStore } from "../../apps/desktop/src/store";

const unzip = async (blob: Blob) => unzipSync(new Uint8Array(await blob.arrayBuffer()));
const byName = <T extends { filename: string }>(items: T[]) => [...items].sort((a, b) => a.filename.localeCompare(b.filename));
const rezip = (entries: Record<string, Uint8Array>) => new Blob([zipSync(entries, { level: 0 })]);

it("backs up attached and unattached files outside the trash, loading one at a time", async () => {
  const library = await openBrowserFileLibrary(crypto.randomUUID());
  try {
    const attached = await library.upload(new File(["attached bytes"], "attached.txt", { type: "text/plain" }));
    const loose = await library.upload(new File([new Uint8Array([0, 255, 7])], "보관만.bin"));
    const trashed = await library.upload(new File(["gone"], "trashed.txt"));
    await library.change(trashed.id, trashed.revision, { trashedAt: new Date().toISOString() });
    // A document keeps its own copy of the attached file; the library backup does not depend on it.
    const draft = newDraft();
    draft.document.files = { [attached.id]: attached };
    draft.blobs[attached.id] = (await library.load(attached.id)).blob;
    let active = 0, most = 0;
    const { blob, manifest } = await exportLibraryBackup({ list: () => library.list(), async load(id) {
      most = Math.max(most, ++active);
      try { return await library.load(id); } finally { active--; }
    } });
    expect(most).toBe(1);
    expect(manifest.skipped).toEqual([]);
    expect(manifest.files.map(file => file.filename).sort()).toEqual(["attached.txt", "보관만.bin"]);
    const entries = await unzip(blob);
    expect(Object.keys(entries).sort()).toEqual([`files/${attached.id}`, `files/${loose.id}`, "manifest.json"].sort());
    expect(strFromU8(entries[`files/${attached.id}`])).toBe("attached bytes");
    expect([...entries[`files/${loose.id}`]]).toEqual([0, 255, 7]);
  } finally { library.close(); }
});

it("restores names, types and bytes into an empty library without replacing existing files", async () => {
  const source = await openBrowserFileLibrary(crypto.randomUUID()), target = await openBrowserFileLibrary(crypto.randomUUID());
  try {
    const first = await source.upload(new File(["one"], "first.txt", { type: "text/plain" }));
    await source.change(first.id, first.revision, { filename: "renamed.txt" });
    await source.upload(new File([new Uint8Array([1, 2, 3])], "data.bin", { type: "application/x-test" }));
    const { blob } = await exportLibraryBackup(source);
    const result = await restoreLibraryBackup(blob, target);
    expect(result.failed).toEqual([]);
    const restored = await target.list();
    expect(restored.map(file => [file.filename, file.mime]).sort()).toEqual([["data.bin", "application/x-test"], ["renamed.txt", "text/plain"]]);
    for (const file of restored) {
      const original = (await source.list()).find(item => item.filename === file.filename)!;
      expect(file.sha256).toBe(original.sha256);
      expect(new Uint8Array(await (await target.load(file.id)).blob.arrayBuffer())).toEqual(new Uint8Array(await (await source.load(original.id)).blob.arrayBuffer()));
      expect(file.trashedAt).toBeUndefined();
    }
    // A second import adds new files beside the existing ones.
    await restoreLibraryBackup(blob, target);
    const all = await target.list();
    expect(all).toHaveLength(4);
    expect(new Set(all.map(file => file.id)).size).toBe(4);
    expect(all.filter(file => restored.some(item => item.id === file.id)).map(file => file.revision)).toEqual([1, 1]);
  } finally { source.close(); target.close(); }
});

it("separates damaged and oversized files from the restorable rest", async () => {
  const source = await openBrowserFileLibrary(crypto.randomUUID()), target = await openBrowserFileLibrary(crypto.randomUUID());
  const fileBytes = limits.fileBytes;
  try {
    const good = await source.upload(new File(["good"], "good.txt")), damaged = await source.upload(new File(["damaged"], "damaged.txt"));
    const large = await source.upload(new File(["much too large"], "large.txt"));
    const complete = await exportLibraryBackup(source);
    const entries = await unzip(complete.blob);
    entries[`files/${damaged.id}`] = strToU8("changed");
    limits.fileBytes = 8;
    const result = await restoreLibraryBackup(rezip(entries), target);
    expect(result.restored.map(file => file.filename)).toEqual(["good.txt"]);
    expect(byName(result.failed)).toEqual([
      { id: damaged.id, filename: "damaged.txt", reason: "corruptBackup" },
      { id: large.id, filename: "large.txt", reason: "fileLimit" },
    ]);
    expect((await target.list()).map(file => file.filename)).toEqual(["good.txt"]);

    // The same split while backing up: unreadable and oversized originals are listed, not stored.
    const partial = await exportLibraryBackup({ list: () => source.list(), async load(id) {
      if (id === damaged.id) throw new Error("missingMedia");
      return source.load(id);
    } });
    expect(partial.manifest.files.map(file => file.id)).toEqual([good.id]);
    expect(byName(partial.manifest.skipped)).toEqual([
      { id: damaged.id, filename: "damaged.txt", reason: "missingMedia" },
      { id: large.id, filename: "large.txt", reason: "fileLimit" },
    ]);
    expect(Object.keys(await unzip(partial.blob)).sort()).toEqual([`files/${good.id}`, "manifest.json"]);
    expect((await restoreLibraryBackup(partial.blob, target)).skipped).toHaveLength(2);

    // Other ZIPs, including an all-document backup, are refused as a whole.
    const documents = await exportBackupCollection({ list: async () => [newDraft()], load: async draft => draft });
    await expect(restoreLibraryBackup(documents.blob, target)).rejects.toThrow("libraryBackupInvalid");
    await expect(restoreLibraryBackup(new Blob(["not a zip"]), target)).rejects.toThrow("libraryBackupInvalid");
    expect(await target.list()).toHaveLength(2);
  } finally { limits.fileBytes = fileBytes; source.close(); target.close(); }
});

it("uses the same backup and restore for the desktop file library", async () => {
  const store = openDesktopStore(mkdtempSync(join(tmpdir(), "wonboard-library-backup-")));
  vi.stubGlobal("window", { wonboardDesktop: {
    filesList: async () => store.filesList(), filesLoad: async (id: string) => store.filesLoad(id),
    filesUpload: async (...args: Parameters<typeof store.filesUpload>) => store.filesUpload(...args),
    filesChange: async (...args: Parameters<typeof store.filesChange>) => store.filesChange(...args),
  } });
  try {
    const library = openDesktopFileLibrary();
    const kept = await library.upload(new File(["desktop bytes"], "desktop.txt", { type: "text/plain" }));
    const trashed = await library.upload(new File(["gone"], "trashed.txt"));
    await library.change(trashed.id, trashed.revision, { trashedAt: new Date().toISOString() });
    const { blob, manifest } = await exportLibraryBackup(library);
    expect(manifest.files.map(file => file.id)).toEqual([kept.id]);
    const result = await restoreLibraryBackup(blob, library);
    expect(result.failed).toEqual([]);
    const copy = result.restored[0];
    expect(copy.id).not.toBe(kept.id);
    expect([copy.filename, copy.mime, copy.sha256]).toEqual(["desktop.txt", "text/plain", kept.sha256]);
    expect(await (await library.load(copy.id)).blob.text()).toBe("desktop bytes");
    expect((await library.list()).filter(file => !file.trashedAt)).toHaveLength(2);
  } finally { store.close(); vi.unstubAllGlobals(); }
});
