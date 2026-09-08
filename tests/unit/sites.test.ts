import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleSitesRequest } from "../../apps/server/src/sites/worker";
import { createSitesTestRuntime, createSyntheticPng, syntheticPng } from "../helpers/sites-runtime";
import { newDraft, sha256, type WriterDocument } from "@wonboard/document";

describe("personal Sites API with real SQLite and simulated R2/identity", () => {
  let runtime: ReturnType<typeof createSitesTestRuntime>;
  const origin = "https://personal.wonboard.test";
  async function call(path: string, method = "GET", body?: unknown, user: string | null = "owner-fixture", from = origin) {
    const binary = body instanceof Uint8Array;
    return handleSitesRequest(new Request(origin + path, { method,
      headers: { ...(user ? { "oai-authenticated-user-id": user } : {}),
        ...(method !== "GET" && method !== "HEAD" ? { Origin: from } : {}),
        ...(body !== undefined ? { "Content-Type": binary ? "image/png" : "application/json" } : {}) },
      body: body === undefined ? undefined : binary ? new Blob([body as Uint8Array<ArrayBuffer>]) : JSON.stringify(body),
    }), runtime.env);
  }
  async function setup() { expect((await call("/api/sites/setup", "POST", { accepted: true, locale: "ko" })).status).toBe(200); }
  async function photoDocument() {
    await setup();
    expect((await call("/api/media/photo", "PUT", syntheticPng)).status).toBe(200);
    const draft = newDraft();
    draft.document.title = "한글 공략";
    const bytes = new Uint8Array(syntheticPng).buffer;
    draft.document.media.photo = { id: "photo", originalName: "capture.png", mime: "image/png", width: 1, height: 1, size: bytes.byteLength, sha256: await sha256(bytes) };
    draft.document.content.content!.push({ type: "media", attrs: { mediaId: "photo", width: 320 } });
    const response = await call(`/api/documents/${draft.document.documentId}`, "PUT", draft.document);
    expect(response.status).toBe(200);
    return response.json() as Promise<WriterDocument>;
  }
  async function publish(document: WriterDocument) {
    const variant = await (await call(`/api/documents/${document.documentId}/media/photo/variant`, "PUT", syntheticPng)).json();
    const response = await call(`/api/documents/${document.documentId}/publish`, "POST", { revision: document.revision, variants: { photo: variant.hash } });
    expect(response.status).toBe(200);
    return (await response.json()).urls.photo as string;
  }
  beforeEach(() => { runtime = createSitesTestRuntime(); });
  afterEach(() => runtime.close());

  it("fails closed before owner binding and prevents public first-visitor ownership claims", async () => {
    runtime.env.WONBOARD_OWNER_ID = undefined;
    expect((await (await call("/api/sites/session")).json()).configured).toBe(false);
    expect((await call("/api/sites/setup", "POST", { accepted: true, locale: "ko" })).status).toBe(403);
    expect(runtime.sqlite.prepare("SELECT count(*) AS count FROM installation").get()!.count).toBe(0);
  });
  it("requires acknowledgement and owner authorization on every private operation", async () => {
    expect((await call("/api/documents")).status).toBe(403);
    expect((await call("/api/sites/setup", "POST", { accepted: false, locale: "ko" })).status).toBe(400);
    await setup();
    for (const user of [null, "another-user"]) {
      for (const [path, method, body] of [["/api/documents", "GET"], ["/api/media/photo", "GET"], ["/api/media/photo", "PUT", syntheticPng], ["/api/documents/test/publications", "DELETE"], ["/api/sites/setup", "POST", { accepted: true, locale: "ko" }]] as const) {
        expect((await call(path, method, body, user)).status).toBe(user ? 403 : 401);
      }
    }
    runtime.env.WONBOARD_OWNER_ID = "another-user";
    expect((await call("/api/sites/session", "GET", undefined, "another-user").then(r => r.json())).owner).toBe(false);
  });
  it("rejects foreign origins and does not implement platform sign-in routes", async () => {
    expect((await call("/api/sites/setup", "POST", { accepted: true, locale: "en" }, "owner-fixture", "https://evil.test")).status).toBe(403);
    expect((await call("/signin-with-chatgpt")).status).toBe(404);
  });
  it("stores verified originals privately and refuses changed bytes under an existing ID", async () => {
    const document = await photoDocument();
    const response = await call("/api/media/photo");
    expect(await sha256(await response.arrayBuffer())).toBe(document.media.photo.sha256);
    expect((await call("/media/photo", "GET", undefined, null)).status).toBe(404);
    expect((await call("/api/media/photo", "PUT", createSyntheticPng(90))).status).toBe(409);
    expect(await sha256(await (await call("/api/media/photo")).arrayBuffer())).toBe(document.media.photo.sha256);
    const bad = { ...document, media: { photo: { ...document.media.photo, width: 2 } } };
    expect((await call(`/api/documents/${document.documentId}`, "PUT", bad)).status).toBe(400);
    expect((await call("/api/media/unsafe", "PUT", new TextEncoder().encode("<svg/>"))).status).toBe(400);
  });
  it("persists documents and rejects a stale second writer without losing the first", async () => {
    const document = await photoDocument();
    const path = `/api/documents/${document.documentId}`;
    const outcomes = await Promise.all([call(path, "PUT", { ...document, title: "First" }), call(path, "PUT", { ...document, title: "Second" })]);
    expect(outcomes.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await (await call(path)).json()).revision).toBe(2);
    const page = await (await call("/api/documents")).json();
    expect(page.documents).toHaveLength(1);
    expect(page.documents[0].media).toEqual({});
  });
  it("stores inline writing styles without exposing the draft publicly", async () => {
    await setup();
    const { document } = newDraft();
    document.content.content = [{ type: "paragraph", content: [{ type: "text", text: "비공개 한글 English", marks: [
      { type: "textStyle", attrs: { fontFamily: "soft", fontSize: 24, highlight: "#fff0a3" } },
    ] }] }];
    const path = `/api/documents/${document.documentId}`;
    expect((await call(path, "PUT", document)).status).toBe(200);
    expect((await (await call(path)).json()).content).toEqual(document.content);
    expect((await call(path, "GET", undefined, null)).status).toBe(401);
  });
  it("publishes unsigned anonymous URLs with stable IDs across rename and a new handler invocation", async () => {
    let document = await photoDocument();
    const url = await publish(document);
    const image = await call(new URL(url).pathname, "GET", undefined, null);
    expect(image.status).toBe(200);
    expect(image.headers.get("Content-Type")).toBe("image/png");
    expect(image.headers.get("Cache-Control")).toBe("no-store");
    expect(image.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(new URL(url).search).toBe("");
    expect(await sha256(await image.arrayBuffer())).toBe(document.media.photo.sha256);
    document = await (await call(`/api/documents/${document.documentId}`, "PUT", { ...document, title: "바뀐 제목" })).json();
    expect(await publish(document)).toBe(url);
    expect((await call(new URL(url).pathname, "HEAD", undefined, null)).headers.get("Content-Disposition")).toContain(encodeURIComponent("바뀐 제목"));
  });
  it("keeps published photos when removed from a draft and withdraws every public URL explicitly", async () => {
    let document = await photoDocument();
    const url = await publish(document);
    document = await (await call(`/api/documents/${document.documentId}`, "PUT", { ...document, content: newDraft().document.content, media: {} })).json();
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
    expect((await call(`/api/documents/${document.documentId}/publications`, "DELETE")).status).toBe(200);
    const hidden = await call(new URL(url).pathname, "GET", undefined, null);
    expect(hidden.status).toBe(404);
    expect(hidden.headers.get("Cache-Control")).toBe("no-store");
    expect((await call("/api/media/photo")).status).toBe(200);
  });
  it("restores the same URL and does not expose a partially uploaded publication", async () => {
    const document = await photoDocument();
    const before = await call(`/api/documents/${document.documentId}/publish`, "POST", { revision: 1, variants: { photo: "0".repeat(64) } });
    expect(before.status).toBe(400);
    expect(await (await call(`/api/documents/${document.documentId}/publications`)).json()).toEqual([]);
    const url = await publish(document);
    await call(`/api/documents/${document.documentId}/publications`, "DELETE");
    expect(await publish(document)).toBe(url);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
});
