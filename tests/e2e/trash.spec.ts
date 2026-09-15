import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

async function write(page: Page, title: string) {
  await page.getByRole("textbox", { name: "Add title" }).fill(title);
  await page.getByRole("textbox", { name: "Document body" }).fill("Text to keep.");
  await expect(page.locator(".save-state")).toHaveText("Saved locally");
}
async function trash(page: Page) {
  await page.locator(".document-row-actions").getByRole("button", { name: "Move to trash" }).click();
}
async function openTrash(page: Page) {
  await page.locator(".writing-library > footer").getByRole("button", { name: /^Trash/ }).click();
}
test("trash removes a document from active filters and restores its content", async ({ page }) => {
  await page.goto("/"); await write(page, "Keep my draft"); await trash(page);
  await expect(page.locator(".document-list > button").filter({ hasText: "Keep my draft" })).toHaveCount(0);
  await page.getByRole("button", { name: "Last 7 days", exact: true }).click();
  await page.getByRole("searchbox").fill("Keep my draft");
  await expect(page.locator(".document-list > button")).toHaveCount(0);
  await openTrash(page);
  await expect(page.getByText("Cannot restore in 30 days")).toBeVisible();
  await page.getByRole("button", { name: "Restore document", exact: true }).click();
  await expect(page.getByText("Trash is empty.")).toBeVisible();
  await page.getByRole("button", { name: "Back to my writing", exact: true }).click();
  await page.locator(".document-list > button").filter({ hasText: "Keep my draft" }).click();
  await expect(page.getByRole("textbox", { name: "Document body" })).toContainText("Text to keep.");
});
test("permanent delete and empty trash require confirmation and survive reload", async ({ page }) => {
  await page.goto("/"); await write(page, "Delete one"); await trash(page); await openTrash(page);
  await page.getByRole("button", { name: "Delete permanently now", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete permanently now" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".trash-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Delete permanently now", exact: true }).click();
  await dialog.getByRole("button", { name: "Delete permanently now" }).click();
  await expect(dialog).toHaveCount(0); await page.reload(); await openTrash(page); await expect(page.locator(".trash-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to my writing", exact: true }).click();
  await write(page, "Delete all"); await trash(page); await openTrash(page);
  await page.getByRole("button", { name: "Empty trash", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".trash-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Empty trash", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Empty trash" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0); await page.reload(); await openTrash(page); await expect(page.locator(".trash-row")).toHaveCount(0);
});
test("a stale tab cannot bring a trashed document back", async ({ page, context }) => {
  await page.goto("/"); await write(page, "Two tabs");
  const other = await context.newPage(); await other.goto("/");
  await expect(other.getByRole("textbox", { name: "Add title" })).toHaveValue("Two tabs");
  await trash(page);
  await other.getByRole("textbox", { name: "Document body" }).fill("Stale editing");
  await expect(other.locator(".unsupported")).toBeVisible();
  await page.reload(); await openTrash(page);
  await expect(page.locator(".trash-row")).toContainText("Two tabs");
});
test("trashing the current document selects the next draft then an empty draft", async ({ page }) => {
  await page.goto("/"); await write(page, "First draft");
  await page.locator(".admin-bar").getByRole("button", { name: "New" }).click();
  await write(page, "Second draft"); await trash(page);
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue("First draft");
  await trash(page);
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue("");
  await expect(page.locator(".document-row-actions button")).toBeDisabled();
});
test("expired trash is hidden and removed from storage on reopening", async ({ page }) => {
  let clockTime = Date.parse("2026-09-15T00:00:00Z");
  await page.route("**/api/auth/session", route => route.fulfill({
    json: { authenticated: true, username: "clock-fixture", expiresAt: clockTime + 8 * 3600000 }
  }));
  await page.clock.install({ time: new Date("2026-09-15T00:00:00Z") });
  await page.goto("/"); await write(page, "Expired draft"); await trash(page);
  clockTime = Date.parse("2026-10-16T00:00:00Z");
  await page.clock.setSystemTime(new Date(clockTime));
  await page.reload(); await openTrash(page); await expect(page.locator(".trash-row")).toHaveCount(0);
  const count = await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const req = indexedDB.open("wonboard-writer-v1", 1);
    req.onsuccess = () => { const db = req.result, read = db.transaction("drafts").objectStore("drafts").count();
      read.onsuccess = () => { resolve(read.result); db.close(); }; read.onerror = () => reject(read.error); };
  }));
  expect(count).toBe(0);
});
test("undoing a trash move restores the document after reload", async ({ page }) => {
  await page.goto("/"); await write(page, "Undo draft"); await trash(page);
  await page.getByRole("button", { name: "Undo move" }).click();
  await expect(page.getByRole("button", { name: "Undo move" })).toHaveCount(0); await page.reload();
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue("Undo draft");
  await expect(page.getByRole("textbox", { name: "Document body" })).toContainText("Text to keep.");
});
