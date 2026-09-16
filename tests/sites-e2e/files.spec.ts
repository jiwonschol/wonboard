import { test, expect } from "@playwright/test";
import { newDraft } from "@wonboard/document";

const owner = { "X-Wonboard-Test-User": "owner-fixture", Origin: "http://127.0.0.1:5174" };
test("a rejected private-file export clears old HTML and uses server share activity", async ({ page, request }) => {
  const file = await (await request.put("/api/files/export-file?name=file.txt", { headers: { ...owner, "Content-Type": "text/plain" }, data: "private bytes" })).json();
  const draft = newDraft("en");
  draft.document.files = { "export-file": file };
  draft.document.content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: "export-file", label: "file.txt" } }] }] };
  expect((await request.put(`/api/documents/${draft.document.documentId}`, { headers: owner, data: draft.document })).status()).toBe(200);
  const share = await (await request.post("/api/files/export-file/share", { headers: owner, data: { revision: 1, operationId: "create", expiresAt: new Date(Date.now() + 3600000).toISOString() } })).json();
  await page.clock.setFixedTime(new Date(Date.now() + 31 * 86400000));
  await page.goto("/");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Export", exact: true });
  await panel.getByRole("checkbox").check();
  await panel.getByRole("button", { name: "Publish photos and prepare HTML" }).click();
  await expect(panel.locator("textarea")).toBeVisible();
  expect(await panel.locator("textarea").inputValue()).toContain(share.token);
  expect((await request.patch(`/api/file-shares/${share.id}`, { headers: owner, data: { revision: 1, action: "revoke", operationId: "revoke" } })).status()).toBe(200);
  await panel.getByRole("button", { name: "Publish photos and prepare HTML" }).click();
  await expect(panel.locator("textarea")).toHaveCount(0);
  await expect(panel.getByText("A referenced file is private. Share it explicitly before exporting HTML.", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Copy HTML", exact: true })).toHaveCount(0);
});
test.beforeEach(async ({ request, context }) => {
  expect((await request.post("/__sites-test/reset")).status()).toBe(204);
  await context.setExtraHTTPHeaders(owner);
  expect((await request.post("/api/sites/setup", { headers: owner, data: { accepted: true, locale: "en" } })).status()).toBe(200);
});

test("owner explicitly shares a library file; anonymous HTML downloads never execute and revoke is immediate", async ({ page, browser, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator(".writing-library").getByRole("button", { name: "File library", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "File library", exact: true });
  await panel.locator('input[type="file"]').setInputFiles({ name: "unsafe.html", mimeType: "text/html", buffer: Buffer.from("<script>window.EXECUTED=true</script>") });
  await panel.getByRole("button", { name: "Create public file link", exact: true }).click();
  const address = panel.getByRole("textbox", { name: "unsafe.html", exact: true });
  await expect(address).toBeVisible();
  const url = await address.inputValue();
  const anonymous = await browser.newContext();
  try {
    const viewer = await anonymous.newPage();
    await viewer.setContent(`<a href="${url}">Download</a>`);
    const downloading = viewer.waitForEvent("download");
    await viewer.getByRole("link", { name: "Download" }).click();
    expect((await downloading).suggestedFilename()).toBe("unsafe.html");
    expect(await viewer.evaluate(() => (window as unknown as { EXECUTED?: boolean }).EXECUTED)).toBeUndefined();
    const response = await anonymous.request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-security-policy"]).toBe("sandbox; default-src 'none'");
    await panel.getByRole("button", { name: "Revoke link", exact: true }).click();
    await expect(panel.getByText("Revoked or expired", { exact: true })).toBeVisible();
    expect((await anonymous.request.get(url)).status()).toBe(404);
    await panel.getByRole("button", { name: "Issue new link", exact: true }).click();
    await expect(address).not.toHaveValue(url);
    const nextUrl = await address.inputValue();
    expect((await anonymous.request.get(url)).status()).toBe(404);
    expect((await anonymous.request.get(nextUrl)).status()).toBe(200);
    const [file] = await (await request.get("/api/files", { headers: owner })).json();
    await request.patch(`/api/files/${file.id}`, { headers: owner, data: { revision: file.revision, trashedAt: "requested" } });
    await request.delete(`/api/files/${file.id}`, { headers: owner, data: { revision: file.revision + 1 } });
    expect((await anonymous.request.get(nextUrl)).status()).toBe(200);
    await page.screenshot({ path: "test-results/sites/file-sharing-library.png", fullPage: true });
  } finally { await anonymous.close(); }
});

test("Sites persists file references through insertion and reload without publishing by selection", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.fill("left right");
  for (let i = 0; i < 5; i++) await body.press("ArrowLeft");
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  await page.locator(".attachments-panel").getByRole("button", { name: "File library", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "File library", exact: true });
  await panel.locator('input[type="file"]').setInputFiles({ name: "private.txt", mimeType: "text/plain", buffer: Buffer.from("private bytes") });
  await panel.getByRole("checkbox", { name: "private.txt", exact: true }).check();
  await panel.getByRole("button", { name: "Insert selected files" }).click();
  await expect(body).toHaveText("left private.txt right");
  await expect(page.getByRole("status").last()).toHaveText("Saved to my Site");
  await page.reload();
  await expect(body).toHaveText("left private.txt right");
  expect(await (await request.get("/api/file-shares", { headers: owner })).json()).toEqual([]);
});
