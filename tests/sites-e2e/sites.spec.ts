import { test, expect } from "@playwright/test";
import { syntheticPng } from "../helpers/sites-runtime";
import { createServer, type Server } from "node:http";

test.beforeEach(async ({ request }) => {
  expect((await request.post("/__sites-test/reset")).status()).toBe(204);
});

test("sign-in and owner checks use the platform flow, not a claim button", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in with ChatGPT" })).toHaveAttribute("href", "/signin-with-chatgpt?return_to=%2F");
  await expect(page.getByRole("textbox", { name: "Document body" })).toHaveCount(0);
  await context.setExtraHTTPHeaders({ "X-Wonboard-Test-User": "another-account" });
  await page.reload();
  await expect(page.getByText("This writing space belongs to another account.", { exact: false })).toBeVisible();
});

test("unfinished setup can recheck and identify the signed-in account without claiming ownership", async ({ page, context }) => {
  let authenticated = false;
  let configured = false;
  const writes: string[] = [];
  page.on("request", request => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
  await page.route("**/api/sites/session", route => configured ? route.continue() : route.fulfill({
    json: { mode: "sites", authenticated, configured: false, owner: false, username: "", setupRequired: false },
  }));
  await page.goto("/");
  await expect(page.getByText("Wonboard setup is not finished yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with ChatGPT" })).toBeVisible();
  await expect(page.getByText("Account connection details", { exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Interface language" }).selectOption("ko");
  await expect(page.getByText("원보드 설치가 아직 끝나지 않았어요.")).toBeVisible();
  authenticated = true;
  await context.setExtraHTTPHeaders({ "X-Wonboard-Test-User": "owner-fixture" });
  await page.getByRole("button", { name: "설치 상태 다시 확인" }).click();
  await expect(page.getByRole("link", { name: "ChatGPT로 로그인" })).toHaveCount(0);
  await page.getByText("계정 연결 정보", { exact: true }).click();
  await page.getByRole("button", { name: "연결 정보 확인", exact: true }).click();
  await expect(page.getByLabel("사이트 계정 연결 ID")).toHaveText("owner-fixture");
  await expect(page.locator(".tiptap")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await page.getByLabel("사이트 계정 연결 ID").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  configured = true;
  await page.getByRole("button", { name: "설치 상태 다시 확인" }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("button", { name: "내 글쓰기 공간 열기" })).toBeDisabled();
  expect(writes).toEqual([]);
});

test("owner setup, private save, photo export, anonymous embed, rename, withdrawal and restore", async ({ page, context, browser }, testInfo) => {
  const errors: string[] = [];
  const consoleMessages: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (["error", "warning"].includes(message.type())) consoleMessages.push(message.text()); });
  await context.setExtraHTTPHeaders({ "X-Wonboard-Test-User": "owner-fixture" });
  await page.goto("/");
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await expect(page).toHaveTitle("Wonboard");
  const start = page.getByRole("button", { name: "Open my writing space" });
  await expect(start).toBeDisabled();
  await page.getByRole("checkbox", { name: "I understand where my data is stored", exact: false }).check();
  await start.click();
  await page.getByRole("textbox", { name: "Add title" }).fill("My illustrated guide");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.fill("First line.\n둘째 줄 한글.");
  await expect(page.getByText("Saved to my Site", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  await page.locator('.attachments-panel input[type="file"]').setInputFiles({ name: "capture.png", mimeType: "image/png", buffer: syntheticPng });
  await expect(page.locator(".tiptap .wb-media img")).toHaveCount(1);
  await expect(page.getByText("Saved to my Site", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue("My illustrated guide");
  await expect(page.locator(".tiptap .wb-media img")).toHaveCount(1);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export", exact: true });
  await expect(dialog.getByRole("button", { name: "Publish photos and prepare HTML" })).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Publish photos and prepare HTML" }).click();
  const source = dialog.getByRole("textbox", { name: "HTML for your community" });
  await expect(source).toBeVisible();
  const html = await source.inputValue();
  const mediaUrl = /src="([^"]+\/media\/[^"]+)"/.exec(html)![1];
  expect(html).not.toContain("blob:");
  const anonymous = await browser.newContext();
  let community: Server | undefined;
  try {
    const imageResponse = await anonymous.request.get(mediaUrl);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toBe("image/png");
    expect(imageResponse.headers()["cache-control"]).toBe("no-store");
    expect((await anonymous.request.get("http://127.0.0.1:5174/api/documents")).status()).toBe(401);
    const external = await anonymous.newPage();
    external.on("console", message => { if (["error", "warning"].includes(message.type())) consoleMessages.push(`External: ${message.text()}`); });
    external.on("requestfailed", request => consoleMessages.push(`External request: ${request.url()} ${request.failure()?.errorText}`));
    // Serve real HTTP on another loopback port. A Playwright-fulfilled page lacks
    // the network address-space information Chrome requires for loopback access.
    community = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html><html><meta charset="utf-8"><title>Community test</title><body>${html}</body></html>`);
    });
    await new Promise<void>(resolve => community!.listen(0, "127.0.0.1", resolve));
    const address = community.address();
    if (!address || typeof address === "string") throw new Error("Test server failed to bind");
    const externalOrigin = `http://127.0.0.1:${address.port}`;
    expect(externalOrigin).not.toBe(new URL(mediaUrl).origin);
    await external.goto(`${externalOrigin}/community-fixture`);
    await expect(external.getByText("둘째 줄 한글", { exact: true })).toBeVisible();
    await expect.poll(() => external.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    if (testInfo.project.name === "chromium") await page.screenshot({ path: "/private/tmp/wonboard-sites-export.png", fullPage: false });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("textbox", { name: "Add title" }).fill("Renamed guide");
    await expect(page.getByText("Saved to my Site", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Publish photos and prepare HTML" }).click();
    await expect(source).toBeVisible();
    expect(await source.inputValue()).toContain(mediaUrl);
    await dialog.getByText("Withdraw this document's public photos", { exact: true }).click();
    await dialog.getByRole("button", { name: "Turn off all these image URLs" }).click();
    await expect(dialog.getByText("Public image URLs are turned off.", { exact: false })).toBeVisible();
    expect((await anonymous.request.get(mediaUrl)).status()).toBe(404);
    await dialog.getByRole("button", { name: "Publish photos and prepare HTML" }).click();
    await expect(source).toBeVisible();
    expect(await source.inputValue()).toContain(mediaUrl);
    expect((await anonymous.request.get(mediaUrl)).status()).toBe(200);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("combobox", { name: "Interface language" }).selectOption("ko");
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileExport = page.getByRole("button", { name: "내보내기", exact: true });
    const exportBounds = await mobileExport.boundingBox();
    const toolbarBounds = await page.locator(".topbar").boundingBox();
    expect(exportBounds!.x + exportBounds!.width).toBeLessThanOrEqual(390);
    expect(exportBounds!.y + exportBounds!.height).toBeLessThanOrEqual(toolbarBounds!.y + toolbarBounds!.height);
    await mobileExport.click();
    await expect(page.getByRole("dialog", { name: "내보내기", exact: true })).toBeVisible();
    const bounds = await page.getByRole("dialog").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    await expect(page.getByRole("dialog").getByRole("button", { name: "사진 공개하고 HTML 준비" })).toBeVisible();
    expect(await page.locator("vite-error-overlay").count()).toBe(0);
    if (testInfo.project.name === "chromium") await page.screenshot({ path: "/private/tmp/wonboard-sites-mobile.png", fullPage: false });
    expect(errors).toEqual([]);
    expect(consoleMessages).toEqual([]);
  } finally {
    await testInfo.attach("browser-diagnostics", { body: JSON.stringify({ errors, consoleMessages }, null, 2), contentType: "application/json" });
    console.info("Sites browser diagnostics", { errors, consoleMessages });
    await anonymous.close();
    if (community) await new Promise<void>((resolve, reject) => community!.close(error => error ? reject(error) : resolve()));
  }
});
