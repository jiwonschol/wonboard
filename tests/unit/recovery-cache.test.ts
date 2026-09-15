import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { newDraft } from "@wonboard/document";
import { cacheRecovery, listRecovery, clearRecovery, discardRecovery, recoveryMode } from "../../apps/client/src/recoveryCache";

it("offers in-place recovery only for an active matching server revision", async () => {
  await clearRecovery();
  const draft = newDraft(); draft.document.revision = 2;
  await cacheRecovery(draft);
  const copy = (await listRecovery())[0];
  expect(recoveryMode(copy, draft)).toBe("replace");
  expect(recoveryMode(copy)).toBe("new");
  expect(recoveryMode(copy, { ...draft, document: { ...draft.document, revision: 3 } })).toBe("new");
  expect(recoveryMode(copy, { ...draft, document: { ...draft.document, trashedAt: new Date().toISOString() } })).toBe("new");
  await clearRecovery();
});
it("keeps newer recovery bytes when an older save completes", async () => {
  await clearRecovery();
  const draft = newDraft(), old = await cacheRecovery(draft);
  const newer = { ...draft, document: { ...draft.document, title: "newer" } };
  const token = await cacheRecovery(newer);
  await discardRecovery(draft.document.documentId, old);
  expect((await listRecovery())[0].draft.document.title).toBe("newer");
  await discardRecovery(draft.document.documentId, token);
  expect(await listRecovery()).toEqual([]);
});
