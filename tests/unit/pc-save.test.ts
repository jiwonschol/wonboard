import { describe, expect, it } from "vitest";
import { newDraft, sha256, type ContentNode, type Draft } from "@wonboard/document";
import { unzipSync, strFromU8 } from "../../packages/document/node_modules/fflate";
import { markdownFile, textFile, toMarkdown } from "../../apps/client/src/pcSave";

const text = (value: string, ...marks: { type: string; attrs?: Record<string, unknown> }[]): ContentNode =>
  ({ type: "text", text: value, ...(marks.length ? { marks } : {}) });
const paragraph = (...content: ContentNode[]): ContentNode => ({ type: "paragraph", content });
const photo = (name: string) => `[사진: ${name}]`;

async function draftWith(content: ContentNode[], photos: string[] = []): Promise<Draft> {
  const draft = newDraft();
  draft.document.title = "제주 여행";
  draft.document.autoRenameAttachments = false;
  for (const [index, originalName] of photos.entries()) {
    const id = `photo-${index}`, bytes = new Uint8Array([index + 1, 2, 3]);
    draft.document.media[id] = { id, originalName, mime: "image/png", width: 4, height: 4, size: bytes.byteLength, sha256: await sha256(bytes.buffer) };
    draft.blobs[id] = new Blob([bytes], { type: "image/png" });
    content.push({ type: "media", attrs: { mediaId: id, width: 320, align: "left", alt: "", caption: index ? "" : "바닷가" } });
  }
  draft.document.content = { type: "doc", content };
  return draft;
}

describe("PC 저장: 텍스트", () => {
  it("사진 자리에 '[사진: 파일 이름]'만 남기고 글은 그대로 둔다", async () => {
    const file = textFile(await draftWith([
      paragraph(text("첫 줄", { type: "bold" }), { type: "hardBreak" }, text("둘째 줄")),
      { type: "orderedList", attrs: { start: 3, type: "a" }, content: [{ type: "listItem", content: [paragraph(text("셋째"))] }] },
    ], ["바다.png"]), photo);
    expect(file.name).toBe("제주 여행.txt");
    expect(file.photos).toBe(1);
    expect(await file.blob.text()).toBe("제주 여행\n\n첫 줄\n둘째 줄\nc. 셋째\n[사진: 바다.png]\n바닷가\n");
  });
});

