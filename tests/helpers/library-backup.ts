import { expect, type Page, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8, strToU8, zipSync } from "../../packages/document/node_modules/fflate/esm/index.mjs";

const binary = Buffer.from([0, 255, 7, 13, 10]);

async function openPanel(page: Page) {
  await page.goto("/");
  await page.locator(".writing-library").getByRole("button", { name: "File library", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "File library", exact: true });
  await expect(panel.getByRole("button", { name: "Back up library (.zip)", exact: true })).toBeEnabled();
  return panel;
}

/** Runs in the page so each storage mode answers through its own library adapter. */
const stored = (page: Page, mode: "local" | "sites") => page.evaluate(async mode => {
  const url = mode === "sites" ? "/apps/client/src/sitesFileLibrary.ts" : "/apps/client/src/fileLibrary.ts";
  const module = await import(url), library = mode === "sites" ? module.openSitesFileLibrary() : await module.openBrowserFileLibrary();
  try {
    const files = [];
    for (const file of await library.list()) {
      const bytes = file.trashedAt ? [] : [...new Uint8Array(await (await library.load(file.id)).blob.arrayBuffer())];
      files.push({ id: file.id, filename: file.filename, mime: file.mime, trashed: Boolean(file.trashedAt), bytes });
    }
    return files.sort((a, b) => a.filename.localeCompare(b.filename));
  } finally { library.close(); }
}, mode);

export async function libraryRoundTrip(page: Page, testInfo: TestInfo, mode: "local" | "sites", reset: () => Promise<void>) {
  let panel = await openPanel(page);
  await panel.locator('input[type="file"][multiple]').setInputFiles([
    { name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("Kept only in the library") },
    { name: "보관만.bin", mimeType: "application/x-test", buffer: binary },
    { name: "trashed.txt", mimeType: "text/plain", buffer: Buffer.from("Do not back up") },
  ]);
  await panel.locator("li").filter({ hasText: "trashed.txt" }).getByRole("button", { name: "Move to trash", exact: true }).click();
  await expect(panel.locator(".file-library-list li")).toHaveCount(2);
  const before = await stored(page, mode);

  const downloading = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Back up library (.zip)", exact: true }).click();
  const archive = await readFile((await (await downloading).path())!);
  await expect(panel.getByRole("status").filter({ hasText: "Backed up 2 library files." })).toBeVisible();
  const entries = unzipSync(new Uint8Array(archive));
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  expect(manifest.skipped).toEqual([]);
  expect(manifest.files.map((file: { filename: string }) => file.filename).sort()).toEqual(["note.txt", "보관만.bin"]);
  const ids = Object.fromEntries(before.map(file => [file.filename, file.id]));
  expect(Object.keys(entries).sort()).toEqual([`files/${ids["note.txt"]}`, `files/${ids["보관만.bin"]}`, "manifest.json"].sort());
  expect(strFromU8(entries[`files/${ids["note.txt"]}`])).toBe("Kept only in the library");
  expect(Buffer.from(entries[`files/${ids["보관만.bin"]}`])).toEqual(binary);

  // Restore into an empty library through the panel's own import control.
  await page.goto("about:blank");
  await reset();
  panel = await openPanel(page);
  await expect(panel.locator(".file-library-list li")).toHaveCount(0);
  const input = panel.locator("input[data-library-backup]");
  await input.setInputFiles({ name: "library.zip", mimeType: "application/zip", buffer: archive });
  await expect(panel.getByRole("status").filter({ hasText: "Added 2 files to the library." })).toBeVisible();
  await expect(panel.locator(".file-library-list li")).toHaveCount(2);
  const restored = await stored(page, mode);
  expect(restored.map(({ filename, mime, bytes, trashed }) => ({ filename, mime, bytes, trashed })))
    .toEqual(before.filter(file => !file.trashed).map(({ filename, mime, bytes, trashed }) => ({ filename, mime, bytes, trashed })));
  for (const file of restored) expect(before.map(item => item.id)).not.toContain(file.id);

  // One damaged file is listed by name; the other is added beside the existing files.
  entries[`files/${ids["note.txt"]}`] = strToU8("Changed after the backup");
  await input.setInputFiles({ name: "damaged.zip", mimeType: "application/zip", buffer: Buffer.from(zipSync(entries, { level: 0 })) });
  const result = panel.getByRole("status").filter({ hasText: "Added 1 files to the library." });
  await expect(result).toContainText("Could not restore 1 files:");
  await expect(result.locator("li")).toHaveText(/^note\.txt — /);
  const after = await stored(page, mode);
  expect(after.map(file => file.filename)).toEqual(["note.txt", "보관만.bin", "보관만.bin"]);
  for (const file of restored) expect(after).toContainEqual(file);

  // A document backup is refused here instead of being half-read.
  await input.setInputFiles({ name: "other.zip", mimeType: "application/zip", buffer: Buffer.from(zipSync({ "document.json": strToU8("{}") }, { level: 0 })) });
  await expect(panel.getByRole("alert")).toContainText("This is not a library backup");
  expect(await stored(page, mode)).toHaveLength(3);
  await page.screenshot({ path: testInfo.outputPath("library-restored.png") });
}
