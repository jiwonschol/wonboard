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
type StoredDraft = Draft & { blobs: Record<string, Blob | ArrayBuffer> };
function toDraft(stored: StoredDraft): Draft {
  // 변환이 던지는 것만 걸러서는 부족하다. `blobs` 가 멀쩡해도 `updatedAt` 이 없거나
  // 문자열이 아니면 목록을 정렬하는 쪽에서 던져, 결국 같은 자리로 돌아온다 —
  // 초기화가 빈 초안으로 물러나며 멀쩡한 문서까지 전부 가려진다.
  const document = stored?.document;
  if (
    !document ||
    typeof document !== "object" ||
    typeof document.documentId !== "string" ||
    typeof document.updatedAt !== "string" ||
    typeof document.media !== "object" ||
    document.media === null
  )
    throw new Error("malformedRecord");
  return {
    document: stored.document,
    blobs: Object.fromEntries(
      Object.entries(stored.blobs).map(([id, value]) => [
        id,
        value instanceof Blob
          ? value
          : new Blob([value], { type: stored.document.media[id]?.mime }),
      ]),
    ),
  };
}
export function loadDrafts(db: IDBDatabase): Promise<Draft[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction("drafts").objectStore("drafts").getAll();
    request.onsuccess = () => {
      // 레코드 하나가 깨졌다고 전체 목록을 버리지 않는다. 예전에는 변환이 한 번만
      // 던져도 loadDrafts 가 통째로 실패해 useDrafts 가 빈 초안을 열었고, 멀쩡한
      // 문서까지 전부 사라진 것처럼 보였다. 깨진 레코드만 격리하고 나머지는 연다.
      const drafts: Draft[] = [];
      for (const stored of request.result as StoredDraft[]) {
        try {
          drafts.push(toDraft(stored));
        } catch (error) {
          console.warn(
            "Wonboard skipped an unreadable stored draft",
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error),
          );
        }
      }
      resolve(drafts);
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
