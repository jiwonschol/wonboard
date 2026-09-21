import { renderToStaticMarkup } from "react-dom/server";
import { PortableDocumentBody, type TableImages } from "@wonboard/renderer";
import { attachmentNodes, referencedFileIds, validateDocument, type WriterDocument } from "@wonboard/document";

export function exportHtml(document: WriterDocument, mediaUrls: Record<string, string>, tableImages?: TableImages) {
  validateDocument(document);
  for (const id of referencedFileIds(document.content)) {
    const value = mediaUrls[id];
    if (!value) throw new Error("privateFile");
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
      throw new Error("invalidLink");
  }
  for (const node of attachmentNodes(document.content).filter(node => node.type === "media")) {
    const value = mediaUrls[String(node.attrs?.mediaId)];
    if (!value) throw new Error("missingMedia");
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
      throw new Error("invalidLink");
  }
  return renderToStaticMarkup(<PortableDocumentBody document={document} mediaUrls={mediaUrls} tableImages={tableImages} />);
}
