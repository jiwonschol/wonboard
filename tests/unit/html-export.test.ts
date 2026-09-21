import { describe, expect, it } from "vitest";
import { newDraft, writingFonts, type ContentNode } from "@wonboard/document";
import { exportHtml } from "../../apps/client/src/htmlExport";

describe("portable HTML export", () => {
  it("uses Nanum Myeongjo for new documents and preserves legacy default typography", () => {
    const { document } = newDraft();
    expect(document.defaultFont).toBe("nanum-serif");
    expect(exportHtml(document, {})).toContain("Nanum Myeongjo");
    delete document.defaultFont;
    expect(exportHtml(document, {})).toContain("Pretendard Variable");
  });
  it("exports every bundled font by its family without promising to embed font files", () => {
    for (const font of writingFonts) {
      const { document } = newDraft();
      document.content.content = [{ type: "paragraph", content: [{ type: "text", text: "한글 English", marks: [{ type: "textStyle", attrs: { fontFamily: font.id } }] }] }];
      const html = exportHtml(document, {});
      expect(html).toContain(font.family.split(",")[0].replaceAll('"', ""));
      expect(html).not.toContain("@font-face");
    }
  });
  it("exports selected-text formatting without styling adjacent text or loading external fonts", () => {
    const { document } = newDraft();
    document.content.content = [{ type: "paragraph", content: [
      { type: "text", text: "기본 " },
      { type: "text", text: "한글 English", marks: [{ type: "textStyle", attrs: { fontFamily: "serif", fontSize: 24, color: "#334455", highlight: "#fff0a3" } }] },
      { type: "text", text: " 나머지" },
    ] }];
    const html = exportHtml(document, {});
    expect(html).toContain("기본 <span style=");
    expect(html).toContain("Noto Serif KR Variable");
    expect(html).toContain("font-size:24px;color:#334455;background-color:#fff0a3");
    expect(html).toContain("한글 English</span> 나머지");
    expect(html).not.toContain("@font-face");
    expect(html).not.toContain("<link");
  });
  it("escapes text and preserves hard breaks, empty paragraphs and block styles", () => {
    const { document } = newDraft();
    document.content.content = [{ type: "paragraph", attrs: { textAlign: "center" }, content: [
      { type: "text", text: "한글 <script> & English", marks: [{ type: "bold" }] }, { type: "hardBreak" }, { type: "text", text: "다음 줄" },
    ] }, { type: "paragraph" }];
    const html = exportHtml(document, {});
    expect(html).toContain("text-align:center"); expect(html).toContain("<strong>한글 &lt;script&gt; &amp; English</strong><br/>다음 줄");
    expect(html).toContain("<br/></p>");
    expect(html).not.toContain("<script>");
  });
  it("requires external image URLs and preserves width, caption and order", () => {
    const { document } = newDraft();
    document.media.photo = { id: "photo", originalName: "image.png", width: 1, height: 1, mime: "image/png", size: 1, sha256: "a".repeat(64) };
    document.content.content = [{ type: "media", attrs: { mediaId: "photo", width: 320, align: "right", caption: "사진 <1>" } }];
    expect(() => exportHtml(document, { photo: "blob:local" })).toThrow();
    expect(() => exportHtml(document, {})).toThrow("missingMedia");
    const html = exportHtml(document, { photo: "https://site.test/media/stable" });
    expect(html).toContain('src="https://site.test/media/stable"'); expect(html).toContain('width="320"');
    expect(html).toContain("사진 &lt;1&gt;"); expect(html).toContain("text-align:right");
    expect(html).not.toContain("data-media-id");
  });
});

describe("tables exported as images", () => {
  const fileId = "11111111-1111-4111-8111-111111111111";
  const cell = (content: ContentNode[]): ContentNode => ({ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null }, content: [{ type: "paragraph", content }] });
  it("replaces the table with its image and does not require a share for file links inside it", () => {
    const { document } = newDraft();
    document.files = { [fileId]: { id: fileId, originalName: "a.zip", mime: "application/zip", size: 1, sha256: "a".repeat(64) } };
    const table: ContentNode = { type: "table", content: [{ type: "tableRow", content: [cell([{ type: "fileRef", attrs: { fileId, label: "a.zip" } }])] }] };
    document.content.content = [table];
    expect(() => exportHtml(document, {})).toThrow("privateFile");
    const html = exportHtml(document, {}, new Map([[table, { src: "https://example.com/media/t", alt: "a.zip", width: 720 }]]));
    expect(html).not.toContain("<table");
    expect(html).toContain('<img src="https://example.com/media/t" alt="a.zip" width="720"');
  });
  it("widens images of tables with many columns instead of squeezing cells", async () => {
    const { tableImageWidth } = await import("../../apps/client/src/tableImage");
    const row = (count: number): ContentNode => ({ type: "table", content: [{ type: "tableRow", content: Array.from({ length: count }, () => cell([])) }] });
    expect(tableImageWidth(row(3))).toBe(720);
    expect(tableImageWidth(row(40))).toBe(40 * 64);
  });
});
