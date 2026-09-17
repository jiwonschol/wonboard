import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { newDraft } from "@wonboard/document";
import { createSitesTestRuntime } from "../helpers/sites-runtime";
import { backfillStoragePage, backfillStatus, classifyStorageInventory } from "../../apps/server/src/sites/storageBackfill";
import { handleSitesRequest } from "../../apps/server/src/sites/worker";
const schema = readFileSync(new URL("../../apps/server/src/sites/schema.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../apps/server/src/sites/migrations/0002-storage-sharing.sql", import.meta.url), "utf8");
function legacy() {
  const f = createSitesTestRuntime(schema.slice(0, schema.indexOf("-- New bytes")));
  f.sqlite.prepare("INSERT INTO installation VALUES(1,'owner-fixture','2026-09-01','en')").run();
  for (let i=0;i<25;i++) {
    const document = newDraft("en").document; document.documentId = `legacy-${String(i).padStart(2,"0")}`; document.revision = 1;
    f.sqlite.prepare("INSERT INTO documents VALUES(?,1,?,'en','',?,?)").run(document.documentId,document.title,JSON.stringify(document),document.updatedAt);
  }
  f.sqlite.prepare("INSERT INTO publications(public_id,document_id,media_id,blob_key,published) VALUES('old-url','legacy-00','photo','publications/old/photo/hash',1)").run();
  f.sqlite.exec(migration); return f;
}
describe("additive Sites storage migration and bounded indexing", () => {
  it("preserves IDs, URLs and restart checkpoints when the migration is reapplied", async () => {
    const f=legacy(); try {
      const first=await backfillStoragePage(f.env); expect(first).toMatchObject({phase:"documents",cursor:"legacy-19",complete:false});
      f.sqlite.exec(migration); expect(await backfillStatus(f.env)).toEqual(first);
      expect(await backfillStoragePage(f.env)).toMatchObject({phase:"publications",complete:false});
      expect(await backfillStoragePage(f.env)).toMatchObject({phase:"complete",complete:true});
      expect(f.sqlite.prepare("SELECT public_id,blob_key FROM publications").get()).toMatchObject({public_id:"old-url",blob_key:"publications/old/photo/hash"});
      expect(f.sqlite.prepare("SELECT count(*) AS count FROM documents").get()!.count).toBe(25);
      expect(f.sqlite.prepare("SELECT object_key,size FROM file_objects").get()).toMatchObject({object_key:"publications/old/photo/hash",size:0});
    } finally {f.close();}
  });
  it("rolls back an interrupted page and resumes it without silently skipping rows", async () => {
    const f=legacy(); try {
      f.sqlite.exec("CREATE TRIGGER interrupt_page BEFORE UPDATE ON storage_backfill BEGIN SELECT RAISE(ABORT,'fixture interruption'); END");
      await expect(backfillStoragePage(f.env)).rejects.toThrow("fixture interruption");
      expect(await backfillStatus(f.env)).toMatchObject({cursor:"",revision:1});
      f.sqlite.exec("DROP TRIGGER interrupt_page");
      expect(await backfillStoragePage(f.env)).toMatchObject({cursor:"legacy-19",revision:2});
    } finally {f.close();}
  });
  it("retains unindexed legacy bytes when a document is unreadable and allows an explicit reindex", async () => {
    const f=legacy(); try {
      // Bypass the new write validator only in this old-data fixture.
      f.sqlite.exec("DROP TRIGGER document_files_update");
      f.sqlite.prepare("UPDATE documents SET body='null' WHERE id='legacy-00'").run();
      await backfillStoragePage(f.env); await backfillStoragePage(f.env); await backfillStoragePage(f.env);
      expect(await backfillStatus(f.env)).toMatchObject({phase:"complete",complete:false,failures:1});
      f.sqlite.prepare("DELETE FROM publications").run();
      await f.env.MEDIA.put("publications/old/photo/hash",new Uint8Array([1,2,3]).buffer);
      const call=(path:string,body:unknown={})=>handleSitesRequest(new Request(`https://site.test${path}`,{method:"POST",headers:{origin:"https://site.test","oai-authenticated-user-id":"owner-fixture","content-type":"application/json"},body:JSON.stringify(body)}),f.env);
      expect((await call("/api/files/cleanup")).status).toBe(200); expect(f.files.size).toBe(1);
      const repaired=newDraft("en").document; repaired.documentId="legacy-00";repaired.revision=1;
      f.sqlite.prepare("UPDATE documents SET body=? WHERE id='legacy-00'").run(JSON.stringify(repaired));
      expect((await call("/api/files/backfill",{restart:true})).status).toBe(200);
      await backfillStoragePage(f.env); await backfillStoragePage(f.env);
      expect(await backfillStatus(f.env)).toMatchObject({complete:true,failures:0});
      expect((await call("/api/files/cleanup")).status).toBe(200); expect(f.files.size).toBe(0);
    } finally {f.close();}
  });
  it("plans an inventory without declaring unknown originals or abandoned keys safe to delete",()=>{
    const result=classifyStorageInventory([{key:"media/old-private-photo",size:3},{key:"abandoned-upload",size:4},{key:"files/known",size:5}],new Set(["files/known"]));
    expect(result.map(row=>row.disposition)).toEqual(["retainUnindexed","retainUnindexed","tracked"]);
  });
});
