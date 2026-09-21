import {
  attachmentFilename, attachmentNodes, plainText, validateDocument,
  DocumentError, type WriterDocument,
} from "@wonboard/document";
import { HttpError, json, readImage, readJson, validId } from "./http";
import type { SitesEnv } from "./types";
import { ownerFiles, sharedFile, documentFile } from "./files";
import { photoVariantKey, storePhotoVariant } from "./photoObjects";
import { ownerSnapshots, publicSnapshot } from "./snapshots";
import { tableImageId, tableNodes } from "@wonboard/renderer";

type StoredMedia = { id: string; hash: string; mime: string; size: number; width: number; height: number };
type Publication = { public_id: string; document_id: string; media_id: string;
  blob_key: string | null; mime: string | null; filename: string | null; published: number };
const originalKey = (id: string, hash: string) => `originals/${id}/${hash}`;
const TRASH_RETENTION_MS = 30 * 86400000;
// SQLite evaluates 'now' at statement execution, including the final conditional
// write. Integer milliseconds preserve the exact boundary without Julian rounding.
const databaseNow = `(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`;
const unexpiredWrite = `(json_extract(body, '$.trashedAt') IS ? AND (? IS NULL OR ? > ${databaseNow}))`;
function trashDeadline(trashedAt: string | undefined): number | null {
  return trashedAt === undefined ? null : Date.parse(trashedAt) + TRASH_RETENTION_MS;
}
function canonicalTrashTimestamp(timestamp: string | undefined, serverUpdatedAt: string, serverTimestamp?: unknown) {
  if (timestamp === undefined) return undefined;
  // Provenance is a database column that legacy JSON uploads could not populate.
  // Unmarked legacy rows may carry either a fast or a slow device timestamp.
  if (serverTimestamp === timestamp) return timestamp;
  const updated = Date.parse(serverUpdatedAt);
  if (!Number.isFinite(updated)) throw new HttpError(503, "storageFailed");
  return new Date(updated).toISOString();
}
type LoadedDocument = { document: WriterDocument; storedTimestamp: string | undefined; deadline: number | null };
function expiryBindings(stored: LoadedDocument) {
  return [stored.storedTimestamp ?? null, stored.deadline, stored.deadline];
}
async function loadStoredDocument(env: SitesEnv, id: string, missingStatus = 404): Promise<LoadedDocument> {
  const row = await env.DB.prepare(`SELECT body, updated_at, server_trashed_at, ${databaseNow} AS server_now FROM documents WHERE id = ?`)
    .bind(id).first<{ body: string; updated_at: string; server_trashed_at: string | null; server_now: number }>();
  if (!row) throw new HttpError(missingStatus, missingStatus === 409 ? "storageConflict" : "notFound");
  const { _sitesTrashTimestamp, ...document } = JSON.parse(row.body);
  validateDocument(document);
  const storedTimestamp = document.trashedAt;
  document.trashedAt = canonicalTrashTimestamp(storedTimestamp, row.updated_at, row.server_trashed_at);
  const deadline = trashDeadline(document.trashedAt);
  if (deadline !== null && row.server_now >= deadline) throw new HttpError(410, "trashExpired");
  return { document, storedTimestamp, deadline };
}
async function loadDocument(env: SitesEnv, id: string, missingStatus = 404) {
  return (await loadStoredDocument(env, id, missingStatus)).document;
}
function imageIds(document: WriterDocument) {
  return [...new Set(attachmentNodes(document.content)
    .filter(n => n.type === "media").map(n => String(n.attrs?.mediaId)))];
}
/** 게시판용으로 그림으로 바꾼 표. 사진과 같은 게시 기록에 표 내용의 해시로 올린다. */
async function tableIds(document: WriterDocument) {
  return [...new Set(await Promise.all(tableNodes(document.content)
    .map(node => tableImageId(node, document.defaultFont))))];
}
async function installation(env: SitesEnv) {
  return env.DB.prepare("SELECT owner_id, accepted_at FROM installation WHERE singleton = 1")
    .first<{ owner_id: string; accepted_at: string }>();
}
function displayName(request: Request) {
  const name = request.headers.get("oai-authenticated-user-full-name");
  if (name) {
    try { return request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8"
      ? decodeURIComponent(name) : name; } catch { /* Use the display email below. */ }
  }
  return request.headers.get("oai-authenticated-user-email") ?? "";
}
async function publicImage(request: Request, env: SitesEnv, id: string) {
  const row = await env.DB.prepare("SELECT * FROM publications WHERE public_id = ? AND published = 1")
    .bind(id).first<Publication>();
  if (!row?.blob_key || !row.mime) throw new HttpError(404, "notFound");
  const object = await env.MEDIA.get(row.blob_key);
  if (!object) throw new HttpError(404, "notFound");
  let filename = "image";
  try { filename = encodeURIComponent(row.filename ?? "image").replace(/'/g, "%27"); } catch {}
  // Never cache a visibility decision. Withdrawal is checked on every request.
  const headers = { "Content-Type": row.mime, "Content-Length": String(object.size),
    "Content-Disposition": `inline; filename*=UTF-8''${filename}`,
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin" };
  if (request.method === "HEAD") { await object.body.cancel(); return new Response(null, { headers }); }
  return new Response(object.body, { headers });
}

/** Run only behind Sites' trusted identity dispatcher, never a raw public Worker. */
export async function handleSitesRequest(request: Request, env: SitesEnv): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith("/shared/posts/")) {
      const response = await publicSnapshot(request, env, path);
      if (response) return response;
      throw new HttpError(404, "notFound");
    }
    const sharedMatch = /^\/shared\/files\/([a-zA-Z0-9_-]{1,80})$/.exec(path);
    if (sharedMatch) {
      if (!["GET", "HEAD"].includes(request.method)) throw new HttpError(405, "notFound");
      return await sharedFile(request, env, sharedMatch[1]);
    }
    const publicMatch = /^\/media\/([a-zA-Z0-9_-]{1,80})$/.exec(path);
    if (publicMatch && ["GET", "HEAD"].includes(request.method))
      return await publicImage(request, env, publicMatch[1]);
    if (!path.startsWith("/api/")) {
      // These are dispatcher-owned routes, not app-owned OAuth implementations.
      if (["/signin-with-chatgpt", "/signout-with-chatgpt", "/callback"].includes(path))
        throw new HttpError(404, "notFound");
      return env.ASSETS ? await env.ASSETS.fetch(request) : json({ error: "notFound" }, 404);
    }
    const userId = request.headers.get("oai-authenticated-user-id");
    const candidate = Boolean(env.WONBOARD_OWNER_ID && userId === env.WONBOARD_OWNER_ID);
    const installed = candidate ? await installation(env) : null;
    const owner = candidate && (!installed || installed.owner_id === userId);
    if (path === "/api/sites/session" && request.method === "GET")
      return json({ mode: "sites", authenticated: Boolean(userId), owner,
        configured: Boolean(env.WONBOARD_OWNER_ID),
        username: owner ? displayName(request) : "",
        setupRequired: owner ? !installed : false });
    // The installer reads the platform-confirmed ID while Site access is private.
    // This endpoint grants no ownership and makes no persistent change.
    if (path === "/api/sites/identity" && request.method === "GET") {
      if (!userId) throw new HttpError(401, "signInRequired");
      return json({ userId });
    }
    if (!owner) throw new HttpError(userId ? 403 : 401, "signInRequired");
    if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== url.origin)
      throw new HttpError(403, "forbidden");
    if (path === "/api/sites/setup" && request.method === "POST") {
      const body = await readJson(request);
      if (body?.accepted !== true || !["ko", "en"].includes(body.locale))
        throw new HttpError(400, "invalidDocument");
      await env.DB.prepare("INSERT INTO installation (singleton, owner_id, accepted_at, locale) VALUES (1, ?, ?, ?) ON CONFLICT(singleton) DO NOTHING")
        .bind(userId, new Date().toISOString(), body.locale).run();
      return json({ accepted: true });
    }
    if (!installed) throw new HttpError(403, "setupRequired");
    if (path === "/api/snapshots" || path.startsWith("/api/snapshots/")) {
      const response = await ownerSnapshots(request, env, path, id => loadStoredDocument(env, id));
      if (response) return response;
      throw new HttpError(404, "notFound");
    }
    const fileResponse = await ownerFiles(request, env, path);
    if (fileResponse) return fileResponse;
    if (path === "/api/documents" && request.method === "GET") {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, "invalidDocument");
      const { results } = await env.DB.prepare(`SELECT id, revision, title, locale, excerpt, updated_at, json_extract(body, '$.trashedAt') AS trashed_at, server_trashed_at FROM documents ORDER BY updated_at DESC, id LIMIT 100 OFFSET ?`)
        .bind(offset).all<{ id: string; revision: number; title: string; locale: "ko" | "en"; excerpt: string; updated_at: string; trashed_at: string | null; server_trashed_at: string | null }>();
      const clock = await env.DB.prepare(`SELECT ${databaseNow} AS server_now`).first<{ server_now: number }>();
      if (!clock) throw new HttpError(503, "storageFailed");
      return json({ documents: results.map(row => {
        const timestamp = canonicalTrashTimestamp(row.trashed_at ?? undefined, row.updated_at, row.server_trashed_at);
        const deadline = trashDeadline(timestamp);
        const expired = deadline !== null && clock.server_now >= deadline;
        // Old clients discover cleanup candidates through this same list. Keep
        // their envelope and revision, but never return expired writing content.
        const excerpt = expired ? "" : row.excerpt;
        return { schemaVersion: 1, documentId: row.id,
        revision: row.revision, title: expired ? "" : row.title, locale: row.locale, updatedAt: row.updated_at,
        ...(timestamp === undefined ? {} : { trashedAt: timestamp }),
        media: {}, content: { type: "doc", content: [{ type: "paragraph", content: excerpt ? [{ type: "text", text: excerpt }] : [] }] } };
      }),
        serverNow: clock.server_now, nextOffset: results.length === 100 ? offset + 100 : null });
    }
    const mediaMatch = /^\/api\/media\/([^/]+)$/.exec(path);
    if (mediaMatch && validId(mediaMatch[1])) {
      const id = mediaMatch[1];
      const existing = await env.DB.prepare("SELECT * FROM media WHERE id = ?").bind(id).first<StoredMedia>();
      if (request.method === "GET") {
        const object = existing && await env.MEDIA.get(originalKey(id, existing.hash));
        if (!object || !existing) throw new HttpError(404, "missingMedia");
        return new Response(object.body, { headers: { "Content-Type": existing.mime,
          "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-origin" } });
      }
      if (request.method === "PUT") {
        const image = await readImage(request);
        if (existing && existing.hash !== image.hash) throw new HttpError(409, "mediaConflict");
        if (!existing) {
          await env.MEDIA.put(originalKey(id, image.hash), image.bytes, { httpMetadata: { contentType: image.mime } });
          await env.DB.prepare("INSERT INTO media (id, hash, mime, size, width, height) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
            .bind(id, image.hash, image.mime, image.size, image.width, image.height).run();
          const winner = await env.DB.prepare("SELECT hash FROM media WHERE id = ?").bind(id).first<{ hash: string }>();
          if (winner?.hash !== image.hash) throw new HttpError(409, "mediaConflict");
        }
        return json({ hash: image.hash });
      }
    }
    const docMatch = /^\/api\/documents\/([^/]+)(?:\/(.*))?$/.exec(path);
    if (!docMatch || !validId(docMatch[1])) throw new HttpError(404, "notFound");
    const [, id, action] = docMatch;
    const documentFileId = /^files\/([^/]+)$/.exec(action ?? "");
    if (documentFileId && validId(documentFileId[1]) && ["GET", "HEAD"].includes(request.method)) {
      await loadDocument(env, id);
      return documentFile(request, env, id, documentFileId[1]);
    }
    if (!action && request.method === "GET") return json(await loadDocument(env, id));
    if (!action && request.method === "DELETE") {
      const body = await readJson(request);
      if (!Number.isSafeInteger(body?.revision) || body.revision < 0 ||
          (body.deletionIntent !== undefined && !["manual", "expired"].includes(body.deletionIntent)) ||
          (body.withdrawPublications !== undefined && typeof body.withdrawPublications !== "boolean"))
        throw new HttpError(400, "invalidDocument");
      const row = await env.DB.prepare("SELECT json_extract(body, '$.trashedAt') AS trashed_at, server_trashed_at, updated_at FROM documents WHERE id = ?")
        .bind(id).first<{ trashed_at: string | null; server_trashed_at: string | null; updated_at: string }>();
      if (!row) return json({ removed: true });
      const timestamp = typeof row.trashed_at === "string" ? row.trashed_at : undefined;
      const parsedDeadline = trashDeadline(canonicalTrashTimestamp(timestamp, row.updated_at, row.server_trashed_at));
      const deadline = parsedDeadline !== null && Number.isFinite(parsedDeadline) ? parsedDeadline : null;
      // No intent means an old client: its auto-cleanup and manual delete have
      // identical wire shapes. Preserve data unless the server deadline passed.
      const deletionGuard = `(? = 1 OR (json_extract(body, '$.trashedAt') IS ? AND ? IS NOT NULL AND ? <= ${databaseNow}))`;
      const guard = [body.deletionIntent === "manual" ? 1 : 0, timestamp ?? null, deadline, deadline];
      // Draft lifetime never controls already distributed copies, including
      // requests from old clients that still send withdrawPublications=true.
      const statements = [env.DB.prepare(`DELETE FROM documents WHERE id = ? AND revision = ? AND ${deletionGuard}`)
        .bind(id, body.revision, ...guard)];
      const result = await env.DB.batch(statements);
      if (result[0].meta.changes !== 1) {
        const remaining = await env.DB.prepare("SELECT revision FROM documents WHERE id = ?").bind(id).first();
        if (remaining) throw new HttpError(409, "storageConflict");
      }
      return json({ removed: true });
    }
    if (!action && request.method === "PUT") {
      const document: unknown = await readJson(request);
      validateDocument(document);
      // Internal storage metadata is neither accepted from nor returned to clients.
      delete (document as WriterDocument & { _sitesTrashTimestamp?: unknown })._sitesTrashTimestamp;
      if (document.documentId !== id) throw new HttpError(400, "invalidDocument");
      const stored = document.revision === 0 ? null : await loadStoredDocument(env, id, 409);
      if (stored?.document.trashedAt !== undefined && document.trashedAt !== undefined && document.trashedAt !== stored.document.trashedAt)
        throw new HttpError(409, "storageConflict");
      for (const media of Object.values(document.media)) {
        const stored = await env.DB.prepare("SELECT * FROM media WHERE id = ?").bind(media.id).first<StoredMedia>();
        if (!stored || stored.hash !== media.sha256 || stored.size !== media.size ||
            stored.mime !== media.mime || stored.width !== media.width || stored.height !== media.height)
          throw new HttpError(400, "missingMedia");
      }
      const clock = await env.DB.prepare(`SELECT ${databaseNow} AS server_now`).first<{ server_now: number }>();
      if (!clock) throw new HttpError(503, "storageFailed");
      const saved = { ...document, revision: document.revision + 1, updatedAt: new Date(clock.server_now).toISOString() };
      if (document.trashedAt !== undefined && stored?.document.trashedAt === undefined) {
        // The client expresses intent to trash, never authority over retention.
        // Use the same database clock as the final expiry predicate, including
        // revision-zero imports. Return this canonical value to old clients too.
        saved.trashedAt = saved.updatedAt;
      }
      const values = [saved.revision, saved.title, saved.locale, plainText(saved.content).slice(0, 300), JSON.stringify(saved), saved.updatedAt, saved.trashedAt ?? null];
      const result = document.revision === 0
        ? await env.DB.prepare("INSERT INTO documents (revision, title, locale, excerpt, body, updated_at, server_trashed_at, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
          .bind(...values, id).run()
        : await env.DB.prepare(`UPDATE documents SET revision = ?, title = ?, locale = ?, excerpt = ?, body = ?, updated_at = ?, server_trashed_at = ? WHERE id = ? AND revision = ? AND ${unexpiredWrite}`)
          .bind(...values, id, document.revision, ...expiryBindings(stored!)).run();
      if (result.meta.changes !== 1) throw new HttpError(409, "storageConflict");
      return json(saved);
    }
    const variant = /^media\/([^/]+)\/variant$/.exec(action ?? "");
    if (variant && validId(variant[1]) && request.method === "PUT") {
      const document = await loadDocument(env, id);
      if (!imageIds(document).includes(variant[1]) && !(await tableIds(document)).includes(variant[1]))
        throw new HttpError(400, "missingMedia");
      const image = await readImage(request);
      await storePhotoVariant(env, id, variant[1], image);
      return json({ hash: image.hash });
    }
    if (action === "publications" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT media_id, public_id, published FROM publications WHERE document_id = ?")
        .bind(id).all<Pick<Publication, "media_id" | "public_id" | "published">>();
      return json(results.map(row => ({ mediaId: row.media_id, publicId: row.public_id,
        published: row.published === 1, url: new URL(`/media/${row.public_id}`, url.origin).href })));
    }
    if (action === "publications" && request.method === "DELETE") {
      await env.DB.prepare("UPDATE publications SET published = 0 WHERE document_id = ?").bind(id).run();
      return json({ withdrawn: true });
    }
    if (action === "publish" && request.method === "POST") {
      const body = await readJson(request);
      const stored = await loadStoredDocument(env, id), document = stored.document;
      if (body?.revision !== document.revision) throw new HttpError(409, "storageConflict");
      const ids = imageIds(document);
      if (!body.variants || typeof body.variants !== "object" ||
          Object.keys(body.variants).length !== ids.length) throw new HttpError(400, "missingMedia");
      const publications: string[][] = [];
      for (const mediaId of ids) {
        const hash = body.variants[mediaId];
        if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) throw new HttpError(400, "invalidImage");
        const key = await photoVariantKey(env, id, mediaId, hash);
        const object = await env.MEDIA.get(key);
        const mime = object?.httpMetadata?.contentType;
        if (object) await object.body.cancel();
        if (!object || !["image/png", "image/jpeg"].includes(mime ?? "")) throw new HttpError(400, "missingMedia");
        publications.push([crypto.randomUUID(), id, mediaId, key, mime!, attachmentFilename(document, mediaId)]);
      }
      // 표를 그림으로 내보낼 때만 온다. 값이 "existing"이면 이미 게시한 같은 표의 그림을 다시 쓴다.
      const tables = body.tables === undefined ? [] : await tableIds(document);
      if (body.tables !== undefined && (!body.tables || typeof body.tables !== "object" ||
          Object.keys(body.tables).length !== tables.length)) throw new HttpError(400, "missingMedia");
      for (const [index, tableId] of tables.entries()) {
        const hash = body.tables[tableId];
        let key: string | null = null;
        if (hash === "existing") {
          const row = await env.DB.prepare("SELECT blob_key, mime FROM publications WHERE document_id = ? AND media_id = ?")
            .bind(id, tableId).first<Pick<Publication, "blob_key" | "mime">>();
          if (row?.mime === "image/png") key = row.blob_key;
        } else if (typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash)) {
          key = await photoVariantKey(env, id, tableId, hash);
          const object = await env.MEDIA.get(key);
          if (object) await object.body.cancel();
          if (object?.httpMetadata?.contentType !== "image/png") key = null;
        }
        if (!key) throw new HttpError(400, "missingMedia");
        publications.push([crypto.randomUUID(), id, tableId, key, "image/png", `table-${index + 1}.png`]);
      }
      ids.push(...tables);
      // All photos share a single SQLite statement clock. Separate statements
      // could straddle expiry and commit only part of a document's publication.
      if (publications.length) {
        const statement = env.DB.prepare(`INSERT INTO publications
          (public_id, document_id, media_id, blob_key, mime, filename, published)
          SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'),
            json_extract(value, '$[2]'), json_extract(value, '$[3]'),
            json_extract(value, '$[4]'), json_extract(value, '$[5]'), 1
          FROM json_each(?)
          WHERE EXISTS (SELECT 1 FROM documents WHERE id = ? AND revision = ? AND ${unexpiredWrite})
          ON CONFLICT(document_id, media_id) DO UPDATE SET blob_key = excluded.blob_key,
          mime = excluded.mime, filename = excluded.filename, published = 1`)
          .bind(JSON.stringify(publications), id, document.revision, ...expiryBindings(stored));
        const committed = await env.DB.batch([statement]);
        if (committed[0].meta.changes !== publications.length) throw new HttpError(409, "storageConflict");
      } else if ((await loadDocument(env, id)).revision !== document.revision) throw new HttpError(409, "storageConflict");
      const { results } = await env.DB.prepare("SELECT media_id, public_id FROM publications WHERE document_id = ? AND published = 1")
        .bind(id).all<Pick<Publication, "media_id" | "public_id">>();
      return json({ urls: Object.fromEntries(results.filter(row => ids.includes(row.media_id))
        .map(row => [row.media_id, new URL(`/media/${row.public_id}`, url.origin).href])) });
    }
    throw new HttpError(404, "notFound");
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof DocumentError) return json({ error: error.message }, 400);
    // Do not return database statements, identity headers, or storage keys.
    return json({ error: "storageFailed" }, 503);
  }
}

export default { fetch: handleSitesRequest };
