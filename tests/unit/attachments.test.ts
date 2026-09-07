import { describe, it, expect } from "vitest";
import {
  attachmentFilename,
  newDraft,
  parseVideoUrl,
  videoEmbedUrl,
  parseVideoTime,
  validateDocument,
  exportBackup,
  importBackup,
} from "@wonboard/document";

describe("video URLs and attachment names", () => {
  it.each([
    ["https://youtu.be/M7lc1UVf-VE?t=1m23s", 83],
    ["https://www.youtube.com/watch?v=M7lc1UVf-VE&start=90&autoplay=1", 90],
    ["https://youtube.com/shorts/M7lc1UVf-VE", 0],
    ["https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?start=20", 20],
    ["https://vimeo.com/76979871#t=1m2s", 62],
    ["https://player.vimeo.com/video/76979871?h=abcdef0123#t=32s", 32],
  ])("recognises %s without inheriting autoplay", (url, time) => {
    const v = parseVideoUrl(String(url));
    expect(v?.startSeconds).toBe(time);
    expect(v?.autoplay).toBe(false);
    expect(new URL(videoEmbedUrl(v!)).searchParams.get("autoplay")).toBe("0");
  });
  it.each([
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
    "https://youtube.com@evil.test/watch?v=M7lc1UVf-VE",
    "https://youtu.be/invalid",
    "https://vimeo.com/76979871/../../evil",
    "https://vimeo.com/76979871?h=<script>",
    "https://youtu.be/M7lc1UVf-VE?t=-1",
    "https://youtu.be/M7lc1UVf-VE?t=999999999",
    "https://youtu.be:4433/M7lc1UVf-VE",
    "http://youtu.be/M7lc1UVf-VE",
  ])("rejects unsafe/unsupported URL %s", (url) =>
    expect(parseVideoUrl(url)).toBeNull(),
  );
  it("preserves Vimeo unlisted hash and emits start fragment", () => {
    const v = parseVideoUrl("https://vimeo.com/76979871/abcdef0123#t=42s")!;
    const url = new URL(videoEmbedUrl({ ...v, autoplay: true }));
    expect(url.hostname).toBe("player.vimeo.com");
    expect(url.searchParams.get("h")).toBe("abcdef0123");
    expect(url.hash).toBe("#t=42s");
    expect(url.searchParams.get("autoplay")).toBe("1");
  });
  it("accepts minutes/seconds but rejects malformed time", () => {
    expect(parseVideoTime("2:05")).toBe(125);
    expect(parseVideoTime("1:02:03")).toBe(3723);
    expect(parseVideoTime("1:99")).toBeNull();
  });
  it("round trips videos and naming preference through ZIP", async () => {
    const draft = newDraft();
    draft.document.autoRenameAttachments = false;
    draft.document.content.content!.push({
      type: "video",
      attrs: {
        ...parseVideoUrl("https://youtu.be/M7lc1UVf-VE?t=2m")!,
        autoplay: true,
      },
    });
    validateDocument(draft.document);
    expect((await importBackup(await exportBackup(draft))).document).toEqual(
      draft.document,
    );
  });
  it("rejects forged provider metadata", () => {
    const d = newDraft();
    d.document.content.content!.push({
      type: "video",
      attrs: {
        provider: "youtube",
        videoId: "../../evil",
        privacyHash: "",
        startSeconds: 0,
        autoplay: false,
      },
    });
    expect(() => validateDocument(d.document)).toThrow();
  });
  it("derives sequential filenames from the latest title without changing originals or IDs", () => {
    const d = newDraft();
    d.document.media.a = {
      id: "a",
      originalName: "한글.png",
      mime: "image/png",
      width: 1,
      height: 1,
      size: 1,
      sha256: "a".repeat(64),
    };
    d.document.media.b = {
      ...d.document.media.a,
      id: "b",
      originalName: "photo.jpeg",
      mime: "image/jpeg",
    };
    d.document.title = "제주 여행";
    expect(attachmentFilename(d.document, "a")).toBe("제주 여행_001.png");
    expect(attachmentFilename(d.document, "b")).toBe("제주 여행_002.jpg");
    d.document.title = "서울/여행";
    expect(attachmentFilename(d.document, "a")).toBe("서울 여행_001.png");
    d.document.autoRenameAttachments = false;
    expect(attachmentFilename(d.document, "a")).toBe("한글.png");
    expect(d.document.media.a.id).toBe("a");
  });
});
