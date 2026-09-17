import { StorageConflict } from "./storage";
import { sha256 } from "@wonboard/document";
import { sitesRequest, openDraftRepository } from "./draftRepository";
import { prepareImageVariants } from "./publishing";
import { prepareFile, type FileLibrary, type LibraryFile } from "./fileLibrary";

export function openSitesFileLibrary(): FileLibrary {
  const pending = new Map<string, string>();
  let uploads = new WeakMap<File, Awaited<ReturnType<typeof prepareFile>>>();
  let serverNow = Number.NaN, receivedAt = performance.now();
  let clockVersion = 0;
  async function operation(path: string, method: string, body: Record<string, unknown>) {
    const key = JSON.stringify([path, method, body]), operationId = pending.get(key) ?? crypto.randomUUID();
    pending.set(key, operationId);
    const result = await (await sitesRequest(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, operationId }) })).json();
    pending.delete(key);
    return result;
  }
  return {
    now: () => serverNow + Math.max(0, performance.now() - receivedAt),
    invalidateClock() { clockVersion++; serverNow = Number.NaN; },
    sharing: {
      async backfill() { await operation("/api/files/backfill", "POST", { restart: true }); },
      async usage() { return (await sitesRequest("/api/files/usage")).json(); },
      async writings() { return (await sitesRequest("/api/snapshots")).json(); },
      async updateWriting(writing) {
        const repository = await openDraftRepository("sites", () => {});
        try {
          const document = await (await sitesRequest(`/api/documents/${writing.documentId}`)).json();
          const draft = await repository.load({ document, blobs: {} });
          const variants = await prepareImageVariants(draft);
          return operation(`/api/snapshots/${writing.id}/update`, "POST", { revision: writing.revision,
            documentId: document.documentId, documentRevision: document.revision, variants });
        } catch (error) {
          if (error instanceof Error && ["notFound", "trashExpired"].includes(error.message)) throw new Error("snapshotSourceUnavailable");
          throw error;
        } finally { repository.close(); }
      },
      changeWriting(writing, action, expiresAt) { return operation(`/api/snapshots/${writing.id}`, "PATCH", { revision: writing.revision, action, expiresAt }); },
      async removeWriting(writing) { await operation(`/api/snapshots/${writing.id}`, "DELETE", { revision: writing.revision }); },
      async list() { return (await sitesRequest("/api/file-shares")).json(); },
      async photos() { return (await sitesRequest("/api/distributed-photos")).json(); },
      async changePhoto(photo, action) { await sitesRequest(`/api/distributed-photos/${photo.id}`, { method: action === "delete" ? "DELETE" : "PATCH" }); },
      create(file, expiresAt) { return operation(`/api/files/${file.id}/share`, "POST", { revision: file.revision, expiresAt }); },
      change(share, action, expiresAt) { return operation(`/api/file-shares/${share.id}`, "PATCH", { revision: share.revision, action, expiresAt }); },
      async remove(share) { await operation(`/api/file-shares/${share.id}`, "DELETE", { revision: share.revision }); },
      async cleanup() { return operation("/api/files/cleanup", "POST", {}); },
    },
    async list() {
      const version = ++clockVersion;
      serverNow = Number.NaN;
      const response = await sitesRequest("/api/files");
      const header = response.headers.get("X-Wonboard-Server-Now"), clock = Number(header);
      const value = await response.json();
      if (header === null || !Number.isFinite(clock) || !Array.isArray(value)) throw new Error("invalidDocument");
      if (version === clockVersion) { serverNow = clock; receivedAt = performance.now(); }
      return value;
    },
    async load(id) {
      const file: LibraryFile = await (await sitesRequest(`/api/files/${id}`)).json();
      const bytes = await (await sitesRequest(`/api/files/${id}/content`)).arrayBuffer();
      if (bytes.byteLength !== file.size || await sha256(bytes) !== file.sha256) throw new Error("missingMedia");
      return { file, blob: new Blob([bytes], { type: file.mime }) };
    },
    async upload(input) {
      const prepared = uploads.get(input) ?? await prepareFile(input);
      uploads.set(input, prepared);
      const { file, bytes } = prepared;
      try {
        const result = await (await sitesRequest(`/api/files/${file.id}?name=${encodeURIComponent(file.originalName)}`, {
          method: "PUT", headers: { "Content-Type": file.mime }, body: bytes,
        })).json();
        uploads.delete(input);
        return result;
      } catch (error) {
        // A lost response may have committed this ID; a definitive conflict cannot.
        if (error instanceof StorageConflict) uploads.delete(input);
        throw error;
      }
    },
    async change(id, revision, change) {
      return (await sitesRequest(`/api/files/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, ...change }) })).json();
    },
    async remove(id, revision) {
      await sitesRequest(`/api/files/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }) });
    },
    close() { pending.clear(); uploads = new WeakMap(); },
  };
}
