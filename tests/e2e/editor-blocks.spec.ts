import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./fixtures";

const bodyOf = (page: Page) => page.getByRole("textbox", { name: "Document body" });
const settingsOf = (page: Page) => page.getByRole("complementary", { name: "Settings", exact: true });
async function paste(page: Page, data: Record<string, string>) {
  await page.locator(".tiptap").evaluate((element, data) => {
    const transfer = new DataTransfer();
    for (const [type, value] of Object.entries(data)) transfer.setData(type, value);
    element.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, data);
}
async function slash(page: Page, query: string) {
  await page.keyboard.press("Enter");
  await page.keyboard.press("/");
  await page.keyboard.insertText(query);
}
async function expectInside(locator: Locator, width: number) {
  const box = (await locator.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
}

test("style applies only to dragged text, or to the paragraph at the cursor", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const body = bodyOf(page), settings = settingsOf(page);
  await body.click();
  await page.keyboard.type("첫 줄");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.type("둘째 줄 강조");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(settings.getByText("Applies to the selected text.")).toBeVisible();
  await settings.getByRole("button", { name: "Display", exact: true }).click();
  await expect(body.locator('span[data-wb-variant="display"]')).toHaveText("강조");
  await expect(body.locator('span[data-wb-variant="display"]')).toHaveCSS("font-size", "36px");
  await expect(body.locator("p")).not.toHaveCSS("font-size", "36px");
  await page.keyboard.press("ArrowRight");
  await expect(settings.getByText(/Applies to this whole paragraph/)).toBeVisible();
  await settings.getByRole("button", { name: "Subtitle", exact: true }).click();
  await expect(body.locator("p")).toHaveCSS("font-style", "italic");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(bodyOf(page).locator('span[data-wb-variant="display"]')).toHaveText("강조");
  await expect(bodyOf(page).locator("p")).toHaveCSS("font-style", "italic");
  expect(errors).toEqual([]);
});

test("text box and table are created from the slash menu, styled, saved and previewed", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page), settings = settingsOf(page);
  await body.click();
  await page.keyboard.type("공지 내용");
  await slash(page, "글사");
  const inserter = page.getByRole("dialog", { name: "Block Inserter" });
  await expect(inserter.getByRole("option")).toHaveText(["Text box"]);
  // 한글 입력기는 조합 중인 "사"를 "상"으로 바꾼 뒤 "자"를 잇는다.
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText("상자");
  await expect(inserter.getByRole("option")).toHaveText(["Text box"]);
  await page.keyboard.press("Enter");
  await page.keyboard.type("상자 안의 글");
  await expect(body.locator(".wb-text-box p")).toHaveText("상자 안의 글");
  await expect(body.locator(".wb-text-box")).not.toContainText("/");
  await settings.getByRole("button", { name: "#e8f3ff", exact: true }).click();
  await expect(body.locator(".wb-text-box")).toHaveCSS("background-color", "rgb(232, 243, 255)");
  await body.getByText("공지 내용").click();
  await page.keyboard.press("End");
  await slash(page, "table");
  await page.keyboard.press("Enter");
  await expect(body.locator("table tr")).toHaveCount(3);
  await expect(body.locator("table th")).toHaveCount(3);
  await page.keyboard.type("이름");
  await body.locator("table td").first().click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Edit menu" });
  await menu.getByRole("menuitem", { name: "Add row below" }).click();
  await expect(body.locator("table tr")).toHaveCount(4);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(bodyOf(page).locator(".wb-text-box")).toHaveCSS("background-color", "rgb(232, 243, 255)");
  await expect(bodyOf(page).locator("table th").first()).toHaveText("이름");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Preview" });
  await expect(preview.locator("[data-wb-text-box]")).toHaveCSS("background-color", "rgb(232, 243, 255)");
  await expect(preview.locator("table tr")).toHaveCount(4);
});

