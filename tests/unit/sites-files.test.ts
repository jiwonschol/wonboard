import { describe, expect, it, vi } from "vitest";
import { exportBackup, importBackup, newDraft } from "@wonboard/document";
import { handleSitesRequest } from "../../apps/server/src/sites/worker";
import { createSitesTestRuntime } from "../helpers/sites-runtime";
import { openSitesFileLibrary } from "../../apps/client/src/sitesFileLibrary";
import { openDraftRepository } from "../../apps/client/src/draftRepository";
import { recoveredDraft } from "../../apps/client/src/trash";

async function fixture() {
  const runtime = createSitesTestRuntime();
  async function call(path: string, method = "GET", body?: unknown, identity: string | null = "owner-fixture") {
    const headers = new Headers({ origin: "https://site.test" });
    if (identity) headers.set("oai-authenticated-user-id", identity);
    if (body !== undefined) headers.set("content-type", "application/json");
    return handleSitesRequest(new Request(`https://site.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), runtime.env);
  }
  await call("/api/sites/setup", "POST", { accepted: true, locale: "en" });
  async function upload(id = "report", text = "<script>window.pwned=true</script>") {
    return handleSitesRequest(new Request(`https://site.test/api/files/${id}?name=report.html`, {
      method: "PUT", headers: { origin: "https://site.test", "oai-authenticated-user-id": "owner-fixture", "content-type": "text/html" }, body: text,
    }), runtime.env);
  }
  return { ...runtime, call, upload };
}

