import { limits, sha256, type AttachmentFile } from "@wonboard/document";
import { HttpError, json, readBytes, readJson, validId } from "./http";
import type { SitesEnv } from "./types";
import { removeDistributedPhoto } from "./photoObjects";

type FileRow = { id: string; object_id: string; revision: number; body: string; filename: string; created_at: string; trashed_at: string | null; pinned: number; object_key: string; state: string; server_now: number };
type ShareRow = { id: string; file_id: string; token: string; revision: number; expires_at: number | null; revoked: number; operation_id: string; created_at: string; filename?: string; server_now: number };
const retention = 30 * 86400000;
const nowSql = "(CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))";
const unreferenced = `NOT EXISTS (SELECT 1 FROM library_files f WHERE f.object_id=file_objects.id AND f.pinned=1
  AND (f.trashed_at IS NULL OR strftime('%s',f.trashed_at) IS NULL OR
    (CAST(strftime('%s',f.trashed_at) AS INTEGER)*1000 + CAST(substr(strftime('%f',f.trashed_at),4,3) AS INTEGER)) + ${retention} > ${nowSql}))
  AND NOT EXISTS (SELECT 1 FROM library_files f JOIN document_file_refs r ON r.file_id=f.id WHERE f.object_id=file_objects.id)
  AND NOT EXISTS (SELECT 1 FROM library_files f JOIN file_shares s ON s.file_id=f.id WHERE f.object_id=file_objects.id)
  AND NOT EXISTS (SELECT 1 FROM publications p WHERE p.blob_key=file_objects.object_key)
  AND NOT EXISTS (SELECT 1 FROM snapshot_assets a JOIN snapshot_versions v ON v.id=a.version_id
    WHERE a.object_id=file_objects.id AND (v.retired_at IS NULL OR v.retired_at+300000>${nowSql}))`;
const nameOf = (value: unknown) => {
  if (typeof value !== "string" || !value.trim() || value.length > 1024 || /[\u0000-\u001f\u007f]/.test(value)) throw new HttpError(400, "invalidFileName");
  return value.trim();
};
function revisionOf(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new HttpError(400, "invalidDocument");
  return Number(value);
}
function publicFile(row: FileRow) {
  return { ...JSON.parse(row.body) as AttachmentFile, filename: row.filename, revision: row.revision, createdAt: row.created_at,
    ...(row.trashed_at ? { trashedAt: row.trashed_at } : {}) };
}
async function fileRow(env: SitesEnv, id: string) {
  return env.DB.prepare(`SELECT f.*, o.object_key, o.state, ${nowSql} AS server_now FROM library_files f JOIN file_objects o ON o.id=f.object_id WHERE f.id=?`)
    .bind(id).first<FileRow>();
}
function expires(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new HttpError(400, "invalidDocument");
  return Date.parse(value);
}
const shareView = (row: ShareRow) => ({ id: row.id, fileId: row.file_id, filename: row.filename, token: row.token, revision: row.revision,
  expiresAt: row.expires_at === null ? null : new Date(row.expires_at).toISOString(), revoked: Boolean(row.revoked),
  active: !row.revoked && (row.expires_at === null || row.expires_at > row.server_now),
  createdAt: row.created_at, url: `/shared/files/${row.token}` });
