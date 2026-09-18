import type { Draft } from "@wonboard/document";
import { validateDocument, withoutUnusedMedia } from "@wonboard/document";
import type { StoredDraft } from "../../desktop/src/bridge";
import type { DraftRepository } from "./draftRepository";
import { StorageConflict } from "./storage";

function hydrate(stored: StoredDraft): Draft {
  validateDocument(stored.document);
  return { document: stored.document, blobs: Object.fromEntries(Object.entries(stored.blobs)
    .map(([id, bytes]) => [id, new Blob([bytes], { type: stored.document.media[id]?.mime ?? stored.document.files?.[id]?.mime })])) };
}
export function openDesktopRepository(): DraftRepository {
  const storage = window.wonboardDesktop;
  if (!storage) throw new Error("storageFailed");
  const persisted = new WeakMap<Blob, string>();
  return {
    async list() { return (await storage.list()).map(hydrate); },
    async load(draft) {
      if (draft.document.revision === 0) return draft;
      const loaded = hydrate(await storage.load(draft.document.documentId));
      for (const media of [...Object.values(loaded.document.media), ...Object.values(loaded.document.files ?? {})]) persisted.set(loaded.blobs[media.id], media.sha256);
      return loaded;
    },
    async save(draft, revision) {
      const snapshot = withoutUnusedMedia(draft);
      const blobs: StoredDraft["blobs"] = {};
      for (const media of [...Object.values(snapshot.document.media), ...Object.values(snapshot.document.files ?? {})]) {
        const blob = snapshot.blobs[media.id];
        if (!blob || blob.size !== media.size) throw new Error("missingMedia");
        if (persisted.get(blob) !== media.sha256) blobs[media.id] = await blob.arrayBuffer();
      }
      try {
        const saved = await storage.save({ document: snapshot.document, blobs }, revision);
        validateDocument(saved.document);
        for (const media of [...Object.values(snapshot.document.media), ...Object.values(snapshot.document.files ?? {})]) persisted.set(snapshot.blobs[media.id], media.sha256);
        return { document: saved.document, blobs: snapshot.blobs };
      } catch (error) {
        if (error instanceof Error && error.message.endsWith("storageConflict")) throw new StorageConflict();
        throw error;
      }
    },
    async remove(id, revision) {
      try { await storage.remove(id, revision); }
      catch (error) {
        if (error instanceof Error && error.message.endsWith("storageConflict")) throw new StorageConflict();
        throw error;
      }
    },
    close() {},
  };
}
