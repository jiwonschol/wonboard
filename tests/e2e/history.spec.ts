import type { Page } from "@playwright/test";
import { test, expect, collectPageErrors, reloadAfterFonts } from "./fixtures";

const bodyOf = (page: Page) => page.getByRole("textbox", { name: "Document body" });
const marker = "Changed. ";

async function settle(page: Page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function prepare(page: Page) {
  await page.goto("/");
  const body = bodyOf(page);
  await body.click();
  await body.evaluate(element => {
    const data = new DataTransfer();
    data.setData("text/html", Array.from({ length: 80 }, (_, i) =>
      `<p>Paragraph ${i}: reading here.</p>`).join(""));
    const event = new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true });
    if (event.clipboardData?.getData("text/html") !== data.getData("text/html"))
      Object.defineProperty(event, "clipboardData", { value: data });
    element.dispatchEvent(event);
  });
  await expect(body.locator("p")).toHaveCount(80);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  // 본문 준비를 실행 취소 이력에서 빼고, 실제 키 입력 하나만 되돌린다.
  await reloadAfterFonts(page);
  await body.locator("p").first().click();
  await page.keyboard.press("Home");
  await page.keyboard.insertText(marker);
  await expect(body.locator("p").first()).toHaveText(`${marker}Paragraph 0: reading here.`);
}

async function readingPosition(page: Page) {
  await settle(page);
  return bodyOf(page).evaluate(element => {
    const selection = window.getSelection()!;
    const paragraph = (node: Node | null) => node?.parentElement?.closest("p")?.textContent;
    return {
      anchor: paragraph(selection.anchorNode), anchorOffset: selection.anchorOffset,
      focus: paragraph(selection.focusNode), focusOffset: selection.focusOffset,
      selected: selection.toString(),
      scroll: element.closest(".wb-canvas")!.scrollTop,
      bottom: element.lastElementChild!.getBoundingClientRect().top,
    };
  });
}

async function expectPosition(page: Page, before: Awaited<ReturnType<typeof readingPosition>>) {
  const after = await readingPosition(page);
  expect(after.anchor).toBe(before.anchor);
  expect(after.anchorOffset).toBe(before.anchorOffset);
  expect(after.focus).toBe(before.focus);
  expect(after.focusOffset).toBe(before.focusOffset);
  expect(after.selected).toBe(before.selected);
  expect(Math.abs(after.scroll - before.scroll)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.bottom - before.bottom)).toBeLessThanOrEqual(2);
}

for (const route of ["shortcuts", "toolbar", "edit menu", "desktop menu"] as const) {
  test(`${route}: undo and redo preserve the selection and reading position at the end`, async ({ page }) => {
    const errors = collectPageErrors(page);
    if (route === "desktop menu") await page.addInitScript(() => {
      // preload가 전달하는 메뉴 동작을 같은 공개 브리지로 받는다.
      Object.assign(window, { wonboardDesktopEditing: {
        isMisspelled: () => false, suggestions: () => [], paste: () => {},
        onHistory(handler: (action: "undo" | "redo") => boolean) {
          const listener = (event: Event) => handler((event as CustomEvent<"undo" | "redo">).detail);
          document.addEventListener("test:desktop-history", listener);
          return () => document.removeEventListener("test:desktop-history", listener);
        },
      } });
    });
    await prepare(page);
    const body = bodyOf(page);
    await body.locator("p").last().click();
    await page.keyboard.press("Home");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    const before = await readingPosition(page);
    expect(before.anchor).toContain("Paragraph 79:");
    expect(before.selected).toBe("Pa");
    expect(before.scroll).toBeGreaterThan(1000);
    const act = async (redo: boolean) => {
      if (route === "shortcuts") await page.keyboard.press(redo ? "ControlOrMeta+Shift+z" : "ControlOrMeta+z");
      else if (route === "toolbar") await page.getByRole("button", { name: redo ? "Redo" : "Undo", exact: true }).click();
      else if (route === "desktop menu") await page.evaluate(redo => {
        document.dispatchEvent(new CustomEvent("test:desktop-history", { detail: redo ? "redo" : "undo" }));
      }, redo);
      else await body.evaluate((element, redo) => {
        // OS 메뉴가 편집 영역에 전달하는 입력. 네이티브 메뉴 자체는 웹 시험에 없다.
        element.dispatchEvent(new InputEvent("beforeinput", {
          inputType: redo ? "historyRedo" : "historyUndo", bubbles: true, cancelable: true,
        }));
      }, redo);
    };
    await act(false);
    await expect(body.locator("p").first()).not.toContainText(marker);
    await expectPosition(page, before);
    await act(true);
    await expect(body.locator("p").first()).toContainText(marker);
    await expectPosition(page, before);
    if (route === "shortcuts") {
      await act(false);
      await page.keyboard.press("ControlOrMeta+y");
      await expect(body.locator("p").first()).toContainText(marker);
      await expectPosition(page, before);
    }
    expect(errors).toEqual([]);
  });
}

test("toolbar undo and redo keep the reading position when the cursor is offscreen", async ({ page }) => {
  const errors = collectPageErrors(page);
  await prepare(page);
  const body = bodyOf(page);
  await body.evaluate(element => { element.closest(".wb-canvas")!.scrollTop = 2500; });
  const before = await readingPosition(page);
  expect(before.anchor).toContain("Paragraph 0:");
  expect(before.scroll).toBeGreaterThan(1000);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(body.locator("p").first()).not.toContainText(marker);
  // 앞쪽 삽입분이 사라진 만큼 커서의 오프셋은 옮겨지지만 화면은 그대로다.
  let after = await readingPosition(page);
  expect(after.anchor).toContain("Paragraph 0:");
  expect(after.anchorOffset).toBe(0);
  expect(Math.abs(after.scroll - before.scroll)).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(body.locator("p").first()).toContainText(marker);
  after = await readingPosition(page);
  expect(after.anchorOffset).toBe(before.anchorOffset);
  expect(Math.abs(after.scroll - before.scroll)).toBeLessThanOrEqual(2);
  // 키보드로 버튼을 누를 때도 본문으로 초점을 강제로 돌려 화면을 움직이지 않는다.
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  const redo = page.getByRole("button", { name: "Redo", exact: true });
  await undo.focus();
  await page.keyboard.press("Space");
  await expect(body.locator("p").first()).not.toContainText(marker);
  await expect(undo).toBeFocused();
  expect(Math.abs((await readingPosition(page)).scroll - before.scroll)).toBeLessThanOrEqual(2);
  await redo.focus();
  await page.keyboard.press("Space");
  await expect(body.locator("p").first()).toContainText(marker);
  await expect(redo).toBeFocused();
  expect(Math.abs((await readingPosition(page)).scroll - before.scroll)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test("undo maps a cursor inside removed text to a valid nearby position", async ({ page }) => {
  const errors = collectPageErrors(page);
  await prepare(page);
  const body = bodyOf(page);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(body.locator("p").first()).not.toContainText(marker);
  const position = await readingPosition(page);
  expect(position.anchor).toContain("Paragraph 0:");
  expect(position.anchorOffset).toBe(0);
  expect(position.selected).toBe("");
  await page.keyboard.insertText("Still editable. ");
  await expect(body.locator("p").first()).toHaveText(/^Still editable\. Paragraph 0:/);
  expect(errors).toEqual([]);
});
