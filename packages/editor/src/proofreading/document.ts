import type { Node } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

export type TextSegment = { text: string; from: number; to: number };

/** Positions and string offsets are both UTF-16. Inline exclusions split a segment. */
export function spellingSegments(doc: Node): TextSegment[] {
  const segments: TextSegment[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock") return false;
    if (!node.isText || node.marks.some(mark => ["code", "link"].includes(mark.type.name))) return;
    const last = segments.at(-1);
    if (last?.to === pos) {
      last.text += node.text!;
      last.to += node.nodeSize;
    } else segments.push({ text: node.text!, from: pos, to: pos + node.nodeSize });
  });
  return segments;
}

/** Apply only changed characters, preserving marks on every unchanged character. */
export function replaceSpelling(tr: Transaction, from: number, to: number, original: string, replacement: string): Transaction {
  const segment = spellingSegments(tr.doc).find(item => item.from <= from && item.to >= to);
  if (!segment || segment.text.slice(from - segment.from, to - segment.from) !== original) throw new Error("Stale spelling range");
  if (original.length > 200 || replacement.length > 200) throw new Error("Replacement range too long");
  const before = Array.from(original), after = Array.from(replacement);
  const offsets = [0];
  for (const char of before) offsets.push(offsets.at(-1)! + char.length);
  const costs = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));
  for (let i = before.length; i >= 0; i--) {
    for (let j = after.length; j >= 0; j--) {
      costs[i][j] = i === before.length ? after.length - j : j === after.length ? before.length - i
        : before[i] === after[j] ? costs[i + 1][j + 1]
        : 1 + Math.min(costs[i + 1][j + 1], costs[i + 1][j], costs[i][j + 1]);
    }
  }
  const edits: { from: number; to: number; text: string }[] = [];
  let i = 0, j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) { i++; j++; continue; }
    const start = from + offsets[i];
    if (i < before.length && j < after.length && costs[i][j] === 1 + costs[i + 1][j + 1]) {
      edits.push({ from: start, to: from + offsets[++i], text: after[j++] });
    } else if (i < before.length && costs[i][j] === 1 + costs[i + 1][j]) {
      edits.push({ from: start, to: from + offsets[++i], text: "" });
    } else edits.push({ from: start, to: start, text: after[j++] });
  }
  // Backwards edits keep the original positions valid, including repeated insertions.
  for (const edit of edits.reverse()) {
    const marks = edit.from < edit.to ? tr.doc.nodeAt(edit.from)?.marks
      : tr.doc.resolve(edit.from).marks();
    if (edit.text) tr.replaceWith(edit.from, edit.to, tr.doc.type.schema.text(edit.text, marks));
    else tr.delete(edit.from, edit.to);
  }
  return tr;
}
