import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { exportBackup, importBackup, newDraft } from "@wonboard/document";
import { openDesktopStore } from "../../apps/desktop/src/store";
import { openDesktopRepository } from "../../apps/client/src/desktopRepository";
import { openStorage, saveDraft, loadDrafts } from "../../apps/client/src/storage";
import { recoveredDraft } from "../../apps/client/src/trash";

// 데스크톱판과 Sites판 사이의 공식 이동 경로는 ZIP 백업과 복원이다.
it("opens a ZIP backup made from the desktop store through the browser restore with the same title, body and photo", async () => {
  const directory = mkdtempSync(join(tmpdir(), "wonboard-move-"));
  let store = openDesktopStore(directory);
  vi.stubGlobal("window", { wonboardDesktop: {
    list: async () => store.list(), load: async (id: string) => store.load(id),
    save: async (...args: Parameters<typeof store.save>) => store.save(...args),
  } });
  try {
    const written = newDraft("ko"), bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    written.document.title = "데스크톱에서 쓴 글 Desktop post";
    written.document.media.photo = { id: "photo", originalName: "사진.png", mime: "image/png", width: 1, height: 1,
      size: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
    written.blobs.photo = new Blob([bytes], { type: "image/png" });
    written.document.content = { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "첫 문단 " }, { type: "text", text: "굵게 bold", marks: [{ type: "bold" }] }] },
      { type: "media", attrs: { mediaId: "photo", width: 320, align: "center", alt: "대체 설명", caption: "사진 설명" } },
      { type: "paragraph", content: [{ type: "text", text: "사진 다음 문단" }] },
    ] };
    await openDesktopRepository().save(written, 0);

    // 앱을 다시 열어 디스크에 남은 것만으로 백업을 만든다.
    store.close(); store = openDesktopStore(directory);
    const desktop = openDesktopRepository();
    const backup = await exportBackup(await desktop.load((await desktop.list())[0]));

    // 브라우저 쪽(로컬 웹·Sites판의 "백업 가져오기")은 새 문서로 받아 저장한다.
    const db = await openStorage(crypto.randomUUID());
    try {
      await saveDraft(db, recoveredDraft(await importBackup(backup)), 0);
      const [opened] = await loadDrafts(db);
      expect(opened.document.title).toBe(written.document.title);
      expect(opened.document.content).toEqual(written.document.content);
      expect(opened.document.media).toEqual(written.document.media);
      expect(new Uint8Array(await opened.blobs.photo.arrayBuffer())).toEqual(bytes);
    } finally { db.close(); }
  } finally { store.close(); vi.unstubAllGlobals(); }
});
