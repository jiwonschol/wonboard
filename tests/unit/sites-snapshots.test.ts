import { describe, expect, it } from "vitest";
import { newDraft, sha256 } from "@wonboard/document";
import { handleSitesRequest } from "../../apps/server/src/sites/worker";
import { createSitesTestRuntime, syntheticPng, createSyntheticPng } from "../helpers/sites-runtime";

async function fixture() {
  const runtime = createSitesTestRuntime();
  let now = Date.parse("2026-09-17T00:00:00.123Z");
  runtime.sqlite.function("strftime", (format, value) => {
    if (value !== "now") throw new Error("unexpected clock input");
    return format === "%s" ? String(Math.floor(now / 1000)) : new Date(now).toISOString().slice(17, 23);
  });
  async function call(path: string, method = "GET", body?: unknown, owner = true) {
    const binary = body instanceof Uint8Array;
    return handleSitesRequest(new Request(new URL(path, "https://site.test"), { method,
      headers: { origin: "https://site.test", ...(owner ? { "oai-authenticated-user-id": "owner-fixture" } : {}),
        "content-type": binary ? "image/png" : "application/json" },
      body: body === undefined ? undefined : binary ? new Blob([body as Uint8Array<ArrayBuffer>]) : JSON.stringify(body),
    }), runtime.env);
  }
  await call("/api/sites/setup", "POST", { accepted: true, locale: "en" });
  const draft = newDraft("en"), id = draft.document.documentId;
  draft.document.title = "Frozen <script>alert(1)</script>";
  draft.document.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "First edition" }] }, { type: "media", attrs: { mediaId: "photo" } }] };
  draft.document.media.photo = { id: "photo", originalName: "p.png", mime: "image/png", size: syntheticPng.length, width: 1, height: 1,
    sha256: await sha256(new Uint8Array(syntheticPng).buffer) };
  await call("/api/media/photo", "PUT", syntheticPng);
  const saved = await (await call(`/api/documents/${id}`, "PUT", draft.document)).json();
  const variant = await (await call(`/api/documents/${id}/media/photo/variant`, "PUT", syntheticPng)).json();
  const input = { documentId: id, documentRevision: saved.revision, variants: { photo: variant.hash }, operationId: "create-snapshot" };
  return { ...runtime, call, saved, input, setTime: (time: number) => { now = time; }, time: () => now };
}

