import { withoutUnusedMedia, validateDocument, sha256, type Draft } from "@wonboard/document";
import { loadDrafts, openStorage, saveDraft, StorageConflict } from "./storage";

export type StorageMode = "local" | "sites";
export type DraftRepository = {
  list(): Promise<Draft[]>;
  load(draft: Draft): Promise<Draft>;
  save(draft: Draft, revision: number): Promise<Draft>;
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
export async function openDraftRepository(mode: StorageMode, onBlocked: () => void): Promise<DraftRepository> {
  if (mode === "local") {
    const db = await openStorage(undefined, onBlocked);
    return { list: () => loadDrafts(db), load: async draft => draft,
      save: (draft, revision) => saveDraft(db, draft, revision), close: () => db.close() };
  }
  const uploaded = new Map<string, string>();
  return {
    async list() {
      const drafts = new Map<string, Draft>();
      let offset: number | null = 0;
      do {
        const page = await (await sitesRequest(`/api/documents?offset=${offset}`)).json();
        if (!Array.isArray(page.documents) || !(page.nextOffset === null ||
            (Number.isSafeInteger(page.nextOffset) && page.nextOffset > offset)))
          throw new Error("invalidDocument");
        for (const document of page.documents) {
          validateDocument(document);
          drafts.set(document.documentId, { document, blobs: {} });
        }
        offset = page.nextOffset;
      } while (offset !== null);
      return [...drafts.values()];
    },
    async load(draft) {
      if (draft.document.revision === 0) return draft;
      const document = await (await sitesRequest(`/api/documents/${draft.document.documentId}`)).json();
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
      return { document, blobs };
    },
    async save(draft, revision) {
      const snapshot = withoutUnusedMedia(draft);
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
    close() { uploaded.clear(); },
  };
}
