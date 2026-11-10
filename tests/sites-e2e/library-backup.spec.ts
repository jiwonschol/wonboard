import { test, expect } from "@playwright/test";
import { libraryRoundTrip } from "../helpers/library-backup";

test("library backup round trips the Site's unattached files as new private files", async ({ page, context, request }, testInfo) => {
  test.setTimeout(90_000);
  const headers = { "X-Wonboard-Test-User": "owner-fixture", Origin: "http://127.0.0.1:5174" };
  await context.setExtraHTTPHeaders(headers);
  async function reset() {
    expect((await request.post("/__sites-test/reset")).status()).toBe(204);
    expect((await request.post("/api/sites/setup", { headers, data: { accepted: true, locale: "en" } })).status()).toBe(200);
  }
  await reset();
  await libraryRoundTrip(page, testInfo, "sites", reset);
  // Importing never recreates a share link.
  expect(await (await request.get("/api/file-shares", { headers })).json()).toEqual([]);
});
