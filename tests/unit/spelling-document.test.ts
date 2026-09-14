import { describe, expect, it } from "vitest";
import { Schema } from "../../packages/editor/node_modules/@tiptap/pm/dist/model/index.js";
import { EditorState } from "../../packages/editor/node_modules/@tiptap/pm/dist/state/index.js";
import { closeHistory, history, undo, redo } from "../../packages/editor/node_modules/@tiptap/pm/dist/history/index.js";
import { replaceSpelling, spellingSegments } from "../../packages/editor/src/proofreading/document";

const schema = new Schema({
  nodes: { doc: { content: "block+" }, paragraph: { group: "block", content: "inline*" },
    codeBlock: { group: "block", content: "text*" }, text: { group: "inline" }, image: { group: "inline", inline: true } },
  marks: { bold: {}, italic: {}, code: {}, link: {} },
});
const text = (value: string, mark?: string) => schema.text(value, mark ? [schema.mark(mark)] : []);
const paragraph = (...content: ReturnType<typeof text>[]) => schema.node("paragraph", null, content);

describe("spelling document boundaries", () => {
  it("joins formatting but excludes links, code, images, and paragraph boundaries", () => {
    const doc = schema.node("doc", null, [paragraph(text("질게", "bold"), text("에서답변"), text("링크", "link"), text("뒤"), schema.node("image"), text("끝")),
      schema.node("codeBlock", null, text("code")), paragraph(text("😀english"), text("excluded", "code"))]);
    expect(spellingSegments(doc).map(item => item.text)).toEqual(["질게에서답변", "뒤", "끝", "😀english"]);
    for (const segment of spellingSegments(doc)) expect(doc.textBetween(segment.from, segment.to)).toBe(segment.text);
  });
  it("preserves marks and makes the complete replacement one undo step", () => {
    const doc = schema.node("doc", null, paragraph(text("😀질게", "bold"), text("에서답변", "italic"), text("하시는걸")));
    let state = EditorState.create({ doc, plugins: [history()] });
    const dispatch = (tr: typeof state.tr) => { state = state.apply(tr); };
    dispatch(replaceSpelling(closeHistory(state.tr), 3, doc.content.size - 1, "질게에서답변하시는걸", "질게에서 답변하시는 걸"));
    expect(state.doc.textContent).toBe("😀질게에서 답변하시는 걸");
    expect(state.doc.nodeAt(3)?.marks[0].type.name).toBe("bold");
    expect(state.doc.nodeAt(8)?.marks[0].type.name).toBe("italic");
    const changed = state.doc;
    expect(undo(state, dispatch)).toBe(true);
    expect(state.doc.eq(doc)).toBe(true);
    expect(redo(state, dispatch)).toBe(true);
    expect(state.doc.eq(changed)).toBe(true);
  });
  it("passes only adjacency for excluded marks and keeps outer gap edits outside their content", () => {
    for (const mark of ["code", "link"]) {
      const protectedText = text("private_identifier", mark);
      const doc = schema.node("doc", null, [paragraph(protectedText, text(" 에", "bold"), text("서 봐요")),
        paragraph(text("다음", mark)), paragraph(text(" 에서")),
        paragraph(text("그림", mark), schema.node("image"), text(" 에서"))]);
      const segments = spellingSegments(doc);
      expect(segments.map(segment => !!segment.afterProtected)).toEqual([true, false, false]);
      expect(segments[0].text).toBe(" 에서 봐요");
      expect(segments.some(segment => segment.text.includes("private_identifier"))).toBe(false);
      let state = EditorState.create({ doc, plugins: [history()] });
      const dispatch = (tr: typeof state.tr) => { state = state.apply(tr); };
      const start = segments[0].from;
      dispatch(replaceSpelling(closeHistory(state.tr), start, start + 3, " 에서", "에서"));
      expect(state.doc.nodeAt(1)?.eq(protectedText)).toBe(true);
      expect(state.doc.textContent.startsWith("private_identifier에서 봐요")).toBe(true);
      expect(undo(state, dispatch)).toBe(true);
      expect(state.doc.eq(doc)).toBe(true);
    }
  });
  it("rejects stale text and attempts to cross excluded content", () => {
    const doc = schema.node("doc", null, paragraph(text("one"), text("link", "link"), text("two")));
    const state = EditorState.create({ doc });
    expect(() => replaceSpelling(state.tr, 1, 4, "old", "new")).toThrow("Stale");
    expect(() => replaceSpelling(state.tr, 1, 11, "onelinktwo", "new")).toThrow("Stale");
  });
});
