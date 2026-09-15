import type { Draft } from "@wonboard/document";
import { bytesForStorage, toDraft } from "./storage";

export type RecoveryCopy = { documentId: string; baseRevision: number; cachedAt: string; token: string; draft: Draft };
const name = "wonboard-sites-recovery-v1";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("copies", { keyPath: "documentId" });
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("copies", mode); let result: T;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? new Error("storageFailed")); };
    try { action(tx.objectStore("copies"), value => { result = value; }); }
    catch (error) { tx.abort(); reject(error); }
  });
}
// Queue conversions as well as writes: a slow photo conversion must not replace a newer copy.
let pending: Promise<unknown> = Promise.resolve();
export function cacheRecovery(draft: Draft): Promise<string> {
  const token = crypto.randomUUID();
  const operation = pending.catch(() => {}).then(async () => {
    const blobs = Object.fromEntries(await Promise.all(Object.entries(draft.blobs).map(async ([id, blob]) => [id, await bytesForStorage(blob)])));
    await transaction<void>("readwrite", store => {
      store.put({ documentId: draft.document.documentId, baseRevision: draft.document.revision,
        cachedAt: new Date().toISOString(), token, draft: { document: draft.document, blobs } });
    });
    return token;
  });
  pending = operation;
  return operation;
}
export async function listRecovery(): Promise<RecoveryCopy[]> {
  return transaction<RecoveryCopy[]>("readonly", (store, done) => {
    const request = store.getAll();
    request.onsuccess = () => done(request.result.flatMap(copy => {
      try { return [{ ...copy, draft: toDraft(copy.draft) }]; } catch { return []; }
    }));
  });
}
export async function discardRecovery(documentId: string, token: string): Promise<void> {
  await pending.catch(() => {});
  return transaction<void>("readwrite", store => {
    const request = store.get(documentId);
    request.onsuccess = () => { if (request.result?.token === token) store.delete(documentId); };
  });
}
export async function clearRecovery(): Promise<void> {
  await pending.catch(() => {});
  return transaction<void>("readwrite", store => { store.clear(); });
}
export function recoveryMode(copy: RecoveryCopy, server?: Draft): "replace" | "new" {
  return server && server.document.trashedAt === undefined && server.document.revision === copy.baseRevision ? "replace" : "new";
}
