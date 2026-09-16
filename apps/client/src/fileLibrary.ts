import { limits, sha256, type LibraryFile, type FileChange } from "@wonboard/document";
export type { LibraryFile, FileChange } from "@wonboard/document";
import { StorageConflict } from "./storage";

export type FileShare = { id: string; fileId: string; token: string; revision: number; expiresAt: string | null; revoked: boolean; active: boolean; url: string; filename?: string };
export type DistributedPhoto = { id: string; documentId: string; filename: string; published: boolean; url: string };
export type SharedWriting = { id: string; documentId: string; title: string; revision: number; token: string; version: string;
  url: string; active: boolean; revoked: boolean; expiresAt: string | null };
export type FileLibrary = {
  now?(): number;
  invalidateClock?(): void;
  list(): Promise<LibraryFile[]>;
  load(id: string): Promise<{ file: LibraryFile; blob: Blob }>;
  upload(file: File): Promise<LibraryFile>;
  change(id: string, revision: number, change: FileChange): Promise<LibraryFile>;
  remove(id: string, revision: number): Promise<void>;
  close(): void;
  sharing?: {
    writings(): Promise<SharedWriting[]>;
    updateWriting(writing: SharedWriting): Promise<SharedWriting>;
    changeWriting(writing: SharedWriting, action: "extend" | "revoke" | "reissue", expiresAt: string | null): Promise<SharedWriting>;
    removeWriting(writing: SharedWriting): Promise<void>;
    list(): Promise<FileShare[]>;
    create(file: LibraryFile, expiresAt: string | null): Promise<FileShare>;
    change(share: FileShare, action: "extend" | "revoke" | "reissue", expiresAt: string | null): Promise<FileShare>;
    remove(share: FileShare): Promise<void>;
    cleanup(): Promise<{ deleted: number; failed: number }>;
    photos(): Promise<DistributedPhoto[]>;
    changePhoto(photo: DistributedPhoto, action: "revoke" | "delete"): Promise<void>;
  };
};
type StoredFile = { file: LibraryFile; bytes: ArrayBuffer };
const retention = 30 * 86400000;
export const fileExpired = (file: LibraryFile, now = Date.now()) =>
  file.trashedAt !== undefined && Date.parse(file.trashedAt) + retention <= now;
export function fileName(value: string) {
  const name = value.trim();
  if (!name || name.length > 1024 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error("invalidFileName");
  return name;
}
export async function prepareFile(input: File): Promise<StoredFile> {
  if (input.size > limits.fileBytes) throw new Error("fileLimit");
  const name = fileName(input.name), bytes = await input.arrayBuffer();
  if (bytes.byteLength !== input.size || bytes.byteLength > limits.fileBytes) throw new Error("fileLimit");
  const mime = /^[\w.+-]+\/[\w.+-]+$/.test(input.type) && input.type.length <= 128
    ? input.type : "application/octet-stream";
  return { file: { id: crypto.randomUUID(), originalName: name, filename: name, mime,
    size: bytes.byteLength, sha256: await sha256(bytes), revision: 1, createdAt: new Date().toISOString() }, bytes };
}

// Library originals are independent pins. A document stores its own portable copy;
// removing this pin never mutates another document or any distributed object.
// No content deduplication or physical cross-document GC is implied by this adapter.
export async function openBrowserFileLibrary(name = "wonboard-files-v1"): Promise<FileLibrary> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "file.id" });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
  function read<T>(operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files"), request = operation(tx.objectStore("files"));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function mutate<T>(id: string, revision: number, transform: (previous: StoredFile | undefined) => { record?: StoredFile; result: T }): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite"), store = tx.objectStore("files");
      let result: T, failure: unknown;
      const request = store.get(id);
      request.onsuccess = () => {
        try {
          const previous = request.result as StoredFile | undefined;
          if ((previous?.file.revision ?? 0) !== revision) throw new StorageConflict();
          const next = transform(previous);
          result = next.result;
          if (next.record) store.put(next.record); else store.delete(id);
        } catch (error) { failure = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result!);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error("storageFailed"));
      tx.onerror = () => reject(failure ?? tx.error ?? new Error("storageFailed"));
    });
  }
  return {
    async list() { return (await read<StoredFile[]>(store => store.getAll())).map(row => row.file); },
    async load(id) {
      const row = await read<StoredFile | undefined>(store => store.get(id));
      if (!row || fileExpired(row.file)) throw new Error("missingFile");
      if (row.bytes.byteLength !== row.file.size || await sha256(row.bytes) !== row.file.sha256) throw new Error("missingMedia");
      return { file: row.file, blob: new Blob([row.bytes], { type: row.file.mime }) };
    },
    async upload(input) {
      const row = await prepareFile(input);
      return mutate(row.file.id, 0, () => ({ record: row, result: row.file }));
    },
    async change(id, revision, change) {
      return mutate(id, revision, previous => {
        if (!previous || fileExpired(previous.file)) throw new Error("missingFile");
        const file = { ...previous.file, revision: revision + 1 };
        if (change.filename !== undefined) file.filename = fileName(change.filename);
        if (change.trashedAt === null) delete file.trashedAt;
        else if (change.trashedAt !== undefined) {
          // The caller requests trashing; its timestamp is not a retention authority.
          if (!previous.file.trashedAt) file.trashedAt = new Date().toISOString();
        }
        return { record: { ...previous, file }, result: file };
      });
    },
    async remove(id, revision) {
      await mutate(id, revision, previous => {
        if (previous && !previous.file.trashedAt) throw new Error("fileNotTrashed");
        return { result: undefined };
      });
    },
    close() { db.close(); },
  };
}
