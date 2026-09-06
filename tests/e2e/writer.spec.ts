import { test, expect } from "./fixtures";

test("title input stops at the document limit and remains saveable and restorable", async ({ page }) => {
  await page.goto("/");
  const title = page.getByRole("textbox", { name: "Add title" });
  await expect(title).toHaveAttribute("maxlength", "10000");
  const longTitle = "한글 English ".repeat(1000);
  await title.fill(longTitle);
  await expect(title).toHaveValue(longTitle.slice(0, 10000));
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(title).toHaveValue(longTitle.slice(0, 10000));
  await page.getByRole("button", { name: "Options", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup (.zip)", exact: true }).click();
  await page.locator('input[accept=".zip,application/zip"]').setInputFiles((await (await downloaded).path())!);
  await expect(page.getByText("Backup restored as a new document.")).toBeVisible();
  await expect(title).toHaveValue(longTitle.slice(0, 10000));
});

test("writes Korean, preserves blank paragraphs, changes UI language and restores after reload", async ({
  page,
}) => {
  await page.goto("/");
  const title = page.getByRole("textbox", { name: "Add title" });
  await title.fill("한글과 English");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.fill("첫 문단 한글");
  await body.press("Enter");
  await body.press("Enter");
  await body.press("Shift+Enter");
  await body.pressSequentially("English");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  const text = await body.innerText();
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("ko");
  await expect(page.getByRole("textbox", { name: "문서 본문" })).toHaveText(
    /첫 문단 한글/,
  );
  await page.reload();
  await expect(page.getByRole("textbox", { name: "제목 추가" })).toHaveValue(
    "한글과 English",
  );
  expect(
    await page.getByRole("textbox", { name: "문서 본문" }).innerText(),
  ).toBe(text);
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "미리보기" })).toContainText(
    "첫 문단 한글",
  );
});

test("real image insertion, resize, caption, backup and restore into a second document", async ({
  page,
}) => {
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error")
      console.log(message.text());
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Add title" })
    .fill("사진 보존 테스트");
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: 320, height: 160 },
  });
  await page
    .locator('input[type=file][accept="image/png,image/jpeg"]')
    .setInputFiles({
      name: "스크린샷.png",
      mimeType: "image/png",
      buffer: png,
    });
  const image = page.locator(".tiptap .wb-media img");
  await expect(image).toHaveCount(1);
  await image.click();
  await page.getByLabel("Width (px)").fill("320");
  await page.getByLabel("Caption", { exact: true }).fill("사진 설명");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(page.locator(".wb-media figcaption")).toHaveText("사진 설명");
  expect(
    await page.locator(".wb-media figure").evaluate((e) => e.style.width),
  ).toBe("320px");
  await page.getByRole("button", { name: "Options", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup (.zip)", exact: true })
    .click();
  const archive = await downloaded;
  const path = await archive.path();
  await page
    .locator('input[type=file][accept=".zip,application/zip"]')
    .setInputFiles(path!);
  await expect(
    page.getByText("Backup restored as a new document."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).last().click();
  await page
    .getByRole("button", { name: "Documents", exact: true })
    .first()
    .click();
  await expect(page.locator(".document-list>button")).toHaveCount(2);
});

test("blocks stale tab writes, keeping the first document intact", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Add title" }).fill("initial");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("textbox", { name: "Add title" })).toHaveValue(
    "initial",
  );
  await page.getByRole("textbox", { name: "Add title" }).fill("first tab");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await other.getByRole("textbox", { name: "Add title" }).fill("stale tab");
  await expect(other.getByRole("alert")).toContainText("Another tab changed");
  await other.getByRole("button", { name: "New document", exact: true }).first().click();
  await other.getByRole("textbox", { name: "Add title" }).fill("다른 문서");
  await expect(other.getByRole("status").last()).toHaveText("Saved locally");
  await other.getByRole("button", { name: "Documents", exact: true }).first().click();
  await other.locator(".document-list>button").filter({ hasText: "stale tab" }).click();
  await expect(other.getByRole("alert")).toContainText("Another tab changed");
  // Switching away must keep the unsaved conflicting copy available for recovery.
  const download = other.waitForEvent("download");
  await other.locator(".unsupported").getByRole("button", { name: "Download backup (.zip)" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  await page.reload();
  await page.getByRole("button", { name: "Documents", exact: true }).first().click();
  await page.locator(".document-list>button").filter({ hasText: "first tab" }).click();
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue(
    "first tab",
  );
});

test("small viewport has no horizontal overflow and inspector can be closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Close Settings" }).click();
  await page
    .getByRole("textbox", { name: "Add title" })
    .fill("작은 화면의 한글 문서");
  await page
    .getByRole("textbox", { name: "Document body" })
    .fill("읽고 쓰는 문장 ".repeat(200));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
});
