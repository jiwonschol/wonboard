import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { openBrowserFileLibrary } from "../../apps/client/src/fileLibrary";
import { newDraft } from "@wonboard/document";
import { openStorage, saveDraft, loadDrafts, removeDraft } from "../../apps/client/src/storage";

describe("independent browser file library", () => {
  it("retains duplicate names as different objects and renames without changing identity or bytes", async () => {
    const library = await openBrowserFileLibrary(crypto.randomUUID());
    try {
      const input = new File(["a"], "notes.txt", { type: "text/plain" });
      const first = await library.upload(input), second = await library.upload(input);
      expect(first.id).not.toBe(second.id);
      const renamed = await library.change(first.id, first.revision, { filename: "다른 이름.txt" });
      expect(renamed.id).toBe(first.id);
      expect(renamed.sha256).toBe(first.sha256);
      expect(await (await library.load(first.id)).blob.text()).toBe("a");
      await expect(library.change(first.id, first.revision, { filename: "stale.txt" })).rejects.toThrow("storageConflict");
      expect(await library.list()).toHaveLength(2);
    } finally { library.close(); }
  });
  it("keeps document copies when the independent library original is permanently removed", async () => {
    const library = await openBrowserFileLibrary(crypto.randomUUID()), db = await openStorage(crypto.randomUUID());
    try {
      const file = await library.upload(new File(["retained"], "report.txt"));
      const { blob } = await library.load(file.id);
      const first = newDraft();
      first.document.files = { [file.id]: file };
      first.document.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: file.id, label: file.filename } }] }] };
      first.blobs[file.id] = blob;
      const second = { ...first, document: { ...first.document, documentId: crypto.randomUUID() } };
      await saveDraft(db, first, 0);
      await saveDraft(db, second, 0);
      await expect(library.remove(file.id, file.revision)).rejects.toThrow("fileNotTrashed");
      const trashed = await library.change(file.id, file.revision, { trashedAt: new Date().toISOString() });
      await library.remove(file.id, trashed.revision);
      await removeDraft(db, first.document.documentId, 1);
      expect(await library.list()).toEqual([]);
      const [remaining] = await loadDrafts(db);
      expect(await remaining.blobs[file.id].text()).toBe("retained");
    } finally { library.close(); db.close(); }
  });
  it("uses stored trash time at the 30-day boundary and keeps cleanup metadata visible", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const library = await openBrowserFileLibrary(crypto.randomUUID());
    try {
      const file = await library.upload(new File(["a"], "file.txt"));
      const trashed = await library.change(file.id, file.revision, { trashedAt: "2099-01-01T00:00:00Z" });
      expect(trashed.trashedAt).toBe("2026-01-01T00:00:00.000Z");
      vi.setSystemTime(new Date("2026-01-31T00:00:00Z"));
      await expect(library.change(file.id, trashed.revision, { trashedAt: null })).rejects.toThrow("missingFile");
      expect(await library.list()).toHaveLength(1);
      await library.remove(file.id, trashed.revision);
      expect(await library.list()).toEqual([]);
    } finally { library.close(); vi.useRealTimers(); }
  });
  it("checks the exact 20MiB limit before reading and isolates active content as stored bytes", async () => {
    const library = await openBrowserFileLibrary(crypto.randomUUID());
    try {
      const tooLarge = new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.dat");
      const read = vi.spyOn(tooLarge, "arrayBuffer");
      await expect(library.upload(tooLarge)).rejects.toThrow("fileLimit");
      expect(read).not.toHaveBeenCalled();
      const file = await library.upload(new File(["<script>alert(1)</script>"], "index.html", { type: "text/html" }));
      expect(await (await library.load(file.id)).blob.text()).toBe("<script>alert(1)</script>");
    } finally { library.close(); }
  });
});
