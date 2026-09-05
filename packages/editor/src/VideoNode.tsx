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
  parseHTML() {
    return [];
  },
  renderHTML({ node }) {
    return [
      "div",
      { "data-wonboard-video": node.attrs.videoId },
      node.attrs.provider,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
