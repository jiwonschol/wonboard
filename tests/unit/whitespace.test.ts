import { expect, it } from "vitest";
import { getSchema } from "../../packages/editor/node_modules/@tiptap/core/dist/index.js";
import StarterKit from "../../packages/editor/node_modules/@tiptap/starter-kit/dist/index.js";
import { Slice } from "../../packages/editor/node_modules/@tiptap/pm/dist/model/index.js";
import { whitespaceChanges } from "../../packages/editor/src/whitespace";

const schema = getSchema([StarterKit]);
it("removes trailing spaces across marks and extra blank paragraphs without changing words", () => {
  const doc = schema.nodeFromJSON({ type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "  아이템  이름 " }, { type: "text", text: "  ", marks: [{ type: "bold" }] }] },
    { type: "paragraph" }, { type: "paragraph" }, { type: "paragraph" },
    { type: "paragraph", content: [{ type: "text", text: "끝" }] },
  ] });
  let result = doc;
  const changes = whitespaceChanges(doc);
  expect(changes).toHaveLength(4);
  for (const change of changes) result = result.replace(change.from, change.to, Slice.empty);
  expect(result.childCount).toBe(3);
  expect(result.firstChild!.textContent).toBe("  아이템  이름");
  expect(whitespaceChanges(result)).toEqual([]);
});
it("preserves code, linked text, and explicit line breaks", () => {
  const doc = schema.nodeFromJSON({ type: "doc", content: [
    { type: "codeBlock", content: [{ type: "text", text: "code  " }] },
    { type: "paragraph", content: [{ type: "text", text: "link  ", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] },
    { type: "paragraph", content: [{ type: "hardBreak" }, { type: "hardBreak" }] },
  ] });
  expect(whitespaceChanges(doc)).toEqual([]);
});
