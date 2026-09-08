import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { newDraft } from "@wonboard/document";
import {
  openStorage,
  saveDraft,
  loadDrafts,
} from "../../apps/client/src/storage";

describe("atomic browser draft storage", () => {
  it("keeps a blocked open pending and resolves when the request succeeds", async () => {
    const request = indexedDB.open(crypto.randomUUID(), 1);
    const spy = vi.spyOn(indexedDB, "open").mockReturnValue(request);
    const blocked = vi.fn();
    try {
      const opening = openStorage("blocked-test", blocked);
      let settled = false;
      void opening.then(() => { settled = true; }, () => { settled = true; });
      request.onblocked!(new IDBVersionChangeEvent("blocked"));
      await Promise.resolve();
      expect(blocked).toHaveBeenCalledOnce();
      expect(settled).toBe(false);
      const db = await opening;
      expect(db.objectStoreNames.contains("drafts")).toBe(true);
      db.close();
    } finally {
      spy.mockRestore();
    }
  });
  it("stores binary originals as ArrayBuffers and reconstructs typed Blobs", async () => {
    const db = await openStorage(crypto.randomUUID());
    const draft = newDraft();
    draft.document.media.photo = {
      id: "photo",
      originalName: "한글.png",
      mime: "image/png",
      width: 1,
      height: 1,
      size: 3,
      sha256: "a".repeat(64),
    };
    draft.blobs.photo = new Blob([new Uint8Array([1, 2, 3])], {
      type: "image/png",
    });
    draft.document.content.content!.push({ type: "media", attrs: { mediaId: "photo" } });
    await saveDraft(db, draft, 0);
    const raw = await new Promise<any>((resolve, reject) => {
      const request = db
        .transaction("drafts")
        .objectStore("drafts")
        .get(draft.document.documentId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(raw.blobs.photo).toBeInstanceOf(ArrayBuffer);
    const restored = (await loadDrafts(db))[0];
    expect(restored.blobs.photo.type).toBe("image/png");
    expect(new Uint8Array(await restored.blobs.photo.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    db.close();
  });
  it("converts an unchanged original only once across text autosaves", async () => {
    const db = await openStorage(crypto.randomUUID());
    const draft = newDraft();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const convert = vi.spyOn(blob, "arrayBuffer");
    draft.document.media.photo = {
      id: "photo",
      originalName: "photo.png",
      mime: "image/png",
      width: 1,
      height: 1,
      size: blob.size,
      sha256: "a".repeat(64),
    };
    draft.document.content.content!.push({
      type: "media",
      attrs: { mediaId: "photo" },
    });
    draft.blobs.photo = blob;
    const saved = await saveDraft(db, draft, 0);
    await saveDraft(
      db,
      { ...saved, document: { ...saved.document, title: "글자만 변경" } },
      saved.document.revision,
    );
    expect(convert).toHaveBeenCalledOnce();
    db.close();
  });
  it("saves and reloads a full document", async () => {
    const db = await openStorage(crypto.randomUUID());
    const draft = newDraft();
    draft.document.title = "한글 초안";
    const saved = await saveDraft(db, draft, 0);
    expect(saved.document.revision).toBe(1);
    expect((await loadDrafts(db))[0]).toEqual(saved);
    db.close();
  });
  it("rejects a stale second tab and preserves the first tab", async () => {
    const db = await openStorage(crypto.randomUUID());
    const draft = newDraft();
    await saveDraft(
      db,
      { ...draft, document: { ...draft.document, title: "먼저 저장" } },
      0,
    );
    await expect(
      saveDraft(
        db,
        { ...draft, document: { ...draft.document, title: "충돌한 글" } },
        0,
      ),
    ).rejects.toThrow("storageConflict");
    expect((await loadDrafts(db))[0].document.title).toBe("먼저 저장");
    db.close();
  });
  it("serialises simultaneous writes so only one version wins", async () => {
    const db = await openStorage(crypto.randomUUID());
    const draft = newDraft();
    const writes = await Promise.allSettled([
      saveDraft(db, draft, 0),
      saveDraft(db, draft, 0),
    ]);
    expect(writes.filter((w) => w.status === "fulfilled")).toHaveLength(1);
    expect(await loadDrafts(db)).toHaveLength(1);
    db.close();
  });
  it("refuses missing media without changing stored document", async () => {
    const db = await openStorage(crypto.randomUUID());
    const original = await saveDraft(db, newDraft(), 0);
    const draft = {
      ...original,
      document: {
        ...original.document,
        content: { type: "doc", content: [{ type: "media", attrs: { mediaId: "x" } }] },
        media: {
          x: {
            id: "x",
            originalName: "x.png",
            mime: "image/png" as const,
            width: 1,
            height: 1,
            size: 1,
            sha256: "a".repeat(64),
          },
        },
      },
    };
    await expect(saveDraft(db, draft, 1)).rejects.toThrow("missingMedia");
    expect((await loadDrafts(db))[0]).toEqual(original);
    db.close();
  });
  it("omits deleted media from saved snapshots but keeps the live originals for undo", async () => {
    const db = await openStorage(crypto.randomUUID());
    const draft = newDraft();
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const { sha256, exportBackup, importBackup } = await import("@wonboard/document");
    draft.document.media.photo = {
      id: "photo", originalName: "undo.png", mime: "image/png",
      width: 1, height: 1, size: bytes.length, sha256: await sha256(bytes.buffer),
    };
    draft.blobs.photo = new Blob([bytes], { type: "image/png" });
    const saved = await saveDraft(db, draft, 0);
    expect(saved.document.media).toEqual({});
    expect((await loadDrafts(db))[0].blobs).toEqual({});
    expect((await importBackup(await exportBackup(draft))).document.media).toEqual({});
    expect(draft.blobs.photo.size).toBe(bytes.length);
    draft.document.content.content!.push({ type: "media", attrs: { mediaId: "photo" } });
    await saveDraft(db, draft, saved.document.revision);
    expect((await loadDrafts(db))[0].blobs.photo.size).toBe(bytes.length);
    db.close();
  });
});
