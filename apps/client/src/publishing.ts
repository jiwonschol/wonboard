import { attachmentNodes, withoutUnusedMedia, type Draft } from "@wonboard/document";
import { sitesRequest } from "./draftRepository";

export type Publication = { mediaId: string; publicId: string; published: boolean; url: string };
export async function publications(documentId: string): Promise<Publication[]> {
  return (await sitesRequest(`/api/documents/${documentId}/publications`)).json();
}
export async function publishImages(draft: Draft): Promise<Record<string, string>> {
  const snapshot = withoutUnusedMedia(draft);
  const variants: Record<string, string> = {};
  const nodes = attachmentNodes(snapshot.document.content).filter(node => node.type === "media");
  for (const media of Object.values(snapshot.document.media)) {
    const source = snapshot.blobs[media.id];
    if (!source) throw new Error("missingMedia");
    const bitmap = await createImageBitmap(source);
    try {
      // Render at up to 2× the largest displayed width; never enlarge originals.
      // Re-encoding removes camera metadata without changing the private original.
      const displayWidth = Math.max(...nodes.filter(node => node.attrs?.mediaId === media.id)
        .map(node => Number(node.attrs?.width ?? 600)));
      const width = Math.max(1, Math.min(bitmap.width, Math.round(displayWidth * 2)));
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("invalidImage");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(new Error("invalidImage")), media.mime, 0.9));
      const result = await (await sitesRequest(`/api/documents/${snapshot.document.documentId}/media/${media.id}/variant`, {
        method: "PUT", headers: { "Content-Type": blob.type }, body: blob,
      })).json();
      variants[media.id] = result.hash;
    } finally { bitmap.close(); }
  }
  const result = await (await sitesRequest(`/api/documents/${snapshot.document.documentId}/publish`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: snapshot.document.revision, variants }),
  })).json();
  if (!result.urls || Object.keys(snapshot.document.media).some(id => {
    const value = result.urls[id];
    if (typeof value !== "string") return true;
    const url = new URL(value);
    return url.origin !== location.origin || !/^\/media\/[a-zA-Z0-9_-]+$/.test(url.pathname) || url.search !== "";
  })) throw new Error("publishFailed");
  return result.urls;
}
