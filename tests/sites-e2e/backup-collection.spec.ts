import { test, expect } from "@playwright/test";
import { collectionRoundTrip } from "../helpers/backup-collection";

test("all-document backup round trips the Site's documents, photos and attachments", async ({ page, context, request }, testInfo) => {
  test.setTimeout(90_000);
  const headers = { "X-Wonboard-Test-User": "owner-fixture", Origin: "http://127.0.0.1:5174" };
  await context.setExtraHTTPHeaders(headers);
  async function reset() {
    expect((await request.post("/__sites-test/reset")).status()).toBe(204);
    expect((await request.post("/api/sites/setup", { headers, data: { accepted: true, locale: "en" } })).status()).toBe(200);
  }
  await reset();
  await collectionRoundTrip(page, testInfo, "sites", reset);
});
