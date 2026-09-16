import { HttpError } from "./http";
import type { SitesEnv } from "./types";

const now = "(CAST(strftime('%s','now') AS INTEGER)*1000 + CAST(substr(strftime('%f','now'),4,3) AS INTEGER))";

/** Reserve before put. Every attempt has a distinct immutable object key. */
export async function storePhotoVariant(env: SitesEnv, documentId: string, mediaId: string,
  image: { hash: string; bytes: ArrayBuffer; mime: string }) {
  const id = crypto.randomUUID(), key = `photo-objects/${id}`;
  await env.DB.prepare(`INSERT INTO file_objects(id,object_key,state,lease_until,size) VALUES (?,?,'uploading',${now}+3600000,?)`)
    .bind(id, key, image.bytes.byteLength).run();
  await env.MEDIA.put(key, image.bytes, { httpMetadata: { contentType: image.mime } });
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE file_objects SET state='ready' WHERE id=? AND state='uploading' AND lease_until>${now}`).bind(id),
    env.DB.prepare(`INSERT INTO photo_variants(document_id,media_id,hash,object_id)
      SELECT ?,?,?,id FROM file_objects WHERE id=? AND state='ready' AND lease_until>${now}
      ON CONFLICT(document_id,media_id,hash) DO UPDATE SET object_id=excluded.object_id`)
      .bind(documentId, mediaId, image.hash, id),
  ]);
  if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1) throw new HttpError(409, "storageConflict");
}

export async function photoVariantKey(env: SitesEnv, documentId: string, mediaId: string, hash: string) {
  const row = await env.DB.prepare(`SELECT o.object_key,o.state FROM photo_variants v
    JOIN file_objects o ON o.id=v.object_id WHERE v.document_id=? AND v.media_id=? AND v.hash=?`)
    .bind(documentId, mediaId, hash).first<{ object_key: string; state: string }>();
  if (row) {
    if (row.state !== "ready") throw new HttpError(409, "storageConflict");
    return row.object_key;
  }
  // Read compatibility for variants uploaded by the old app. Publication
  // triggers register these keys and fence attachment against cleanup.
  return `publications/${documentId}/${mediaId}/${hash}`;
}

export async function removeDistributedPhoto(env: SitesEnv, id: string) {
  // Record even legacy keys before removing their last discoverable row. Keep
  // tombstones after deletion so delayed writes cannot gain new references.
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO file_objects(id,object_key,state,lease_until,size)
      SELECT ?,blob_key,'ready',0,0 FROM publications WHERE public_id=? AND blob_key IS NOT NULL`).bind(crypto.randomUUID(), id),
    env.DB.prepare(`UPDATE file_objects SET lease_until=0 WHERE object_key IN
      (SELECT blob_key FROM publications WHERE public_id=?) AND state='ready'`).bind(id),
    env.DB.prepare(`DELETE FROM photo_variants WHERE object_id IN
      (SELECT o.id FROM file_objects o JOIN publications p ON p.blob_key=o.object_key WHERE p.public_id=?)`).bind(id),
    env.DB.prepare("DELETE FROM publications WHERE public_id=?").bind(id),
  ]);
}
