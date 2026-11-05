import { expect, type Page, type TestInfo } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8, zipSync, strToU8 } from "../../packages/document/node_modules/fflate/esm/index.mjs";
import { syntheticPng } from "./sites-runtime";

export async function collectionRoundTrip(page: Page, testInfo: TestInfo, mode: "local" | "sites", reset?: () => Promise<void>) {
  await page.goto("/");
  await expect(page.locator(".tiptap")).toBeVisible();
  const ids = await page.evaluate(async ({ mode, png }) => {
    const docUrl = "/packages/document/src/index.ts", repoUrl = "/apps/client/src/draftRepository.ts";
    const { newDraft, sha256 } = await import(docUrl);
    const { openDraftRepository } = await import(repoUrl);
    const repo = await openDraftRepository(mode, () => {});
    try {
      const text = newDraft("en"), photo = newDraft("en"), trash = newDraft("en");
      text.document.title = "Text to keep";
      text.document.content.content = [{ type: "paragraph", content: [{ type: "text", text: "Keep this body" }] }];
      photo.document.title = "Two photos and a file";
      photo.document.content.content = [{ type: "paragraph", content: [{ type: "text", text: "Illustrated body" }] }];
      for (const id of ["photo1", "photo2"]) {
        const blob = new Blob([new Uint8Array(png)], { type: "image/png" });
        photo.blobs[id] = blob;
        photo.document.media[id] = { id, originalName: `${id}.png`, mime: blob.type, size: blob.size, width: 1, height: 1,
          sha256: await sha256(await blob.arrayBuffer()) };
        photo.document.content.content.push({ type: "media", attrs: { mediaId: id } });
      }
      const file = new Blob(["Attachment contents"], { type: "text/plain" });
      photo.blobs.note = file;
      photo.document.files = { note: { id: "note", originalName: "note.txt", mime: file.type, size: file.size,
        sha256: await sha256(await file.arrayBuffer()) } };
      photo.document.content.content.push({ type: "paragraph", content: [{ type: "fileRef", attrs: { fileId: "note", label: "note.txt" } }] });
      trash.document.title = "Do not resurrect"; trash.document.trashedAt = new Date().toISOString();
      for (const draft of [text, photo, trash]) await repo.save(draft, 0);
      return { text: text.document.documentId, photo: photo.document.documentId, trash: trash.document.documentId };
    } finally { repo.close(); }
  }, { mode, png: [...syntheticPng] });
  await page.reload();
  await expect(page.locator(".document-list > button")).toHaveCount(2);
  await page.getByRole("button", { name: "Save to PC", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Save to PC", exact: true });
  const button = menu.getByRole("button", { name: "Back up all documents (.zip)", exact: true });
  const bbox = await button.boundingBox();
  expect(bbox).not.toBeNull();
  expect(bbox!.x).toBeGreaterThanOrEqual(0);
  expect(bbox!.x + bbox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const downloading = page.waitForEvent("download");
  await button.click();
  const download = await downloading;
  await expect(page.getByRole("status").filter({ hasText: "Backed up 2 documents." })).toBeVisible();
  const archive = await readFile((await download.path())!);
  const entries = unzipSync(new Uint8Array(archive));
  expect(Object.keys(entries).sort()).toEqual([`${ids.text}.zip`, `${ids.photo}.zip`, "manifest.json"].sort());
  const manifest = JSON.parse(strFromU8(entries["manifest.json"]));
  expect(manifest.documents).toHaveLength(2);
  expect(manifest.skipped).toEqual([]);
  const inner = unzipSync(entries[`${ids.photo}.zip`]);
  expect(Object.keys(inner).sort()).toEqual(["document.json", "files/note", "media/photo1", "media/photo2"]);
  expect(strFromU8(inner["files/note"])).toBe("Attachment contents");
  expect(Buffer.from(inner["media/photo1"])).toEqual(syntheticPng);
  expect(Buffer.from(inner["media/photo2"])).toEqual(syntheticPng);

  // Use the production limit check with a reduced test-only ceiling: one text
  // document fits, while the illustrated document must be explicitly skipped.
  const previousLimit = await page.evaluate(async limit => {
    const url = "/packages/document/src/index.ts", { limits } = await import(url);
    const previous = limits.archiveBytes; limits.archiveBytes = limit; return previous;
  }, entries[`${ids.text}.zip`].byteLength + 16);
  await page.getByRole("combobox", { name: "Interface language" }).selectOption("ko");
  await page.getByRole("button", { name: "PC 저장", exact: true }).click();
  const partialDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "모든 글 백업 (.zip)", exact: true }).click();
  const partial = unzipSync(new Uint8Array(await readFile((await (await partialDownload).path())!)));
  expect(JSON.parse(strFromU8(partial["manifest.json"])).skipped).toEqual([
    { documentId: ids.photo, title: "Two photos and a file", reason: "archiveLimit" },
  ]);
  await expect(page.getByRole("status").filter({ hasText: "1개 글은 담지 못했습니다" })).toBeVisible();
  await page.evaluate(async previous => {
    const url = "/packages/document/src/index.ts", { limits } = await import(url); limits.archiveBytes = previous;
  }, previousLimit);
  await page.getByRole("combobox", { name: "화면 언어" }).selectOption("en");

  // Restore into an empty store using the actual import control.
  await page.goto("about:blank");
  if (reset) await reset();
  else await page.goto("/").then(async () => {
    await expect(page.locator(".tiptap")).toBeVisible();
    await page.evaluate(async () => {
      const url = "/apps/client/src/storage.ts";
      const { openStorage } = await import(url), db = await openStorage();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("drafts", "readwrite");
        transaction.objectStore("drafts").clear();
        transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    });
  });
  await page.goto("/");
  const input = page.locator('input[accept=".zip,application/zip"]');
  await input.setInputFiles({ name: "all.zip", mimeType: "application/zip", buffer: archive });
  await expect(page.getByRole("status").filter({ hasText: "Restored 2 documents as new documents." })).toBeVisible();
  await expect(page.locator(".document-list > button")).toHaveCount(2);
  await page.locator(".document-list > button").filter({ hasText: "Two photos and a file" }).click();
  await expect(page.locator(".tiptap .wb-media img")).toHaveCount(2);
  await expect(page.locator(".tiptap")).toContainText("Illustrated body");
  await expect(page.locator(".tiptap")).toContainText("note.txt");
  const stored = await page.evaluate(async mode => {
    const url = "/apps/client/src/draftRepository.ts", { openDraftRepository } = await import(url);
    const repo = await openDraftRepository(mode, () => {});
    try {
      const list = await repo.list(), photo = await repo.load(list.find((item: any) => item.document.title === "Two photos and a file"));
      const fileId = Object.keys(photo.document.files)[0];
      return { ids: list.map((item: any) => item.document.documentId), attachment: await photo.blobs[fileId].text(),
        photos: await Promise.all(["photo1", "photo2"].map(async id => [...new Uint8Array(await photo.blobs[id].arrayBuffer())])) };
    } finally { repo.close(); }
  }, mode);
  expect(stored.ids).not.toContain(ids.text); expect(stored.ids).not.toContain(ids.photo); expect(stored.ids).not.toContain(ids.trash);
  expect(stored.attachment).toBe("Attachment contents");
  expect(stored.photos).toEqual([[...syntheticPng], [...syntheticPng]]);

  // An extracted, unchanged inner ZIP still goes through the single import path.
  await input.setInputFiles({ name: "one.zip", mimeType: "application/zip", buffer: Buffer.from(entries[`${ids.photo}.zip`]) });
  await expect(page.getByText("Backup restored as a new document.", { exact: true })).toBeVisible();
  await expect(page.locator(".document-list > button")).toHaveCount(3);

  // Corruption of one document does not prevent the next document's restore.
  entries[`${ids.photo}.zip`] = strToU8("broken");
  await input.setInputFiles({ name: "partial.zip", mimeType: "application/zip", buffer: Buffer.from(zipSync(entries, { level: 0 })) });
  await expect(page.getByRole("status").filter({ hasText: "Restored 1 documents as new documents. Could not restore 1 documents." })).toBeVisible();
  await expect(page.locator(".document-list > button")).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath("collection-restored.png") });
}
