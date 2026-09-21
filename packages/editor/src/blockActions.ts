import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { liftTarget } from "@tiptap/pm/transform";
import { textVariants } from "@wonboard/document";
import { en, ko } from "@wonboard/locales";

export type Variant = "default" | (typeof textVariants)[number];
export const variants: readonly Variant[] = ["default", ...textVariants];

/** 드래그로 고른 글자가 있는가. 사진처럼 블록 전체를 고른 경우는 글자 선택이 아니다. */
export const hasTextSelection = (editor: Editor) =>
  !editor.state.selection.empty && !(editor.state.selection instanceof NodeSelection);

const textBlockType = (editor: Editor) => (editor.isActive("heading") ? "heading" : "paragraph");

/** 선택한 글자가 있으면 그 글자에만, 커서만 있으면 커서가 있는 문단에 적용한다. */
export function currentVariant(editor: Editor): Variant {
  if (hasTextSelection(editor)) return editor.getAttributes("textStyle").variant ?? "default";
  return editor.getAttributes(textBlockType(editor)).variant ?? "default";
}
export function applyVariant(editor: Editor, variant: Variant) {
  const chain = editor.chain().focus();
  if (hasTextSelection(editor)) chain.setMark("textStyle", { variant: variant === "default" ? null : variant }).run();
  else chain.updateAttributes(textBlockType(editor), { variant }).run();
}

export const turnIntoTypes = ["paragraph", "heading1", "heading2", "heading3", "bulletList", "orderedList", "blockquote", "codeBlock", "textBox"] as const;
export type TurnIntoType = (typeof turnIntoTypes)[number];
export function isBlockType(editor: Editor, type: TurnIntoType) {
  if (type.startsWith("heading")) return editor.isActive("heading", { level: Number(type.slice(7)) });
  if (type === "paragraph") return editor.isActive("paragraph") && !["bulletList", "orderedList", "blockquote", "codeBlock", "textBox"].some(name => editor.isActive(name));
  return editor.isActive(type);
}
export function turnInto(editor: Editor, type: TurnIntoType) {
  if (isBlockType(editor, type)) return;
  const chain = editor.chain().focus();
  if (type === "paragraph") chain.clearNodes().run();
  else if (type.startsWith("heading")) chain.setHeading({ level: Number(type.slice(7)) as 1 | 2 | 3 }).run();
  else if (type === "bulletList") chain.toggleBulletList().run();
  else if (type === "orderedList") chain.toggleOrderedList().run();
  else if (type === "blockquote") chain.toggleBlockquote().run();
  else if (type === "codeBlock") chain.setCodeBlock().run();
  else chain.wrapIn("textBox").run();
}

/** 커서가 든 글상자를 풀어 안의 블록을 그대로 바깥에 남긴다. */
export function unwrapTextBox(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name !== "textBox") continue;
    const start = $from.before(depth), size = $from.node(depth).nodeSize;
    return editor.chain().focus().command(({ tr }) => {
      const range = tr.doc.resolve(start + 1).blockRange(tr.doc.resolve(start + size - 1));
      const target = range && liftTarget(range);
      if (!range || target === null || target === undefined) return false;
      tr.lift(range, target);
      return true;
    }).run();
  }
  return false;
}

export const insertTypes = [
  "paragraph",
  "heading",
  "image",
  "textBox",
  "table",
  "bulletList",
  "orderedList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
] as const;
export type InsertType = (typeof insertTypes)[number];
// 초성만 친 순간(ㄱ, ㅅ)은 호환 자모라 완성 글자와 맞춰 볼 수 없다. 첫소리 자모로 바꾼다.
const initials = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const jamo = (text: string) =>
  text
    .replace(/[ㄱ-ㅎ]/gu, (c) => initials.includes(c) ? String.fromCharCode(0x1100 + initials.indexOf(c)) : c)
    .normalize("NFD")
    .toLowerCase();
const insertAliases: Partial<Record<InsertType, string>> = {
  heading: "h2 title 소제목",
  textBox: "box callout 박스 상자",
  table: "grid 테이블",
  image: "photo picture 그림 이미지",
  horizontalRule: "hr divider line 줄",
};
export const matchesInsertType = (type: InsertType, query: string) =>
  !query ||
  [type, en[type], ko[type], insertAliases[type] ?? ""].some((label) => jamo(label).includes(jamo(query)));
/** 사진은 파일 선택이 필요해 호출하는 쪽이 처리한다. */
export function insertBlock(editor: Editor, type: Exclude<InsertType, "image">) {
  const chain = editor.chain().focus();
  if (type === "paragraph") chain.setParagraph().run();
  if (type === "heading") chain.toggleHeading({ level: 2 }).run();
  if (type === "textBox") chain.wrapIn("textBox").run();
  if (type === "table") chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  if (type === "bulletList") chain.toggleBulletList().run();
  if (type === "orderedList") chain.toggleOrderedList().run();
  if (type === "blockquote") chain.toggleBlockquote().run();
  if (type === "codeBlock") chain.toggleCodeBlock().run();
  if (type === "horizontalRule") chain.setHorizontalRule().run();
}

/** 본문 맨 위층 블록의 시작 위치. 옮기기·복제·삭제는 이 단위로 한다. */
export function topLevelBlocks(editor: Editor) {
  const blocks: { pos: number; size: number; type: string }[] = [];
  editor.state.doc.forEach((node, pos) => blocks.push({ pos, size: node.nodeSize, type: node.type.name }));
  return blocks;
}
export const topLevelIndex = (editor: Editor) => editor.state.selection.$from.index(0);
export function moveBlock(editor: Editor, index: number, direction: -1 | 1) {
  const blocks = topLevelBlocks(editor);
  const current = blocks[index], target = blocks[index + direction];
  if (!current || !target) return false;
  const node = editor.state.doc.child(index);
  const transaction = editor.state.tr.delete(current.pos, current.pos + current.size);
  const destination = direction < 0 ? target.pos : target.pos + target.size - current.size;
  transaction.insert(destination, node);
  // 옮긴 블록 안의 같은 자리에 커서를 둬서 Alt+Shift+화살표를 이어 누를 수 있게 한다.
  const offset = Math.max(0, Math.min(editor.state.selection.from - current.pos, current.size - 1));
  transaction.setSelection(TextSelection.near(transaction.doc.resolve(destination + offset))).scrollIntoView();
  editor.view.dispatch(transaction);
  return true;
}
export function duplicateBlock(editor: Editor, index: number) {
  const block = topLevelBlocks(editor)[index];
  if (!block) return;
  editor.view.dispatch(editor.state.tr.insert(block.pos + block.size, editor.state.doc.child(index)));
}
export function deleteBlock(editor: Editor, index: number) {
  const block = topLevelBlocks(editor)[index];
  if (!block) return;
  editor.chain().focus().deleteRange({ from: block.pos, to: block.pos + block.size }).run();
}
