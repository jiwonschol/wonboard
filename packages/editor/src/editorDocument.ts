import { Node, type Editor } from "@tiptap/core";
import { type ContentNode, type Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";
export const WritingDocument = Node.create({ name: "doc", topNode: true, content: "documentTitle documentBody" });
export const DocumentTitle = Node.create({
  name: "documentTitle", content: "(text | hardBreak)*", marks: "", defining: true,
  addOptions: () => ({ locale: () => "ko" as Locale }),
  parseHTML: () => [{ tag: 'div[data-wb-title]' }],
  renderHTML() { return ["div", { "data-wb-title": "", class: "document-title", role: "textbox", "aria-label": translator(this.options.locale())("addTitle"), "aria-multiline": "true" }, 0]; },
});
export const DocumentBody = Node.create({
  name: "documentBody", content: "block+", defining: true,
  addOptions: () => ({ locale: () => "ko" as Locale }),
  parseHTML: () => [{ tag: 'div[data-wb-body]' }],
  renderHTML() { return ["div", { "data-wb-body": "", class: "wb-body", role: "textbox", "aria-label": translator(this.options.locale())("body"), "aria-multiline": "true" }, 0]; },
});
export function editingDocument(title: string, content: ContentNode): ContentNode {
  return { type: "doc", content: [{ type: "documentTitle", content: title.split("\n").flatMap((text, i) => [...(i ? [{ type: "hardBreak" }] : []), ...(text ? [{ type: "text", text }] : [])]) }, { type: "documentBody", content: content.content }] };
}
export function documentBodyContent(content: ContentNode): ContentNode {
  return content.content?.[1]?.type === "documentBody" ? { type: "doc", content: content.content[1].content } : content;
}
export function editingTitle(editor: Editor) { return editor.state.doc.firstChild!.textBetween(0, editor.state.doc.firstChild!.content.size, "", "\n"); }
export function bodyStart(editor: Editor) { return editor.state.doc.firstChild!.nodeSize + 2; }
