import { newDraft, type Draft, type Locale, type WriterDocument } from "@wonboard/document";
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
  return { ...value, document: { ...document, documentId: crypto.randomUUID(), revision: 0,
    updatedAt: new Date().toISOString() } };
}
