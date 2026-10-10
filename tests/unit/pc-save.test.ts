import { describe, expect, it } from "vitest";
import { newDraft, sha256, type ContentNode, type Draft } from "@wonboard/document";
import { unzipSync, strFromU8 } from "../../packages/document/node_modules/fflate";
import { Marked } from "../../packages/editor/node_modules/marked";
import { markdownFile, textFile, toMarkdown } from "../../apps/client/src/pcSave";
import { wordFile } from "../../apps/client/src/wordSave";

const text = (value: string, ...marks: { type: string; attrs?: Record<string, unknown> }[]): ContentNode =>
  ({ type: "text", text: value, ...(marks.length ? { marks } : {}) });
const paragraph = (...content: ContentNode[]): ContentNode => ({ type: "paragraph", content });
const photo = (name: string) => `[사진: ${name}]`;
const reader = new Marked({ gfm: true });

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
  it("코드 블록의 모든 지원 줄바꿈을 같은 규칙으로 나누고 끝에 빈 줄을 더하지 않는다", async () => {
    for (const ending of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
      const draft = await draftWith([{ type: "codeBlock", attrs: { language: "txt" }, content: [text(`a${ending}b${ending}`)] }]);
      const output = await (await markdownFile(draft)).blob.text();
      expect(output).toBe("# 제주 여행\n\n```txt\na\nb\n```\n");
      expect(reader.parse(output)).toContain('<pre><code class="language-txt">a\nb\n</code></pre>');
    }
  });
  it("링크 주소의 DEL을 퍼센트 인코딩해 링크로 남긴다", async () => {
    const link = { type: "link", attrs: { href: "https://example.com/a\u007fb", title: "주소" } };
    const draft = await draftWith([
      paragraph(text("링크", link)),
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [paragraph(text("칸 링크", link))] }] }] },
    ]);
    const output = await (await markdownFile(draft)).blob.text();
    expect(output).not.toContain("\u007f");
    expect(output).toContain('[링크](https://example.com/a%7Fb "주소")');
    expect(output).toContain('[칸 링크](https://example.com/a%7Fb "주소")');
    expect(reader.parse(output)).toContain('<a href="https://example.com/a%7Fb" title="주소">링크</a>');
  });
  it("이모지 앞뒤의 강조 경계는 Unicode 코드 포인트로 판단한다", async () => {
    for (const [mark, delimiter, tag] of [["bold", "**", "strong"], ["italic", "*", "em"], ["strike", "~~", "del"]]) {
      for (const [left, core, right, wrapped] of [
        ["", "😀", "text", `${delimiter}😀${delimiter}<!-- -->`],
        ["text", "😀", "", `<!-- -->${delimiter}😀${delimiter}`],
        ["😀", "문자", "😀", `${delimiter}문자${delimiter}`],
        ["😀", "!", "😀", `<!-- -->${delimiter}!${delimiter}<!-- -->`],
      ]) {
        const draft = await draftWith([paragraph(
          ...(left ? [text(left)] : []), text(core, { type: mark }), ...(right ? [text(right)] : []),
        )]);
        const output = await (await markdownFile(draft)).blob.text();
        expect(output).toContain(left + wrapped + right);
        expect(reader.parse(output)).toContain(`<${tag}>${core}</${tag}>`);
      }
    }
  });
  it("색·밑줄이 다른 이웃 코드 글자를 합치고 줄바꿈과 링크 경계는 남긴다", async () => {
    const code = { type: "code" }, link = { type: "link", attrs: { href: "https://example.com/" } };
    const red = { type: "textStyle", attrs: { color: "#ff0000" } };
    const blue = { type: "textStyle", attrs: { color: "#0000ff" } };
    const draft = await draftWith([
      paragraph(text("a", code, red), text("b", code, blue, { type: "underline" })),
      paragraph(text("a` ", code, red), text(" b", code, blue), { type: "hardBreak" }, text("c", code)),
      paragraph(text("a", code, red, link), text("b", code, blue)),
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [paragraph(text("a|", code, red), text("b", code, blue))] }] }] },
    ]);
    const output = await (await markdownFile(draft)).blob.text();
    expect(output).toContain("\n\n`ab`\n\n");
    expect(output).toContain("\n\n``a`  b``\\\n`c`\n\n");
    expect(output).toContain("[`a`](https://example.com/)`b`");
    expect(output).toContain("| `a\\|b` |");
    expect(reader.parse(output)).toContain("<p><code>ab</code></p>");
    expect(reader.parse(output)).toContain("<code>a`  b</code><br><code>c</code>");
  });
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
      // 혼자 있는 CR도 줄바꿈이고, 변환이 안에서 표시로 쓰는 제어 글자가 글에 있어도 지워지지 않는다.
      paragraph(text("가\r나\u0000\u0001\u0002\u0003다")),
    ], ["바다.png"]);
    Object.assign(draft.document.content.content!.at(-1)!.attrs!, { alt: " 바다  사진\n둘째 줄 ", caption: "" });
    expect(toMarkdown(draft.document)).toBe([
      "# 제주 여행", "",
      "`첫 줄`\\", "`둘째 줄`", "",
      "[&nbsp;걸린 글 ](https://example.com/a\\(b\\) \" 풍선&#10;말 \")뒤", "",
      "**원보드(Wonboard)**<!-- -->는", "",
      "가\\", "나\u0000\u0001\u0002\u0003다", "",
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

describe("PC 저장: 워드", () => {
  const parts = async (draft: Draft) => {
    const file = await wordFile(draft), entries = unzipSync(new Uint8Array(await file.blob.arrayBuffer()));
    return { file, entries, body: strFromU8(entries["word/document.xml"]), relations: strFromU8(entries["word/_rels/document.xml.rels"]) };
  };
  it("제목·문단·소제목·목록·인용·표·링크·사진이 문서와 같은 순서로 들어 있다", async () => {
    const { file, entries, body, relations } = await parts(await draftWith([
      paragraph(text("첫 문단")),
      { type: "heading", attrs: { level: 2 }, content: [text("소제목")] },
      { type: "orderedList", attrs: { start: 3, type: "a" }, content: [{ type: "listItem", content: [paragraph(text("목록 항목"))] }] },
      { type: "blockquote", content: [paragraph(text("인용한 글"))] },
      { type: "table", content: [{ type: "tableRow", content: [
        { type: "tableHeader", content: [paragraph(text("머리 칸"))] }, { type: "tableCell", content: [paragraph(text("보통 칸"))] }] }] },
      paragraph(text("걸린 글", { type: "link", attrs: { href: "https://example.com/?a=1&b=2" } })),
    ], ["바다.png"]));
    expect(file.name).toBe("제주 여행.docx");
    expect(file.photos).toBe(1);
    // 워드가 읽는 순서대로: 글자는 <w:t>에, 구조는 그 문단·표의 요소에 있다.
    const order = [
      '<w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">제주 여행</w:t>',
      '<w:p><w:r><w:t xml:space="preserve">첫 문단</w:t>',
      '<w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t xml:space="preserve">소제목</w:t>',
      '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>', "목록 항목",
      '<w:pBdr><w:left ', "인용한 글",
      "<w:tbl>", "<w:tc>", "머리 칸", "</w:tc><w:tc>", "보통 칸", "</w:tc></w:tr></w:tbl>",
      '<w:hyperlink r:id="rId4" w:history="1">', "걸린 글", "</w:hyperlink>",
      '<w:drawing>', '<a:blip r:embed="rId3"/>', "</w:drawing>", "바닷가",
    ];
    let from = 0;
    for (const piece of order) {
      const at = body.indexOf(piece, from);
      expect(at, piece).toBeGreaterThanOrEqual(0);
      from = at + piece.length;
    }
    // 번호 목록은 문서의 번호 모양(a, b, c)과 시작 번호를 갖고, 링크와 사진은 관계 파일을 거쳐 주소와 원본을 가리킨다.
    expect(strFromU8(entries["word/numbering.xml"])).toContain('<w:num w:numId="1"><w:abstractNumId w:val="2"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="3"/>');
    expect(relations).toContain('Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/?a=1&amp;b=2" TargetMode="External"');
    expect(relations).toContain('Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"');
    expect([...entries["word/media/image1.png"]]).toEqual([1, 2, 3]);
    // 워드는 목차 파일이 맨 앞에 있어야 읽는다.
    expect(Object.keys(entries)[0]).toBe("[Content_Types].xml");
  });
  it("굵게·기울임·밑줄·취소선·글자색·글자 크기·글꼴 이름이 남는다", async () => {
    const { body } = await parts(await draftWith([paragraph(
      text("굵게", { type: "bold" }), text("기울임", { type: "italic" }), text("밑줄", { type: "underline" }), text("취소선", { type: "strike" }),
      text("꾸민 글", { type: "textStyle", attrs: { color: "#ff0000", fontSize: 24, fontFamily: "nanum-gothic" } }),
    )]));
    const font = "나눔고딕";
    expect(body).toContain([
      '<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">굵게</w:t></w:r>',
      '<w:r><w:rPr><w:i/><w:iCs/></w:rPr><w:t xml:space="preserve">기울임</w:t></w:r>',
      '<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">밑줄</w:t></w:r>',
      '<w:r><w:rPr><w:strike/></w:rPr><w:t xml:space="preserve">취소선</w:t></w:r>',
      // 글자 크기는 반 포인트 단위다. 24px = 18pt = 36.
      `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/><w:color w:val="FF0000"/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr><w:t xml:space="preserve">꾸민 글</w:t></w:r>`,
    ].join(""));
  });
  it("공백·줄바꿈·특수 문자는 글자 그대로 남고, XML에 쓸 수 없는 글자만 빠진다", async () => {
    const draft = await draftWith([paragraph(text("  가  나 \t<다> & \"라\"\r\n마\u2028바\u0000\u0001\u000b\uffff사"), { type: "hardBreak" }, text(" "))]);
    draft.document.title = "";
    const { body } = await parts(draft);
    expect(body).toContain('<w:body><w:p><w:r><w:t xml:space="preserve">  가  나 </w:t><w:tab/><w:t xml:space="preserve">&lt;다&gt; &amp; "라"</w:t><w:br/>'
      + '<w:t xml:space="preserve">마</w:t><w:br/><w:t xml:space="preserve">바사</w:t></w:r><w:r><w:br/></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>');
  });
});
