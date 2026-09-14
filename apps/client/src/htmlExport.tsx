import { renderToStaticMarkup } from "react-dom/server";
import { PortableDocumentBody } from "@wonboard/renderer";
import { attachmentNodes, validateDocument, type WriterDocument } from "@wonboard/document";

export function exportHtml(document: WriterDocument, mediaUrls: Record<string, string>) {
  validateDocument(document);
  for (const node of attachmentNodes(document.content).filter(node => node.type === "media")) {
    const value = mediaUrls[String(node.attrs?.mediaId)];
    if (!value) throw new Error("missingMedia");
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
      throw new Error("invalidLink");
  }
  return renderToStaticMarkup(<PortableDocumentBody document={document} mediaUrls={mediaUrls} />);
}
