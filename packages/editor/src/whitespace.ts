import type { Node } from "@tiptap/pm/model";

export type SpaceChange = { from: number; to: number; before: string; after: string; kind: "spaces" | "paragraph" };

// Only remove trailing ASCII spaces and consecutive, unstyled empty top-level
// paragraphs. Never infer Korean word boundaries or flatten rich content.
const untrimmed = ["code", "link"];

export function whitespaceChanges(doc: Node): SpaceChange[] {
  const changes: SpaceChange[] = [];
  let previousBlank = false;
  const removed = new Set<number>();
  doc.forEach((node, offset) => {
    // A paragraph holding only trimmable spaces is empty once tidied, so it counts as blank here.
    let blank = node.type.name === "paragraph" &&
      Object.values(node.attrs).every(value => value === null || value === undefined);
    node.forEach(child => { blank &&= child.isText && /^ +$/.test(child.text!) && !child.marks.some(mark => untrimmed.includes(mark.type.name)); });
    if (blank && previousBlank) {
      removed.add(offset);
      changes.push({ from: offset, to: offset + node.nodeSize, before: "", after: "", kind: "paragraph" });
    }
    previousBlank = blank;
  });
  doc.descendants((node, pos) => {
    if (removed.has(pos)) return false;
    if (node.type.name === "codeBlock") return false;
    if (!["paragraph", "heading"].includes(node.type.name)) return;
    let end = node.content.size;
    for (let index = node.childCount - 1; index >= 0; index--) {
      const child = node.child(index);
      if (!child.isText || child.marks.some(mark => untrimmed.includes(mark.type.name))) break;
      const count = child.text!.match(/ +$/)?.[0].length ?? 0;
      if (count) changes.push({ from: pos + 1 + end - count, to: pos + 1 + end,
        before: child.text!.slice(-120), after: child.text!.slice(-120).slice(0, -count), kind: "spaces" });
      if (count !== child.nodeSize) break;
      end -= child.nodeSize;
    }
  });
  return changes.sort((a, b) => b.from - a.from);
}