function filenameHeader(name: string) {
  let encoded = "file";
  try { encoded = encodeURIComponent(name.replace(/[\u0000-\u001f\u007f/\\]/g, "_")).replace(/'/g, "%27"); } catch {}
  return `attachment; filename="download"; filename*=UTF-8''${encoded}`;
}
async function download(request: Request, env: SitesEnv, file: FileRow) {
  const object = await env.MEDIA.get(file.object_key);
  if (!object || file.state !== "ready") throw new HttpError(404, "notFound");
  // Treat all originals as downloads. PNG/JPEG preview uses the existing validated
  // image pipeline; HTML/SVG never becomes same-origin executable content here.
  const headers = { "Content-Type": "application/octet-stream", "Content-Length": String(object.size),
    "Content-Disposition": filenameHeader(file.filename), "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'", "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "cross-origin" };
  if (request.method === "HEAD") { await object.body.cancel(); return new Response(null, { headers }); }
  return new Response(object.body, { headers });
}
export async function sharedFile(request: Request, env: SitesEnv, token: string) {
  const share = await env.DB.prepare(`SELECT * FROM file_shares WHERE token=? AND revoked=0 AND (expires_at IS NULL OR expires_at > ${nowSql})`)
    .bind(token).first<ShareRow>();
  if (!share) throw new HttpError(404, "notFound");
  const file = await fileRow(env, share.file_id);
  if (!file) throw new HttpError(404, "notFound");
  return download(request, env, file);
}

/** Caller has checked the owning document and its canonical retention deadline. */
export async function documentFile(request: Request, env: SitesEnv, documentId: string, fileId: string) {
  const ref = await env.DB.prepare("SELECT file_id FROM document_file_refs WHERE document_id=? AND file_id=?")
    .bind(documentId, fileId).first();
  const file = ref ? await fileRow(env, fileId) : null;
  if (!file) throw new HttpError(404, "missingFile");
  return download(request, env, file);
}

/** Called only after the existing owner, setup and mutating-Origin checks. */
export async function ownerFiles(request: Request, env: SitesEnv, path: string): Promise<Response | null> {
  if (path === "/api/distributed-photos" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT public_id AS id,document_id AS documentId,filename,published FROM publications ORDER BY document_id,media_id")
      .all<{ id: string; documentId: string; filename: string; published: number }>();
    return json(results.map(photo => ({ ...photo, published: Boolean(photo.published), url: `/media/${photo.id}` })));
  }
  const photo = /^\/api\/distributed-photos\/([^/]+)$/.exec(path);
  if (photo && validId(photo[1])) {
    if (request.method === "PATCH") {
      await env.DB.prepare("UPDATE publications SET published=0 WHERE public_id=?").bind(photo[1]).run();
      return json({ revoked: true });
    }
    if (request.method === "DELETE") {
      await removeDistributedPhoto(env, photo[1]);
      return json({ removed: true });
    }
  }
  if (path === "/api/files/cleanup" && request.method === "POST") {
    if (!env.MEDIA.delete) throw new HttpError(503, "cleanupUnavailable");
    const { results } = await env.DB.prepare(`SELECT id,object_key,state,size FROM file_objects WHERE retry_at <= ${nowSql} AND lease_until <= ${nowSql} AND ${unreferenced} ORDER BY retry_at,id LIMIT 20`)
      .all<{ id: string; object_key: string; state: string; size: number }>();
    let deleted = 0, failed = 0;
    for (const object of results) {
      // Claim and reference absence are one SQL decision. Document triggers and
      // share creation can only attach to ready objects, never a claimed one.
      const claim = await env.DB.prepare(`UPDATE file_objects SET state='deleting',attempts=attempts+1,retry_at=${nowSql}+60000
        WHERE id=? AND lease_until <= ${nowSql} AND retry_at <= ${nowSql}
        AND ${unreferenced}`)
        .bind(object.id).run();
      if (!claim.meta.changes) continue;
      try {
        await env.MEDIA.delete(object.object_key);
        await env.DB.prepare(`UPDATE file_objects SET state='deleted',retry_at=${nowSql}+60000 WHERE id=? AND state='deleting'`).bind(object.id).run();
        deleted++;
      } catch { failed++; }
    }
    // Keep tombstones: an upload already in flight may finish after lease expiry.
    // Later owner visits repeat idempotent deletion, never attach those bytes.
    return json({ deleted, failed, backgroundService: false });
  }
  if (path === "/api/files" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT f.*, o.object_key, o.state FROM library_files f JOIN file_objects o ON o.id=f.object_id WHERE f.pinned=1 ORDER BY f.created_at DESC, f.id").all<FileRow>();
    const clock = await env.DB.prepare(`SELECT ${nowSql} AS now`).first<{ now: number }>();
    if (!clock) throw new HttpError(503, "storageFailed");
    const response = json(results.map(publicFile));
    response.headers.set("X-Wonboard-Server-Now", String(clock.now));
    return response;
  }
  if (path === "/api/file-shares" && request.method === "GET") {
    const { results } = await env.DB.prepare(`SELECT s.*, f.filename, ${nowSql} AS server_now FROM file_shares s JOIN library_files f ON f.id=s.file_id ORDER BY s.created_at DESC, s.id`).all<ShareRow>();
    return json(results.map(shareView));
  }
  const match = /^\/api\/files\/([^/]+)(\/content|\/share)?$/.exec(path);
  if (match && validId(match[1])) {
    const id = match[1], file = await fileRow(env, id);
    if (!match[2] && request.method === "PUT") {
      const name = nameOf(new URL(request.url).searchParams.get("name"));
      const bytes = await readBytes(request, limits.fileBytes), hash = await sha256(bytes);
      if (file) {
        if (file.state !== "ready" || JSON.parse(file.body).sha256 !== hash || !file.pinned) throw new HttpError(409, "storageConflict");
        return json(publicFile(file));
      }
      const rawMime = request.headers.get("content-type") ?? "";
      const mime = /^[\w.+-]+\/[\w.+-]+$/.test(rawMime) && rawMime.length <= 128 ? rawMime : "application/octet-stream";
      const metadata: AttachmentFile = { id, originalName: name, mime, size: bytes.byteLength, sha256: hash };
      const objectId = crypto.randomUUID(), key = `files/${objectId}`, created = new Date().toISOString();
      await env.DB.prepare(`INSERT INTO file_objects(id,object_key,state,lease_until,size) VALUES (?,?,'uploading',${nowSql}+600000,?)`)
        .bind(objectId, key, bytes.byteLength).run();
      await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "application/octet-stream" } });
      const result = await env.DB.batch([
        env.DB.prepare(`UPDATE file_objects SET state='ready',lease_until=0 WHERE id=? AND state='uploading' AND lease_until > ${nowSql}`).bind(objectId),
        env.DB.prepare("INSERT INTO library_files(id,object_id,revision,body,filename,created_at) SELECT ?,id,1,?,?,? FROM file_objects WHERE id=? AND state='ready'")
          .bind(id, JSON.stringify(metadata), name, created, objectId),
      ]);
      if (result[1].meta.changes !== 1) throw new HttpError(409, "storageConflict");
      return json({ ...metadata, filename: name, revision: 1, createdAt: created }, 201);
    }
    if (!file) throw new HttpError(404, "missingFile");
    if (!match[2] && request.method === "DELETE") {
      const body = await readJson(request), revision = revisionOf(body?.revision);
      const result = await env.DB.prepare("UPDATE library_files SET pinned=0,revision=revision+1 WHERE id=? AND revision=? AND trashed_at IS NOT NULL")
        .bind(id, revision).run();
      if (!result.meta.changes) throw new HttpError(409, "storageConflict");
      return json({ removed: true });
    }
    if (file.state !== "ready") throw new HttpError(404, "missingFile");
    if (match[2] === "/content" && ["GET", "HEAD"].includes(request.method)) {
      if (!file.pinned || (file.trashed_at !== null && Date.parse(file.trashed_at) + retention <= file.server_now))
        throw new HttpError(410, "trashExpired");
      return download(request, env, file);
    }
    if (!match[2] && request.method === "GET") return json(publicFile(file));
    if (!match[2] && request.method === "PATCH") {
      const body = await readJson(request), revision = revisionOf(body?.revision);
      const name = body.filename === undefined ? file.filename : nameOf(body.filename);
      const trashedAt = body.trashedAt === null ? null : body.trashedAt === undefined ? file.trashed_at : file.trashed_at ?? new Date(file.server_now).toISOString();
      const deadline = file.trashed_at === null ? null : Date.parse(file.trashed_at) + retention;
      const result = await env.DB.prepare(`UPDATE library_files SET filename=?,trashed_at=?,revision=revision+1 WHERE id=? AND revision=? AND pinned=1 AND trashed_at IS ? AND (? IS NULL OR ? > ${nowSql})`)
        .bind(name, trashedAt, id, revision, file.trashed_at, deadline, deadline).run();
      if (!result.meta.changes) throw new HttpError(409, "storageConflict");
      return json(publicFile({ ...file, filename: name, trashed_at: trashedAt, revision: revision + 1 }));
    }
    if (match[2] === "/share" && request.method === "POST") {
      const body = await readJson(request), revision = revisionOf(body?.revision);
      const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
      const shareId = crypto.randomUUID(), operation = body.operationId;
      if (typeof operation !== "string" || !validId(operation)) throw new HttpError(400, "invalidDocument");
      const previous = await env.DB.prepare(`SELECT *, ${nowSql} AS server_now FROM file_shares WHERE file_id=? AND create_operation_id=?`).bind(id, operation).first<ShareRow>();
      if (previous) return json(shareView(previous));
      const expiry = expires(body.expiresAt), created = new Date().toISOString();
      const result = await env.DB.prepare("INSERT OR IGNORE INTO file_shares(id,file_id,token,revision,expires_at,operation_id,create_operation_id,created_at) SELECT ?,f.id,?,1,?,?,?,? FROM library_files f JOIN file_objects o ON o.id=f.object_id WHERE f.id=? AND f.revision=? AND f.pinned=1 AND f.trashed_at IS NULL AND o.state='ready'")
        .bind(shareId, token, expiry, operation, operation, created, id, revision).run();
      if (!result.meta.changes) {
        const repeated = await env.DB.prepare(`SELECT *, ${nowSql} AS server_now FROM file_shares WHERE file_id=? AND create_operation_id=?`).bind(id, operation).first<ShareRow>();
        if (repeated) return json(shareView(repeated));
        throw new HttpError(409, "storageConflict");
      }
      const createdShare = await env.DB.prepare(`SELECT *, ${nowSql} AS server_now FROM file_shares WHERE id=?`).bind(shareId).first<ShareRow>();
      if (!createdShare) throw new HttpError(409, "storageConflict");
      return json(shareView(createdShare), 201);
    }
  }
  const shareMatch = /^\/api\/file-shares\/([^/]+)$/.exec(path);
  if (shareMatch && validId(shareMatch[1]) && ["PATCH", "DELETE"].includes(request.method)) {
    const id = shareMatch[1], body = await readJson(request), revision = revisionOf(body?.revision);
    const previous = await env.DB.prepare(`SELECT *, ${nowSql} AS server_now FROM file_shares WHERE id=?`).bind(id).first<ShareRow>();
    if (!previous) {
      if (request.method === "DELETE") return json({ removed: true });
      throw new HttpError(404, "notFound");
    }
    if (request.method === "DELETE") {
      const result = await env.DB.prepare("DELETE FROM file_shares WHERE id=? AND revision=?").bind(id, revision).run();
      if (!result.meta.changes) throw new HttpError(409, "storageConflict");
      return json({ removed: true });
    }
    const operation = body.operationId;
    if (typeof operation !== "string" || !validId(operation)) throw new HttpError(400, "invalidDocument");
    if (previous.operation_id === operation) return json(shareView(previous));
    if (!["extend", "revoke", "reissue"].includes(body.action)) throw new HttpError(400, "invalidDocument");
    if (body.action === "extend" && previous.revoked) throw new HttpError(409, "storageConflict");
    const next = { ...previous, revision: revision + 1, operation_id: operation,
      token: body.action === "reissue" ? crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "") : previous.token,
      revoked: body.action === "revoke" ? 1 : body.action === "reissue" ? 0 : previous.revoked,
      expires_at: body.action === "revoke" ? previous.expires_at : expires(body.expiresAt) };
    const result = await env.DB.prepare("UPDATE file_shares SET token=?,revision=?,expires_at=?,revoked=?,operation_id=? WHERE id=? AND revision=?")
      .bind(next.token, next.revision, next.expires_at, next.revoked, operation, id, revision).run();
    if (!result.meta.changes) throw new HttpError(409, "storageConflict");
    return json(shareView(next));
  }
  return null;
}
