import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  expect((await request.post("/__sites-test/reset")).status()).toBe(204);
});

async function publish(page: Page, tablesAsImages: boolean) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export", exact: true });
  await dialog.getByRole("checkbox", { name: "Make the photos in this document viewable", exact: false }).check();
  const option = dialog.getByRole("checkbox", { name: "Export tables as images", exact: false });
  if (tablesAsImages) await option.check(); else await expect(option).not.toBeChecked();
  if (tablesAsImages) await expect(dialog).toContainText("Readers cannot search, copy or edit the text inside it.");
  await dialog.getByRole("button", { name: "Publish photos and prepare HTML" }).click();
  const source = dialog.getByRole("textbox", { name: "HTML for your community" });
  await expect(source).toBeVisible();
  const html = await source.inputValue();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  return html;
}

test("tables become reusable public images only when the writer chooses it", async ({ page, context, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const tableUploads: string[] = [];
  page.on("request", request => { if (/\/media\/table:[a-f0-9]+\/variant$/.test(request.url())) tableUploads.push(request.url()); });
  await context.setExtraHTTPHeaders({ "X-Wonboard-Test-User": "owner-fixture" });
  await page.goto("/");
  await page.getByRole("checkbox", { name: "I understand where my data is stored", exact: false }).check();
  await page.getByRole("button", { name: "Open my writing space" }).click();
  await page.getByRole("textbox", { name: "Add title" }).fill("공략 표");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.click();
  await page.keyboard.type("장비 비교");
  await page.keyboard.press("Enter");
  await page.keyboard.press("/");
  await page.keyboard.insertText("table");
  await page.keyboard.press("Enter");
  for (const [index, text] of ["이름", "공격력", "비고", "대검", "120", "**굵게**"].entries()) {
    if (index) await page.keyboard.press("Tab");
    await page.keyboard.type(text);
  }
  await expect(page.getByText("Saved to my Site", { exact: true })).toBeVisible();

  const plain = await publish(page, false);
  expect(plain).toContain("<table");
  expect(tableUploads).toEqual([]);

  const html = await publish(page, true);
  expect(html).not.toContain("<table");
  const image = /<img src="([^"]+\/media\/[^"]+)" alt="([^"]*)"/.exec(html)!;
  expect(image[2]).toContain("이름 | 공격력 | 비고");
  expect(tableUploads).toHaveLength(1);
  const anonymous = await browser.newContext();
  try {
    const response = await anonymous.request.get(image[1]);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const bytes = await response.body();
    expect(bytes.readUInt32BE(16)).toBe(1440);

    const again = await publish(page, true);
    expect(again).toContain(image[1]);
    expect(tableUploads).toHaveLength(1);

    await body.locator("td").first().click();
    await page.keyboard.press("End");
    await page.keyboard.type("+1");
    await expect(page.getByText("Saved to my Site", { exact: true })).toBeVisible();
    const changed = await publish(page, true);
    expect(tableUploads).toHaveLength(2);
    const changedUrl = /<img src="([^"]+\/media\/[^"]+)"/.exec(changed)![1];
    expect(changedUrl).not.toBe(image[1]);
    expect((await anonymous.request.get(image[1])).status()).toBe(200);
    expect((await anonymous.request.get(changedUrl)).status()).toBe(200);
  } finally {
    await anonymous.close();
  }
  expect(errors).toEqual([]);
});
