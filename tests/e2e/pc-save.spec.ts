import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { strFromU8, strToU8, unzipSync, zipSync } from "../../packages/document/node_modules/fflate/esm/index.mjs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { writingFonts, type ContentNode } from "@wonboard/document";

const paragraph = (text: string, marks?: ContentNode["marks"]): ContentNode =>
  ({ type: "paragraph", content: [{ type: "text", text, ...(marks ? { marks } : {}) }] });

/** 백업 ZIP으로 글을 넣는다. 사진은 화면을 서로 다르게 잘라 만든 진짜 PNG다. */
async function restoreDocument(page: Page, path: string, title: string, photos: number, build: (photo: (index: number, caption: string) => ContentNode) => ContentNode[]) {
  const media: Record<string, unknown> = {}, files: Record<string, Uint8Array> = {};
  await page.goto("/");
  for (let index = 0; index < photos; index++) {
    const id = `photo-${index}`, width = 200 + index, height = 300;
    const bytes = new Uint8Array(await page.screenshot({ clip: { x: index, y: 0, width, height }, scale: "css" }));
    media[id] = { id, originalName: `바다 ${index}.png`, mime: "image/png", width, height, size: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex") };
    files[`media/${id}`] = bytes;
  }
  const content = build((index, caption) => ({ type: "media", attrs: { mediaId: `photo-${index}`, width: 200 + index, align: "left", alt: "", caption } }));
  files["document.json"] = strToU8(JSON.stringify({ schemaVersion: 1, documentId: "pc-save-fixture", revision: 0, title, locale: "ko",
    defaultFont: "nanum-serif", autoRenameAttachments: false, content: { type: "doc", content }, media, updatedAt: new Date().toISOString() }));
  await writeFile(path, zipSync(files));
  await page.locator('input[accept=".zip,application/zip"]').setInputFiles(path);
  await expect(page.getByText("Backup restored as a new document.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue(title);
  await expect(page.locator(".tiptap .wb-media img")).toHaveCount(photos);
}

test("Save to PC sits beside Share and saves text and Markdown on this computer", async ({ page }, testInfo) => {
  await restoreDocument(page, testInfo.outputPath("fixture.zip"), "제주 여행", 2, photo => [
    paragraph("빨간 글", [{ type: "textStyle", attrs: { color: "#ff0000", fontFamily: "serif", fontSize: 24 } }]),
    photo(0, "바닷가"), photo(1, ""),
  ]);
  // 공유는 Sites판의 일이다. 다른 판에서는 눌리지 않는 단추 대신 안내가 나온다.
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByText("Sharing works in Wonboard installed on a ChatGPT site.", { exact: false })).toBeVisible();
  await page.getByRole("combobox", { name: "Interface language" }).selectOption("ko");
  await page.getByRole("button", { name: "PC 저장", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "PC 저장", exact: true });
  for (const name of ["PDF로 저장", "텍스트로 저장 (.txt)", "마크다운으로 저장 (.md)", "백업 내려받기 (.zip)"])
    await expect(menu.getByRole("button", { name, exact: true })).toBeVisible();

  // 텍스트: 사진이 있으면 먼저 알리고, 확인해야 저장한다.
  await menu.getByRole("button", { name: "텍스트로 저장 (.txt)", exact: true }).click();
  const warning = page.getByRole("dialog", { name: "텍스트로 저장 (.txt)", exact: true });
  await expect(warning).toContainText("사진 2장의 자리에는 ‘[사진: 파일 이름]’만 남고");
  const text = page.waitForEvent("download");
  await warning.getByRole("button", { name: "사진 없이 저장", exact: true }).click();
  // WebKit은 한글 파일 이름을 자모로 풀어서 알려 준다.
  expect((await text).suggestedFilename().normalize("NFC")).toBe("제주 여행.txt");
  expect(await readFile((await (await text).path())!, "utf8")).toBe("제주 여행\n\n빨간 글\n[사진: 바다 0.png]\n바닷가\n[사진: 바다 1.png]\n");

  // 마크다운: 사진이 있으면 ZIP이고, 글 안의 경로가 ZIP 안의 파일을 가리킨다.
  await page.getByRole("button", { name: "PC 저장", exact: true }).click();
  const markdown = page.waitForEvent("download");
  await menu.getByRole("button", { name: "마크다운으로 저장 (.md)", exact: true }).click();
  expect((await markdown).suggestedFilename().normalize("NFC")).toBe("제주 여행.zip");
  const entries = unzipSync(new Uint8Array(await readFile((await (await markdown).path())!)));
  expect(Object.keys(entries).sort()).toEqual(["images/바다 0.png", "images/바다 1.png", "제주 여행.md"]);
  expect(strFromU8(entries["제주 여행.md"])).toBe("# 제주 여행\n\n빨간 글\n\n![](<images/바다 0.png>)\n\n바닷가\n\n![](<images/바다 1.png>)\n");
  await expect(page.getByText("마크다운 파일과 사진 파일을 ZIP 하나에", { exact: false })).toBeVisible();
});

test("Save as PDF prints only the writing, with its fonts and photos, and keeps blocks whole", async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "PDF 출력은 Chromium만 만든다.");
  test.setTimeout(120_000);
  await page.addInitScript(() => { window.print = () => { document.documentElement.dataset.printed = "yes"; }; });
  const groups = 14, photos = groups;
  await restoreDocument(page, testInfo.outputPath("fixture.zip"), "인쇄할 글", photos, photo => [
    ...writingFonts.map(font => paragraph(`${font.id} 글꼴 한글 English 123`, [{ type: "textStyle", attrs: { fontFamily: font.id } }])),
    // 채움 글의 길이를 조금씩 달리해, 막지 않으면 여러 블록이 쪽 경계에 걸리게 한다.
    ...Array.from({ length: groups }, (_, group) => [
      ...Array.from({ length: 1 + (group % 4) }, (_, line) => paragraph(`채움 ${group}-${line}`)),
      photo(group, `CAP${group}`),
      { type: "table", content: Array.from({ length: 6 }, (_, row) => ({ type: "tableRow", content: [0, 1].map(column => ({
        type: row ? "tableCell" : "tableHeader", attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
        content: [paragraph(`TBL${group}R${row}C${column}`)] })) })) },
      { type: "textBox", attrs: { backgroundColor: "#e8f3ff", borderColor: "#88aadd", borderWidth: 2, padding: 20 },
        content: Array.from({ length: 5 }, (_, line) => paragraph(`BOX${group}L${line}`)) },
    ]).flat(),
  ]);
  await page.getByRole("button", { name: "Save to PC", exact: true }).click();
  await page.getByRole("button", { name: "Save as PDF", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-printed", "yes");
  await expect(page).toHaveTitle("인쇄할 글");

  // 인쇄할 때는 본문만 남는다.
  await page.emulateMedia({ media: "print" });
  for (const chrome of [".admin-bar", ".topbar", ".writing-library", ".wb-editing-area", ".statusbar"])
    await expect(page.locator(chrome)).toBeHidden();
  await expect(page.locator(".print-root .document-title")).toBeVisible();
  await expect(page.locator(".print-root img")).toHaveCount(photos);

  // Chromium은 PDF를 다 만들면 afterprint를 알린다. 그때 인쇄용 본문이 치워지므로 PDF는 한 번만 만든다.
  const pdf = await getDocument({ data: new Uint8Array(await page.pdf({ preferCSSPageSize: true })), useSystemFonts: false }).promise;
  const fonts = new Set<string>(), pageOf = new Map<string, number>();
  let images = 0;
  expect(pdf.numPages).toBeGreaterThan(5);
  for (let number = 1; number <= pdf.numPages; number++) {
    const sheet = await pdf.getPage(number), operators = await sheet.getOperatorList();
    let painted = 0, captions = 0;
    operators.fnArray.forEach((fn, index) => {
      if (fn === OPS.paintImageXObject) painted++;
      if (fn === OPS.setFont) fonts.add(String(sheet.commonObjs.get(operators.argsArray[index][0]).name));
    });
    const words = (await sheet.getTextContent()).items.map(item => "str" in item ? item.str : "").join(" ");
    for (const [marker] of words.matchAll(/(?:TBL|BOX|CAP)\d+/g)) {
      // 한 표·한 글상자의 글은 모두 같은 쪽에 있어야 한다.
      expect(pageOf.get(marker) ?? number, marker).toBe(number);
      if (!pageOf.has(marker) && marker.startsWith("CAP")) captions++;
      pageOf.set(marker, number);
    }
    // 사진은 쪽마다 제 설명과 같은 수만큼 한 번씩만 그려진다(둘로 갈라지면 두 쪽에 그려진다).
    expect(painted, `page ${number}`).toBe(captions);
    images += painted;
  }
  expect(images).toBe(photos);
  expect(pageOf.size).toBe(groups * 3);
  // 글꼴 조각이 PDF에 들어가면 이름 앞에 "ABCDEF+" 표시가 붙는다. 기기 글꼴(기본 고딕·돋움)도 예외가 아니다.
  const embedded = [...fonts].map(name => /^[A-Z]{6}\+(.+)$/.exec(name)?.[1] ?? `not embedded: ${name}`);
  expect(embedded.filter(name => name.startsWith("not embedded"))).toEqual([]);
  // 편집기가 싣는 글꼴은 제 이름으로 들어 있다. 기기 글꼴은 기기마다 달라 이름을 묻지 않는다.
  for (const family of [/^Pretendard/, /^NotoSerifKR/, /^GowunDodum/, /^NanumGothicCoding/, /^NotoSansKR/, /^NanumMyeongjo/, /^GowunBatang/, /^Manrope/, /^NanumGothic(?!Coding)/])
    expect(embedded.some(name => family.test(name)), String(family)).toBe(true);

  await page.emulateMedia({ media: null });
  await expect(page.locator(".print-root")).toHaveCount(0);
  await expect(page).not.toHaveTitle("인쇄할 글");
});
