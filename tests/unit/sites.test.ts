import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleSitesRequest } from "../../apps/server/src/sites/worker";
import { createSitesTestRuntime, createSyntheticPng, syntheticPng } from "../helpers/sites-runtime";
import { newDraft, sha256, type WriterDocument } from "@wonboard/document";
import { readImage, readJson } from "../../apps/server/src/sites/http";

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
  it("lists the trash timestamp from document JSON", async () => {
    await setup();
    const document = { ...newDraft().document, trashedAt: "2026-09-15T00:00:00.000Z" };
    databaseClock(Date.parse(document.trashedAt));
    expect((await call(`/api/documents/${document.documentId}`, "PUT", document)).status).toBe(200);
    const listed = await (await call("/api/documents")).json();
    expect(listed.documents[0].trashedAt).toBe(document.trashedAt);
  });
  it("does not withdraw photos when removal loses a revision race", async () => {
    const document = await photoDocument(), urls = await publish(document);
    expect((await call(`/api/documents/${document.documentId}`, "DELETE", { revision: 0, withdrawPublications: true })).status).toBe(409);
    expect((await call(`/api/documents/${document.documentId}`)).status).toBe(200);
    expect((await call(new URL(urls).pathname, "GET", undefined, null)).status).toBe(200);
  });
  it("preserves distributed photos even for legacy withdrawal flags and enforces owner and origin", async () => {
    for (const withdrawPublications of [false, true]) {
      const document = await photoDocument(), urls = await publish(document);
      const path = `/api/documents/${document.documentId}`, body = { revision: document.revision, withdrawPublications, deletionIntent: "manual" };
      expect((await call(path, "DELETE", body, null)).status).toBe(401);
      expect((await call(path, "DELETE", body, "another-user")).status).toBe(403);
      expect((await call(path, "DELETE", body, "owner-fixture", "https://other.test")).status).toBe(403);
      expect((await call(path, "DELETE", body)).status).toBe(200);
      expect((await call(path, "DELETE", body)).status).toBe(200);
      expect((await call(path)).status).toBe(404);
      expect((await call(new URL(urls).pathname, "GET", undefined, null)).status).toBe(200);
      expect((await call("/api/media/photo")).status).toBe(200);
      expect((await call(`${path}/publications`).then(r => r.json()))).toHaveLength(1);
    }
  });
  async function setup() { expect((await call("/api/sites/setup", "POST", { accepted: true, locale: "ko" })).status).toBe(200); }
  it("anchors new and active trash timestamps to the database clock", async () => {
    await setup();
    const now = Date.parse("2026-09-16T12:00:00.123Z");
    databaseClock(now);
    for (const initiallySaved of [false, true]) {
      let document = newDraft().document;
      const path = `/api/documents/${document.documentId}`;
      if (initiallySaved) document = await (await call(path, "PUT", document)).json();
      const saved = await (await call(path, "PUT", { ...document, trashedAt: "2099-01-01T00:00:00.000Z" })).json();
      expect(saved.trashedAt).toBe(new Date(now).toISOString());
      expect((await (await call(path)).json()).trashedAt).toBe(saved.trashedAt);
    }
  });
  it("rejects trash timestamp replacement but accepts unchanged legacy saves and restoration", async () => {
    await setup();
    const now = Date.parse("2026-09-16T12:00:00.123Z");
    const clock = databaseClock(now), document = newDraft().document;
    const path = `/api/documents/${document.documentId}`;
    let saved = await (await call(path, "PUT", { ...document, trashedAt: new Date(now).toISOString() })).json();
    clock(now + 1000);
    for (const replacement of ["2099-01-01T00:00:00.000Z", "2026-09-15T00:00:00.000Z"]) {
      expect((await call(path, "PUT", { ...saved, trashedAt: replacement })).status).toBe(409);
    }
    saved = await (await call(path, "PUT", { ...saved, title: "legacy save" })).json();
    expect(saved.trashedAt).toBe(new Date(now).toISOString());
    const restored = await (await call(path, "PUT", { ...saved, trashedAt: undefined })).json();
    expect(restored.trashedAt).toBeUndefined();
    expect(restored.revision).toBe(saved.revision + 1);
  });
  it("preserves unexpired trash for legacy and automatic deletion regardless of device clock", async () => {
    const document = await photoDocument(), url = await publish(document);
    const now = Date.parse("2026-09-16T12:00:00.123Z"), clock = databaseClock(now);
    const path = `/api/documents/${document.documentId}`;
    const saved = await (await call(path, "PUT", { ...document, trashedAt: "2099-01-01T00:00:00.000Z" })).json();
    for (const deletionIntent of [undefined, "expired"]) {
      expect((await call(path, "DELETE", { revision: saved.revision, deletionIntent, withdrawPublications: true })).status).toBe(409);
      expect((await call(path)).status).toBe(200);
      expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
    }
    clock(now + 30 * 86400000 - 1);
    expect((await call(path, "DELETE", { revision: saved.revision, deletionIntent: "expired" })).status).toBe(409);
    clock(now + 30 * 86400000);
    expect((await call(path, "DELETE", { revision: saved.revision })).status).toBe(200);
    expect((await call(path, "DELETE", { revision: saved.revision, deletionIntent: "expired" })).status).toBe(200);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
  it("bounds legacy future trash by server updated_at and freezes the canonical value on save", async () => {
    const document = await photoDocument(), path = `/api/documents/${document.documentId}`;
    const start = Date.parse("2026-09-16T12:00:00.123Z"), clock = databaseClock(start + 1000);
    const legacy = { ...document, trashedAt: "2099-01-01T00:00:00.000Z" };
    runtime.sqlite.prepare("UPDATE documents SET body=?,updated_at=? WHERE id=?")
      .run(JSON.stringify(legacy), new Date(start).toISOString(), document.documentId);
    const loaded = await (await call(path)).json();
    expect(loaded.trashedAt).toBe(new Date(start).toISOString());
    expect((await (await call("/api/documents")).json()).documents[0].trashedAt).toBe(loaded.trashedAt);
    expect((await call(path, "PUT", legacy)).status).toBe(409);
    const saved = await (await call(path, "PUT", { ...loaded, title: "safe legacy save" })).json();
    expect(saved.trashedAt).toBe(loaded.trashedAt);
    clock(start + 30 * 86400000);
    expect((await call(path)).status).toBe(410);
    expect((await call(`${path}/publish`, "POST", { revision: saved.revision, variants: {} })).status).toBe(410);
    expect((await call(path, "DELETE", { revision: saved.revision })).status).toBe(200);
  });
  it("preserves distributed photos on both sides of legacy deletion expiry", async () => {
    const document = await photoDocument(), url = await publish(document);
    const start = Date.parse("2026-09-16T12:00:00.123Z"), clock = databaseClock(start);
    const path = `/api/documents/${document.documentId}`;
    const saved = await (await call(path, "PUT", { ...document, trashedAt: new Date(start).toISOString() })).json();
    clock(start + 30 * 86400000 - 1);
    expect((await call(path, "DELETE", { revision: saved.revision, withdrawPublications: true })).status).toBe(409);
    expect(runtime.sqlite.prepare("SELECT id FROM documents WHERE id=?").get(document.documentId)).toBeDefined();
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
    clock(start + 30 * 86400000);
    expect((await call(path, "DELETE", { revision: saved.revision, withdrawPublications: true })).status).toBe(200);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
  it("does not execute photo withdrawal SQL during draft deletion", async () => {
    const document = await photoDocument(), url = await publish(document);
    runtime.sqlite.exec("CREATE TRIGGER fail_withdraw BEFORE UPDATE ON publications BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
    const path = `/api/documents/${document.documentId}`;
    expect((await call(path, "DELETE", { revision: document.revision, deletionIntent: "manual", withdrawPublications: true })).status).toBe(200);
    expect((await call(path)).status).toBe(404);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
  it("expires an untouched legacy future timestamp consistently across every owner path", async () => {
    const document = await photoDocument(), url = await publish(document);
    const path = `/api/documents/${document.documentId}`;
    databaseClock(Date.parse("2026-09-16T12:00:00.123Z"));
    const legacy = { ...document, trashedAt: "2099-01-01T00:00:00.000Z" };
    runtime.sqlite.prepare("UPDATE documents SET body=?,updated_at=? WHERE id=?")
      .run(JSON.stringify(legacy), "2026-08-01T12:00:00.123Z", document.documentId);
    expect((await call(path)).status).toBe(410);
    expect((await call(path, "PUT", legacy)).status).toBe(410);
    expect((await call(`${path}/publish`, "POST", { revision: document.revision, variants: {} })).status).toBe(410);
    expect((await call(`${path}/media/photo/variant`, "PUT", syntheticPng)).status).toBe(410);
    const [listed] = (await (await call("/api/documents")).json()).documents;
    expect(listed).toMatchObject({ title: "", trashedAt: "2026-08-01T12:00:00.123Z" });
    expect((await call(path, "DELETE", { revision: document.revision })).status).toBe(200);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
  function databaseClock(initial: number) {
    let now = initial;
    runtime.sqlite.function("strftime", (format, value) => {
      if (value !== "now") throw new Error("Unexpected clock input");
      if (format === "%s") return String(Math.floor(now / 1000));
      if (format === "%f") return new Date(now).toISOString().slice(17, 23);
      throw new Error("Unexpected clock format");
    });
    return (value: number) => { now = value; };
  }
  it("expires private content while preserving legacy cleanup metadata and public photos", async () => {
    const document = await photoDocument(), url = await publish(document);
    const path = `/api/documents/${document.documentId}`;
    const expiry = Date.parse("2026-10-16T12:00:00.123Z"), clock = databaseClock(expiry - 30 * 86400000);
    const trashedAt = new Date(expiry - 30 * 86400000).toISOString();
    const trashed = await (await call(path, "PUT", { ...document, trashedAt })).json();
    clock(expiry - 1);
    expect((await call(path)).status).toBe(200);
    clock(expiry);
    expect((await call(path)).status).toBe(410);
    for (const timestamp of [undefined, new Date(expiry + 86400000).toISOString(), trashedAt]) {
      expect((await call(path, "PUT", { ...trashed, trashedAt: timestamp })).status).toBe(410);
    }
    expect((await call(`${path}/publish`, "POST", { revision: trashed.revision, variants: {} })).status).toBe(410);
    expect((await call(`${path}/media/photo/variant`, "PUT", syntheticPng)).status).toBe(410);
    const metadata = (await (await call("/api/documents")).json()).documents[0];
    expect(metadata).toMatchObject({ documentId: document.documentId, revision: trashed.revision, trashedAt, title: "" });
    expect(metadata.content.content[0].content).toEqual([]);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
    expect((await call(path, "DELETE", { revision: metadata.revision })).status).toBe(200);
    expect((await call(path, "DELETE", { revision: metadata.revision })).status).toBe(200);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
  it("rejects restoration when the SQL write reaches the deadline after the read", async () => {
    const document = await photoDocument(), path = `/api/documents/${document.documentId}`;
    const expiry = Date.parse("2026-10-16T12:00:00.123Z"), clock = databaseClock(expiry - 30 * 86400000);
    const trashedAt = new Date(expiry - 30 * 86400000).toISOString();
    const trashed = await (await call(path, "PUT", { ...document, trashedAt })).json();
    clock(expiry - 1);
    const prepare = runtime.env.DB.prepare.bind(runtime.env.DB);
    runtime.env.DB.prepare = sql => {
      const statement = prepare(sql);
      if (sql.startsWith("UPDATE documents SET revision")) {
        const run = statement.run.bind(statement);
        statement.run = async () => { clock(expiry); return run(); };
      }
      return statement;
    };
    expect((await call(path, "PUT", { ...trashed, trashedAt: undefined })).status).toBe(409);
    expect(JSON.parse(String(runtime.sqlite.prepare("SELECT body FROM documents WHERE id = ?").get(document.documentId)!.body)).trashedAt).toBe(trashedAt);
  });
  it("checks expiry inside publication writes without withdrawing existing public photos", async () => {
    const document = await photoDocument(), url = await publish(document);
    const path = `/api/documents/${document.documentId}`;
    const expiry = Date.parse("2026-10-16T12:00:00.123Z"), clock = databaseClock(expiry - 30 * 86400000);
    const trashed = await (await call(path, "PUT", { ...document, trashedAt: new Date(expiry - 30 * 86400000).toISOString() })).json();
    clock(expiry - 1);
    const variant = await (await call(`${path}/media/photo/variant`, "PUT", syntheticPng)).json();
    const batch = runtime.env.DB.batch.bind(runtime.env.DB);
    runtime.env.DB.batch = statements => { clock(expiry); return batch(statements); };
    expect((await call(`${path}/publish`, "POST", { revision: trashed.revision, variants: { photo: variant.hash } })).status).toBe(409);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
  it("allows restoration just before expiry and retains optimistic revision conflicts", async () => {
    const document = await photoDocument(), path = `/api/documents/${document.documentId}`;
    const expiry = Date.parse("2026-10-16T12:00:00.123Z");
    const clock = databaseClock(expiry - 30 * 86400000);
    const trashed = await (await call(path, "PUT", { ...document, trashedAt: new Date(expiry - 30 * 86400000).toISOString() })).json();
    clock(expiry - 1);
    expect((await call(path, "PUT", { ...document, trashedAt: undefined })).status).toBe(409);
    expect((await call(path, "PUT", { ...trashed, trashedAt: undefined })).status).toBe(200);
    expect((await (await call(path)).json()).trashedAt).toBeUndefined();
  });
  it("publishes all photos using one deadline decision even if time advances after the write", async () => {
    let document = await photoDocument();
    const path = `/api/documents/${document.documentId}`;
    expect((await call("/api/media/second", "PUT", syntheticPng)).status).toBe(200);
    document.media.second = { ...document.media.photo, id: "second" };
    document.content.content!.push({ type: "media", attrs: { mediaId: "second" } });
    const expiry = Date.parse("2026-10-16T12:00:00.123Z"), clock = databaseClock(expiry - 30 * 86400000);
    document = await (await call(path, "PUT", { ...document, trashedAt: new Date(expiry - 30 * 86400000).toISOString() })).json();
    clock(expiry - 1);
    const variants: Record<string, string> = {};
    for (const id of ["photo", "second"]) {
      variants[id] = (await (await call(`${path}/media/${id}/variant`, "PUT", syntheticPng)).json()).hash;
    }
    const batch = runtime.env.DB.batch.bind(runtime.env.DB);
    runtime.env.DB.batch = statements => batch(statements.map(statement => {
      const run = statement.run.bind(statement);
      statement.run = async () => { const result = await run(); clock(expiry); return result; };
      return statement;
    }));
    const response = await call(`${path}/publish`, "POST", { revision: document.revision, variants });
    expect(response.status).toBe(200);
    expect(Object.keys((await response.json()).urls)).toHaveLength(2);
    expect(runtime.sqlite.prepare("SELECT count(*) AS count FROM publications WHERE published = 1").get()!.count).toBe(2);
  });
  it("uses the stored timestamp including legacy Date.parse formats and does not trust revision zero", async () => {
    const document = await photoDocument(), path = `/api/documents/${document.documentId}`;
    const expiry = Date.parse("2026-10-16T12:00:00.000Z"), clock = databaseClock(expiry - 30 * 86400000);
    const trashed = await (await call(path, "PUT", { ...document, trashedAt: new Date(expiry - 30 * 86400000).toUTCString() })).json();
    trashed.trashedAt = new Date(expiry - 30 * 86400000).toUTCString();
    runtime.sqlite.prepare("UPDATE documents SET body=? WHERE id=?").run(JSON.stringify(trashed), document.documentId);
    clock(expiry + 1);
    expect((await call(path, "PUT", { ...trashed, trashedAt: undefined, revision: 0 })).status).toBe(409);
    expect((await call(path, "PUT", { ...trashed, trashedAt: undefined })).status).toBe(410);
    expect((await call(path)).status).toBe(410);
  });
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

  it("keeps a successful publication successful when a later save changes revision", async () => {
    const document = await photoDocument();
    const batch = runtime.env.DB.batch.bind(runtime.env.DB);
    runtime.env.DB.batch = async statements => {
      const result = await batch(statements);
      const changed = { ...document, revision: document.revision + 1 };
      runtime.sqlite.prepare("UPDATE documents SET revision = ?, body = ? WHERE id = ?").run(changed.revision, JSON.stringify(changed), document.documentId);
      return result;
    };
    const url = await publish(document);
    expect((await call(new URL(url).pathname, "GET", undefined, null)).status).toBe(200);
  });
  it("does not publish when the revision changes before the conditional transaction", async () => {
    const document = await photoDocument();
    const variant = await (await call(`/api/documents/${document.documentId}/media/photo/variant`, "PUT", syntheticPng)).json();
    const batch = runtime.env.DB.batch.bind(runtime.env.DB);
    runtime.env.DB.batch = async statements => {
      runtime.sqlite.prepare("UPDATE documents SET revision = revision + 1 WHERE id = ?").run(document.documentId);
      return batch(statements);
    };
    expect((await call(`/api/documents/${document.documentId}/publish`, "POST", { revision: document.revision, variants: { photo: variant.hash } })).status).toBe(409);
    expect(runtime.sqlite.prepare("SELECT count(*) AS count FROM publications WHERE published = 1").get()!.count).toBe(0);
  });
  it("accepts the full Korean text budget in JSON", async () => {
    const text = "한".repeat(2_000_000);
    const result = await readJson(new Request(origin, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }));
    expect(result.text).toBe(text);
  });
  it("uses EXIF orientation and accepts trailing camera data after JPEG EOI", async () => {
    for (const orientation of [1, 6, 8]) {
      const exif = Buffer.alloc(32); exif.write("Exif\0\0", 0, "binary"); exif.write("II", 6); exif.writeUInt16LE(42, 8); exif.writeUInt32LE(8, 10);
      exif.writeUInt16LE(1, 14); exif.writeUInt16LE(0x112, 16); exif.writeUInt16LE(3, 18); exif.writeUInt32LE(1, 20); exif.writeUInt16LE(orientation, 24);
      const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, exif.length + 2]), exif]);
      const bytes = Buffer.concat([Buffer.from([0xff, 0xd8]), app1, Buffer.from([0xff, 0xc0, 0, 8, 8, 0, 2, 0, 3, 1, 0xff, 0xda, 0, 2, 12, 0xff, 0, 4, 0xff, 0xd9]), Buffer.from("camera trailer")]);
      const image = await readImage(new Request(origin, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: bytes }));
      expect([image.width, image.height]).toEqual(orientation === 1 ? [3, 2] : [2, 3]);
      const truncated = bytes.subarray(0, bytes.indexOf(Buffer.from([0xff, 0xd9])));
      await expect(readImage(new Request(origin, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: truncated }))).rejects.toThrow("invalidImage");
    }
  });

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