describe("independent frozen writing snapshots", () => {
  it("requires explicit file sharing and renders videos only as source links", async () => {
    const f = await fixture();
    try {
      const file = await (await f.call("/api/files/private-file?name=note.txt", "PUT", { text: "private" })).json();
      const content = structuredClone(f.saved.content);
      content.content.push({ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: "private-file", label: "note.txt" } }] });
      content.content.push({ type: "video", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ", privacyHash: "", startSeconds: 0, autoplay: false } });
      const savedResponse = await f.call(`/api/documents/${f.saved.documentId}`, "PUT", { ...f.saved, content, files: { "private-file": file } });
      expect(savedResponse.status).toBe(200);
      const input = { ...f.input, documentRevision: 2 };
      const refused = await f.call("/api/snapshots", "POST", input);
      expect(refused.status).toBe(400); expect((await refused.json()).error).toBe("privateFile");
      const share = await (await f.call("/api/files/private-file/share", "POST", { revision: 1, operationId: "explicit-share" })).json();
      const response = await f.call("/api/snapshots", "POST", input); expect(response.status).toBe(201);
      const snapshot = await response.json(), html = await (await f.call(snapshot.url, "GET", undefined, false)).text();
      expect(html).not.toContain("<iframe"); expect(html).toContain("youtube.com/watch"); expect(html).toContain(share.token);
      await f.call(`/api/file-shares/${share.id}`, "PATCH", { revision: 1, action: "revoke", operationId: "revoke-file" });
      expect((await f.call(share.url, "GET", undefined, false)).status).toBe(404);
      expect((await f.call(snapshot.url, "GET", undefined, false)).status).toBe(200);
    } finally { f.close(); }
  });
  it("checks the document revision again in the commit transaction", async () => {
    const f = await fixture();
    try {
      const batch = f.env.DB.batch.bind(f.env.DB);
      f.env.DB.batch = statements => {
        f.sqlite.prepare("UPDATE documents SET revision=revision+1 WHERE id=?").run(f.saved.documentId);
        return batch(statements);
      };
      expect((await f.call("/api/snapshots", "POST", f.input)).status).toBe(409);
      expect(f.sqlite.prepare("SELECT count(*) AS count FROM snapshots").get()!.count).toBe(0);
      expect(f.sqlite.prepare("SELECT count(*) AS count FROM snapshot_versions").get()!.count).toBe(0);
    } finally { f.close(); }
  });
  it("freezes text and assets, grants five minutes to old assets and prioritizes revocation", async () => {
    const f = await fixture();
    try {
      const response = await f.call("/api/snapshots", "POST", f.input);
      expect(response.status).toBe(201);
      const snapshot = await response.json(), first = await f.call(snapshot.url, "GET", undefined, false);
      expect(first.headers.get("cache-control")).toBe("no-store");
      expect(first.headers.get("content-security-policy")).toContain("script-src 'none'");
      const html = await first.text();
      expect(html).toContain("First edition"); expect(html).not.toContain("<script>");
      const asset = new URL(/<img[^>]*src="([^"]+)"/.exec(html)![1], `https://site.test${snapshot.url}`).pathname;
      expect(await (await f.call(asset, "GET", undefined, false)).arrayBuffer()).toEqual(new Uint8Array(syntheticPng).buffer);
      const changed = await (await f.call(`/api/documents/${f.saved.documentId}`, "PUT", { ...f.saved, title: "Second edition" })).json();
      const variant = await (await f.call(`/api/documents/${f.saved.documentId}/media/photo/variant`, "PUT", createSyntheticPng(90))).json();
      await f.call(`/api/documents/${f.saved.documentId}/publish`, "POST", { revision: changed.revision, variants: { photo: variant.hash } });
      expect(await (await f.call(snapshot.url, "GET", undefined, false)).text()).toBe(html);
      const updated = await (await f.call(`/api/snapshots/${snapshot.id}/update`, "POST", { ...f.input, documentRevision: changed.revision,
        revision: snapshot.revision, variants: { photo: variant.hash }, operationId: "update-snapshot" })).json();
      expect(updated.revision).toBe(2);
      expect(await (await f.call(snapshot.url, "GET", undefined, false)).text()).toContain("Second edition");
      const switchedAt = f.time();
      f.setTime(switchedAt + 300000 - 1);
      expect((await f.call(asset, "HEAD", undefined, false)).status).toBe(200);
      f.setTime(switchedAt + 300000);
      expect((await f.call(asset, "GET", undefined, false)).status).toBe(404);
      f.setTime(switchedAt + 1);
      expect((await f.call(`/api/snapshots/${snapshot.id}`, "PATCH", { revision: 2, action: "revoke", operationId: "revoke" })).status).toBe(200);
      expect((await f.call(asset, "GET", undefined, false)).status).toBe(404);
      expect((await f.call(snapshot.url, "GET", undefined, false)).status).toBe(404);
      expect((await f.call(`/api/snapshots/${snapshot.id}/preview/`)).status).toBe(200);
    } finally { f.close(); }
  });
  it("preserves the previous version on failed updates and survives draft deletion", async () => {
    const f = await fixture();
    try {
      const created = await f.call("/api/snapshots", "POST", f.input); expect(created.status).toBe(201);
      const snapshot = await created.json(), html = await (await f.call(snapshot.url, "GET", undefined, false)).text();
      const repeat = await (await f.call("/api/snapshots", "POST", f.input)).json(); expect(repeat.id).toBe(snapshot.id);
      expect((await f.call(`/api/snapshots/${snapshot.id}/update`, "POST", { ...f.input, documentRevision: 999, revision: 1, operationId: "bad" })).status).toBe(409);
      expect(await (await f.call(snapshot.url, "GET", undefined, false)).text()).toBe(html);
      f.sqlite.exec("CREATE TRIGGER fail_snapshot_asset BEFORE INSERT ON snapshot_assets BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
      expect((await f.call(`/api/snapshots/${snapshot.id}/update`, "POST", { ...f.input, revision: 1, operationId: "failed-assets" })).status).toBe(503);
      expect(await (await f.call(snapshot.url, "GET", undefined, false)).text()).toBe(html);
      expect(f.sqlite.prepare("SELECT count(*) AS count FROM snapshot_versions").get()!.count).toBe(1);
      f.sqlite.exec("DROP TRIGGER fail_snapshot_asset");
      expect((await f.call(`/api/documents/${f.saved.documentId}`, "DELETE", { revision: 1, deletionIntent: "manual" })).status).toBe(200);
      expect(await (await f.call(snapshot.url, "GET", undefined, false)).text()).toBe(html);
      const renewed = await (await f.call(`/api/snapshots/${snapshot.id}`, "PATCH", { revision: 1, action: "reissue", operationId: "renew" })).json();
      expect(renewed.token).not.toBe(snapshot.token);
      expect((await f.call(snapshot.url, "GET", undefined, false)).status).toBe(404);
      expect((await f.call(renewed.url, "GET", undefined, false)).status).toBe(200);
      expect((await f.call(`/api/snapshots/${snapshot.id}`, "DELETE", { revision: 2 })).status).toBe(200);
      expect((await f.call(renewed.url, "GET", undefined, false)).status).toBe(404);
    } finally { f.close(); }
  });
  it("checks parent expiry for GET, HEAD and assets while retaining a private copy", async () => {
    const f = await fixture();
    try {
      const expiresAt = f.time() + 1000;
      const created = await f.call("/api/snapshots", "POST", { ...f.input, expiresAt: new Date(expiresAt).toISOString() });
      expect(created.status).toBe(201);
      const snapshot = await created.json(), html = await (await f.call(snapshot.url, "GET", undefined, false)).text();
      const asset = new URL(/<img[^>]*src="([^"]+)"/.exec(html)![1], `https://site.test${snapshot.url}`).pathname;
      f.setTime(expiresAt - 1);
      expect((await f.call(snapshot.url, "HEAD", undefined, false)).status).toBe(200);
      f.setTime(expiresAt);
      for (const path of [snapshot.url, asset]) for (const method of ["GET", "HEAD"]) {
        const response = await f.call(path, method, undefined, false);
        expect(response.status).toBe(404); expect(response.headers.get("cache-control")).toBe("no-store");
      }
      expect((await f.call(`/api/snapshots/${snapshot.id}/preview/`)).status).toBe(200);
      expect((await f.call(`/api/snapshots/${snapshot.id}/preview/`, "GET", undefined, false)).status).toBe(401);
      expect((await f.call("/api/snapshots", "GET", undefined, false)).status).toBe(401);
    } finally { f.close(); }
  });
});
