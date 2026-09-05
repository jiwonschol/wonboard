import { test, expect } from "./fixtures";

test("file drop and clipboard image events insert originals; pointer resizing survives reload", async ({
  page,
}) => {
  await page.goto("/");
  const body = page.getByRole("textbox", { name: "Document body" });
  await body.fill("사진 앞 문단");
  await body.press("Enter");
  const bytes = [
    ...(await page.screenshot({
      clip: { x: 0, y: 0, width: 320, height: 160 },
    })),
  ];
  for (const kind of ["drop", "paste"] as const) {
    await body.evaluate(
      (element, { bytes, kind }) => {
        const transfer = new DataTransfer();
        transfer.items.add(
          new File([new Uint8Array(bytes)], `${kind}-한글.png`, {
            type: "image/png",
          }),
        );
        const box = element.getBoundingClientRect();
        const event =
          kind === "drop"
            ? new DragEvent("drop", {
                bubbles: true,
                cancelable: true,
                dataTransfer: transfer,
                clientX: box.x + 10,
                clientY: box.bottom - 5,
              })
            : new ClipboardEvent("paste", {
                bubbles: true,
                cancelable: true,
                clipboardData: transfer,
              });
        if (
          kind === "paste" &&
          !(event as ClipboardEvent).clipboardData?.files.length
        ) {
          // Firefox's synthetic ClipboardEvent constructor may omit file payloads.
          Object.defineProperty(event, "clipboardData", { value: transfer });
        }
        element.dispatchEvent(event);
      },
      { bytes, kind },
    );
    await expect(page.locator(".wb-media img")).toHaveCount(
      kind === "drop" ? 1 : 2,
    );
    await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  }
  await page.locator(".wb-media img").first().click();
  const beforeWidth = await page
    .locator(".wb-media figure")
    .first()
    .evaluate((e) => e.getBoundingClientRect().width);
  const handle = page.locator(".resize-handle");
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 - 80,
    box!.y + box!.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  const width = await page
    .locator(".wb-media figure")
    .first()
    .evaluate((e) => e.style.width);
  expect(parseInt(width)).toBeLessThan(beforeWidth);
  await expect(page.getByRole("status").last()).toHaveText("Saved locally");
  await page.reload();
  await expect(page.locator(".wb-media img")).toHaveCount(2);
  expect(
    await page
      .locator(".wb-media figure")
      .first()
      .evaluate((e) => e.style.width),
  ).toBe(width);
});