describe("Sites independent file distribution", () => {
  it("treats a repeated library unpin as success and counts only physically reclaimed bytes", async () => {
    const f = await fixture(); try {
      await f.upload("reclaim", "12345");
      await f.call("/api/files/reclaim", "PATCH", { revision: 1, trashedAt: "requested" });
      expect((await f.call("/api/files/reclaim", "DELETE", {revision:1})).status).toBe(409);
      expect((await f.call("/api/files/reclaim", "DELETE", {revision:2})).status).toBe(200);
      expect((await f.call("/api/files/reclaim", "DELETE", {revision:2})).status).toBe(200);
      expect((await (await f.call("/api/files/usage")).json()).pendingBytes).toBe(5);
      expect(await (await f.call("/api/files/cleanup", "POST", {})).json()).toMatchObject({deleted:1,reclaimedBytes:5});
      f.sqlite.prepare("UPDATE file_objects SET retry_at=0").run();
      expect(await (await f.call("/api/files/cleanup", "POST", {})).json()).toMatchObject({deleted:1,reclaimedBytes:0});
      expect((await (await f.call("/api/files/usage")).json()).trackedBytes).toBe(0);
    } finally { f.close(); }
  });
  it("reports confirmed freed bytes when physical deletion succeeds but ledger completion needs retry", async () => {
    const f=await fixture(); try {
      await f.upload("completion-failure","12345");
      await f.call("/api/files/completion-failure","PATCH",{revision:1,trashedAt:"requested"});
      await f.call("/api/files/completion-failure","DELETE",{revision:2});
      f.sqlite.exec("CREATE TRIGGER fail_completion BEFORE UPDATE OF state ON file_objects WHEN NEW.state='deleted' BEGIN SELECT RAISE(ABORT,'fixture completion failure'); END");
      expect(await (await f.call("/api/files/cleanup","POST",{})).json()).toMatchObject({deleted:0,failed:1,reclaimedBytes:5});
      expect(f.files.size).toBe(0);
      f.sqlite.exec("DROP TRIGGER fail_completion");f.sqlite.prepare("UPDATE file_objects SET retry_at=0").run();
      expect(await (await f.call("/api/files/cleanup","POST",{})).json()).toMatchObject({deleted:1,failed:0,reclaimedBytes:0});
    } finally {f.close();}
  });
  it("expires owner library downloads by database time without breaking documents or public shares", async () => {
    const f = await fixture();
    try {
      const file = await (await f.upload()).json(), draft = newDraft();
      draft.document.files = { report: file };
      expect((await f.call(`/api/documents/${draft.document.documentId}`, "PUT", draft.document)).status).toBe(200);
      const share = await (await f.call("/api/files/report/share", "POST", { revision: 1, operationId: "share" })).json();
      const trashed = await (await f.call("/api/files/report", "PATCH", { revision: 1, trashedAt: "2099-01-01T00:00:00Z" })).json();
      let now = Date.parse(trashed.trashedAt) + 30 * 86400000 - 1;
      f.sqlite.function("strftime", (format, value) => {
        if (value !== "now") throw new Error("unexpected date input");
        return format === "%s" ? String(Math.floor(now / 1000)) : new Date(now).toISOString().slice(17, 23);
      });
      expect((await f.call("/api/files/report/content")).status).toBe(200);
      now++;
      expect((await f.call("/api/files/report/content")).status).toBe(410);
      expect((await f.call("/api/files/report/content", "HEAD")).status).toBe(410);
      expect((await f.call("/api/files/report", "PATCH", { revision: 2, trashedAt: null })).status).toBe(409);
      expect((await f.call(share.url, "GET", undefined, null)).status).toBe(200);
      expect((await f.call(`/api/documents/${draft.document.documentId}/files/report`)).status).toBe(200);
      expect((await f.call("/api/documents/unknown/files/report")).status).toBe(404);
    } finally { f.close(); }
  });
  it("restores an attached ZIP on the same Site after the former library object was deleted", async () => {
    const f = await fixture();
    vi.stubGlobal("fetch", async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("origin", "https://site.test"); headers.set("oai-authenticated-user-id", "owner-fixture");
      return handleSitesRequest(new Request(new URL(path, "https://site.test"), { ...init, headers }), f.env);
    });
    const repository = await openDraftRepository("sites", () => {});
    try {
      const file = await (await f.upload("report", "restore me")).json(), original = newDraft();
      original.document.files = { report: file };
      original.document.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: "report", label: "report.html" } }] }] };
      original.blobs.report = new Blob(["restore me"], { type: file.mime });
      const archive = await exportBackup(original);
      await f.call("/api/files/report", "PATCH", { revision: 1, trashedAt: "requested" });
      await f.call("/api/files/report", "DELETE", { revision: 2 });
      await f.call("/api/files/cleanup", "POST", {});
      expect((await f.call("/api/files/report/content")).status).toBe(404);
      const restored = recoveredDraft(await importBackup(archive));
      const [newId] = Object.keys(restored.document.files!);
      expect(newId).not.toBe("report");
      const saved = await repository.save(restored, 0), loaded = await repository.load(saved);
      expect(await loaded.blobs[newId].text()).toBe("restore me");
      expect(original.document.files.report.id).toBe("report");
      expect(await (await f.call("/api/file-shares")).json()).toEqual([]);
    } finally { repository.close(); vi.unstubAllGlobals(); f.close(); }
  });
  it("retries a committed upload with the same file ID after its response is lost", async () => {
    const f = await fixture(), library = openSitesFileLibrary();
    let loseResponse = true;
    vi.stubGlobal("fetch", async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set("origin", "https://site.test"); headers.set("oai-authenticated-user-id", "owner-fixture");
      const response = await handleSitesRequest(new Request(new URL(path, "https://site.test"), { ...init, headers }), f.env);
      if (init.method === "PUT" && loseResponse) { loseResponse = false; throw new Error("lost response"); }
      return response;
    });
    try {
      const input = new File(["one upload"], "once.txt", { type: "text/plain" });
      await expect(library.upload(input)).rejects.toThrow("lost response");
      const [committed] = await library.list();
      const repeated = await library.upload(input);
      expect(repeated.id).toBe(committed.id);
      expect(await library.list()).toHaveLength(1);
      expect(f.sqlite.prepare("SELECT count(*) AS count FROM file_objects").get()!.count).toBe(1);
    } finally { vi.unstubAllGlobals(); library.close(); f.close(); }
  });
  it("reports share activity from SQLite time and accepts repeated successful deletion", async () => {
    const f = await fixture();
    const expiry = new Date(Date.now() + 3600000).toISOString();
    const skew = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 31 * 86400000);
    try {
      await f.upload();
      const share = await (await f.call("/api/files/report/share", "POST", { revision: 1, operationId: "create", expiresAt: expiry })).json();
      expect(share.active).toBe(true);
      expect((await (await f.call("/api/file-shares")).json())[0].active).toBe(true);
      for (let i = 0; i < 2; i++) expect((await f.call(`/api/file-shares/${share.id}`, "DELETE", { revision: share.revision, operationId: "delete" })).status).toBe(200);
      expect(await (await f.call("/api/file-shares")).json()).toEqual([]);
    } finally { skew.mockRestore(); f.close(); }
  });
  it("preserves every document and distribution reference, then retries deletion after a lost response", async () => {
    const f = await fixture();
    try {
      const file = await (await f.upload("retained", "bytes")).json();
      const ids: string[] = [];
      for (let i = 0; i < 2; i++) {
        const draft = newDraft(); ids.push(draft.document.documentId);
        draft.document.files = { retained: file };
        draft.document.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: "retained", label: "f" } }] }] };
        expect((await f.call(`/api/documents/${draft.document.documentId}`, "PUT", draft.document)).status).toBe(200);
      }
      const share = await (await f.call("/api/files/retained/share", "POST", { revision: 1, operationId: "shared" })).json();
      await f.call("/api/files/retained", "PATCH", { revision: 1, trashedAt: "requested" });
      await f.call("/api/files/retained", "DELETE", { revision: 2 });
      expect((await f.call(`/api/documents/${ids[0]}`, "DELETE", { revision: 1, deletionIntent: "manual" })).status).toBe(200);
      expect((await f.call("/api/files/cleanup", "POST", {})).status).toBe(200);
      expect((await f.call("/api/files/retained/content")).status).toBe(410);
      expect((await f.call(`/api/documents/${ids[1]}/files/retained`)).status).toBe(200);
      expect((await f.call(`/api/documents/${ids[1]}`, "DELETE", { revision: 1, deletionIntent: "manual" })).status).toBe(200);
      await f.call(`/api/file-shares/${share.id}`, "PATCH", { revision: 1, action: "revoke", operationId: "revoke" });
      expect((await (await f.call("/api/files/cleanup", "POST", {})).json()).deleted).toBe(0);
      expect((await f.call("/api/files/retained/content")).status).toBe(410);
      const retained = await f.env.MEDIA.get(String(f.sqlite.prepare("SELECT object_key FROM file_objects").get()!.object_key));
      expect(retained).not.toBeNull(); await retained!.body.cancel();
      await f.call(`/api/file-shares/${share.id}`, "DELETE", { revision: 2 });
      const remove = f.env.MEDIA.delete!;
      f.env.MEDIA.delete = async key => { await remove(key); throw new Error("lost response"); };
      expect((await (await f.call("/api/files/cleanup", "POST", {})).json()).failed).toBe(1);
      f.env.MEDIA.delete = remove;
      f.sqlite.prepare("UPDATE file_objects SET retry_at=0").run();
      expect((await (await f.call("/api/files/cleanup", "POST", {})).json()).deleted).toBe(1);
      expect((await f.call("/api/files/retained/content")).status).toBe(404);
      expect((await (await f.call("/api/files/cleanup", "POST", {})).json()).failed).toBe(0);
    } finally { f.close(); }
  });
  it("does not starve garbage behind active files and fences a late upload after reservation expiry", async () => {
    const f = await fixture();
    try {
      for (let i = 0; i < 21; i++) await f.upload(`active-${i}`, "active");
      await f.upload("garbage", "garbage");
      await f.call("/api/files/garbage", "PATCH", { revision: 1, trashedAt: "requested" });
      await f.call("/api/files/garbage", "DELETE", { revision: 2 });
      expect((await (await f.call("/api/files/cleanup", "POST", {})).json()).deleted).toBe(1);
      const put = f.env.MEDIA.put;
      f.env.MEDIA.put = async (key, bytes, options) => {
        f.sqlite.prepare("UPDATE file_objects SET lease_until=0 WHERE object_key=?").run(key);
        await f.call("/api/files/cleanup", "POST", {});
        await put(key, bytes, options);
      };
      expect((await f.upload("late", "late bytes")).status).toBe(409);
      expect((await f.call("/api/files/late")).status).toBe(404);
      f.sqlite.prepare("UPDATE file_objects SET retry_at=0 WHERE state='deleted'").run();
      await f.call("/api/files/cleanup", "POST", {});
      expect([...f.files.values()].some(value => new TextDecoder().decode(value.bytes) === "late bytes")).toBe(false);
      expect((await f.call("/api/files/active-0/content")).status).toBe(200);
    } finally { f.close(); }
  });
  it("keeps owner APIs private and serves active content only as uncached sandboxed downloads", async () => {
    const f = await fixture();
    try {
      expect((await f.call("/api/files", "GET", undefined, null)).status).toBe(401);
      expect((await f.call("/api/files", "GET", undefined, "other")).status).toBe(403);
      expect((await f.upload()).status).toBe(201);
      const created = await f.call("/api/files/report/share", "POST", { revision: 1, operationId: "create" });
      expect(created.status).toBe(201);
      const share = await created.json();
      const response = await f.call(share.url, "GET", undefined, null);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/octet-stream");
      expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
      expect(response.headers.get("content-security-policy")).toBe("sandbox; default-src 'none'");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await response.text()).toContain("<script>");
      expect(await (await f.call(share.url, "HEAD", undefined, null)).text()).toBe("");
      expect((await f.call(share.url, "POST", {}, null)).status).toBe(405);
    } finally { f.close(); }
  });
  it("preserves distributed links after rename and workspace deletion, and invalidates old tokens on reissue", async () => {
    const f = await fixture();
    try {
      await f.upload();
      const share = await (await f.call("/api/files/report/share", "POST", { revision: 1, operationId: "create" })).json();
      expect(await (await f.call("/api/files/report/share", "POST", { revision: 1, operationId: "create" })).json()).toEqual(share);
      expect((await f.call("/api/files/report", "PATCH", { revision: 1, filename: "renamed.html" })).status).toBe(200);
      expect((await f.call(share.url, "GET", undefined, null)).headers.get("content-disposition")).toContain("renamed.html");
      await f.call("/api/files/report", "PATCH", { revision: 2, trashedAt: "2099-01-01T00:00:00Z" });
      expect((await f.call("/api/files/report", "DELETE", { revision: 3 })).status).toBe(200);
      expect(await (await f.call("/api/files")).json()).toEqual([]);
      expect((await f.call(share.url, "GET", undefined, null)).status).toBe(200);
      const revoked = await (await f.call(`/api/file-shares/${share.id}`, "PATCH", { revision: 1, action: "revoke", operationId: "revoke" })).json();
      const denied = await f.call(share.url, "HEAD", undefined, null);
      expect(denied.status).toBe(404);
      expect(denied.headers.get("cache-control")).toBe("no-store");
      expect((await f.call(`/api/file-shares/${share.id}`, "PATCH", { revision: revoked.revision, action: "extend", operationId: "extend" })).status).toBe(409);
      const reissued = await (await f.call(`/api/file-shares/${share.id}`, "PATCH", { revision: revoked.revision, action: "reissue", operationId: "new" })).json();
      expect(reissued.token).not.toBe(share.token);
      expect((await f.call(share.url, "GET", undefined, null)).status).toBe(404);
      expect((await f.call(reissued.url, "GET", undefined, null)).status).toBe(200);
      expect(await (await f.call(`/api/file-shares/${share.id}`, "PATCH", { revision: revoked.revision, action: "reissue", operationId: "new" })).json()).toEqual(reissued);
    } finally { f.close(); }
  });
  it("enforces expiry at the native millisecond boundary before range and conditional responses", async () => {
    const f = await fixture();
    let now = Date.parse("2030-01-01T00:00:00.122Z");
    f.sqlite.function("strftime", (format, _time) => format === "%s" ? String(Math.floor(now / 1000)) : `00.${String(now % 1000).padStart(3, "0")}`);
    try {
      await f.upload();
      const share = await (await f.call("/api/files/report/share", "POST", { revision: 1, operationId: "create", expiresAt: "2030-01-01T00:00:00.123Z" })).json();
      const publicRequest = () => handleSitesRequest(new Request(`https://site.test${share.url}`, { headers: { range: "bytes=0-2", "if-none-match": "*" } }), f.env);
      expect((await publicRequest()).status).toBe(200);
      now++;
      expect((await publicRequest()).status).toBe(404);
      now++;
      expect((await f.call(share.url, "HEAD", undefined, null)).status).toBe(404);
    } finally { f.close(); }
  });
  it("keeps document references in the same transaction and refuses a reference claimed by cleanup", async () => {
    const f = await fixture();
    try {
      const file = await (await f.upload("report", "contents")).json();
      const draft = newDraft();
      draft.document.files = { report: file };
      draft.document.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: "report", label: "report.html" } }] }] };
      const path = `/api/documents/${draft.document.documentId}`;
      expect((await f.call(path, "PUT", draft.document)).status).toBe(200);
      f.sqlite.prepare("UPDATE file_objects SET state='deleting'").run();
      expect((await f.call(path, "PUT", { ...draft.document, revision: 1, title: "must not save" })).status).toBeGreaterThanOrEqual(400);
      const saved = await (await f.call(path)).json();
      expect(saved.revision).toBe(1);
      expect(saved.title).toBe("");
    } finally { f.close(); }
  });
});
