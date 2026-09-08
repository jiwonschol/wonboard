import {
  attachmentFilename, attachmentNodes, plainText, validateDocument,
  DocumentError, type WriterDocument,
} from "@wonboard/document";
import { HttpError, json, readImage, readJson, validId } from "./http";
import type { SitesEnv } from "./types";

type StoredMedia = { id: string; hash: string; mime: string; size: number; width: number; height: number };
type Publication = { public_id: string; document_id: string; media_id: string;
  blob_key: string | null; mime: string | null; filename: string | null; published: number };
const originalKey = (id: string, hash: string) => `originals/${id}/${hash}`;
const variantKey = (doc: string, id: string, hash: string) => `publications/${doc}/${id}/${hash}`;

async function loadDocument(env: SitesEnv, id: string) {
  const row = await env.DB.prepare("SELECT body FROM documents WHERE id = ?").bind(id).first<{ body: string }>();
  if (!row) throw new HttpError(404, "notFound");
  const document: unknown = JSON.parse(row.body);
  validateDocument(document);
  return document;
}
function imageIds(document: WriterDocument) {
  return [...new Set(attachmentNodes(document.content)
    .filter(n => n.type === "media").map(n => String(n.attrs?.mediaId)))];
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
    if (path === "/api/documents" && request.method === "GET") {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, "invalidDocument");
      const { results } = await env.DB.prepare("SELECT id, revision, title, locale, excerpt, updated_at FROM documents ORDER BY updated_at DESC, id LIMIT 100 OFFSET ?")
        .bind(offset).all<{ id: string; revision: number; title: string; locale: "ko" | "en"; excerpt: string; updated_at: string }>();
      return json({ documents: results.map(row => ({ schemaVersion: 1, documentId: row.id,
        revision: row.revision, title: row.title, locale: row.locale, updatedAt: row.updated_at,
        media: {}, content: { type: "doc", content: [{ type: "paragraph", content: row.excerpt ? [{ type: "text", text: row.excerpt }] : [] }] } })),
        nextOffset: results.length === 100 ? offset + 100 : null });
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
    if (!action && request.method === "GET") return json(await loadDocument(env, id));
    if (!action && request.method === "PUT") {
      const document: unknown = await readJson(request);
      validateDocument(document);
      if (document.documentId !== id) throw new HttpError(400, "invalidDocument");
      for (const media of Object.values(document.media)) {
        const stored = await env.DB.prepare("SELECT * FROM media WHERE id = ?").bind(media.id).first<StoredMedia>();
        if (!stored || stored.hash !== media.sha256 || stored.size !== media.size ||
            stored.mime !== media.mime || stored.width !== media.width || stored.height !== media.height)
          throw new HttpError(400, "missingMedia");
      }
      const saved = { ...document, revision: document.revision + 1, updatedAt: new Date().toISOString() };
      const values = [saved.revision, saved.title, saved.locale, plainText(saved.content).slice(0, 300), JSON.stringify(saved), saved.updatedAt];
      const result = document.revision === 0
        ? await env.DB.prepare("INSERT INTO documents (revision, title, locale, excerpt, body, updated_at, id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
          .bind(...values, id).run()
        : await env.DB.prepare("UPDATE documents SET revision = ?, title = ?, locale = ?, excerpt = ?, body = ?, updated_at = ? WHERE id = ? AND revision = ?")
          .bind(...values, id, document.revision).run();
      if (result.meta.changes !== 1) throw new HttpError(409, "storageConflict");
      return json(saved);
    }
    const variant = /^media\/([^/]+)\/variant$/.exec(action ?? "");
    if (variant && validId(variant[1]) && request.method === "PUT") {
      const document = await loadDocument(env, id);
      if (!imageIds(document).includes(variant[1])) throw new HttpError(400, "missingMedia");
      const image = await readImage(request);
      await env.MEDIA.put(variantKey(id, variant[1], image.hash), image.bytes, { httpMetadata: { contentType: image.mime } });
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
      const document = await loadDocument(env, id);
      if (body?.revision !== document.revision) throw new HttpError(409, "storageConflict");
      const ids = imageIds(document);
      if (!body.variants || typeof body.variants !== "object" ||
          Object.keys(body.variants).length !== ids.length) throw new HttpError(400, "missingMedia");
      const statements = [];
      for (const mediaId of ids) {
        const hash = body.variants[mediaId];
        if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) throw new HttpError(400, "invalidImage");
        const key = variantKey(id, mediaId, hash);
        const object = await env.MEDIA.get(key);
        const mime = object?.httpMetadata?.contentType;
        if (object) await object.body.cancel();
        if (!object || !["image/png", "image/jpeg"].includes(mime ?? "")) throw new HttpError(400, "missingMedia");
        statements.push(env.DB.prepare(`INSERT INTO publications
          (public_id, document_id, media_id, blob_key, mime, filename, published)
          SELECT ?, ?, ?, ?, ?, ?, 1 WHERE EXISTS (SELECT 1 FROM documents WHERE id = ? AND revision = ?)
          ON CONFLICT(document_id, media_id) DO UPDATE SET blob_key = excluded.blob_key,
          mime = excluded.mime, filename = excluded.filename, published = 1`)
          .bind(crypto.randomUUID(), id, mediaId, key, mime, attachmentFilename(document, mediaId), id, document.revision));
      }
      if (statements.length) await env.DB.batch(statements);
      // Return only this committed snapshot; stale writers must explicitly retry.
      if ((await loadDocument(env, id)).revision !== document.revision) throw new HttpError(409, "storageConflict");
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
