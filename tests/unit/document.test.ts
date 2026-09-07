import { describe, it, expect } from "vitest";
import {
  newDraft,
  validateDocument,
  plainText,
  characterCount,
  matchesQuery,
  isComposingKey,
  safeLink,
  exportBackup,
  importBackup,
  imageMime,
  sha256,
  limits,
  type ContentNode,
} from "@wonboard/document";
import { en, ko, translator } from "@wonboard/locales";
import { zipSync, strToU8 } from "../../packages/document/node_modules/fflate";

const texts = [
  "한글",
  "English",
  "한영 mixed",
  "한글",
  "👨‍👩‍👧‍👦",
  "é",
  "",
  "첫 줄\n다음 줄",
  "https://example.com/" + "a".repeat(1000),
  '따옴표 " & < >',
  "가".repeat(20000),
  "공백  두 개",
  "한",
  "글",
  "Hello 안녕",
  "📷 사진",
  "안녕하세요.",
  "제목과 본문",
  "한국어 English 123",
  "끝.",
];
describe("document contract", () => {
  it.each(texts)("round trips fixture %#", async (text) => {
    const draft = newDraft();
    draft.document.title = text.slice(0, 100);
    draft.document.content = {
      type: "doc",
      content: [
        { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
        { type: "paragraph" },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "줄" },
            { type: "hardBreak" },
            { type: "text", text: "바꿈", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    validateDocument(draft.document);
    expect((await importBackup(await exportBackup(draft))).document).toEqual(
      draft.document,
    );
  });
  it("preserves original image bytes, NFD filename, placement, width and caption", async () => {
    const draft = newDraft();
    const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const blob = new Blob([bytes], { type: "image/png" });
    draft.document.media.photo = {
      id: "photo",
      originalName: "스크린샷.png",
      mime: "image/png",
      width: 1,
      height: 1,
      size: 9,
      sha256: await sha256(bytes.buffer),
    };
    draft.blobs.photo = blob;
    draft.document.content.content!.push(
      {
        type: "media",
        attrs: {
          mediaId: "photo",
          width: 320,
          align: "center",
          caption: "사진 설명",
          alt: "대체 설명",
        },
      },
      { type: "paragraph" },
    );
    const result = await importBackup(await exportBackup(draft));
    expect(result.document).toEqual(draft.document);
    expect(await result.blobs.photo.arrayBuffer()).toEqual(
      await blob.arrayBuffer(),
    );
  });
  it("rejects unrecognised nodes and versions without mutating source", () => {
    for (const content of [
      { type: "customFuture", content: [] },
      {
        type: "doc",
        content: [{ type: "paragraph", attrs: { customFuture: "keep" } }],
      },
    ]) {
      const d = newDraft().document;
      d.content = content as ContentNode;
      const before = JSON.stringify(d);
      expect(() => validateDocument(d)).toThrow("futureDocument");
      expect(JSON.stringify(d)).toBe(before);
    }
    expect(() =>
      validateDocument({ ...newDraft().document, schemaVersion: 2 }),
    ).toThrow("futureDocument");
  });
  it("rejects links that can execute code", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      " https://example.com",
      "https:\n//evil.com",
    ])
      expect(safeLink(url)).toBe(false);
    expect(safeLink("https://example.com/한글")).toBe(true);
  });
  it("rejects mark attributes the current editor cannot preserve", () => {
    const withMark = (mark: Record<string, unknown>) => ({
      ...newDraft().document,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x", marks: [mark] }],
          },
        ],
      },
    });
    expect(() =>
      validateDocument(withMark({ type: "bold", attrs: { future: "keep" } })),
    ).toThrow("futureDocument");
    expect(() =>
      validateDocument(
        withMark({
          type: "link",
          attrs: { href: "https://example.com", future: "keep" },
        }),
      ),
    ).toThrow("futureDocument");
    expect(() =>
      validateDocument(
        withMark({
          type: "link",
          attrs: {
            href: "https://example.com",
            target: "_blank",
            rel: "noopener noreferrer nofollow",
            class: null,
            title: null,
          },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects invalid tree structure, missing images and executable styles", () => {
    const d = newDraft().document;
    for (const n of [
      { type: "text", text: "invalid root" },
      { type: "media", attrs: { mediaId: "missing" } },
      { type: "paragraph", attrs: { textColor: "url(https://tracking.test)" } },
    ]) {
      d.content = { type: "doc", content: [n] };
      expect(() => validateDocument(d)).toThrow();
    }
  });
  it("counts visible characters, not bytes or UTF16 code units", () => {
    expect(characterCount("한글👨‍👩‍👧‍👦é", "ko")).toBe(4);
    expect(characterCount("한", "ko")).toBe(1);
  });
  it("searches NFD/NFC, case and one syllable without modifying source", () => {
    expect(matchesQuery("한글 ABC", "한글 abc", "ko")).toBe(true);
    expect(matchesQuery("한글", "글", "ko")).toBe(true);
  });
  it("handles both IME key signals and ordinary Enter", () => {
    expect(isComposingKey({ isComposing: true })).toBe(true);
    expect(isComposingKey({ isComposing: false, keyCode: 229 })).toBe(true);
    expect(isComposingKey({ keyCode: 13 })).toBe(false);
  });
  it("preserves empty paragraphs and hard breaks in text projection", () => {
    expect(
      plainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "가" },
              { type: "hardBreak" },
              { type: "text", text: "나" },
            ],
          },
          { type: "paragraph" },
          { type: "paragraph", content: [{ type: "text", text: "다" }] },
        ],
      }),
    ).toBe("가\n나\n\n다");
  });
  it("has exactly matching ko/en keys and renders every key", () => {
    expect(Object.keys(ko).sort()).toEqual(Object.keys(en).sort());
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(translator("ko")(k, { count: 2 })).not.toBe(k);
      expect(translator("en")(k, { count: 2 })).toBeTruthy();
    }
  });
  it("recognises actual signatures instead of filename", () => {
    expect(() => imageMime(strToU8("<svg/>"))).toThrow("invalidImage");
    expect(imageMime(Uint8Array.from([255, 216, 255]))).toBe("image/jpeg");
  });
});
describe("backup boundary", () => {
  it("includes ZIP container overhead in the export limit and restores at the exact limit", async () => {
    const draft = newDraft();
    const archive = await exportBackup(draft);
    const originalLimit = limits.archiveBytes;
    try {
      limits.archiveBytes = archive.size - 1;
      expect(strToU8(JSON.stringify(draft.document)).length).toBeLessThan(limits.archiveBytes);
      await expect(exportBackup(draft)).rejects.toThrow("archiveLimit");
      limits.archiveBytes = archive.size;
      expect((await importBackup(await exportBackup(draft))).document).toEqual(draft.document);
    } finally {
      limits.archiveBytes = originalLimit;
    }
  });
  const zipBlob = (files: Record<string, Uint8Array>) =>
    new Blob([zipSync(files) as Uint8Array<ArrayBuffer>]);
  it.each(["../secret", "/document.json", "media/../../outside", "extra.json"])(
    "rejects unsafe or unexpected entry %s",
    async (path) => {
      await expect(
        importBackup(
          zipBlob({
            "document.json": strToU8(JSON.stringify(newDraft().document)),
            [path]: strToU8("x"),
          }),
        ),
      ).rejects.toThrow("archiveLimit");
    },
  );
  it("rejects invalid JSON and incomplete archives", async () => {
    await expect(
      importBackup(zipBlob({ "document.json": strToU8("{no") })),
    ).rejects.toThrow("corruptBackup");
    await expect(importBackup(new Blob(["not a zip"]))).rejects.toThrow();
  });
  it("refuses missing original before exporting", async () => {
    const d = newDraft();
    d.document.media.x = {
      id: "x",
      originalName: "x.png",
      mime: "image/png",
      width: 1,
      height: 1,
      size: 1,
      sha256: "a".repeat(64),
    };
    d.document.content.content!.push({ type: "media", attrs: { mediaId: "x" } });
    await expect(exportBackup(d)).rejects.toThrow("missingMedia");
  });
});
