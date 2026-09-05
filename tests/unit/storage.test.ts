import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { newDraft } from "@wonboard/document";
import {
  openStorage,
  saveDraft,
  loadDrafts,
} from "../../apps/client/src/storage";

describe("atomic browser draft storage", () => {
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
});
