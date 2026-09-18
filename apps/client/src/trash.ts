import { newDraft, validateDocument, type ContentNode, type Draft, type Locale, type WriterDocument } from "@wonboard/document";
import { newestDraftFirst } from "./storage";

export const TRASH_RETENTION_MS = 30 * 86400000;
export function trashExpired(document: WriterDocument, now = Date.now()): boolean {
  return document.trashedAt !== undefined && now >= Date.parse(document.trashedAt) + TRASH_RETENTION_MS;
}
export function trashDaysRemaining(document: WriterDocument, now = Date.now()): number {
  return document.trashedAt === undefined ? 0 : Math.min(30, Math.max(0,
    Math.ceil((Date.parse(document.trashedAt) + TRASH_RETENTION_MS - now) / 86400000)));
}
export function latestActiveDraft(drafts: Draft[], locale: Locale): Draft {
  return drafts.filter(d => d.document.trashedAt === undefined).sort(newestDraftFirst)[0] ?? newDraft(locale);
}
export function recoveredDraft(value: Draft): Draft {
  const { trashedAt: _trashedAt, ...document } = value.document;
  let content = document.content, files = document.files, blobs = value.blobs;
  let supported = true;
  try { validateDocument(value.document); } catch { supported = false; }
  if (supported && files && Object.keys(files).length) {
    // A portable copy must not reuse a deleted library entry's tombstone or
    // revive its old public links. Preserve bytes, remap only supported file refs.
    const ids = new Map(Object.keys(files).map(id => [id, crypto.randomUUID()]));
    const remap = (node: ContentNode): ContentNode => ({ ...node,
      ...(node.type === "fileRef" ? { attrs: { ...node.attrs, fileId: ids.get(String(node.attrs?.fileId)) } } : {}),
      ...(node.content ? { content: node.content.map(remap) } : {}),
    });
    content = remap(content);
    files = Object.fromEntries(Object.entries(files).map(([id, file]) => [ids.get(id)!, { ...file, id: ids.get(id)! }]));
    blobs = Object.fromEntries(Object.entries(blobs).map(([id, blob]) => [ids.get(id) ?? id, blob]));
  }
  return { ...value, blobs, document: { ...document, content, ...(files ? { files } : {}), documentId: crypto.randomUUID(), revision: 0,
    updatedAt: new Date().toISOString() } };
}
