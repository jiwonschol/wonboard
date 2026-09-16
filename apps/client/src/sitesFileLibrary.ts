import { sha256 } from "@wonboard/document";
import { sitesRequest } from "./draftRepository";
import { prepareFile, type FileLibrary, type LibraryFile } from "./fileLibrary";

export function openSitesFileLibrary(): FileLibrary {
  const pending = new Map<string, string>();
  async function operation(path: string, method: string, body: Record<string, unknown>) {
    const key = JSON.stringify([path, method, body]), operationId = pending.get(key) ?? crypto.randomUUID();
    pending.set(key, operationId);
    const result = await (await sitesRequest(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, operationId }) })).json();
    pending.delete(key);
    return result;
  }
  return {
    sharing: {
      async list() { return (await sitesRequest("/api/file-shares")).json(); },
      async photos() { return (await sitesRequest("/api/distributed-photos")).json(); },
      async changePhoto(photo, action) { await sitesRequest(`/api/distributed-photos/${photo.id}`, { method: action === "delete" ? "DELETE" : "PATCH" }); },
      create(file, expiresAt) { return operation(`/api/files/${file.id}/share`, "POST", { revision: file.revision, expiresAt }); },
      change(share, action, expiresAt) { return operation(`/api/file-shares/${share.id}`, "PATCH", { revision: share.revision, action, expiresAt }); },
      async remove(share) { await operation(`/api/file-shares/${share.id}`, "DELETE", { revision: share.revision }); },
      async cleanup() { return operation("/api/files/cleanup", "POST", {}); },
    },
    async list() { return (await sitesRequest("/api/files")).json(); },
    async load(id) {
      const file: LibraryFile = await (await sitesRequest(`/api/files/${id}`)).json();
      const bytes = await (await sitesRequest(`/api/files/${id}/content`)).arrayBuffer();
      if (bytes.byteLength !== file.size || await sha256(bytes) !== file.sha256) throw new Error("missingMedia");
      return { file, blob: new Blob([bytes], { type: file.mime }) };
    },
    async upload(input) {
      const { file, bytes } = await prepareFile(input);
      return (await sitesRequest(`/api/files/${file.id}?name=${encodeURIComponent(file.originalName)}`, {
        method: "PUT", headers: { "Content-Type": file.mime }, body: bytes,
      })).json();
    },
    async change(id, revision, change) {
      return (await sitesRequest(`/api/files/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, ...change }) })).json();
    },
    async remove(id, revision) {
      await sitesRequest(`/api/files/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }) });
    },
    close() { pending.clear(); },
  };
}
