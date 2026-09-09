import type { Draft } from "@wonboard/document";
import { validateDocument, withoutUnusedMedia } from "@wonboard/document";
import type { StoredDraft } from "../../desktop/src/bridge";
import type { DraftRepository } from "./draftRepository";
import { StorageConflict } from "./storage";

function hydrate(stored: StoredDraft): Draft {
  validateDocument(stored.document);
  return { document: stored.document, blobs: Object.fromEntries(Object.entries(stored.blobs)
    .map(([id, bytes]) => [id, new Blob([bytes], { type: stored.document.media[id].mime })])) };
}
export function openDesktopRepository(): DraftRepository {
  const storage = window.wonboardDesktop;
  if (!storage) throw new Error("storageFailed");
  return {
    async list() { return (await storage.list()).map(hydrate); },
    async load(draft) { return draft.document.revision === 0 ? draft : hydrate(await storage.load(draft.document.documentId)); },
    async save(draft, revision) {
      const snapshot = withoutUnusedMedia(draft);
      const blobs: StoredDraft["blobs"] = {};
      for (const media of Object.values(snapshot.document.media)) {
        const blob = snapshot.blobs[media.id];
        if (!blob || blob.size !== media.size) throw new Error("missingMedia");
        blobs[media.id] = await blob.arrayBuffer();
      }
      try {
        const saved = await storage.save({ document: snapshot.document, blobs }, revision);
        validateDocument(saved.document);
        return { document: saved.document, blobs: snapshot.blobs };
      } catch (error) {
        if (error instanceof Error && error.message.endsWith("storageConflict")) throw new StorageConflict();
        throw error;
      }
    },
    close() {},
  };
}
