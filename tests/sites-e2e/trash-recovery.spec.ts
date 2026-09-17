import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { newDraft } from "@wonboard/document";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { syntheticPng } from "../helpers/sites-runtime";

const headers = { "X-Wonboard-Test-User": "owner-fixture", Origin: "http://127.0.0.1:5174" };
test.beforeEach(async ({ request, context }) => {
  expect((await request.post("/__sites-test/reset")).status()).toBe(204);
  await context.setExtraHTTPHeaders(headers);
  expect((await request.post("/api/sites/setup", { headers, data: { accepted: true, locale: "en" } })).status()).toBe(200);
});
async function seed(request: APIRequestContext, photo = false) {
  const draft = newDraft("en"); draft.document.title = "Private draft";
  draft.document.content.content = [{ type: "paragraph", content: [{ type: "text", text: "Saved original" }] }];
  const id = draft.document.documentId;
  if (photo) {
    const hash = createHash("sha256").update(syntheticPng).digest("hex");
    expect((await request.put("/api/media/photo", { headers: { ...headers, "Content-Type": "image/png" }, data: syntheticPng })).status()).toBe(200);
    draft.document.media.photo = { id: "photo", originalName: "p.png", mime: "image/png", width: 1, height: 1, size: syntheticPng.length, sha256: hash };
    draft.document.content.content.push({ type: "media", attrs: { mediaId: "photo" } });
  }
  expect((await request.put(`/api/documents/${id}`, { headers, data: draft.document })).status()).toBe(200);
  let url = "";
  if (photo) {
    const variant = await (await request.put(`/api/documents/${id}/media/photo/variant`, { headers: { ...headers, "Content-Type": "image/png" }, data: syntheticPng })).json();
    const result = await request.post(`/api/documents/${id}/publish`, { headers, data: { revision: 1, variants: { photo: variant.hash } } });
    expect(result.status()).toBe(200); url = (await result.json()).urls.photo;
  }
  return { id, url };
}
async function move(page: Page) {
  await page.locator(".document-row-actions button").click();
}
async function openTrash(page: Page, locale = "en") {
  await page.locator(".writing-library > footer").getByRole("button", { name: locale === "en" ? /^Trash/ : /^휴지통/ }).click();
}
async function expectCachedEdits(page: Page, text: string) {
  await expect.poll(() => page.evaluate(async expected => {
    const moduleUrl = "/apps/client/src/recoveryCache.ts";
    const { listRecovery } = await import(moduleUrl);
    return (await listRecovery()).some((copy: { draft: unknown }) => JSON.stringify(copy.draft).includes(expected));
  }, text)).toBe(true);
}
for (const action of ["update", "trash", "delete"] as const) test(`resume reconciles a clean current draft after remote ${action}`, async ({ page, request }) => {
  const { id } = await seed(request), path = `/api/documents/${id}`;
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "Document body" });
  await expect(editor).toContainText("Saved original");
  const stored = await (await request.get(path, { headers })).json();
  if (action === "delete") expect((await request.delete(path, { headers, data: { revision: stored.revision, deletionIntent: "manual" } })).status()).toBe(200);
  else expect((await request.put(path, { headers, data: { ...stored,
    ...(action === "trash" ? { trashedAt: new Date().toISOString() } : {
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Remote saved version" }] }] },
    }),
  } })).status()).toBe(200);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  if (action === "update") await expect(editor).toContainText("Remote saved version");
  else {
    await expect(editor).not.toContainText("Saved original");
    await expect(page.locator('.document-list[aria-label="My writing"] > button')).toHaveCount(1);
    if (action === "trash") { await openTrash(page); await expect(page.locator(".trash-row")).toHaveCount(1); }
  }
});
test("resume creates a fallback in the current interface language", async ({ page, request }) => {
  const { id } = await seed(request), path = `/api/documents/${id}`;
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Document body" })).toContainText("Saved original");
  await page.locator(".admin-bar select").selectOption("ko");
  const stored = await (await request.get(path, { headers })).json();
  expect((await request.delete(path, { headers, data: { revision: stored.revision, deletionIntent: "manual" } })).status()).toBe(200);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".tiptap")).not.toContainText("Saved original");
  await page.locator(".tiptap").fill("현재 언어로 작성");
  await expect.poll(async () => (await (await request.get("/api/documents", { headers })).json()).documents.some(
    (document: { locale: string; content: unknown }) => document.locale === "ko" && JSON.stringify(document.content).includes("현재 언어로 작성"),
  )).toBe(true);
});
test("resume preserves edits made while the clean current document is reloading", async ({ page, request }) => {
  const { id } = await seed(request), path = `/api/documents/${id}`;
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "Document body" });
  await expect(editor).toContainText("Saved original");
  const stored = await (await request.get(path, { headers })).json();
  expect((await request.put(path, { headers, data: { ...stored, title: "Remote update" } })).status()).toBe(200);
  let loading = false;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**${path}`, async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch(); loading = true; await pending;
    await route.fulfill({ response });
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => loading).toBe(true);
  await editor.fill("My new edits");
  release();
  await expect(editor).toContainText("My new edits");
  await expect(page.getByRole("alert")).toContainText("Another tab changed this document");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download original document JSON" }).click();
  const download = await downloading;
  expect(await readFile((await download.path())!, "utf8")).toContain("My new edits");
  expect(JSON.stringify(await (await request.get(path, { headers })).json())).toContain("Saved original");
});
test("resume refreshes a suspended monotonic clock, fails closed and retries without revoking photos", async ({ page, request }) => {
  const { id, url } = await seed(request, true);
  await page.addInitScript(() => Object.defineProperty(performance, "now", { value: () => 1000 }));
  await page.goto("/");
  await move(page);
  await page.getByRole("dialog", { name: "Move to trash" }).getByRole("button", { name: "Move to trash" }).click();
  await openTrash(page);
  await expect(page.locator(".trash-row")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Restore document", exact: true })).toBeEnabled();
  expect((await request.post(`/__sites-test/advance-clock/${31 * 86400000}`)).status()).toBe(204);
  let syncAttempts = 0;
  const listPath = /\/api\/documents(?:\?.*)?$/;
  await page.route(listPath, route => { syncAttempts++; return route.abort(); });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => syncAttempts).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Restore document", exact: true })).toBeDisabled();
  await expect(page.locator(".trash-row")).toHaveCount(1);
  expect((await request.get(`/api/documents/${id}`, { headers })).status()).toBe(410);
  expect((await request.get(url)).status()).toBe(200);
  await page.unroute(listPath);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".trash-row")).toHaveCount(0);
  await expect.poll(async () => (await request.get(`/api/documents/${id}`, { headers })).status()).toBe(404);
  expect((await request.get(url)).status()).toBe(200);
});
for (const offsetDays of [-31, 31]) test(`Sites trash uses server time with device skew ${offsetDays} days`, async ({ page, request }) => {
  const { id, url } = await seed(request, true);
  await page.clock.setFixedTime(new Date(Date.now() + offsetDays * 86400000));
  await page.goto("/");
  await move(page);
  await page.getByRole("dialog", { name: "Move to trash" }).getByRole("button", { name: "Move to trash" }).click();
  await expect(page.getByRole("dialog", { name: "Move to trash" })).toHaveCount(0);
  await expect.poll(async () => (await (await request.get(`/api/documents/${id}`, { headers })).json()).trashedAt).toBeDefined();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Document body" })).toBeVisible();
  expect((await request.get(`/api/documents/${id}`, { headers })).status()).toBe(200);
  await openTrash(page);
  await expect(page.locator(".trash-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Restore document", exact: true }).click();
  await expect(page.locator(".trash-row")).toHaveCount(0);
  expect((await (await request.get(`/api/documents/${id}`, { headers })).json()).trashedAt).toBeUndefined();
  await page.reload();
  await move(page);
  await page.getByRole("dialog", { name: "Move to trash" }).getByRole("button", { name: "Move to trash" }).click();
  await openTrash(page);
  await page.getByRole("button", { name: "Delete permanently now", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete permanently now" }).getByRole("button", { name: "Delete permanently now" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await request.get(`/api/documents/${id}`, { headers })).status()).toBe(404);
  expect((await request.get(url)).status()).toBe(200);
});
test("expired drafts remain discoverable for cleanup retry without returning content or withdrawing photos", async ({ page, request }) => {
  const { id, url } = await seed(request, true), path = `/api/documents/${id}`;
  expect((await request.post(`/__sites-test/expired-document/${id}`)).status()).toBe(204);
  expect((await request.get(path, { headers })).status()).toBe(410);
  let failedDeletes = 0;
  await page.route(`**${path}`, route => {
    if (route.request().method() === "DELETE") {
      failedDeletes++;
      return route.fulfill({ status: 503, json: { error: "storageFailed" } });
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Document body" })).toBeVisible();
  expect(failedDeletes).toBe(1);
  await openTrash(page);
  await expect(page.locator(".trash-row")).toHaveCount(0);
  const retained = (await (await request.get("/api/documents", { headers })).json()).documents;
  expect(retained).toHaveLength(1);
  expect(retained[0].title).toBe("");
  expect(JSON.stringify(retained)).not.toContain("Saved original");
  expect((await request.get(url)).status()).toBe(200);
  await page.unroute(`**${path}`);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Document body" })).toBeVisible();
  expect((await request.get(path, { headers })).status()).toBe(404);
  expect((await request.get(url)).status()).toBe(200);
});
test("public photos remain unless explicitly withdrawn when moving or removing a draft", async ({ page, request }) => {
  for (const action of ["keep", "move", "remove"] as const) {
    let rejectWithdrawal = action === "move";
    await page.route("**/api/documents/*/publications", route => {
      if (route.request().method() === "DELETE" && rejectWithdrawal) {
        rejectWithdrawal = false; return route.abort();
      }
      return route.continue();
    });
    const { url } = await seed(request, true); await page.goto("/"); await move(page);
    let dialog = page.getByRole("dialog", { name: "Move to trash" });
    await expect(dialog.getByRole("checkbox")).not.toBeChecked();
    if (action === "move") await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Move to trash" }).click();
    await expect(dialog).toHaveCount(0);
    if (action === "move") {
      await expect(page.getByText("The document is in trash, but its photo URLs could not be turned off.")).toBeVisible();
      expect((await request.get(url)).status()).toBe(200);
      await page.getByRole("button", { name: "Try again", exact: true }).click();
      await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
    }
    expect((await request.get(url)).status()).toBe(action === "move" ? 404 : 200);
    await openTrash(page);
    await page.getByRole("button", { name: "Delete permanently now", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "Delete permanently now" });
    if (action === "remove") await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Delete permanently now" }).click();
    await expect(dialog).toHaveCount(0);
    expect((await request.get(url)).status()).toBe(action === "keep" ? 200 : 404);
  }
});
test("offline editing can be recovered explicitly after reopening online", async ({ page, context, request }) => {
  const { id } = await seed(request); await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Document body" })).toContainText("Saved original");
  await context.setOffline(true);
  await page.getByRole("textbox", { name: "Document body" }).fill("Offline recovery text");
  await expect(page.locator(".notice.error")).toBeVisible();
  await expectCachedEdits(page, "Offline recovery text");
  await page.close(); await context.setOffline(false);
  page = await context.newPage(); await page.goto("/");
  await expect(page.getByRole("button", { name: "Recover edits", exact: true })).toBeVisible();
  await expect(page.locator(".tiptap")).toHaveAttribute("contenteditable", "false");
  await page.getByRole("button", { name: "Recover edits", exact: true }).click();
  await expect(page.locator(".recovery-notice")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Document body" })).toContainText("Offline recovery text");
  expect(JSON.stringify(await (await request.get(`/api/documents/${id}`, { headers })).json())).toContain("Offline recovery text");
});
test("a recovery copy never silently revives a document moved to trash elsewhere", async ({ page, context, request }) => {
  const { id } = await seed(request); await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Document body" })).toBeVisible();
  await context.setOffline(true); await page.getByRole("textbox", { name: "Document body" }).fill("My previous edits");
  await expect(page.locator(".notice.error")).toBeVisible();
  await expectCachedEdits(page, "My previous edits");
  await page.close(); await context.setOffline(false);
  const other = await context.newPage(); await other.goto("/");
  await move(other);
  await expect(other.getByRole("button", { name: "Undo move" })).toBeVisible();
  await other.close(); page = await context.newPage(); await page.goto("/");
  await expect(page.getByRole("button", { name: "Recover edits", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Recover as new document" }).click();
  await expect(page.locator(".recovery-notice")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Document body" })).toContainText("My previous edits");
  expect((await (await request.get(`/api/documents/${id}`, { headers })).json()).trashedAt).toBeDefined();
  const listed = await (await request.get("/api/documents", { headers })).json();
  expect(listed.documents.filter((d: { trashedAt?: string }) => !d.trashedAt)).toHaveLength(1);
});
test("trash rows and photo confirmation dialogs fit Korean and English at desktop and mobile widths", async ({ page, request }, testInfo) => {
  const measurements: unknown[] = [];
  for (const locale of ["ko", "en"] as const) for (const width of [1440, 390]) {
    const { id } = await seed(request, true);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/");
    await page.locator(".admin-bar select").selectOption(locale);
    await page.setViewportSize({ width, height: 900 });
    await move(page);
    const dialog = page.locator(".trash-dialog");
    await expect(dialog).toBeVisible();
    async function capture(name: string, selector: string) {
      const values = await page.locator(selector).evaluateAll(nodes => nodes.map(node => ({
        scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, x: node.getBoundingClientRect().x, right: node.getBoundingClientRect().right
      })));
      expect(values.length).toBeGreaterThan(0);
      for (const value of values) { expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth); expect(value.x).toBeGreaterThanOrEqual(0); expect(value.right).toBeLessThanOrEqual(width); }
      measurements.push({ locale, width, name, values });
      await page.screenshot({ path: testInfo.outputPath(`trash-${locale}-${width}-${name}.png`) });
    }
    await capture("move", ".trash-dialog");
    await dialog.getByRole("button", { name: locale === "en" ? "Move to trash" : "휴지통으로 이동", exact: true }).click();
    await expect(dialog).toHaveCount(0); await openTrash(page, locale);
    await expect(page.locator(".trash-row")).toContainText(locale === "en" ? "Cannot restore in 30 days" : "30일 뒤 복원 불가");
    await capture("list", ".trash-row");
    await page.locator(".trash-row").last().getByRole("button", { name: locale === "en" ? "Delete permanently now" : "지금 영구 삭제", exact: true }).click();
    await expect(dialog).toBeVisible(); await capture("remove", ".trash-dialog");
    await dialog.getByRole("button", { name: locale === "en" ? "Delete permanently now" : "지금 영구 삭제", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect((await request.get(`/api/documents/${id}`, { headers })).status()).toBe(404);
  }
  expect(measurements).toHaveLength(12);
  await testInfo.attach("trash-layout-measurements", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
});
