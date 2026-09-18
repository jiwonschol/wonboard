import { renderToStaticMarkup } from "react-dom/server";
import { PortableDocumentBody } from "@wonboard/renderer";
import { attachmentNodes, referencedFileIds, type WriterDocument } from "@wonboard/document";
import { HttpError, json, readJson, validId } from "./http";
import { photoVariantKey } from "./photoObjects";
import type { SitesEnv } from "./types";

const nowSql = "(CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))";
type Snapshot = { id: string; document_id: string; title: string; token: string; current_version: string;
  revision: number; expires_at: number | null; revoked: number; operation_id: string; server_now: number };
type Source = { document: WriterDocument; storedTimestamp?: string; deadline: number | null };
type LoadSource = (id: string) => Promise<Source>;
const token = () => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
const activeSql = `(revoked=0 AND (expires_at IS NULL OR expires_at>${nowSql}))`;
const view = (row: Snapshot) => ({ id: row.id, documentId: row.document_id, title: row.title, token: row.token,
  version: row.current_version, revision: row.revision, expiresAt: row.expires_at === null ? null : new Date(row.expires_at).toISOString(),
  revoked: Boolean(row.revoked), active: !row.revoked && (row.expires_at === null || row.expires_at > row.server_now),
  url: `/shared/posts/${row.token}/` });
const row = (env: SitesEnv, id: string) => env.DB.prepare(`SELECT *,${nowSql} AS server_now FROM snapshots WHERE id=?`).bind(id).first<Snapshot>();
function expires(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new HttpError(400, "invalidDocument");
  return Date.parse(value);
}
function operation(value: unknown): string {
  if (typeof value !== "string" || !validId(value)) throw new HttpError(400, "invalidDocument");
  return value;
}
const pageHeaders = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; script-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };

async function assetResponse(request: Request, env: SitesEnv, snapshot: Snapshot, version: string, mediaId: string, privateView: boolean) {
  const asset = await env.DB.prepare(`SELECT o.object_key,a.mime FROM snapshot_assets a
    JOIN snapshot_versions v ON v.id=a.version_id JOIN file_objects o ON o.id=a.object_id
    WHERE v.snapshot_id=? AND v.id=? AND a.media_id=? AND o.state='ready'
    AND (v.id=? OR (?=0 AND v.retired_at IS NOT NULL AND v.retired_at+300000>${nowSql}))`)
    .bind(snapshot.id, version, mediaId, snapshot.current_version, privateView ? 1 : 0).first<{ object_key: string; mime: string }>();
  if (!asset) throw new HttpError(404, "notFound");
  const object = await env.MEDIA.get(asset.object_key);
  if (!object) throw new HttpError(404, "notFound");
  const headers = { "Content-Type": asset.mime, "Content-Length": String(object.size), "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };
  if (request.method === "HEAD") { await object.body.cancel(); return new Response(null, { headers }); }
  return new Response(object.body, { headers });
}
async function pageResponse(request: Request, env: SitesEnv, snapshot: Snapshot) {
  const version = await env.DB.prepare("SELECT html FROM snapshot_versions WHERE id=? AND snapshot_id=?")
    .bind(snapshot.current_version, snapshot.id).first<{ html: string }>();
  if (!version) throw new HttpError(404, "notFound");
  return new Response(request.method === "HEAD" ? null : version.html, { headers: pageHeaders });
}

export async function publicSnapshot(request: Request, env: SitesEnv, path: string): Promise<Response | null> {
  const match = /^\/shared\/posts\/([a-zA-Z0-9_-]{1,80})(?:\/(?:assets\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+))?)?$/.exec(path);
  if (!match) return null;
  if (!["GET", "HEAD"].includes(request.method)) throw new HttpError(405, "notFound");
  const snapshot = await env.DB.prepare(`SELECT *,${nowSql} AS server_now FROM snapshots WHERE token=? AND ${activeSql}`)
    .bind(match[1]).first<Snapshot>();
  if (!snapshot) throw new HttpError(404, "notFound");
  if (match[2]) return assetResponse(request, env, snapshot, match[2], match[3], false);
  if (!path.endsWith("/")) return new Response(null, { status: 308, headers: { Location: `${path}/`, "Cache-Control": "no-store" } });
  return pageResponse(request, env, snapshot);
}

