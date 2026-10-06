import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { createSitesTestRuntime } from "../helpers/sites-runtime";
import { handleSitesRequest } from "../../apps/server/src/sites/worker";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const localSchema = read("apps/server/src/sites/schema.sql");
const journal = JSON.parse(read("drizzle/meta/_journal.json")) as { entries: { tag: string }[] };
const deploymentSql = journal.entries.map(({ tag }) => read(`drizzle/${tag}.sql`)).join("\n");
function structure(db: DatabaseSync) {
  return db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(row => {
    const name = String(row.name);
    return {
      name,
      // Drizzle makes primary keys NOT NULL explicitly; legacy SQLite TEXT PKs did not.
      columns: db.prepare(`PRAGMA table_info(${name})`).all().map(col => ({
        name: col.name, type: col.type, nullable: col.pk ? false : !col.notnull, default: col.dflt_value, pk: col.pk,
      })),
      unique: db.prepare(`PRAGMA index_list(${name})`).all().filter(idx => idx.unique).map(idx =>
        db.prepare(`PRAGMA index_info('${String(idx.name)}')`).all().map(col => col.name).join(",")
      ).sort(),
      references: db.prepare(`PRAGMA foreign_key_list(${name})`).all(),
    };
  });
}

describe("Sites deployment migrations", () => {
  it("creates all current tables, constraints, integrity triggers and the backfill checkpoint", async () => {
    // Apply each breakpoint as Sites does, including complete multi-statement trigger bodies.
    const fresh = createSitesTestRuntime("");
    const expected = createSitesTestRuntime();
    try {
      for (const statement of deploymentSql.split("--> statement-breakpoint")) fresh.sqlite.exec(statement);
      expect(structure(fresh.sqlite)).toEqual(structure(expected.sqlite));
      expect(fresh.sqlite.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger' ORDER BY name").all())
        .toEqual(expected.sqlite.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger' ORDER BY name").all());
      expect(fresh.sqlite.prepare("SELECT * FROM storage_backfill").get()).toEqual(expected.sqlite.prepare("SELECT * FROM storage_backfill").get());
      fresh.sqlite.exec("PRAGMA foreign_keys=ON");
      fresh.sqlite.exec("INSERT INTO installation VALUES(1,'owner-fixture','2026-09-01','en')");
      expect(() => fresh.sqlite.exec("INSERT INTO documents(id,revision,title,locale,excerpt,body,updated_at) VALUES('bad',1,'','en','','{\"files\":{\"missing\":{}}}','2026-09-01')"))
        .toThrow("missingFile");
      expect(() => fresh.sqlite.exec("INSERT INTO snapshot_assets VALUES('v','photo','missing','image/png')")).toThrow("missingMedia");
      const response = await handleSitesRequest(new Request("https://site.test/api/documents", { headers: { "oai-authenticated-user-id": "owner-fixture" } }), fresh.env);
      expect(response.status).toBe(200);
    } finally { fresh.close(); expected.close(); }
  });
  it("keeps the legacy 0001/0002 upgrade path compatible and preserves saved data", () => {
    const legacy = createSitesTestRuntime(localSchema.slice(0, localSchema.indexOf("-- New bytes")).replace(",\n  server_trashed_at TEXT", ""));
    const fresh = createSitesTestRuntime(deploymentSql);
    try {
      legacy.sqlite.exec("INSERT INTO documents VALUES('kept',1,'kept','en','','{}','2026-09-01')");
      legacy.sqlite.exec("INSERT INTO publications(public_id,document_id,media_id,blob_key,published) VALUES('kept-url','kept','photo','kept-key',1)");
      legacy.sqlite.exec(read("apps/server/src/sites/migrations/0001-trash-provenance.sql"));
      legacy.sqlite.exec(read("apps/server/src/sites/migrations/0002-storage-sharing.sql"));
      expect(structure(legacy.sqlite)).toEqual(structure(fresh.sqlite));
      expect(legacy.sqlite.prepare("SELECT title FROM documents WHERE id='kept'").get()).toMatchObject({ title: "kept" });
      expect(legacy.sqlite.prepare("SELECT public_id,blob_key FROM publications").get()).toMatchObject({ public_id: "kept-url", blob_key: "kept-key" });
    } finally { legacy.close(); fresh.close(); }
  });
});
