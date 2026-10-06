// Verify the portable Sites archive before any hosted save/deploy step.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const json = path => JSON.parse(read(path));
const hosting = json(".openai/hosting.json");
assert.equal(hosting.d1, "DB");
assert.equal(hosting.r2, "MEDIA");
assert.ok(isDeepStrictEqual(hosting, json("dist/.openai/hosting.json")), "Sites metadata differs from source");
const config = json("wrangler.json");
assert.equal(config.main, "dist/server/index.js");
assert.equal(config.assets.directory, "dist/client");
assert.equal(config.assets.binding, "ASSETS");
assert.equal(config.assets.run_worker_first, true);
assert.ok(read("dist/client/index.html").length > 0);
const journal = json("drizzle/meta/_journal.json");
assert.ok(journal.entries.length > 0, "Missing initial D1 migration");
for (const entry of journal.entries) assert.ok(read(`drizzle/${entry.tag}.sql`).length > 0);
function verifyCopy(directory) {
  for (const entry of readdirSync(new URL(`../${directory}`, import.meta.url), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) verifyCopy(path);
    else assert.deepEqual(read(`dist/.openai/${path}`), read(path), `Missing or stale ${path}`);
  }
}
verifyCopy("drizzle");
const worker = await import(`data:text/javascript;base64,${read(config.main).toString("base64")}`);
assert.equal(typeof worker.default?.fetch, "function", "Worker must export default.fetch");
const denied = await worker.default.fetch(new Request("https://site.test/api/documents"), {});
assert.equal(denied.status, 401, "Compiled Worker must reject anonymous document access");
const page = await worker.default.fetch(new Request("https://site.test/"), {
  ASSETS: { fetch: async () => new Response("asset-fixture") },
});
assert.equal(await page.text(), "asset-fixture", "Compiled Worker must use ASSETS");
console.log("Sites Worker, ASSETS, hosting metadata and committed D1 migrations verified.");
