import { test, expect } from "./fixtures";

test("Korean spelling applies only chosen words and persists personal exceptions", async ({ page }) => {
  page.on("console", message => { if (message.type() === "error") console.log(message.text()); });
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("됬어요 맞춥법 실바나스");
  const tool = page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true });
  await tool.click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible({ timeout: 20000 });
  await expect(dialog.getByRole("textbox", { name: "Replace with" })).toHaveValue("됐어요");
  await dialog.getByRole("button", { name: "됐어요", exact: true }).click();
  await expect(body).toHaveText("됬어요 맞춥법 실바나스");
  await expect(dialog).toContainText("English grammar and context are not checked.");
  await dialog.getByRole("textbox", { name: "Replace with" }).press("Enter");
  await expect(body).toHaveText("됬어요 맞춥법 실바나스");
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("됐어요 맞춥법 실바나스");
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await dialog.getByRole("button", { name: "Add to dictionary" }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText("됬어요 맞춥법 실바나스");
  await page.reload();
  await tool.click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByText("Personal dictionary (1)", { exact: true }).click();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await tool.click();
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await dialog.getByRole("button", { name: "Skip once" }).click();
  await expect(dialog).toContainText("Unrecognized expression: 실바나스");
  await dialog.getByRole("textbox", { name: "Replace with" }).fill("실바나스님");
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("됬어요 맞춥법 실바나스님");
});

test("spacing applies, then registers a base term without suppressing spacing", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("질게에서답변하시는걸");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Skip once" })).toBeFocused();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("질게에서 답변하시는 걸");
  await expect(dialog.getByRole("textbox", { name: "Base word to add" })).toHaveValue("질게");
  await dialog.getByRole("button", { name: "Add to dictionary" }).click();
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await body.press("ControlOrMeta+z");
  await expect(body).toHaveText("질게에서답변하시는걸");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
});

test("English suggestions share the review flow", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("teh");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "the", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "the", exact: true }).click();
  await expect(body).toHaveText("teh");
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("the");
});

test("the complete source sentence can be corrected while its community term is skipped", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("평소에 질게에서답변하시는걸 뵌걸로보면 제가 조언할 수준은 아닌것 같지만");
  await page.getByRole("toolbar", { name: "Writing tools", exact: true }).getByRole("button", { name: "Check spelling", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Check spelling" });
  await expect(dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(dialog).toContainText("Unrecognized expression: 질게");
  await dialog.getByRole("button", { name: "Skip once", exact: true }).click();
  for (const suggestion of ["뵌 걸로 보면", "아닌 것"]) {
    await expect(dialog.getByRole("button", { name: suggestion, exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Change", exact: true }).click();
  }
  await expect(dialog).toContainText("Spelling review complete.");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  const expected = "평소에 질게에서 답변하시는 걸 뵌 걸로 보면 제가 조언할 수준은 아닌 것 같지만";
  await expect(body).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.reload();
  await expect(body).toHaveText(expected);
});

test("unreadable personal dictionary reports a failure without changing or resetting it", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("wonboard.spelling.personal.v1", "{broken"));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Document body", exact: true }).fill("됬어요");
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Check again", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("wonboard.spelling.personal.v1"))).toBe("{broken");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
});

test("composition Enter does not apply a replacement or skip a result", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("됬어요");
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const skip = dialog.getByRole("button", { name: "Skip once", exact: true });
  await expect(skip).toBeFocused();
  const prevented = await skip.evaluate(node => !node.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true })));
  expect(prevented).toBe(true);
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await expect(body).toHaveText("됬어요");
});

test("changing the document invalidates suggestions and rechecks the new text", async ({ page }) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  await body.fill("됬어요");
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "됐어요", exact: true })).toBeVisible();
  await body.evaluate(node => (node as HTMLElement & { editor: { commands: { setContent(text: string): void } } }).editor.commands.setContent("<p>역활을 맡았어요.</p>"));
  await expect(dialog.getByRole("alert")).toContainText("Document changed");
  await expect(dialog.getByRole("button", { name: "Change", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "역할을", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Change", exact: true }).click();
  await expect(body).toHaveText("역할을 맡았어요.");
});

test("closing review terminates its Worker without applying pending results", async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.Worker;
    (window as unknown as { spellingTerminations: number }).spellingTerminations = 0;
    window.Worker = class extends Original {
      terminate() {
        (window as unknown as { spellingTerminations: number }).spellingTerminations++;
        super.terminate();
      }
    };
  });
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body", exact: true });
  const source = "질게에서답변하시는걸 ".repeat(600);
  await body.fill(source);
  await page.getByRole("button", { name: "Check spelling", exact: true }).first().click();
  const before = await page.evaluate(() => (window as unknown as { spellingTerminations: number }).spellingTerminations);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { spellingTerminations: number }).spellingTerminations)).toBe(before + 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(body).toHaveText(source.trim());
});

for (const locale of ["ko", "en"]) test(`review remains usable at 390px (${locale})`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(value => localStorage.setItem("wonboard-locale", value), locale);
  await page.goto("/");
  await expect(page).toHaveTitle(/Wonboard/i);
  const settings = page.getByRole("button", { name: locale === "ko" ? "설정" : "Settings", exact: true });
  await expect(settings).toBeVisible();
  if (await settings.getAttribute("aria-pressed") === "true") await settings.click();
  const body = page.locator('[contenteditable="true"]').first();
  await body.fill("질게에서답변하시는걸");
  await page.getByRole("button", { name: locale === "ko" ? "맞춤법 검사" : "Check spelling", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const suggestion = dialog.getByRole("button", { name: "질게에서 답변하시는 걸", exact: true });
  await expect(suggestion).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: `/private/tmp/wonboard-spelling-${locale}-390.png` });
  await dialog.getByRole("button", { name: locale === "ko" ? "바꾸기" : "Change", exact: true }).click();
  await expect(body).toHaveText("질게에서 답변하시는 걸");
  await dialog.getByRole("button", { name: locale === "ko" ? "닫기" : "Close", exact: true }).click();
  expect(errors).toEqual([]);
});
