import { withoutUnusedMedia, type Draft } from "@wonboard/document";

export class StorageConflict extends Error {
  constructor() {
    super("storageConflict");
  }
}
export function openStorage(
  name = "wonboard-writer-v1",
  onBlocked?: () => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("drafts", {
        keyPath: "document.documentId",
      });
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    // The request is still live; closing the blocking tab lets it succeed.
    request.onblocked = () => onBlocked?.();
  });
}
export function loadDrafts(db: IDBDatabase): Promise<Draft[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction("drafts").objectStore("drafts").getAll();
    request.onsuccess = () => {
      try {
        resolve(
          request.result.map(
            (
              stored: Draft & { blobs: Record<string, Blob | ArrayBuffer> },
            ) => ({
              document: stored.document,
              blobs: Object.fromEntries(
                Object.entries(stored.blobs).map(([id, value]) => [
                  id,
                  value instanceof Blob
                    ? value
                    : new Blob([value], {
                        type: stored.document.media[id]?.mime,
                      }),
                ]),
              ),
            }),
          ),
        );
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
export async function saveDraft(
  db: IDBDatabase,
  draft: Draft,
  expectedRevision: number,
): Promise<Draft> {
  // Undo history is session-only. Persist only images used by this snapshot,
  // leaving the live draft's originals intact for undo/redo.
  draft = withoutUnusedMedia(draft);
  for (const media of Object.values(draft.document.media)) {
    if (
      !(draft.blobs[media.id] instanceof Blob) ||
      draft.blobs[media.id].size !== media.size
    )
      return Promise.reject(new Error("missingMedia"));
  }
  const snapshot: Draft = {
    document: { ...draft.document, revision: expectedRevision + 1 },
    blobs: draft.blobs,
  };
  // Prepare binary data before opening the transaction: awaiting inside it can
  // auto-close IndexedDB transactions. ArrayBuffers also avoid WebKit Blob writes.
  const stored = {
    document: snapshot.document,
    blobs: Object.fromEntries(
      await Promise.all(
        Object.entries(snapshot.blobs).map(async ([id, blob]) => [
          id,
          await blob.arrayBuffer(),
        ]),
      ),
    ),
  };
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    const store = transaction.objectStore("drafts");
    let conflict = false;
    let writeError: unknown;
    const request = store.get(draft.document.documentId);
    request.onsuccess = () => {
      if ((request.result?.document.revision ?? 0) !== expectedRevision) {
        conflict = true;
        transaction.abort();
        return;
      }
      try {
        const write = store.put(stored);
        write.onerror = () => {
          writeError = write.error;
        };
      } catch (error) {
        writeError = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(snapshot);
    transaction.onabort = () =>
      reject(
        conflict
          ? new StorageConflict()
          : (writeError ?? transaction.error ?? new Error("storageFailed")),
      );
    transaction.onerror = () =>
      reject(writeError ?? transaction.error ?? new Error("storageFailed"));
  });
}
