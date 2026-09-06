import { test, expect } from "./fixtures";

test("deleted images remain undoable but do not exhaust the limit after reopening", async ({ page }) => {
  await page.goto("/");
  const input = page.locator('input[type=file][accept="image/png,image/jpeg"]');
  const buffer = await page.screenshot({
    clip: { x: 0, y: 0, width: 40, height: 40 },
    scale: "css",
  });
  await input.setInputFiles(Array.from({ length: 100 }, (_, i) => ({
    name: `undo-${i}.png`, mimeType: "image/png", buffer,
  })));
  const images = page.locator(".tiptap .wb-media img");
  await expect(images).toHaveCount(100);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  // Separate the insertion and removal history groups (Tiptap's default is 500ms).
  await page.waitForTimeout(600);
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.press("ControlOrMeta+a");
  await body.press("Backspace");
  await expect(images).toHaveCount(0);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(images).toHaveCount(100);
  await expect.poll(() => images.first().evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(40);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(images).toHaveCount(0);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await input.setInputFiles({ name: "new.png", mimeType: "image/png", buffer });
  await expect(page.getByText("Deleted images are still kept for undo.", { exact: false })).toBeVisible();
  await page.reload();
  await input.setInputFiles({ name: "new.png", mimeType: "image/png", buffer });
  await expect(images).toHaveCount(1);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
});

test("948px laptop keeps the document between two non-overlapping sidebars", async ({
  page,
}) => {
  await page.setViewportSize({ width: 948, height: 815 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  const left = await page.locator(".writing-library").boundingBox();
  const canvas = await page.locator(".wb-canvas").boundingBox();
  const right = await page.locator(".wb-inspector").boundingBox();
  expect(left!.x + left!.width).toBeLessThanOrEqual(canvas!.x);
  expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(right!.x);
  expect(canvas!.width).toBeGreaterThan(400);
});

test("attachment counts and title-derived filenames track edits, toggle, reload and ZIP restore", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Add title" }).fill("제주 여행");
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  await expect(
    page.getByLabel("Rename files using the document title"),
  ).toBeChecked();
  const buffer = await page.screenshot({
    clip: { x: 0, y: 0, width: 120, height: 80 },
  });
  await page.locator(".attachments-panel input[type=file]").setInputFiles([
    { name: "한글.png", mimeType: "image/png", buffer },
    { name: "second.png", mimeType: "image/png", buffer },
  ]);
  await expect(
    page.getByRole("tab", { name: "Attachments 2", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".attachment-filename")).toHaveText([
    "제주 여행_001.png",
    "제주 여행_002.png",
  ]);
  await page.getByRole("textbox", { name: "Add title" }).fill("서울 여행");
  await expect(page.locator(".attachment-filename")).toHaveText([
    "서울 여행_001.png",
    "서울 여행_002.png",
  ]);
  await page.getByLabel("Rename files using the document title").uncheck();
  await expect(page.locator(".attachment-filename")).toHaveText([
    "한글.png",
    "second.png",
  ]);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await page.getByRole("tab", { name: "Attachments 2", exact: true }).click();
  await expect(
    page.getByLabel("Rename files using the document title"),
  ).not.toBeChecked();
  await expect(page.locator(".attachment-filename")).toHaveText([
    "한글.png",
    "second.png",
  ]);
  await page.getByRole("button", { name: "Options", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup (.zip)", exact: true })
    .click();
  await page
    .locator('input[accept=".zip,application/zip"]')
    .setInputFiles((await (await downloaded).path())!);
  await expect(
    page.getByText("Backup restored as a new document."),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "Options" })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("tab", { name: "Attachments 2", exact: true }).click();
  await expect(
    page.getByLabel("Rename files using the document title"),
  ).not.toBeChecked();
});

test("video detection, playback settings, backup and safe iframe preview", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route(
    /https:\/\/(www\.youtube-nocookie\.com|player\.vimeo\.com)\//,
    (route) => {
      external.push(route.request().url());
      return route.fulfill({
        contentType: "text/html",
        body: "<p>Player test double</p>",
      });
    },
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  await page
    .getByLabel("YouTube or Vimeo URL")
    .fill("https://youtu.be/M7lc1UVf-VE?t=1m23s&autoplay=1");
  await expect(page.getByLabel("Autoplay", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("Minutes", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Seconds", { exact: true })).toHaveValue("23");
  await page.getByLabel("Minutes", { exact: true }).fill("2");
  await page.getByLabel("Seconds", { exact: true }).fill("5");
  await page.getByLabel("Autoplay", { exact: true }).check();
  await page.getByRole("button", { name: "Insert video", exact: true }).click();
  await expect(page.locator(".wb-video-card")).toHaveCount(1);
  expect(external).toHaveLength(0);
  await page
    .getByLabel("YouTube or Vimeo URL")
    .fill("https://vimeo.com/76979871#t=42s");
  await page.getByRole("button", { name: "Insert video", exact: true }).click();
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(page.locator(".wb-video-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const yt = page.locator('iframe[title="YouTube M7lc1UVf-VE"]');
  await expect(yt).toHaveAttribute("src", /autoplay=1&start=125/);
  await expect(page.locator('iframe[title="Vimeo 76979871"]')).toHaveAttribute(
    "src",
    /autoplay=0.*#t=42s/,
  );
  await yt.scrollIntoViewIfNeeded();
  await expect.poll(() => external.length).toBeGreaterThan(0);
});

test("left document list switches saved drafts without losing titles or content; mobile stays within viewport", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Add title" }).fill("첫 글");
  await page
    .getByRole("textbox", { name: "Document body" })
    .fill("처음 쓴 문장");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page
    .getByRole("button", { name: "New document", exact: true })
    .first()
    .click();
  await page.getByRole("textbox", { name: "Add title" }).fill("둘째 글");
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page
    .getByRole("button", { name: "Documents", exact: true })
    .first()
    .click();
  await expect(page.locator(".writing-library")).toBeVisible();
  await expect(page.locator(".document-list>button")).toHaveCount(2);
  await page
    .locator(".document-list>button")
    .filter({ hasText: "첫 글" })
    .click();
  await expect(page.getByRole("textbox", { name: "Document body" })).toHaveText(
    "처음 쓴 문장",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Close document list", exact: true })
    .click();
  await page.getByRole("tab", { name: "Attachments 0", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const sidebar = await page.locator(".wb-inspector").boundingBox();
  expect(sidebar!.x).toBeGreaterThanOrEqual(0);
  expect(sidebar!.x + sidebar!.width).toBeLessThanOrEqual(390);
});
