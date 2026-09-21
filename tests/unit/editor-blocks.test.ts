import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getSchema } from "../../packages/editor/node_modules/@tiptap/core/dist/index.js";
import StarterKit from "../../packages/editor/node_modules/@tiptap/starter-kit/dist/index.js";
import {
  exportBackup,
  importBackup,
  newDraft,
  plainText,
  validateDocument,
  type ContentNode,
} from "@wonboard/document";
import { PortableDocumentBody } from "@wonboard/renderer";
import { TextBox, tableExtensions } from "../../packages/editor/src/blocks";
import { TextStyle } from "../../packages/editor/src/TextStyle";
import { matchesInsertType } from "../../packages/editor/src/blockActions";
import { looksLikeMarkdown, markdownToHtml } from "../../packages/editor/src/markdown";
import { findMatches } from "../../packages/editor/src/find";

const paragraph = (text: string): ContentNode => ({ type: "paragraph", content: [{ type: "text", text }] });
const cell = (type: string, text: string, attrs: Record<string, unknown> = {}): ContentNode => ({
  type, attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null, ...attrs }, content: [paragraph(text)],
});
const table: ContentNode = {
  type: "table",
  content: [
    { type: "tableRow", content: [cell("tableHeader", "이름"), cell("tableHeader", "값")] },
    { type: "tableRow", content: [cell("tableCell", "공격력"), cell("tableCell", "120", { align: "right" })] },
  ],
};
const textBox: ContentNode = {
  type: "textBox",
  attrs: { backgroundColor: "#e8f3ff", borderColor: "#88aadd", borderWidth: 2, padding: 20 },
  content: [paragraph("공지"), { type: "bulletList", content: [{ type: "listItem", content: [paragraph("항목")] }] }],
};
const withContent = (...content: ContentNode[]) => {
  const draft = newDraft();
  draft.document.content = { type: "doc", content };
  return draft;
};

describe("글상자와 표가 문서 형식을 통과한다", () => {
  it("저장·백업을 거쳐도 그대로 남는다", async () => {
    const draft = withContent(textBox, table, { type: "textBox", content: [table] });
    validateDocument(draft.document);
    expect((await importBackup(await exportBackup(draft))).document).toEqual(draft.document);
  });
  it("편집기가 만드는 기본 속성을 문서 검증이 받는다", () => {
    const schema = getSchema([StarterKit, TextStyle, TextBox, ...tableExtensions]);
    const json = schema.nodeFromJSON({
      type: "doc",
      content: [
        { type: "textBox", content: [{ type: "paragraph" }] },
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph" }] }] }] },
      ],
    }).toJSON() as ContentNode;
    expect(() => validateDocument({ ...newDraft().document, content: json })).not.toThrow();
    // 칸 정렬은 TipTap 칸 확장에서 물려받는다. 빠지면 불러온 문서의 정렬이 다음 저장에서 사라진다.
    expect(Object.keys(schema.nodes.tableCell.spec.attrs ?? {})).toContain("align");
    expect(Object.keys(schema.nodes.tableHeader.spec.attrs ?? {})).toContain("align");
  });
  it("병합·열 너비·칸 안의 목록·빈 글상자·잘못된 색은 거부한다", () => {
    const bad: ContentNode[] = [
      { type: "table", content: [{ type: "tableRow", content: [cell("tableCell", "가", { colspan: 2 })] }] },
      { type: "table", content: [{ type: "tableRow", content: [cell("tableCell", "가", { colwidth: [120] })] }] },
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "bulletList", content: [{ type: "listItem", content: [paragraph("가")] }] }] }] }] },
      { type: "table", content: [paragraph("가")] },
      { type: "textBox", content: [] },
      { type: "textBox", attrs: { backgroundColor: "red;background:url(x)" }, content: [paragraph("가")] },
      { type: "table", content: [{ type: "tableRow", content: [cell("tableCell", "가", { colspan: null })] }] },
    ];
    for (const node of bad) expect(() => validateDocument(withContent(node).document)).toThrow();
  });
  it("드래그한 글자의 스타일 값은 정해진 세 가지만 받는다", () => {
    const styled = (variant: unknown) => withContent({ type: "paragraph", content: [{ type: "text", text: "가", marks: [{ type: "textStyle", attrs: { variant } }] }] });
    for (const variant of ["display", "subtitle", "annotation", null]) expect(() => validateDocument(styled(variant).document)).not.toThrow();
    for (const variant of ["default", "huge", 1]) expect(() => validateDocument(styled(variant).document)).toThrow();
  });
  it("글 목록 미리보기에서 표 칸은 탭으로 나뉜다", () => {
    expect(plainText({ type: "doc", content: [table] })).toBe("이름\t값\n공격력\t120");
  });
  it("게시판용 HTML은 class 없이 인라인 스타일로만 글상자와 표를 그린다", () => {
    const html = renderToStaticMarkup(PortableDocumentBody({ document: withContent(textBox, table).document, mediaUrls: {} }));
    expect(html).not.toContain("class=");
    expect(html).toContain("background-color:#e8f3ff");
    expect(html).toContain("border:2px solid #88aadd");
    expect(html).toMatch(/<table style="[^"]*border-collapse:collapse/);
    expect(html).toMatch(/<th style="[^"]*background-color:#f2f4f7/);
    expect(html).toMatch(/<td style="[^"]*text-align:right[^"]*"><p style="(?![^"]*text-align)[^"]*">120/);
  });
  it("드래그한 글자의 스타일은 게시판용 HTML에서도 보인다", () => {
    const html = renderToStaticMarkup(PortableDocumentBody({ document: withContent({ type: "paragraph", content: [
      { type: "text", text: "보통 " }, { type: "text", text: "강조", marks: [{ type: "textStyle", attrs: { variant: "display" } }] },
    ] }).document, mediaUrls: {} }));
    expect(html).toMatch(/<span style="font-size:36px;font-weight:500" data-wb-variant="display">강조<\/span>/);
    expect(html).not.toMatch(/<p style="[^"]*font-size/);
  });
});

