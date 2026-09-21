import { attachmentNodes, withoutUnusedMedia, type Draft } from "@wonboard/document";
import { maxTableImages, tableImageId, tableNodes, type TableImage } from "@wonboard/renderer";
import { sitesRequest } from "./draftRepository";
import { renderTableImage, tableAlt, tableImageWidth } from "./tableImage";

export type Publication = { mediaId: string; publicId: string; published: boolean; url: string };
export async function publications(documentId: string): Promise<Publication[]> {
  return (await sitesRequest(`/api/documents/${documentId}/publications`)).json();
}
export async function prepareImageVariants(draft: Draft): Promise<Record<string, string>> {
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
  return variants;
}
/** 표마다 그림을 올린다. 이미 게시한 같은 내용의 표는 다시 그리지 않고 그 주소를 쓴다. */
async function prepareTableImages(draft: Draft) {
  const { documentId, content, defaultFont } = draft.document;
  const published = new Set((await publications(documentId)).map(item => item.mediaId));
  const tables: Record<string, string> = {}, images: { node: typeof content; id: string; alt: string; width: number }[] = [];
  for (const node of tableNodes(content)) images.push({ node, id: await tableImageId(node, defaultFont), alt: tableAlt(node), width: tableImageWidth(node) });
  // 올리기 전에 막는다. 표가 많은 글이 공개 그림 수천 개를 만들지 않게 한다.
  if (new Set(images.map(image => image.id)).size > maxTableImages) throw new Error("tooManyTables");
  for (const { node, id } of images) {
    if (tables[id]) continue;
    if (published.has(id)) { tables[id] = "existing"; continue; }
    const { blob } = await renderTableImage(node, defaultFont);
    const result = await (await sitesRequest(`/api/documents/${documentId}/media/${id}/variant`, {
      method: "PUT", headers: { "Content-Type": "image/png" }, body: blob,
    })).json();
    tables[id] = result.hash;
  }
  return { tables, images };
}
export async function publishImages(draft: Draft, tablesAsImages = false): Promise<{ urls: Record<string, string>; tableImages: Map<typeof draft.document.content, TableImage> }> {
  const snapshot = withoutUnusedMedia(draft), variants = await prepareImageVariants(snapshot);
  const prepared = tablesAsImages ? await prepareTableImages(snapshot) : null;
  const result = await (await sitesRequest(`/api/documents/${snapshot.document.documentId}/publish`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: snapshot.document.revision, variants, ...(prepared ? { tables: prepared.tables } : {}) }),
  })).json();
  if (!result.urls || Object.keys(snapshot.document.media).some(id => {
    const value = result.urls[id];
    if (typeof value !== "string") return true;
    const url = new URL(value);
    return url.origin !== location.origin || !/^\/media\/[a-zA-Z0-9_-]+$/.test(url.pathname) || url.search !== "";
  })) throw new Error("publishFailed");
  const tableImages = new Map<typeof draft.document.content, TableImage>();
  for (const image of prepared?.images ?? []) {
    const src = result.urls[image.id];
    if (typeof src !== "string" || new URL(src).origin !== location.origin) throw new Error("publishFailed");
    tableImages.set(image.node, { src, alt: image.alt, width: image.width });
  }
  // 이번에 그린 표의 ID만 뺀다. 표 ID는 사진 ID에 없는 ':'를 가져 서로 겹치지 않는다.
  const tableIds = new Set(prepared?.images.map(image => image.id));
  const urls: Record<string, string> = {};
  for (const [id, url] of Object.entries(result.urls as Record<string, string>)) if (!tableIds.has(id)) urls[id] = url;
  return { urls, tableImages };
}
