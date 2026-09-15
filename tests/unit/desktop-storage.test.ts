import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { newDraft } from "@wonboard/document";
import { openDesktopStore } from "../../apps/desktop/src/store";
import { openDesktopRepository } from "../../apps/client/src/desktopRepository";

describe("desktop storage", () => {
  it("omits persisted photo bytes on later text saves and after loading", async () => {
    const store = openDesktopStore(mkdtempSync(join(tmpdir(), "wonboard-ipc-")));
    const save = vi.fn(async (...args: Parameters<typeof store.save>) => store.save(...args));
    vi.stubGlobal("window", { wonboardDesktop: { list: async () => store.list(), load: async (id: string) => store.load(id), save } });
    try {
      const draft = newDraft(), bytes = new Uint8Array([1, 2, 3]);
      draft.document.media.photo = { id: "photo", originalName: "p.png", mime: "image/png", width: 1, height: 1, size: 3, sha256: createHash("sha256").update(bytes).digest("hex") };
      draft.document.content.content!.push({ type: "media", attrs: { mediaId: "photo" } });
      draft.blobs.photo = new Blob([bytes]);
      const repository = openDesktopRepository();
      const first = await repository.save(draft, 0);
      expect(Object.keys(save.mock.calls[0][0].blobs)).toEqual(["photo"]);
      first.document.title = "text edit";
      const second = await repository.save(first, 1);
      expect(save.mock.calls[1][0].blobs).toEqual({});
      const reopened = openDesktopRepository(), loaded = await reopened.load(second);
      await reopened.save(loaded, 2);
      expect(save.mock.calls[2][0].blobs).toEqual({});
    } finally { store.close(); vi.unstubAllGlobals(); }
  });
  it("isolates malformed rows and repairs an incomplete image using verified incoming bytes", () => {
    const directory = mkdtempSync(join(tmpdir(), "wonboard-recovery-")), store = openDesktopStore(directory);
    const draft = newDraft(), bytes = new Uint8Array([1, 2, 3]), hash = createHash("sha256").update(bytes).digest("hex");
    draft.document.media.photo = { id: "photo", originalName: "p.png", mime: "image/png", width: 1, height: 1, size: 3, sha256: hash };
    draft.document.content.content!.push({ type: "media", attrs: { mediaId: "photo" } });
    writeFileSync(join(directory, "images", hash), new Uint8Array([1]));
    try {
      const saved = store.save({ document: draft.document, blobs: { photo: bytes.buffer } }, 0);
      expect(new Uint8Array(store.load(saved.document.documentId).blobs.photo)).toEqual(bytes);
      const raw = new DatabaseSync(join(directory, "documents.sqlite"));
      raw.prepare("INSERT INTO documents VALUES (?, ?, ?)").run("broken", 1, "not-json"); raw.close();
      expect(store.list().map(d => d.document.documentId)).toEqual([saved.document.documentId]);
      writeFileSync(join(directory, "images", hash), new Uint8Array([4, 5, 6]));
      expect(() => store.save({ document: saved.document, blobs: {} }, 1)).toThrow("missingMedia");
    } finally { store.close(); }
  });
  it("restores Korean text and binary photos after closing SQLite", () => {
    const directory = mkdtempSync(join(tmpdir(), "wonboard-store-"));
    let store = openDesktopStore(directory);
    const { document } = newDraft("ko");
    document.title = "맥에서 작성한 글";
    const bytes = new Uint8Array([1, 2, 3]);
    document.media.photo = { id: "photo", originalName: "캡처.png", mime: "image/png", width: 1, height: 1,
      size: 3, sha256: createHash("sha256").update(bytes).digest("hex") };
    document.content.content = [{ type: "paragraph", content: [{ type: "text", text: "한글 본문과 English." }] },
      { type: "media", attrs: { mediaId: "photo" } }];
    const saved = store.save({ document, blobs: { photo: bytes.buffer } }, 0);
    expect(saved.document.revision).toBe(1);
    expect(() => store.save({ document, blobs: { photo: bytes.buffer } }, 0)).toThrow("storageConflict");
    store.close();
    store = openDesktopStore(directory);
    try {
      expect(store.list()).toHaveLength(1);
      const restored = store.load(document.documentId);
      expect(restored.document).toEqual(saved.document);
      expect(new Uint8Array(restored.blobs.photo)).toEqual(bytes);
    } finally { store.close(); }
  });
  it("rejects missing or altered photos without committing a document", () => {
    const store = openDesktopStore(mkdtempSync(join(tmpdir(), "wonboard-store-")));
    const { document } = newDraft();
    document.media.photo = { id: "photo", originalName: "photo.png", mime: "image/png", width: 1, height: 1,
      size: 3, sha256: "a".repeat(64) };
    document.content.content!.push({ type: "media", attrs: { mediaId: "photo" } });
    try {
      expect(() => store.save({ document, blobs: {} }, 0)).toThrow("missingMedia");
      expect(() => store.save({ document, blobs: { photo: new Uint8Array([1, 2, 3]).buffer } }, 0)).toThrow("missingMedia");
      expect(store.list()).toEqual([]);
    } finally { store.close(); }
  });
});

it("removes matching document revisions without deleting original photo files", () => {
  const directory = mkdtempSync(join(tmpdir(), "wonboard-trash-")), store = openDesktopStore(directory);
  try {
    const draft = newDraft(), bytes = new Uint8Array([1, 2, 3]);
    const hash = createHash("sha256").update(bytes).digest("hex");
    draft.document.media.photo = { id: "photo", originalName: "p.png", mime: "image/png", width: 1, height: 1, size: 3, sha256: hash };
    draft.document.content.content!.push({ type: "media", attrs: { mediaId: "photo" } });
    const saved = store.save({ document: draft.document, blobs: { photo: bytes.buffer } }, 0);
    expect(() => store.remove(saved.document.documentId, 0)).toThrow("storageConflict");
    expect(store.list()).toHaveLength(1);
    store.remove(saved.document.documentId, 1);
    store.remove(saved.document.documentId, 1);
    expect(store.list()).toHaveLength(0);
    expect(existsSync(join(directory, "images", hash))).toBe(true);
    expect(() => store.save(saved, 1)).toThrow("storageConflict");
  } finally { store.close(); }
});
