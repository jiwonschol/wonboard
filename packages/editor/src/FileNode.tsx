import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useContext } from "react";
import { isMediaId } from "@wonboard/document";
import { MediaContext } from "./MediaNode";

function FileView({ node }: NodeViewProps) {
  const { urls } = useContext(MediaContext);
  const url = urls[String(node.attrs.fileId)];
  // No iframe, object, innerHTML or new browsing context for uploaded content.
  return <NodeViewWrapper as="span" className="wb-file" contentEditable={false}>
    {url?.startsWith("blob:")
      ? <a href={url} download={String(node.attrs.label)}>{String(node.attrs.label)}</a>
      : <span>{String(node.attrs.label)}</span>}
  </NodeViewWrapper>;
}

export const FileNode = Node.create({
  name: "fileRef", group: "inline", inline: true, atom: true, marks: "",
  addOptions() { return { ownsFile: (_id: string): boolean => false }; },
  addAttributes() { return { fileId: { default: null }, label: { default: "" } }; },
  parseHTML() {
    return [{ tag: "span[data-wonboard-file]", getAttrs: (element: HTMLElement) => {
      const fileId = element.getAttribute("data-wonboard-file");
      if (!isMediaId(fileId) || !this.options.ownsFile(fileId)) return false;
      const label = (element.textContent ?? "").slice(0, 1024);
      return label ? { fileId, label } : false;
    } }];
  },
  renderHTML({ node }) { return ["span", { "data-wonboard-file": node.attrs.fileId }, String(node.attrs.label)]; },
  addNodeView() { return ReactNodeViewRenderer(FileView); },
});
