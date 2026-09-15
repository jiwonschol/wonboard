import { test, expect } from "./fixtures";

test("whitespace review preserves words, supports cancel, undo, and reload", async ({ page }, testInfo) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  const tool = page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Tidy whitespace" });
  await body.fill("아이템  이름   ");
  await body.press("End");
  await body.press("Enter"); await body.press("Enter"); await body.press("Enter");
  await body.pressSequentially("마지막 문장");
  await tool.click();
  const review = page.getByRole("dialog", { name: "Tidy whitespace" });
  await expect(review).toContainText("Changes: 2");
  await review.getByRole("button", { name: "Close", exact: true }).click();
  await expect(body.locator("p")).toHaveCount(4);
  await tool.click();
  await review.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(body.locator("p")).toHaveCount(3);
  expect(await body.locator("p").first().textContent()).toBe("아이템  이름");
  await body.press("ControlOrMeta+z");
  await expect(body.locator("p")).toHaveCount(4);
  expect(await body.locator("p").first().textContent()).toBe("아이템  이름   ");
  await tool.click();
  await review.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".save-state")).toHaveText("Saved locally");
  await page.reload();
  await expect(body.locator("p")).toHaveCount(3);
  await tool.click();
  await expect(review).toContainText("No whitespace to tidy.");
  await expect(review.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
  await review.getByRole("button", { name: "Close", exact: true }).click();
  for (const locale of ["ko", "en"] as const) for (const width of [1440, 390]) {
    await page.locator(".admin-bar select").selectOption(locale);
    await page.setViewportSize({ width, height: 900 });
    if (width === 390 && await page.locator(".writing-library").count())
      await page.locator(".writing-library > header .icon-button").last().click();
    if (width === 390 && await page.locator(".wb-inspector").count())
      await page.getByRole("button", { name: locale === "ko" ? "설정 닫기" : "Close Settings", exact: true }).click();
    const toolbar = page.locator(".writing-toolbar:not(.writing-toolbar-expanded)");
    await toolbar.getByRole("button", { name: locale === "ko" ? "공백 정리" : "Tidy whitespace", exact: true }).click();
    const dialog = page.locator(".whitespace-dialog");
    await expect(dialog).toBeVisible();
    for (const locator of [toolbar, dialog]) {
      const bounds = await locator.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth,
        left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: testInfo.outputPath(`whitespace-${locale}-${width}.png`) });
    await dialog.getByRole("button", { name: locale === "ko" ? "닫기" : "Close", exact: true }).click();
  }
});
