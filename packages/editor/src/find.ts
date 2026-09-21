import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type Match = { from: number; to: number };
type FindState = { query: string; current: number; matches: Match[]; decorations: DecorationSet };
export const findKey = new PluginKey<FindState>("wonboardFind");

// 사진·파일 같은 글자 아닌 칸은 한 글자 자리로 채워, 문자열 위치가 문서 위치와 1:1이 되게 한다.
const leaf = "￼";
const fold = (text: string) => {
  const lower = text.toLowerCase();
  return lower.length === text.length ? lower : text;
};
// 조합형으로 들어온 한글·악센트(é = e + ́)도 찾도록 NFC로 맞춘다. 결합 문자까지를 한 조각으로
// 정규화하고, 조각마다 원래 위치를 기억해 강조와 바꾸기가 문서의 실제 자리를 가리키게 한다.
function normalized(text: string) {
  let value = "";
  const starts: number[] = [], ends: number[] = [];
  let offset = 0;
  for (const piece of text.match(/[^\p{M}\u1160-\u11ff][\p{M}\u1160-\u11ff]*|[\p{M}\u1160-\u11ff]+/gu) ?? []) {
    const folded = fold(piece.normalize("NFC"));
    for (let i = 0; i < folded.length; i++) { starts.push(offset); ends.push(offset + piece.length); }
    value += folded;
    offset += piece.length;
  }
  return { value, starts, ends };
}
export function findMatches(doc: ProseMirrorNode, query: string): Match[] {
  if (!query) return [];
  const needle = fold(query.normalize("NFC")), matches: Match[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = normalized(node.textBetween(0, node.content.size, undefined, leaf));
    for (let index = text.value.indexOf(needle); index >= 0; index = text.value.indexOf(needle, index + needle.length))
      matches.push({ from: pos + 1 + text.starts[index], to: pos + 1 + text.ends[index + needle.length - 1] });
    return false;
  });
  return matches;
}
function build(doc: ProseMirrorNode, query: string, current: number): FindState {
  const matches = findMatches(doc, query);
  const index = matches.length ? Math.min(Math.max(current, 0), matches.length - 1) : 0;
  return {
    query, current: index, matches,
    decorations: DecorationSet.create(doc, matches.map((match, i) =>
      Decoration.inline(match.from, match.to, { class: i === index ? "find-match find-current" : "find-match" }))),
  };
}
export const Find = Extension.create({
  name: "wonboardFind",
  addProseMirrorPlugins() {
    return [new Plugin<FindState>({
      key: findKey,
      state: {
        init: (_, state) => build(state.doc, "", 0),
        apply(tr, previous, _old, state) {
          const meta = tr.getMeta(findKey) as Partial<Pick<FindState, "query" | "current">> | undefined;
          if (!meta && !tr.docChanged) return previous;
          return build(state.doc, meta?.query ?? previous.query, meta?.current ?? previous.current);
        },
      },
      props: { decorations: state => findKey.getState(state)?.decorations },
    })];
  },
});

export const findState = (editor: Editor) => findKey.getState(editor.state)!;
export function setQuery(editor: Editor, query: string) {
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { query, current: 0 }));
  reveal(editor);
}
export function step(editor: Editor, direction: 1 | -1) {
  const { matches, current } = findState(editor);
  if (!matches.length) return;
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { current: (current + direction + matches.length) % matches.length }));
  reveal(editor);
}
function reveal(editor: Editor) {
  const { matches, current } = findState(editor);
  const match = matches[current];
  if (match) editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, match.from, match.to)).scrollIntoView());
}
export function replaceCurrent(editor: Editor, replacement: string) {
  const { matches, current } = findState(editor);
  const match = matches[current];
  if (!match) return;
  const tr = closeHistory(editor.state.tr);
  if (replacement) tr.insertText(replacement, match.from, match.to);
  else tr.delete(match.from, match.to);
  editor.view.dispatch(tr);
  // 바꾼 글자가 다시 검색어와 맞아도(foo → FOO) 그 뒤의 항목으로 넘어간다.
  const after = match.from + replacement.length;
  const next = findState(editor).matches.findIndex(item => item.from >= after);
  editor.view.dispatch(editor.state.tr.setMeta(findKey, { current: Math.max(next, 0) }));
  reveal(editor);
}
/** 모두 바꾸기는 한 트랜잭션이라 실행 취소 한 번으로 되돌아간다. */
export function replaceAll(editor: Editor, replacement: string) {
  const { matches } = findState(editor);
  if (!matches.length) return;
  // 바로 앞의 입력과 한 묶음이 되지 않게 새 실행 취소 단위로 시작한다.
  const tr = closeHistory(editor.state.tr);
  for (const match of [...matches].reverse()) {
    if (replacement) tr.insertText(replacement, match.from, match.to);
    else tr.delete(match.from, match.to);
  }
  editor.view.dispatch(tr);
}