test("right-click menu formats the selection and Shift+right-click leaves the native menu", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page);
  await body.click();
  await page.keyboard.type("오른쪽 클릭");
  await body.locator("p").dblclick({ position: { x: 5, y: 5 } });
  await body.locator("p").click({ button: "right", position: { x: 5, y: 5 } });
  const menu = page.getByRole("menu", { name: "Edit menu" });
  await expect(menu.getByRole("menuitem", { name: "Copy" })).toBeEnabled();
  await expect(menu).toContainText("Shift+right-click opens the standard menu.");
  await menu.getByRole("menuitem", { name: "Bold" }).click();
  await expect(menu).toHaveCount(0);
  await expect(body.locator("strong")).toHaveText("오른쪽");
  await body.locator("p").click({ button: "right", modifiers: ["Shift"] });
  await expect(menu).toHaveCount(0);
  await body.locator("p").click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Quote" }).click();
  await expect(body.locator("blockquote p")).toHaveText("오른쪽 클릭");
});

test("selection toolbar appears over dragged text", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page);
  await body.click();
  await page.keyboard.type("선택 막대");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+ArrowLeft");
  const bar = page.getByRole("toolbar", { name: "Selected text formatting" });
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "Italic" }).click();
  await expect(body.locator("em")).toHaveText("선택 막대");
  await page.keyboard.press("End");
  await expect(bar).toBeHidden();
});

test("block handle moves and duplicates blocks", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page);
  await body.click();
  await page.keyboard.type("하나");
  await page.keyboard.press("Enter");
  await page.keyboard.type("둘");
  await body.locator("p").nth(1).hover();
  const handle = page.getByRole("button", { name: "Drag to move. Click for block options." });
  await handle.click();
  await page.getByRole("menu").getByRole("menuitem", { name: "Move block up" }).click();
  await expect(body.locator("p")).toHaveText(["둘", "하나"]);
  await page.keyboard.press("Alt+Shift+ArrowDown");
  await expect(body.locator("p")).toHaveText(["하나", "둘"]);
  await body.locator("p").first().hover();
  await handle.click();
  await page.getByRole("menu").getByRole("menuitem", { name: "Duplicate" }).click();
  await expect(body.locator("p")).toHaveText(["하나", "하나", "둘"]);
  await body.locator("p").nth(2).hover();
  await handle.dragTo(body.locator("p").first(), { targetPosition: { x: 2, y: 2 } });
  await expect(body.locator("p")).toHaveText(["둘", "하나", "하나"]);
});

test("markdown paste converts markdown but keeps community plain text", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page);
  await body.click();
  await paste(page, { "text/plain": "#해시태그 오늘\n1. 첫째 줄" });
  await expect(body.locator("h1, ol")).toHaveCount(0);
  await expect(body).toContainText("#해시태그 오늘");
  await page.keyboard.press("Enter");
  await paste(page, { "text/plain": "## 공략 정리\n\n**핵심**만 적는다.\n\n| 이름 | 값 |\n|---|---|\n| 공격력 | 120 |" });
  await expect(body.locator("h2")).toHaveText("공략 정리");
  await expect(body.locator("strong")).toHaveText("핵심");
  await expect(body.locator("table th")).toHaveText(["이름", "값"]);
  await paste(page, { "text/plain": "**굵게**", "text/html": "<p>웹에서 복사한 글</p>" });
  await expect(body).toContainText("웹에서 복사한 글");
});

test("contents list headings, jump to them and explain the empty state", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page);
  await page.getByRole("button", { name: "Contents" }).click();
  const outline = page.getByRole("navigation", { name: "Contents" });
  await expect(outline).toContainText("Headings 1–3 appear here.");
  await body.click();
  await page.keyboard.type("# 첫 장");
  await page.keyboard.press("Enter");
  for (let i = 0; i < 30; i++) { await page.keyboard.type(`본문 ${i}`); await page.keyboard.press("Enter"); }
  await page.keyboard.type("## 둘째 절");
  await page.keyboard.press("Enter");
  await page.keyboard.type("### 셋째 항");
  await expect(outline.getByRole("button")).toHaveText(["첫 장", "둘째 절", "셋째 항"]);
  await expect(outline.locator('li[data-level="3"]')).toHaveCount(1);
  await outline.getByRole("button", { name: "첫 장" }).click();
  await expect(outline.getByRole("button", { name: "첫 장" })).toHaveAttribute("aria-current", "location");
  await expect(body.locator("h1")).toBeInViewport();
});