describe("PC 저장: 마크다운", () => {
  it("사진이 없으면 .md 하나다", async () => {
    const file = await markdownFile(await draftWith([paragraph(text("본문"))]));
    expect(file.name).toBe("제주 여행.md");
    expect(await file.blob.text()).toBe("# 제주 여행\n\n본문\n");
  });
  it("사진이 있으면 ZIP이고, 글 안의 그림 경로마다 그 이름의 사진 파일이 들어 있다", async () => {
    // 이름이 겹치거나 공백·괄호가 있어도 경로와 파일이 글자 그대로 맞아야 한다.
    const draft = await draftWith([paragraph(text("본문"))], ["바다.png", "바다.png", "해 질 녘 (1).png", `${"😀".repeat(200)}.png`, "COM¹.png", "바다.png.", "그림.txt"]);
    const file = await markdownFile(draft);
    expect(file.name).toBe("제주 여행.zip");
    const entries = unzipSync(new Uint8Array(await file.blob.arrayBuffer()));
    const markdown = strFromU8(entries["제주 여행.md"]);
    const paths = [...markdown.matchAll(/!\[[^\]]*\]\((?:<([^>]+)>|([^)\s]+))\)/g)].map(match => match[1] ?? match[2]);
    // 풀 수 없을 만큼 긴 이름은 확장자를 남기고 줄이고, Windows가 받지 않는 이름은 피하고, 확장자는 사진 형식을 따른다.
    expect(paths).toEqual(["images/바다.png", "images/바다-2.png", "images/해 질 녘 (1).png", `images/${"😀".repeat(49)}.png`, "images/_COM¹.png", "images/바다-3.png", "images/그림.txt.png"]);
    expect(Object.keys(entries).sort()).toEqual(["제주 여행.md", ...paths].sort());
    paths.forEach((path, index) => expect([...entries[path]]).toEqual([index + 1, 2, 3]));
  });
  it("보관 중에 바뀐 사진은 성한 파일처럼 담지 않는다", async () => {
    const draft = await draftWith([], ["바다.png"]);
    draft.blobs["photo-0"] = new Blob([new Uint8Array([9, 9, 9])], { type: "image/png" });
    await expect(markdownFile(draft)).rejects.toThrow("damagedPhoto");
  });
  it("공백과 줄바꿈은 어느 블록에서도 같은 규칙으로 남는다", async () => {
    const spaced = [text("  가  나 ", { type: "bold" }), { type: "hardBreak" }, { type: "hardBreak" }];
    const draft = await draftWith([
      { type: "heading", attrs: { level: 3 }, content: spaced },
      paragraph(...spaced),
      { type: "table", content: [{ type: "tableRow", content: [
        { type: "tableHeader", content: [paragraph(...spaced), { type: "paragraph" }, paragraph(text("다"))] },
        // 머리 칸과 보통 칸이 섞인 첫 행은 머리 행으로 올리지 않는다.
        { type: "tableCell", content: [paragraph(text("라"))] },
      ] }] },
    ], ["바다.png"]);
    (draft.document.content.content!.at(-1)!.attrs as Record<string, unknown>).caption = " 가  나 \n다";
    const kept = "&nbsp;&nbsp;**가 &nbsp;나**&nbsp;";
    expect(toMarkdown(draft.document)).toBe([
      "# 제주 여행", "",
      `### ${kept}<br><br>`, "",
      `${kept}<br><br>`, "",
      "|  |  |", "| --- | --- |", `| ${kept}<br><br><br><br>다 | 라 |`, "",
      "![](images/바다.png)", "",
      "&nbsp;가 &nbsp;나&nbsp;\\", "다", "",
    ].join("\n"));
  });
  it("코드·링크·강조의 경계와 속성에서도 글자가 그대로 남는다", async () => {
    const link = { type: "link", attrs: { href: "https://example.com/a(b)", title: " 풍선\n말 " } };
    const draft = await draftWith([
      // 코드 글자 안의 줄바꿈은 코드 표시를 나눠 남긴다.
      paragraph(text("첫 줄\n둘째 줄", { type: "code" })),
      // 링크는 가장자리 공백까지 걸린 글 그대로를 덮는다. 줄 가장자리의 공백은 기호 안에서도 &nbsp;다.
      paragraph(text(" 걸린 글 ", link), text("뒤")),
      // 강조 가장자리가 문장부호이고 옆이 글자이면 빈 주석을 두어 기호가 글자로 보이지 않게 한다.
      paragraph(text("원보드(Wonboard)", { type: "bold" }), text("는")),
    ], ["바다.png"]);
    Object.assign(draft.document.content.content!.at(-1)!.attrs!, { alt: " 바다  사진\n둘째 줄 ", caption: "" });
    expect(toMarkdown(draft.document)).toBe([
      "# 제주 여행", "",
      "`첫 줄`\\", "`둘째 줄`", "",
      "[&nbsp;걸린 글 ](https://example.com/a\\(b\\) \" 풍선&#10;말 \")뒤", "",
      "**원보드(Wonboard)**<!-- -->는", "",
      "![ 바다  사진&#10;둘째 줄 ](images/바다.png)", "",
    ].join("\n"));
  });
  it("표현할 수 없는 서식은 글 내용을 잃지 않고 일반 글로 남는다", async () => {
    const { document } = await draftWith([
      { type: "heading", attrs: { level: 2 }, content: [text(" 첫  줄"), { type: "hardBreak" }, text("둘째 줄")] },
      { type: "paragraph", attrs: { textAlign: "center", textColor: "#ff0000", backgroundColor: "#ffeeee" }, content: [
        text("빨간 글", { type: "textStyle", attrs: { color: "#ff0000", fontFamily: "serif", fontSize: 24 } }),
        text(" 밑줄", { type: "underline" }), text(" 굵게 ", { type: "bold" }), text("*별표*와 [괄호]"), text(" 값 ", { type: "code" }),
      ] },
      { type: "textBox", attrs: { backgroundColor: "#fff4d6" }, content: [paragraph(text("  들여 쓴 글상자 안의 글"))] },
      { type: "table", content: [
        { type: "tableRow", content: [{ type: "tableHeader", content: [paragraph(text("이름"))] }, { type: "tableHeader", attrs: { colspan: 1, rowspan: 1, align: "right" }, content: [paragraph(text("값"))] }] },
        { type: "tableRow", content: [{ type: "tableCell", content: [paragraph(text(" a|b"))] }, { type: "tableCell", content: [paragraph(text("1", { type: "link", attrs: { href: "https://example.com/?a|b&copy;", title: "풍선 \"말\"" } }))] }] },
      ] },
      // 느낌표 뒤의 링크가 그림으로 읽히지 않고, 줄바꿈으로 끝나는 코드에 빈 줄이 붙지 않는다.
      paragraph(text("보라!"), text("링크", { type: "link", attrs: { href: "https://example.com/" } })),
      { type: "codeBlock", content: [text("a\n")] },
      // 머리 행을 끈 표의 첫 행은 머리 행으로 바뀌지 않는다.
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [paragraph(text("첫 행"))] }] }] },
    ]);
    expect(toMarkdown(document)).toBe([
      "# 제주 여행", "",
      "## &nbsp;첫 &nbsp;줄<br>둘째 줄", "",
      "빨간 글 밑줄 **굵게** \\*별표\\*와 \\[괄호\\]`  값  `", "",
      "&nbsp;&nbsp;들여 쓴 글상자 안의 글", "",
      "| 이름 | 값 |", "| --- | --: |", "| &nbsp;a\\|b | [1](https://example.com/?a%7Cb&amp;copy; \"풍선 \\\"말\\\"\") |", "",
      "보라\\![링크](https://example.com/)", "",
      "```", "a", "```", "",
      "|  |", "| --- |", "| 첫 행 |", "",
    ].join("\n"));
  });
});
