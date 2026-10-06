import { describe, expect, it } from "vitest";
import { newDraft, type ContentNode, type Draft } from "@wonboard/document";
import { unzipSync, strFromU8 } from "../../packages/document/node_modules/fflate";
import { markdownFile, textFile, toMarkdown } from "../../apps/client/src/pcSave";

const text = (value: string, ...marks: { type: string; attrs?: Record<string, unknown> }[]): ContentNode =>
  ({ type: "text", text: value, ...(marks.length ? { marks } : {}) });
const paragraph = (...content: ContentNode[]): ContentNode => ({ type: "paragraph", content });
const photo = (name: string) => `[사진: ${name}]`;

function draftWith(content: ContentNode[], photos: string[] = []): Draft {
  const draft = newDraft();
  draft.document.title = "제주 여행";
  draft.document.autoRenameAttachments = false;
  photos.forEach((originalName, index) => {
    const id = `photo-${index}`, bytes = new Uint8Array([index + 1, 2, 3]);
    draft.document.media[id] = { id, originalName, mime: "image/png", width: 4, height: 4, size: bytes.byteLength, sha256: "a".repeat(64) };
    draft.blobs[id] = new Blob([bytes], { type: "image/png" });
    content.push({ type: "media", attrs: { mediaId: id, width: 320, align: "left", alt: "", caption: index ? "" : "바닷가" } });
  });
  draft.document.content = { type: "doc", content };
  return draft;
}

describe("PC 저장: 텍스트", () => {
  it("사진 자리에 '[사진: 파일 이름]'만 남기고 글은 그대로 둔다", async () => {
    const file = textFile(draftWith([paragraph(text("첫 줄", { type: "bold" }), { type: "hardBreak" }, text("둘째 줄"))], ["바다.png"]), photo);
    expect(file.name).toBe("제주 여행.txt");
    expect(file.photos).toBe(1);
    expect(await file.blob.text()).toBe("제주 여행\n\n첫 줄\n둘째 줄\n[사진: 바다.png]\n바닷가\n");
  });
});

describe("PC 저장: 마크다운", () => {
  it("사진이 없으면 .md 하나다", async () => {
    const file = await markdownFile(draftWith([paragraph(text("본문"))]));
    expect(file.name).toBe("제주 여행.md");
    expect(await file.blob.text()).toBe("# 제주 여행\n\n본문\n");
  });
  it("사진이 있으면 ZIP이고, 글 안의 그림 경로마다 그 이름의 사진 파일이 들어 있다", async () => {
    // 이름이 겹치거나 공백·괄호가 있어도 경로와 파일이 글자 그대로 맞아야 한다.
    const draft = draftWith([paragraph(text("본문"))], ["바다.png", "바다.png", "해 질 녘 (1).png"]);
    const file = await markdownFile(draft);
    expect(file.name).toBe("제주 여행.zip");
    const entries = unzipSync(new Uint8Array(await file.blob.arrayBuffer()));
    const markdown = strFromU8(entries["제주 여행.md"]);
    const paths = [...markdown.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^)\s]+))\)/g)].map(match => match[1] ?? match[2]);
    expect(paths).toEqual(["images/바다.png", "images/바다-2.png", "images/해 질 녘 (1).png"]);
    expect(Object.keys(entries).sort()).toEqual(["제주 여행.md", ...paths].sort());
    paths.forEach((path, index) => expect([...entries[path]]).toEqual([index + 1, 2, 3]));
  });
  it("표현할 수 없는 서식은 글 내용을 잃지 않고 일반 글로 남는다", () => {
    const { document } = draftWith([
      { type: "paragraph", attrs: { textAlign: "center", textColor: "#ff0000", backgroundColor: "#ffeeee" }, content: [
        text("빨간 글", { type: "textStyle", attrs: { color: "#ff0000", fontFamily: "serif", fontSize: 24 } }),
        text(" 밑줄", { type: "underline" }), text(" 굵게 ", { type: "bold" }), text("*별표*와 [괄호]"),
      ] },
      { type: "textBox", attrs: { backgroundColor: "#fff4d6" }, content: [paragraph(text("글상자 안의 글"))] },
      { type: "table", content: [
        { type: "tableRow", content: [{ type: "tableHeader", content: [paragraph(text("이름"))] }, { type: "tableHeader", attrs: { colspan: 1, rowspan: 1, align: "right" }, content: [paragraph(text("값"))] }] },
        { type: "tableRow", content: [{ type: "tableCell", content: [paragraph(text("a|b"))] }, { type: "tableCell", content: [paragraph(text("1"))] }] },
      ] },
    ]);
    expect(toMarkdown(document)).toBe([
      "# 제주 여행", "",
      "빨간 글 밑줄 **굵게** \\*별표\\*와 \\[괄호\\]", "",
      "글상자 안의 글", "",
      "| 이름 | 값 |", "| --- | --: |", "| a\\|b | 1 |", "",
    ].join("\n"));
  });
});
