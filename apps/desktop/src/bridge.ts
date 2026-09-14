import type { WriterDocument } from "@wonboard/document";

export type StoredDraft = { document: WriterDocument; blobs: Record<string, ArrayBuffer> };
export type DesktopStorage = {
  list(): Promise<StoredDraft[]>;
  load(id: string): Promise<StoredDraft>;
  save(draft: StoredDraft, revision: number): Promise<StoredDraft>;
};
declare global {
  interface Window { wonboardDesktop?: DesktopStorage }
}
