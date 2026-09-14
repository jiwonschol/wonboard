import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import type { Database, ObjectStore, SitesEnv, Statement } from "../../apps/server/src/sites/types.ts";

/** Real SQLite statements + an in-memory R2 double. Never a hosted runtime. */
export function createSitesTestRuntime() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../../apps/server/src/sites/schema.sql", import.meta.url), "utf8"));
  function prepare(sql: string): Statement {
    let values: unknown[] = [];
    const query = () => sqlite.prepare(sql);
    return {
      bind(...args) { values = args; return this; },
      async first<T>() { return (query().get(...values as never[]) ?? null) as T | null; },
      async all<T>() { return { results: query().all(...values as never[]) as T[] }; },
      async run() { return { meta: { changes: Number(query().run(...values as never[]).changes) } }; },
    };
  }
  const DB: Database = { prepare, async batch(statements) {
    sqlite.exec("BEGIN");
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec("COMMIT"); return results; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  } };
  const files = new Map<string, { bytes: ArrayBuffer; mime: string }>();
  const MEDIA: ObjectStore = {
    async get(key) { const file = files.get(key); return file ? {
      body: new Blob([file.bytes]).stream(), size: file.bytes.byteLength,
      httpMetadata: { contentType: file.mime },
    } : null; },
    async put(key, bytes, options) { files.set(key, { bytes: bytes.slice(0), mime: options?.httpMetadata?.contentType ?? "" }); },
  };
  const env: SitesEnv = { DB, MEDIA, WONBOARD_OWNER_ID: "owner-fixture" };
  return { env, sqlite, files, close: () => sqlite.close() };
}

/** A decodable one-pixel RGBA PNG, generated without any user image. */
export function createSyntheticPng(red = 40) {
  function chunk(type: string, data: Buffer) {
    const payload = Buffer.concat([Buffer.from(type, "ascii"), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, payload, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from([0, red, 110, 210, 255]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const syntheticPng = createSyntheticPng();
