import { validateDocument, type WriterDocument } from "@wonboard/document";
import type { SitesEnv, Statement } from "./types";

type Progress = { phase: "documents" | "publications" | "complete"; cursor: string; revision: number };
export async function backfillStatus(env: SitesEnv) {
  const progress = await env.DB.prepare("SELECT phase,cursor,revision FROM storage_backfill WHERE singleton=1").first<Progress>();
  const failures = await env.DB.prepare("SELECT count(*) AS count FROM storage_backfill_failures").first<{ count: number }>();
  return { ...progress, failures: failures?.count ?? 0, complete: progress?.phase === "complete" && failures?.count === 0 };
}
/** One bounded owner-request page. No R2 writes, inventory deletions or background job. */
export async function backfillStoragePage(env: SitesEnv) {
  const previous = await env.DB.prepare("SELECT phase,cursor,revision FROM storage_backfill WHERE singleton=1").first<Progress>();
  if (!previous || previous.phase === "complete") return backfillStatus(env);
  const guard = "EXISTS (SELECT 1 FROM storage_backfill WHERE singleton=1 AND revision=?)";
  const statements: Statement[] = [];
  let cursor = previous.cursor, phase: Progress["phase"] = previous.phase;
  if (phase === "documents") {
    const { results } = await env.DB.prepare("SELECT id,revision FROM documents WHERE id>? ORDER BY id LIMIT 20")
      .bind(cursor).all<{ id: string; revision: number }>();
    for (const row of results) {
      cursor = row.id;
      // Fetch/parse one body at a time, rather than materializing twenty 32MiB bodies.
      const stored = await env.DB.prepare("SELECT body FROM documents WHERE id=? AND revision=?")
        .bind(row.id, row.revision).first<{ body: string }>();
      if (!stored) continue;
      try {
        const { _sitesTrashTimestamp: _serverMarker, ...document } = JSON.parse(stored.body) as WriterDocument & { _sitesTrashTimestamp?: unknown };
        validateDocument(document);
        if (document.documentId !== row.id || document.revision !== row.revision) throw new Error("invalidDocument");
        for (const file of Object.values(document.files ?? {})) {
          const existing = await env.DB.prepare(`SELECT f.id FROM library_files f JOIN file_objects o ON o.id=f.object_id
            WHERE f.id=? AND o.state='ready' AND json_extract(f.body,'$.sha256')=? AND json_extract(f.body,'$.size')=?`)
            .bind(file.id, file.sha256, file.size).first();
          if (!existing) throw new Error("missingFile");
        }
        // A save/delete that ran during parsing wins; never reinsert stale references.
        const current = `EXISTS (SELECT 1 FROM documents WHERE id=? AND revision=?) AND ${guard}`;
        statements.push(env.DB.prepare(`DELETE FROM document_file_refs WHERE document_id=? AND ${current}`)
          .bind(row.id, row.id, row.revision, previous.revision));
        for (const file of Object.values(document.files ?? {})) statements.push(env.DB.prepare(`INSERT OR IGNORE INTO document_file_refs
          SELECT ?,? WHERE ${current}`).bind(row.id, file.id, row.id, row.revision, previous.revision));
        statements.push(env.DB.prepare(`DELETE FROM storage_backfill_failures WHERE document_id=? AND ${current}`)
          .bind(row.id, row.id, row.revision, previous.revision));
      } catch {
        statements.push(env.DB.prepare(`INSERT INTO storage_backfill_failures(document_id,reason)
          SELECT ?,'unreadableDocument' WHERE ${guard} ON CONFLICT(document_id) DO UPDATE SET reason=excluded.reason`)
          .bind(row.id, previous.revision));
      }
    }
    if (results.length < 20) { phase = "publications"; cursor = ""; }
  } else {
    const { results } = await env.DB.prepare("SELECT public_id,blob_key FROM publications WHERE public_id>? ORDER BY public_id LIMIT 20")
      .bind(cursor).all<{ public_id: string; blob_key: string | null }>();
    for (const row of results) {
      cursor = row.public_id;
      if (row.blob_key) statements.push(env.DB.prepare(`INSERT OR IGNORE INTO file_objects(id,object_key,state,lease_until,size)
        SELECT 'legacy:' || blob_key,blob_key,'ready',0,0 FROM publications WHERE public_id=? AND blob_key=? AND ${guard}`)
        .bind(row.public_id, row.blob_key, previous.revision));
    }
    if (results.length < 20) { phase = "complete"; cursor = ""; }
  }
  statements.push(env.DB.prepare("UPDATE storage_backfill SET phase=?,cursor=?,revision=revision+1 WHERE singleton=1 AND revision=?")
    .bind(phase, cursor, previous.revision));
  await env.DB.batch(statements);
  return backfillStatus(env);
}

/** Read-only fixture/inventory planning. Unknown keys are always retained.
 * A real platform inventory needs separate authorization and a supported adapter. */
export function classifyStorageInventory(objects: { key: string; size: number }[], trackedKeys: ReadonlySet<string>) {
  return objects.map(object => ({ ...object, disposition: trackedKeys.has(object.key) ? "tracked" as const : "retainUnindexed" as const }));
}