describe("마크다운 붙여넣기", () => {
  it("마크다운으로만 쓰는 표시가 있을 때만 서식으로 바꾼다", () => {
    for (const text of ["# 제목\n본문", "**굵게** 쓴 글", "```\ncode\n```", "| a | b |\n|---|---|\n| 1 | 2 |", "[링크](https://example.com)"])
      expect(looksLikeMarkdown(text), text).toBe(true);
    for (const text of ["#해시태그 오늘도 출근", "1. 첫째\n2. 둘째", "- 사과\n- 배", "> 인용한 댓글", "그냥 글"])
      expect(looksLikeMarkdown(text), text).toBe(false);
  });
  it("표와 서식을 HTML로 옮기고, 섞인 HTML은 실행하지 않는다", () => {
    const html = markdownToHtml("# 제목\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<img src=x onerror=alert(1)>");
    expect(html).toContain("<h1>제목</h1>");
    expect(html).toContain("<table>");
    expect(html).not.toContain("<img");
    expect(markdownToHtml("**굵게** ![그림](https://example.com/a.png)")).toContain("![그림](https://example.com/a.png)");
  });
});

describe("`/` 메뉴 거르기", () => {
  it("한국어 조합 중간 글자와 영어 이름으로 찾는다", () => {
    expect(matchesInsertType("textBox", "글사")).toBe(true);
    expect(matchesInsertType("textBox", "글ㅅ")).toBe(true);
    expect(matchesInsertType("table", "ㅍ")).toBe(true);
    expect(matchesInsertType("table", "Tab")).toBe(true);
    expect(matchesInsertType("table", "글상자")).toBe(false);
    expect(matchesInsertType("heading", "")).toBe(true);
  });
});

describe("본문 찾기", () => {
  it("조합형으로 들어온 한글과 악센트도 찾고, 문서의 실제 자리를 가리킨다", () => {
    const schema = getSchema([StarterKit]);
    const decomposed = "푸른 하늘 café".normalize("NFD");
    const doc = schema.nodeFromJSON({ type: "doc", content: [paragraph(decomposed)] });
    const [sky] = findMatches(doc, "하늘"), [cafe] = findMatches(doc, "CAFÉ");
    expect(doc.textBetween(sky.from, sky.to)).toBe("하늘".normalize("NFD"));
    expect(doc.textBetween(cafe.from, cafe.to)).toBe("café".normalize("NFD"));
  });
});
