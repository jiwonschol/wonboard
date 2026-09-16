import { describe, expect, it } from "vitest";
import { exportBackup, importBackup, limits, newDraft, plainText, referencedFileIds, sha256, validateDocument, withoutUnusedMedia } from "@wonboard/document";
import "fake-indexeddb/auto";
import { openStorage, saveDraft, loadDrafts, removeDraft } from "../../apps/client/src/storage";
import { exportHtml } from "../../apps/client/src/htmlExport";

async function fixture() {
  const draft = newDraft(), bytes = new TextEncoder().encode("private attachment");
  draft.document.files = { report: { id: "report", originalName: "report.txt", mime: "text/plain", size: bytes.byteLength, sha256: await sha256(bytes.buffer) } };
  draft.document.content = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "See " }, { type: "fileRef", attrs: { fileId: "report", label: "report.txt" } },
  ] }] };
  draft.blobs.report = new Blob([bytes], { type: "text/plain" });
  return draft;
}
describe("private file references and portable backup", () => {
  it("checks serialized document bytes at the exact metadata budget", () => {
    const draft = newDraft(), original = limits.documentBytes;
    const size = new TextEncoder().encode(JSON.stringify(draft.document)).byteLength;
    try {
      limits.documentBytes = size;
      expect(() => validateDocument(draft.document)).not.toThrow();
      limits.documentBytes = size - 1;
      expect(() => validateDocument(draft.document)).toThrow("archiveLimit");
    } finally { limits.documentBytes = original; }
  });
  it("shares a 220MiB document budget between photos and files, leaving ZIP headroom", () => {
    const draft = newDraft();
    draft.document.files = {};
    for (let i = 0; i < 10; i++) {
      const id = `file${i}`;
      draft.document.files[id] = { id, originalName: id, mime: "text/plain", size: limits.fileBytes, sha256: "a".repeat(64) };
    }
    draft.document.media.photo = { id: "photo", originalName: "p.png", mime: "image/png", size: limits.imageBytes, width: 1, height: 1, sha256: "b".repeat(64) };
    expect(() => validateDocument(draft.document)).not.toThrow();
    draft.document.files.extra = { ...draft.document.files.file0, id: "extra", size: 1 };
    expect(() => validateDocument(draft.document)).toThrow("archiveLimit");
    delete draft.document.media.photo;
    draft.document.files.extra.size = limits.fileBytes;
    for (const id of ["twelfth", "thirteenth"]) draft.document.files[id] = { ...draft.document.files.file0, id };
    expect(() => validateDocument(draft.document)).toThrow("archiveLimit");
    expect(limits.archiveBytes - limits.mediaBytes).toBe(36 * 1024 * 1024);
  });
  it("round trips a referenced file without publishing a URL", async () => {
    const draft = await fixture();
    validateDocument(draft.document);
    expect(plainText(draft.document.content)).toBe("See report.txt");
    expect(referencedFileIds(draft.document.content)).toEqual(["report"]);
    const restored = await importBackup(await exportBackup(draft));
    expect(restored.document).toEqual(draft.document);
    expect(await restored.blobs.report.text()).toBe("private attachment");
  });
  it("never reports a successful backup when required file bytes are missing or altered", async () => {
    const draft = await fixture();
    delete draft.blobs.report;
    await expect(exportBackup(draft)).rejects.toThrow("missingMedia");
    draft.blobs.report = new Blob(["changed attachment"], { type: "text/plain" });
    await expect(exportBackup(draft)).rejects.toThrow("corruptBackup");
  });
  it("rejects missing references, executable attributes and oversize", async () => {
    const draft = await fixture();
    const node = draft.document.content.content![0].content![1];
    node.attrs!.href = "javascript:alert(1)";
    expect(() => validateDocument(draft.document)).toThrow("futureDocument");
    delete node.attrs!.href;
    draft.document.files!.report.size = 20 * 1024 * 1024 + 1;
    expect(() => validateDocument(draft.document)).toThrow("invalidDocument");
    delete draft.document.files!.report;
    expect(() => validateDocument(draft.document)).toThrow("missingMedia");
  });
  it("preserves attachment bytes and MIME across browser storage and two independent documents", async () => {
    const db = await openStorage(crypto.randomUUID());
    try {
      const first = await fixture();
      const second = { ...first, document: { ...first.document, documentId: crypto.randomUUID() } };
      await saveDraft(db, first, 0);
      await saveDraft(db, second, 0);
      await removeDraft(db, first.document.documentId, 1);
      const [loaded] = await loadDrafts(db);
      expect(loaded.document.documentId).toBe(second.document.documentId);
      expect(loaded.blobs.report.type).toBe("text/plain");
      expect(await loaded.blobs.report.text()).toBe("private attachment");
    } finally { db.close(); }
  });
  it("refuses to silently export private files and escapes the explicit shared link label", async () => {
    const draft = await fixture();
    expect(() => exportHtml(draft.document, {})).toThrow("privateFile");
    expect(() => exportHtml(draft.document, { report: "javascript:alert(1)" })).toThrow("invalidLink");
    draft.document.content.content![0].content![1].attrs!.label = "<script>alert(1)</script>";
    const html = exportHtml(draft.document, { report: "https://files.example/shared" });
    expect(html).toContain("https://files.example/shared");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
  it("removes unused file references only from saved snapshots, preserving live undo bytes", async () => {
    const draft = await fixture();
    draft.document.content.content![0].content!.pop();
    const saved = withoutUnusedMedia(draft);
    expect(saved.document.files).toEqual({});
    expect(saved.blobs).toEqual({});
    expect(draft.blobs.report).toBeInstanceOf(Blob);
  });
});