/** Only the existing owner/setup/origin gate can reach these routes. */
export async function ownerSnapshots(request: Request, env: SitesEnv, path: string, load: LoadSource): Promise<Response | null> {
  if (path === "/api/snapshots" && request.method === "GET") {
    const { results } = await env.DB.prepare(`SELECT *,${nowSql} AS server_now FROM snapshots ORDER BY updated_at DESC,id`).all<Snapshot>();
    return json(results.map(view));
  }
  const match = /^\/api\/snapshots\/([a-zA-Z0-9_-]+)(?:\/(update|preview)(?:\/(?:assets\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+))?)?)?$/.exec(path);
  const previous = match ? await row(env, match[1]) : null;
  if (match?.[2] === "preview" && ["GET", "HEAD"].includes(request.method)) {
    if (!previous) throw new HttpError(404, "notFound");
    if (match[3]) return assetResponse(request, env, previous, match[3], match[4], true);
    if (!path.endsWith("/")) return new Response(null, { status: 308, headers: { Location: `${path}/`, "Cache-Control": "no-store" } });
    return pageResponse(request, env, previous);
  }
  const creating = path === "/api/snapshots" && request.method === "POST";
  const updating = match?.[2] === "update" && request.method === "POST";
  if (creating || updating) {
    const body = await readJson(request), op = operation(body?.operationId);
    if (typeof body.documentId !== "string" || !validId(body.documentId)) throw new HttpError(400, "invalidDocument");
    if (!Number.isSafeInteger(body.documentRevision) || body.documentRevision < 1 ||
        (updating && (!Number.isSafeInteger(body.revision) || body.revision < 1))) throw new HttpError(400, "invalidDocument");
    if (updating && !previous) throw new HttpError(404, "notFound");
    if (creating) {
      const repeated = await env.DB.prepare(`SELECT *,${nowSql} AS server_now FROM snapshots WHERE document_id=? AND create_operation_id=?`)
        .bind(body.documentId, op).first<Snapshot>();
      if (repeated) return json(view(repeated));
    } else if (previous!.operation_id === op) return json(view(previous!));
    if (previous && (previous.revision !== body.revision || previous.document_id !== body.documentId)) throw new HttpError(409, "storageConflict");
    const source = await load(body.documentId), document = source.document;
    if (body.documentRevision !== document.revision) throw new HttpError(409, "storageConflict");
    const ids = [...new Set(attachmentNodes(document.content).filter(node => node.type === "media").map(node => String(node.attrs?.mediaId)))];
    if (!body.variants || typeof body.variants !== "object" || Object.keys(body.variants).length !== ids.length) throw new HttpError(400, "missingMedia");
    const id = previous?.id ?? crypto.randomUUID(), version = crypto.randomUUID();
    const urls: Record<string, string> = {}, assets: { media: string; object: string; mime: string }[] = [], fileShares: { id: string; token: string; revision: number }[] = [];
    for (const mediaId of ids) {
      const hash = body.variants[mediaId];
      if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) throw new HttpError(400, "invalidImage");
      const key = await photoVariantKey(env, document.documentId, mediaId, hash), image = await env.MEDIA.get(key);
      const mime = image?.httpMetadata?.contentType;
      if (image) await image.body.cancel();
      if (!image || !["image/png", "image/jpeg"].includes(mime ?? "")) throw new HttpError(400, "missingMedia");
      await env.DB.prepare("INSERT INTO file_objects(id,object_key,state,lease_until,size) VALUES (?,?,'ready',0,?) ON CONFLICT DO NOTHING")
        .bind(`legacy:${key}`, key, image.size).run();
      const object = await env.DB.prepare("SELECT id FROM file_objects WHERE object_key=? AND state='ready'").bind(key).first<{ id: string }>();
      if (!object) throw new HttpError(409, "storageConflict");
      assets.push({ media: mediaId, object: object.id, mime: mime! });
      urls[mediaId] = `assets/${version}/${mediaId}`;
    }
    for (const fileId of referencedFileIds(document.content)) {
      const share = await env.DB.prepare(`SELECT id,token,revision FROM file_shares WHERE file_id=? AND ${activeSql} ORDER BY created_at DESC,id LIMIT 1`)
        .bind(fileId).first<{ id: string; token: string; revision: number }>();
      if (!share) throw new HttpError(400, "privateFile");
      fileShares.push(share); urls[fileId] = new URL(`/shared/files/${share.token}`, request.url).href;
    }
    const html = "<!doctype html>" + renderToStaticMarkup(<html lang={document.locale}><head><meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex,nofollow" />
      <title>{document.title}</title></head><body style={{ margin: "24px auto", padding: "0 16px", maxWidth: 820 }}>
        <h1>{document.title}</h1><PortableDocumentBody document={document} mediaUrls={urls} videoLinksOnly /></body></html>);
    const condition = `EXISTS (SELECT 1 FROM documents WHERE id=? AND revision=? AND json_extract(body,'$.trashedAt') IS ?
      AND (? IS NULL OR ?>${nowSql})) AND NOT EXISTS (SELECT 1 FROM json_each(?) r
      WHERE NOT EXISTS (SELECT 1 FROM file_shares WHERE id=json_extract(r.value,'$.id') AND token=json_extract(r.value,'$.token')
        AND revision=json_extract(r.value,'$.revision') AND ${activeSql}))`;
    const guard = [document.documentId, document.revision, source.storedTimestamp ?? null, source.deadline, source.deadline, JSON.stringify(fileShares)];
    const parent = creating
      ? env.DB.prepare(`INSERT INTO snapshots(id,document_id,title,token,current_version,revision,expires_at,operation_id,create_operation_id,updated_at)
        SELECT ?,?,?,?,?,1,?,?,?,${nowSql} WHERE ${condition}`)
        .bind(id, document.documentId, document.title, token(), version, expires(body.expiresAt), op, op, ...guard)
      : env.DB.prepare(`UPDATE snapshots SET title=?,current_version=?,revision=revision+1,operation_id=?,updated_at=${nowSql}
        WHERE id=? AND revision=? AND ${condition}`).bind(document.title, version, op, id, previous!.revision, ...guard);
    const statements = [parent];
    if (previous) statements.push(env.DB.prepare(`UPDATE snapshot_versions SET retired_at=(SELECT updated_at FROM snapshots WHERE id=?)
      WHERE id=? AND EXISTS (SELECT 1 FROM snapshots WHERE id=? AND current_version=?)`).bind(id, previous.current_version, id, version));
    statements.push(env.DB.prepare(`INSERT INTO snapshot_versions(id,snapshot_id,source_revision,html)
      SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM snapshots WHERE id=? AND current_version=?)`)
      .bind(version, id, document.revision, html, id, version));
    statements.push(env.DB.prepare(`INSERT INTO snapshot_assets(version_id,media_id,object_id,mime)
      SELECT ?,json_extract(value,'$.media'),json_extract(value,'$.object'),json_extract(value,'$.mime') FROM json_each(?)
      WHERE EXISTS (SELECT 1 FROM snapshot_versions WHERE id=?)`).bind(version, JSON.stringify(assets), version));
    const committed = await env.DB.batch(statements);
    if (committed[0].meta.changes !== 1) throw new HttpError(409, "storageConflict");
    return json(view((await row(env, id))!), creating ? 201 : 200);
  }
  if (match && !match[2] && ["PATCH", "DELETE"].includes(request.method)) {
    if (!previous) { if (request.method === "DELETE") return json({ removed: true }); throw new HttpError(404, "notFound"); }
    const body = await readJson(request);
    if (!Number.isSafeInteger(body?.revision) || body.revision < 1) throw new HttpError(400, "invalidDocument");
    if (request.method === "DELETE") {
      const result = await env.DB.batch([
        env.DB.prepare("DELETE FROM snapshots WHERE id=? AND revision=?").bind(previous.id, body?.revision),
        env.DB.prepare(`DELETE FROM snapshot_assets WHERE version_id IN (SELECT id FROM snapshot_versions WHERE snapshot_id=?)
          AND NOT EXISTS (SELECT 1 FROM snapshots WHERE id=?)`).bind(previous.id, previous.id),
        env.DB.prepare("DELETE FROM snapshot_versions WHERE snapshot_id=? AND NOT EXISTS (SELECT 1 FROM snapshots WHERE id=?)").bind(previous.id, previous.id),
      ]);
      if (!result[0].meta.changes) throw new HttpError(409, "storageConflict");
      return json({ removed: true });
    }
    const op = operation(body?.operationId);
    if (previous.operation_id === op) return json(view(previous));
    if (body.revision !== previous.revision || !["extend", "revoke", "reissue"].includes(body.action)) throw new HttpError(409, "storageConflict");
    if (body.action === "extend" && previous.revoked) throw new HttpError(409, "storageConflict");
    const result = await env.DB.prepare(`UPDATE snapshots SET token=?,expires_at=?,revoked=?,operation_id=?,revision=revision+1
      WHERE id=? AND revision=?`)
      .bind(body.action === "reissue" ? token() : previous.token,
        body.action === "revoke" ? previous.expires_at : expires(body.expiresAt), body.action === "revoke" ? 1 : 0, op, previous.id, previous.revision).run();
    if (!result.meta.changes) throw new HttpError(409, "storageConflict");
    return json(view((await row(env, previous.id))!));
  }
  return null;
}
