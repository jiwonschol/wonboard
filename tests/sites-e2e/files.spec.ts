import { test, expect } from "@playwright/test";
import { newDraft } from "@wonboard/document";

const owner = { "X-Wonboard-Test-User": "owner-fixture", Origin: "http://127.0.0.1:5174" };
for (const offsetDays of [-31, 31]) test(`file trash follows server time and ticks across expiry with device skew ${offsetDays}`, async ({ page, request }) => {
  expect((await request.put("/api/files/clock-file?name=clock.txt", { headers: { ...owner, "Content-Type": "text/plain" }, data: "retained" })).status()).toBe(201);
  expect((await request.patch("/api/files/clock-file", { headers: owner, data: { revision: 1, trashedAt: "requested" } })).status()).toBe(200);
  await page.clock.install({ time: new Date(Date.now() + offsetDays * 86400000) });
  await page.goto("/");
  await page.locator(".writing-library").getByRole("button", { name: "File library", exact: true }).click();
  await page.getByRole("dialog", { name: "File library", exact: true }).getByRole("button", { name: "Trash", exact: true }).click();
  const panel = page.locator(".file-trash-panel");
  const restore = panel.getByRole("button", { name: "Restore file", exact: true });
  const download = panel.getByRole("button", { name: "Download file", exact: true });
  await expect(restore).toBeEnabled(); await expect(download).toBeEnabled();
  expect((await request.post(`/__sites-test/advance-clock/${30 * 86400000 - 10000}`)).status()).toBe(204);
  const response = page.waitForResponse(response => new URL(response.url()).pathname === "/api/files");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await response;
  await expect(restore).toBeEnabled();
  await page.clock.fastForward(20000);
  await expect(restore).toBeDisabled(); await expect(download).toBeDisabled();
  // A failed resume sync must not fall back to the skewed device clock.
  await page.route("**/api/files", route => route.abort());
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(panel.getByRole("alert")).toBeVisible();
  await expect(restore).toBeDisabled();
  await page.unroute("**/api/files");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(panel.getByRole("alert")).toHaveCount(0);
});
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

for (const locale of ["en", "ko"] as const) for (const width of [1440, 390]) test(`oversized file selections fail before downloading originals in ${locale} at ${width}px`, async ({ page }, info) => {
  const files = Array.from({ length: 12 }, (_, i) => ({ id: `large-${i}`, originalName: `large-${i}.txt`, filename: `large-${i}.txt`, mime: "text/plain", size: 20 * 1024 * 1024, sha256: "a".repeat(64), revision: 1, createdAt: new Date().toISOString() }));
  await page.route(/\/api\/files$/, route => route.fulfill({ json: files, headers: { "X-Wonboard-Server-Now": String(Date.now()) } }));
  let downloads = 0;
  await page.route(/\/api\/files\/large-\d+(?:\/content)?$/, route => { downloads++; return route.abort(); });
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Document body" })).toBeVisible();
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  await page.locator(".attachments-panel").getByRole("button", { name: "File library", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "File library", exact: true });
  await page.locator(".admin-bar select").selectOption(locale);
  await page.setViewportSize({ width, height: 900 });
  const localizedPanel = page.getByRole("dialog", { name: locale === "en" ? "File library" : "파일 보관함", exact: true });
  for (const file of files) await localizedPanel.getByRole("checkbox", { name: file.filename, exact: true }).check();
  await localizedPanel.getByRole("button", { name: locale === "en" ? "Insert selected files" : "선택한 파일 넣기" }).click();
  const alert = localizedPanel.getByRole("alert");
  await expect(alert).toContainText("220 MiB");
  await expect.poll(async () => { const box = await alert.boundingBox(); return box !== null && box.y >= 0 && box.y + box.height <= 900; }).toBe(true);
  const box = await alert.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  expect(await alert.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`insertion-limit-${locale}-${width}.png`) });
  expect(downloads).toBe(0);
  await expect(page.locator(".tiptap .wb-file")).toHaveCount(0);
});

for (const locale of ["en","ko"] as const) for (const width of [1440,390]) test(`one trash entry filters writing and files in ${locale} at ${width}px`, async ({page,request},info)=>{
  const file=await (await request.put("/api/files/unified-file?name=long-file-name-for-retention.txt",{headers:{...owner,"Content-Type":"text/plain"},data:"retained"})).json();
  await request.patch("/api/files/unified-file",{headers:owner,data:{revision:file.revision,trashedAt:"requested"}});
  const draft=newDraft("en"); draft.document.title="Recoverable writing";
  await request.put(`/api/documents/${draft.document.documentId}`,{headers:owner,data:{...draft.document,trashedAt:new Date().toISOString()}});
  await page.setViewportSize({width:1440,height:900});await page.goto("/");
  await page.locator(".admin-bar select").selectOption(locale);await page.setViewportSize({width,height:900});
  const sidebar=page.locator(".writing-library");
  await sidebar.locator("footer").getByRole("button",{name:locale==="en"?/^Trash/:/^휴지통/}).click();
  await expect(sidebar.locator(".trash-row")).toContainText("Recoverable writing");
  await sidebar.getByRole("button",{name:locale==="en"?"Files":"파일",exact:true}).click();
  await expect(sidebar.locator(".file-library-list")).toContainText("long-file-name-for-retention.txt");
  await expect(page.getByRole("dialog",{name:locale==="en"?"File library":"파일 보관함",exact:true})).toHaveCount(0);
  await expect(sidebar.getByRole("button",{name:locale==="en"?"Restore file":"파일 복원",exact:true})).toBeEnabled();
  const boxes=await sidebar.locator(".file-trash-panel,.file-library-list li").evaluateAll(nodes=>nodes.map(node=>({x:node.getBoundingClientRect().x,right:node.getBoundingClientRect().right,scroll:node.scrollWidth,client:node.clientWidth})));
  for(const box of boxes){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(width);expect(box.scroll).toBeLessThanOrEqual(box.client);}
  await page.screenshot({path:info.outputPath(`unified-trash-${locale}-${width}.png`)});
  await sidebar.locator(".file-library-tools").getByRole("button",{name:locale==="en"?"My writing":"내 글",exact:true}).click();
  await expect(sidebar.locator(".trash-row")).toContainText("Recoverable writing");
});
