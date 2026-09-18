import type { WriterDocument, LibraryFile, FileChange } from "@wonboard/document";

export type StoredDraft = { document: WriterDocument; blobs: Record<string, ArrayBuffer> };
export type DesktopStorage = {
  filesList(): Promise<LibraryFile[]>;
  filesLoad(id: string): Promise<{ file: LibraryFile; bytes: ArrayBuffer }>;
  filesUpload(file: LibraryFile, bytes: ArrayBuffer): Promise<LibraryFile>;
  filesChange(id: string, revision: number, change: FileChange): Promise<LibraryFile>;
  filesRemove(id: string, revision: number): Promise<void>;
  remove(id: string, revision: number): Promise<void>;
  list(): Promise<StoredDraft[]>;
  load(id: string): Promise<StoredDraft>;
  save(draft: StoredDraft, revision: number): Promise<StoredDraft>;
};
declare global {
  interface Window { wonboardDesktop?: DesktopStorage }
}
