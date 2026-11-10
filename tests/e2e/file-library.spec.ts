import { test, expect } from "./fixtures";
import { libraryRoundTrip } from "../helpers/library-backup";

test("library backup keeps unattached files, leaves trash out and restores them as new files", async ({ page }, testInfo) => {
  await libraryRoundTrip(page, testInfo, "local", () => page.goto("/").then(() => page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("wonboard-files-v1");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("files", "readwrite");
      transaction.objectStore("files").clear();
      transaction.oncomplete = () => { request.result.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    };
  }))));
});

for (const width of [390, 1440]) for (const locale of ["ko", "en"] as const) {
  test(`library backup controls and scope notice stay inside the panel in ${locale} at ${width}px`, async ({ page }, testInfo) => {
    const text = locale === "ko"
      ? { settings: "설정", attachments: "첨부", library: "파일 보관함", backup: "보관함 백업 (.zip)", restore: "보관함 백업 가져오기", scope: "모든 글 백업", unattached: "휴지통 밖의 보관함 파일" }
      : { settings: "Settings", attachments: "Attachments", library: "File library", backup: "Back up library (.zip)", restore: "Import library backup", scope: "Back up all documents", unattached: "every library file outside the trash" };
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.locator(".admin-bar select").selectOption(locale);
    if (width > 900) await page.locator(".writing-library").getByRole("button", { name: text.library, exact: true }).click();
    else {
      await page.getByRole("button", { name: text.settings, exact: true }).click();
      await page.getByRole("button", { name: text.attachments, exact: true }).click();
      await page.locator(".attachments-panel").getByRole("button", { name: text.library, exact: true }).click();
    }
    const panel = page.getByRole("dialog", { name: text.library, exact: true });
    const hint = panel.locator("p").filter({ hasText: text.scope });
    await expect(hint).toContainText(text.unattached);
    const frame = (await panel.boundingBox())!;
    for (const target of [panel.getByRole("button", { name: text.backup, exact: true }), panel.getByRole("button", { name: text.restore, exact: true }), hint]) {
      await target.scrollIntoViewIfNeeded();
      const box = (await target.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(frame.x); expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width);
      expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(900);
    }
    expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`library-backup-${width}-${locale}.png`) });
  });
}

for (const width of [1440, 390]) {
  test(`file picker preserves middle selection, inserts together and survives reload at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const body = page.getByRole("textbox", { name: "Document body" });
    await body.fill("before after");
    for (let i = 0; i < 5; i++) await body.press("ArrowLeft");
    await expect.poll(() => body.evaluate(() => window.getSelection()?.anchorOffset)).toBe(7);
    if (width > 900) await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
    else {
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByRole("button", { name: "Attachments", exact: true }).click();
    }
    await page.locator(".attachments-panel").getByRole("button", { name: "File library", exact: true }).click();
    const panel = page.getByRole("dialog", { name: "File library", exact: true });
    await panel.locator('input[type="file"][multiple]').setInputFiles([
      { name: "one.txt", mimeType: "text/plain", buffer: Buffer.from("one") },
      { name: "two.html", mimeType: "text/html", buffer: Buffer.from("<script>window.INJECTED = true</script>") },
    ]);
    await panel.getByRole("checkbox", { name: "one.txt", exact: true }).check();
    await panel.getByRole("checkbox", { name: "two.html", exact: true }).check();
    await panel.getByRole("button", { name: "Insert selected files" }).click();
    await expect(panel).toHaveCount(0);
    await expect(body).toHaveText("before one.txt two.html after");
    await expect(page.locator(".tiptap .wb-file")).toHaveCount(2);
    await expect(page.getByRole("status").last()).toHaveText("Saved locally");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".tiptap .wb-file")).toHaveCount(0);
    await expect(body).toHaveText("before after");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.getByRole("status").last()).toHaveText("Saved locally");
    await page.reload();
    await expect(body).toHaveText("before one.txt two.html after");
    if (width < 900) await page.getByRole("button", { name: "Settings", exact: true }).click();
    const download = page.waitForEvent("download");
    await body.getByRole("link", { name: "two.html", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("two.html");
    expect(await page.evaluate(() => (window as unknown as { INJECTED?: boolean }).INJECTED)).toBeUndefined();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/file-library-${width}.png`, fullPage: true });
  });
}

test("cancelling file selection preserves text, cursor and saved state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.fill("left right");
  for (let i = 0; i < 5; i++) await body.press("ArrowLeft");
  await expect.poll(() => body.evaluate(() => window.getSelection()?.anchorOffset)).toBe(5);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  await page.locator(".attachments-panel").getByRole("button", { name: "File library", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "File library", exact: true });
  await panel.getByRole("searchbox").fill("nothing");
  await panel.getByRole("button", { name: "Close", exact: true }).click();
  await expect(body).toHaveText("left right");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.keyboard.type("middle ");
  await expect(body).toHaveText("left middle right");
});
