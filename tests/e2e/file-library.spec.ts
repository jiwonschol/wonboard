import { test, expect } from "./fixtures";

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
    await panel.locator('input[type="file"]').setInputFiles([
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
