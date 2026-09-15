import { expect, it } from "vitest";
import { newDraft } from "@wonboard/document";
import { trashExpired, trashDaysRemaining, TRASH_RETENTION_MS, latestActiveDraft, recoveredDraft } from "../../apps/client/src/trash";

it("expires exactly at thirty days and rounds remaining days upward", () => {
  const document = { ...newDraft().document, trashedAt: "2026-09-15T00:00:00.000Z" };
  const start = Date.parse(document.trashedAt), end = start + TRASH_RETENTION_MS;
  expect(trashExpired(document, end - 1)).toBe(false);
  expect(trashDaysRemaining(document, end - 1)).toBe(1);
  expect(trashExpired(document, end)).toBe(true);
  expect(trashDaysRemaining(document, end)).toBe(0);
  expect(trashDaysRemaining(document, start)).toBe(30);
  expect(trashDaysRemaining(document, start + 86400000)).toBe(29);
});
it("selects the newest active draft and creates an empty draft when none remain", () => {
  const active = newDraft(), trashed = newDraft();
  trashed.document.trashedAt = new Date().toISOString();
  expect(latestActiveDraft([trashed, active], "ko")).toBe(active);
  const empty = latestActiveDraft([trashed], "ko");
  expect(empty.document.documentId).not.toBe(trashed.document.documentId);
  expect(empty.document.revision).toBe(0);
});
it("restores a backup as a new active document without changing the original", () => {
  const original = newDraft();
  original.document.trashedAt = new Date().toISOString();
  original.document.revision = 7;
  const recovered = recoveredDraft(original);
  expect(recovered.document.trashedAt).toBeUndefined();
  expect(recovered.document.documentId).not.toBe(original.document.documentId);
  expect(recovered.document.revision).toBe(0);
  expect(original.document.trashedAt).toBeDefined();
});
