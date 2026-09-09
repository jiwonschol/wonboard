import type { Node } from "@tiptap/pm/model";

export type SpellingWord = { word: string; from: number; to: number };
export const dictionaryKey = "wonboard.spelling.personal.v1";
export function readPersonalDictionary(): string[] {
  const value: unknown = JSON.parse(localStorage.getItem(dictionaryKey) ?? "[]");
  if (!Array.isArray(value) || value.some(word => typeof word !== "string")) throw new Error("Invalid dictionary");
  return value;
}

export function spellingWords(doc: Node): SpellingWord[] {
  const words: SpellingWord[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock") return false;
    if (!node.isText || node.marks.some(mark => ["code", "link"].includes(mark.type.name))) return;
    for (const match of node.text!.matchAll(/[가-힣]+/gu)) {
      // Do not mistake a fragment split by formatting for a complete word.
      const from = pos + match.index, to = from + match[0].length;
      const before = doc.textBetween(Math.max(0, from - 1), from, " ");
      const after = doc.textBetween(to, Math.min(doc.content.size, to + 1), " ");
      if (/[\p{L}\p{N}]$/u.test(before) || /^[\p{L}\p{N}]/u.test(after)) continue;
      words.push({ word: match[0], from: pos + match.index, to: pos + match.index + match[0].length });
    }
  });
  return words;
}
