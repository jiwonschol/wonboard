import type { ContentNode, WriterDocument } from "./index";

export type Video = {
  provider: "youtube" | "vimeo";
  videoId: string;
  privacyHash: string;
  startSeconds: number;
  autoplay: boolean;
};
export function isVideo(value: unknown): value is Video {
  if (!value || typeof value !== "object") return false;
  const v = value as Video;
  return (
    (v.provider === "youtube"
      ? /^[\w-]{11}$/.test(v.videoId) && v.privacyHash === ""
      : v.provider === "vimeo" &&
        /^\d{1,12}$/.test(v.videoId) &&
        /^(?:[a-fA-F0-9]{6,32})?$/.test(v.privacyHash)) &&
    typeof v.videoId === "string" &&
    typeof v.privacyHash === "string" &&
    Number.isSafeInteger(v.startSeconds) &&
    v.startSeconds >= 0 &&
    v.startSeconds <= 604800 &&
    typeof v.autoplay === "boolean"
  );
}
export function parseVideoTime(value: string): number | null {
  if (!value) return 0;
  let seconds: number;
  if (/^\d+$/.test(value)) seconds = Number(value);
  else if (/^\d+:\d{1,2}(?::\d{1,2})?$/.test(value)) {
    const parts = value.split(":").map(Number);
    if (parts.slice(1).some((v) => v >= 60)) return null;
    seconds = parts.reduce((a, b) => a * 60 + b, 0);
  } else {
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
    if (!match || !match[0]) return null;
    seconds =
      Number(match[1] ?? 0) * 3600 +
      Number(match[2] ?? 0) * 60 +
      Number(match[3] ?? 0);
  }
  return Number.isSafeInteger(seconds) && seconds <= 604800 ? seconds : null;
}
export function parseVideoUrl(input: string): Video | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    const host = url.hostname;
    const parts = url.pathname.split("/").filter(Boolean);
    let videoId = "",
      privacyHash = "",
      provider: Video["provider"];
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
        "youtu.be",
      ].includes(host)
    ) {
      provider = "youtube";
      if (host === "youtu.be" && parts.length === 1) videoId = parts[0];
      else if (url.pathname === "/watch")
        videoId = url.searchParams.get("v") ?? "";
      else if (
        ["embed", "shorts", "live"].includes(parts[0]) &&
        parts.length === 2
      )
        videoId = parts[1];
    } else if (
      ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)
    ) {
      provider = "vimeo";
      if (
        host === "player.vimeo.com" &&
        parts[0] === "video" &&
        parts.length === 2
      )
        videoId = parts[1];
      else if (
        host !== "player.vimeo.com" &&
        (parts.length === 1 || parts.length === 2)
      ) {
        videoId = parts[0];
        privacyHash = parts[1] ?? "";
      }
      privacyHash = url.searchParams.get("h") ?? privacyHash;
    } else return null;
    const time =
      url.searchParams.get("start") ??
      url.searchParams.get("t") ??
      new URLSearchParams(url.hash.slice(1)).get("t") ??
      "";
    const startSeconds = parseVideoTime(time);
    if (startSeconds === null) return null;
    // Autoplay is an author choice; never inherit it from a pasted URL.
    const video = {
      provider,
      videoId,
      privacyHash,
      startSeconds,
      autoplay: false,
    };
    return isVideo(video) ? video : null;
  } catch {
    return null;
  }
}
export function videoEmbedUrl(video: Video): string {
  if (!isVideo(video)) throw new Error("invalidVideo");
  const url = new URL(
    video.provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${video.videoId}`
      : `https://player.vimeo.com/video/${video.videoId}`,
  );
  url.searchParams.set("autoplay", video.autoplay ? "1" : "0");
  if (video.provider === "youtube") {
    url.searchParams.set("start", String(video.startSeconds));
    url.searchParams.set("playsinline", "1");
  } else {
    if (video.privacyHash) url.searchParams.set("h", video.privacyHash);
    url.searchParams.set("dnt", "1");
    url.hash = `t=${video.startSeconds}s`;
  }
  return url.toString();
}
export function videoSourceUrl(video: Video): string {
  if (!isVideo(video)) throw new Error("invalidVideo");
  return video.provider === "youtube"
    ? `https://www.youtube.com/watch?v=${video.videoId}&t=${video.startSeconds}s`
    : `https://vimeo.com/${video.videoId}${video.privacyHash ? `/${video.privacyHash}` : ""}#t=${video.startSeconds}s`;
}
export function attachmentNodes(node: ContentNode): ContentNode[] {
  return node.type === "media" || node.type === "video"
    ? [node]
    : (node.content ?? []).flatMap(attachmentNodes);
}
export function attachmentFilename(
  document: WriterDocument,
  id: string,
): string {
  const media = document.media[id];
  if (!media) throw new Error("missingMedia");
  if (document.autoRenameAttachments === false) return media.originalName;
  const title =
    Array.from(
      document.title
        .normalize("NFC")
        .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/, ""),
    )
      .slice(0, 80)
      .join("") || "untitled";
  // A stable import sequence survives block moves and title edits.
  const sequence = Object.keys(document.media).indexOf(id) + 1;
  return `${title}_${String(sequence).padStart(3, "0")}.${media.mime === "image/png" ? "png" : "jpg"}`;
}
