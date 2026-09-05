import { test, expect } from "./fixtures";

test("quota failure never claims saved and leaves an exportable in-memory draft", async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Test quota exhausted", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await page.getByRole("textbox", { name: "Add title" }).fill("보존할 초안");
  await expect(page.getByRole("alert")).toContainText("Could not save");
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue(
    "보존할 초안",
  );
  await page.getByRole("button", { name: "Options", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup (.zip)" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
});

test("a loaded editor saves locally with the network unavailable", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "Document body" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page
    .getByRole("textbox", { name: "Document body" })
    .fill("네트워크 없이 작성한 본문");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Document body" }),
  ).toContainText("네트워크 없이 작성한 본문");
});

test("simulated IME composition postpones saving until composition ends (not real OS IME proof)", async ({
  page,
}) => {
  await page.goto("/");
  const title = page.getByRole("textbox", { name: "Add title" });
  await title.fill("original");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await title.dispatchEvent("compositionstart");
  await title.evaluate((element) => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(element, "조합 중 한글");
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        data: "조합 중 한글",
        isComposing: true,
      }),
    );
  });
  await page.waitForTimeout(550);
  await expect(page.getByRole("status").last()).toHaveText("Unsaved changes");
  await title.dispatchEvent("compositionend");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(title).toHaveValue("조합 중 한글");
});

test("large 20000-character / 50-image draft preserves image order and restores", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("textbox", { name: "Add title" }).fill("큰 문서");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.fill("한글 English ".repeat(2000).slice(0, 20000));
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: 120, height: 80 },
  });
  const start = Date.now();
  await page
    .locator('input[type=file][accept="image/png,image/jpeg"]')
    .setInputFiles(
      Array.from({ length: 50 }, (_, i) => ({
        name: `사진-${i}.png`,
        mimeType: "image/png",
        buffer: png,
      })),
    );
  await expect(page.locator(".tiptap .wb-media img")).toHaveCount(50);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  const ids = await page
    .locator(".wb-media")
    .evaluateAll((es) => es.map((e) => e.getAttribute("data-media-id")));
  await page.reload();
  await expect(page.locator(".tiptap .wb-media img")).toHaveCount(50);
  expect(
    await page
      .locator(".wb-media")
      .evaluateAll((es) => es.map((e) => e.getAttribute("data-media-id"))),
  ).toEqual(ids);
  expect((await body.innerText()).replaceAll("\n", "")).toHaveLength(20000);
  console.log(`50-image restore elapsed ${Date.now() - start}ms`);
});

test("formatting survives reload and preview shares the same rendering style", async ({
  page,
}) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.fill("서식을 유지하는 문단");
  await page.getByRole("button", { name: "Display", exact: true }).click();
  await expect(page.locator(".tiptap>p").first()).toHaveCSS(
    "font-size",
    "36px",
  );
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(page.locator(".tiptap>p").first()).toHaveCSS(
    "font-size",
    "36px",
  );
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".preview-page .tiptap>p").first()).toHaveCSS(
    "font-size",
    "36px",
  );
});
