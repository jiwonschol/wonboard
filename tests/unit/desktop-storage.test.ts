import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { newDraft } from "@wonboard/document";
import { openDesktopStore } from "../../apps/desktop/src/store";

describe("desktop storage", () => {
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
