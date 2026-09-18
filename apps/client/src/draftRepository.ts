import { withoutUnusedMedia, validateDocument, sha256, type Draft } from "@wonboard/document";
import { loadDrafts, openStorage, saveDraft, removeDraft, StorageConflict } from "./storage";
import { openDesktopRepository } from "./desktopRepository";

export type StorageMode = "local" | "sites" | "desktop";
export type DraftRepository = {
  list(): Promise<Draft[]>;
  load(draft: Draft): Promise<Draft>;
  save(draft: Draft, revision: number): Promise<Draft>;
  remove(documentId: string, revision: number, options?: { withdrawPublications?: boolean; deletionIntent?: "manual" | "expired" }): Promise<void>;
  now?(): number;
  invalidateClock?(): void;
  close(): void;
};
export async function sitesRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store",
    signal: AbortSignal.timeout(60_000), ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 409 && body.error === "storageConflict") throw new StorageConflict();
    throw new Error(typeof body.error === "string" ? body.error : "storageFailed");
  }
  return response;
}
export async function openDraftRepository(mode: StorageMode, onBlocked: () => void, onDisconnected?: () => void): Promise<DraftRepository> {
  if (mode === "desktop") return openDesktopRepository();
  if (mode === "local") {
    const db = await openStorage(undefined, onBlocked, onDisconnected);
    return { list: () => loadDrafts(db), load: async draft => draft,
      save: (draft, revision) => saveDraft(db, draft, revision),
      remove: (id, revision) => removeDraft(db, id, revision), close: () => db.close() };
  }
  const uploaded = new Map<string, string>();
  let serverNow = Number.NaN, receivedAt = performance.now();
  return {
    now: () => serverNow + Math.max(0, performance.now() - receivedAt),
    invalidateClock() { serverNow = Number.NaN; },
    async list() {
      serverNow = Number.NaN;
      let nextServerNow = Number.NaN, nextReceivedAt = performance.now();
      const drafts = new Map<string, Draft>();
      let offset: number | null = 0;
      do {
        const page = await (await sitesRequest(`/api/documents?offset=${offset}`)).json();
        if (!Number.isFinite(page.serverNow)) throw new Error("invalidDocument");
        nextServerNow = page.serverNow; nextReceivedAt = performance.now();
        if (!Array.isArray(page.documents) || !(page.nextOffset === null ||
            (Number.isSafeInteger(page.nextOffset) && page.nextOffset > offset)))
          throw new Error("invalidDocument");
        for (const document of page.documents) {
          validateDocument(document);
          drafts.set(document.documentId, { document, blobs: {} });
        }
        offset = page.nextOffset;
      } while (offset !== null);
      serverNow = nextServerNow; receivedAt = nextReceivedAt;
      return [...drafts.values()];
    },
    async load(draft) {
      if (draft.document.revision === 0) return draft;
      const stored = await (await sitesRequest(`/api/documents/${draft.document.documentId}`)).json();
      const document = withoutUnusedMedia({ document: stored, blobs: {} }).document;
      validateDocument(document);
      const blobs: Draft["blobs"] = {};
      // Bounded, sequential loading avoids materializing the entire library's photos.
      for (const media of Object.values(document.media)) {
        const response = await sitesRequest(`/api/media/${media.id}`);
        const blob = await response.blob();
        if (blob.size !== media.size || blob.type !== media.mime ||
            await sha256(await blob.arrayBuffer()) !== media.sha256) throw new Error("missingMedia");
        blobs[media.id] = blob;
        uploaded.set(media.id, media.sha256);
      }
      for (const file of Object.values(document.files ?? {})) {
        const bytes = await (await sitesRequest(`/api/documents/${document.documentId}/files/${file.id}`)).arrayBuffer();
        if (bytes.byteLength !== file.size || await sha256(bytes) !== file.sha256) throw new Error("missingMedia");
        blobs[file.id] = new Blob([bytes], { type: file.mime });
        uploaded.set(file.id, file.sha256);
      }
      // A new editing session has no history for the previous session's unused files.
      return withoutUnusedMedia({ document, blobs });
    },
    async save(draft, revision) {
      const snapshot = withoutUnusedMedia(draft);
      // The live draft retains removed file refs for Undo. Keep their server
      // references too, so library cleanup cannot delete bytes while Undo can
      // restore them. Opening a new session prunes them before its next save.
      if (draft.document.files) {
        snapshot.document.files = draft.document.files;
        for (const id of Object.keys(draft.document.files)) {
          if (draft.blobs[id]) snapshot.blobs[id] = draft.blobs[id];
        }
      }
      for (const file of Object.values(snapshot.document.files ?? {})) {
        const blob = snapshot.blobs[file.id];
        if (!blob || blob.size !== file.size) throw new Error("missingMedia");
        if (uploaded.get(file.id) === file.sha256) continue;
        const saved = await (await sitesRequest(`/api/files/${file.id}?name=${encodeURIComponent(file.originalName)}`, {
          method: "PUT", headers: { "Content-Type": file.mime }, body: blob,
        })).json();
        if (saved.sha256 !== file.sha256) throw new Error("missingMedia");
        uploaded.set(file.id, file.sha256);
      }
      for (const media of Object.values(snapshot.document.media)) {
        const blob = snapshot.blobs[media.id];
        if (!blob || blob.size !== media.size) throw new Error("missingMedia");
        if (uploaded.get(media.id) === media.sha256) continue;
        const result = await (await sitesRequest(`/api/media/${media.id}`, {
          method: "PUT", headers: { "Content-Type": media.mime }, body: blob,
        })).json();
        if (result.hash !== media.sha256) throw new Error("missingMedia");
        uploaded.set(media.id, media.sha256);
      }
      const document = await (await sitesRequest(`/api/documents/${snapshot.document.documentId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...snapshot.document, revision }),
      })).json();
      validateDocument(document);
      return { document, blobs: snapshot.blobs };
    },
    async remove(id, revision, options) {
      await sitesRequest(`/api/documents/${id}`, { method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, withdrawPublications: options?.withdrawPublications ?? false, deletionIntent: options?.deletionIntent }) });
    },
    close() { uploaded.clear(); },
  };
}
