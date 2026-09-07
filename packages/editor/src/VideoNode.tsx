import { useContext } from "react";
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { isVideo, videoSourceUrl } from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { MediaContext } from "./MediaNode";

function VideoView({ node, selected }: NodeViewProps) {
  const { locale } = useContext(MediaContext);
  const t = translator(locale);
  if (!isVideo(node.attrs)) return null;
  const video = node.attrs;
  return (
    <NodeViewWrapper
      className={`wb-video-card ${selected ? "is-selected" : ""}`}
      contentEditable={false}
    >
      <div className="video-symbol" aria-hidden="true">
        ▶
      </div>
      <div>
        <strong>{video.provider === "youtube" ? "YouTube" : "Vimeo"}</strong>
        <span>
          {video.videoId} · {Math.floor(video.startSeconds / 60)}:
          {String(video.startSeconds % 60).padStart(2, "0")}
        </span>
        <p>{t("videoSettingsHint")}</p>
        <a
          href={videoSourceUrl(video)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("openVideo")}
        </a>
      </div>
    </NodeViewWrapper>
  );
}
export const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      provider: { default: "youtube" },
      videoId: { default: "" },
      privacyHash: { default: "" },
      startSeconds: { default: 0 },
      autoplay: { default: false },
    };
  },
  // MediaNode 와 같은 이유다 — 자기 표식을 되읽지 못하면 잘라내 옮기기가 삭제가 된다.
  // 임의의 iframe 은 계속 받지 않고, isVideo 를 통과한 값만 노드로 되살린다.
  parseHTML() {
    return [
      {
        tag: "div[data-wonboard-video]",
        getAttrs: (element: HTMLElement) => {
          const attrs = {
            provider: element.getAttribute("data-wonboard-provider"),
            videoId: element.getAttribute("data-wonboard-video"),
            privacyHash: element.getAttribute("data-wonboard-hash") ?? "",
            startSeconds: Number(element.getAttribute("data-wonboard-start")),
            autoplay: element.getAttribute("data-wonboard-autoplay") === "true",
          };
          return isVideo(attrs) ? attrs : false;
        },
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "div",
      {
        "data-wonboard-video": node.attrs.videoId,
        "data-wonboard-provider": String(node.attrs.provider),
        "data-wonboard-hash": String(node.attrs.privacyHash ?? ""),
        "data-wonboard-start": String(node.attrs.startSeconds ?? 0),
        "data-wonboard-autoplay": String(node.attrs.autoplay === true),
      },
      node.attrs.provider,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
