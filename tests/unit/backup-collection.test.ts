import { expect, it } from "vitest";
import { exportBackup, exportBackupCollection, openBackupCollection, importBackup, newDraft, limits, type Draft } from "@wonboard/document";
import { strFromU8, strToU8, unzipSync, zipSync } from "../../packages/document/node_modules/fflate";
import { syntheticPng } from "../helpers/sites-runtime";
import { sha256 } from "@wonboard/document";

async function illustrated() {
  const draft = newDraft();
  for (const id of ["photo1", "photo2"]) {
    const blob = new Blob([syntheticPng], { type: "image/png" });
    draft.blobs[id] = blob;
    draft.document.media[id] = { id, originalName: `${id}.png`, mime: "image/png", size: blob.size,
      width: 1, height: 1, sha256: await sha256(await blob.arrayBuffer()) };
    draft.document.content.content!.push({ type: "media", attrs: { mediaId: id } });
  }
  const blob = new Blob(["attachment"], { type: "text/plain" });
  draft.blobs.file = blob;
  draft.document.files = { file: { id: "file", originalName: "note.txt", mime: blob.type, size: blob.size,
    sha256: await sha256(await blob.arrayBuffer()) } };
  draft.document.content.content!.push({ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: "file", label: "note.txt" } }] });
  return draft;
}
const repository = (drafts: Draft[]) => ({ list: async () => drafts, load: async (draft: Draft) => draft });

it("stores only active documents, loading one at a time, with independently importable photo and attachment backups", async () => {
  const photo = await illustrated(), text = newDraft(), trash = newDraft();
  trash.document.trashedAt = new Date().toISOString();
  const loaded: string[] = [];
  let active = 0;
  const { blob, manifest } = await exportBackupCollection({
    list: async () => [photo, text, trash],
    async load(draft) {
      expect(active++).toBe(0);
      await Promise.resolve(); active--;
      loaded.push(draft.document.documentId);
      return draft;
    },
  });
  expect(loaded).toEqual([photo.document.documentId, text.document.documentId]);
  expect(manifest.documents).toHaveLength(2);
  expect(manifest.skipped).toEqual([]);
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  expect(Object.keys(files).sort()).toEqual([`${photo.document.documentId}.zip`, `${text.document.documentId}.zip`, "manifest.json"].sort());
  expect(JSON.parse(strFromU8(files["manifest.json"]))).toEqual(manifest);
  const inner = files[`${photo.document.documentId}.zip`] as Uint8Array<ArrayBuffer>;
  const restored = await importBackup(new Blob([inner]));
  expect(restored.document).toEqual(photo.document);
  expect(Object.keys(restored.blobs).sort()).toEqual(["file", "photo1", "photo2"]);
  for (const id of Object.keys(photo.blobs)) expect(await restored.blobs[id].arrayBuffer()).toEqual(await photo.blobs[id].arrayBuffer());
  Object.defineProperty(blob, "arrayBuffer", { value: () => { throw new Error("must not buffer the collection"); } });
  const collection = (await openBackupCollection(blob))!;
  for await (const entry of collection.backups()) expect((await importBackup(await entry.read())).document.documentId).toBe(entry.documentId);
  expect(await openBackupCollection(await exportBackup(photo))).toBeNull();
});

it("records an archive limit and a load failure while continuing with the next document", async () => {
  const tooBig = await illustrated(), good = newDraft(), unreadable = newDraft();
  const originalLimit = limits.archiveBytes;
  try {
    // Exercise the real per-document limit with small fixtures.
    limits.archiveBytes = (await exportBackup(good)).size;
    const result = await exportBackupCollection({ list: async () => [tooBig, unreadable, good],
      async load(draft) { if (draft === unreadable) throw new Error("missingMedia"); return draft; } });
    expect(result.manifest.documents.map(item => item.documentId)).toEqual([good.document.documentId]);
    expect(result.manifest.skipped).toEqual([
      { documentId: tooBig.document.documentId, title: "", reason: "archiveLimit" },
      { documentId: unreadable.document.documentId, title: "", reason: "missingMedia" },
    ]);
    expect(result.blob.size).toBeGreaterThan(limits.archiveBytes);
  } finally { limits.archiveBytes = originalLimit; }
});

it("reads damaged and missing inner ZIPs independently and rejects an invalid manifest", async () => {
  const first = newDraft(), second = newDraft();
  const { blob, manifest } = await exportBackupCollection(repository([first, second]));
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  files[manifest.documents[0].filename] = strToU8("damaged");
  const damaged = new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>]);
  const collection = (await openBackupCollection(damaged))!;
  let restored = 0, failed = 0;
  for await (const entry of collection.backups()) {
    try { await importBackup(await entry.read()); restored++; } catch { failed++; }
  }
  expect({ restored, failed }).toEqual({ restored: 1, failed: 1 });
  delete files[manifest.documents[0].filename];
  const missing = (await openBackupCollection(new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>])))!;
  for await (const entry of missing.backups()) {
    if (entry.documentId === first.document.documentId) await expect(entry.read()).rejects.toThrow("corruptBackup");
  }
  files["manifest.json"] = strToU8(JSON.stringify({ ...manifest, version: 2 }));
  await expect(openBackupCollection(new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>]))).rejects.toThrow("corruptBackup");
});
