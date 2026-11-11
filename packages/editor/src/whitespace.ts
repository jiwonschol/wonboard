import type { Node } from "@tiptap/pm/model";

export type SpaceChange = { from: number; to: number; before: string; after: string; kind: "spaces" | "paragraph" };

// Only remove trailing ASCII spaces and consecutive, unstyled empty top-level
// paragraphs. Never infer Korean word boundaries or flatten rich content.
export function whitespaceChanges(doc: Node): SpaceChange[] {
  const changes: SpaceChange[] = [];
  let previousBlank = false;
  doc.forEach((node, offset) => {
    const blank = node.type.name === "paragraph" && node.content.size === 0 &&
      Object.values(node.attrs).every(value => value === null || value === undefined);
    if (blank && previousBlank) changes.push({ from: offset, to: offset + node.nodeSize, before: "", after: "", kind: "paragraph" });
    previousBlank = blank;
  });
  doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock") return false;
    if (!["paragraph", "heading"].includes(node.type.name)) return;
    let end = node.content.size;
    for (let index = node.childCount - 1; index >= 0; index--) {
      const child = node.child(index);
      if (!child.isText || child.marks.some(mark => ["code", "link"].includes(mark.type.name))) break;
      const count = child.text!.match(/ +$/)?.[0].length ?? 0;
      if (count) changes.push({ from: pos + 1 + end - count, to: pos + 1 + end,
        before: child.text!.slice(-120), after: child.text!.slice(-120).slice(0, -count), kind: "spaces" });
      if (count !== child.nodeSize) break;
      end -= child.nodeSize;
    }
  });
  return changes.sort((a, b) => b.from - a.from);
}