test("find and replace all is undone in one step", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page);
  await body.click();
  await page.keyboard.type("사과와 사과, 그리고 사과");
  await page.keyboard.press("ControlOrMeta+f");
  const find = page.getByRole("search", { name: "Find" });
  await find.getByRole("textbox", { name: "Find" }).fill("사과");
  await expect(find.getByRole("status")).toHaveText("1 of 3");
  await find.getByRole("textbox", { name: "Find" }).press("Enter");
  await expect(find.getByRole("status")).toHaveText("2 of 3");
  await expect(body.locator(".find-current")).toHaveCount(1);
  await find.getByRole("textbox", { name: "Replace with" }).fill("배");
  await find.getByRole("button", { name: "Replace all" }).click();
  await expect(body).toHaveText("배와 배, 그리고 배");
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText("사과와 사과, 그리고 사과");
  await find.getByRole("textbox", { name: "Find" }).press("Escape");
  await expect(find).toHaveCount(0);
});

for (const locale of ["ko", "en"] as const)
  for (const width of [390, 1440])
    test(`new menus stay on screen at ${width}px (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      if (locale === "ko") await page.getByRole("combobox", { name: "Interface language" }).selectOption("ko");
      if (width === 390) await page.getByRole("button", { name: locale === "ko" ? "설정 닫기" : "Close Settings" }).click();
      const body = page.getByRole("textbox", { name: locale === "ko" ? "본문" : "Document body" });
      await body.click();
      await page.keyboard.type("오른쪽 끝의 글자를 선택합니다 Select the last words");
      await expect(page.getByRole("status").last()).toHaveText(locale === "ko" ? "브라우저에 저장됨" : "Saved locally");
      await page.keyboard.press("Shift+ArrowLeft");
      await page.keyboard.press("Shift+ArrowLeft");
      await expectInside(page.locator(".selection-menu"), width);
      const box = (await body.locator("p").boundingBox())!;
      await page.mouse.click(box.x + box.width - 4, box.y + 4, { button: "right" });
      const menu = page.locator(".edit-menu");
      await expectInside(menu, width);
      const menuBox = (await menu.boundingBox())!;
      expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(844 + 0.5);
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+f");
      await expectInside(page.locator(".find-bar"), width);
      await page.keyboard.press("Escape");
      await expect(body).toBeFocused();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("/");
      await expectInside(page.locator(".inserter"), width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `/private/tmp/wonboard-editor-blocks-${locale}-${width}.png` });
    });

test("copied text box and table keep their color and cells when pasted back", async ({ page }) => {
  await page.goto("/");
  const body = bodyOf(page);
  await body.click();
  await paste(page, { "text/html":
    '<div data-wb-text-box="" style="background-color:#e8f3ff;border:2px solid #88aadd;border-radius:8px;padding:20px"><p>공지</p></div>' +
    '<table><tbody><tr><th colspan="2" style="background-color:#f2f4f7">이름</th></tr><tr><td>공격력</td><td style="text-align:right">120</td></tr></tbody></table>' });
  await expect(body.locator(".wb-text-box")).toHaveCSS("background-color", "rgb(232, 243, 255)");
  await expect(body.locator(".wb-text-box")).toHaveCSS("border-top-width", "2px");
  await expect(body.locator("table td")).toHaveText(["공격력", "120"]);
  await expect(body.locator("table [colspan]:not([colspan='1'])")).toHaveCount(0);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(bodyOf(page).locator(".wb-text-box")).toHaveCSS("background-color", "rgb(232, 243, 255)");
});
