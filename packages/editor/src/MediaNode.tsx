import {
  createContext,
  useContext,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { translator } from "@wonboard/locales";
import type { Locale } from "@wonboard/document";

export const MediaContext = createContext<{
  urls: Record<string, string>;
  locale: Locale;
}>({ urls: {}, locale: "ko" });
function MediaView({
  node,
  updateAttributes,
  selected,
  editor,
}: NodeViewProps) {
  const { urls, locale } = useContext(MediaContext);
  const t = translator(locale);
  const figure = useRef<HTMLElement>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const drag = useRef<{ x: number; width: number; max: number } | null>(null);
  const width = dragWidth ?? Number(node.attrs.width ?? 600);
  function start(e: PointerEvent<HTMLButtonElement>) {
    if (!editor.isEditable) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      width: figure.current?.getBoundingClientRect().width ?? width,
      max: figure.current?.parentElement?.clientWidth ?? 8000,
    };
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    setDragWidth(
      Math.round(
        Math.max(
          40,
          Math.min(
            drag.current.max,
            drag.current.width + e.clientX - drag.current.x,
          ),
        ),
      ),
    );
  }
  function end() {
    if (drag.current && dragWidth !== null)
      updateAttributes({ width: dragWidth });
    drag.current = null;
    setDragWidth(null);
  }
  return (
    <NodeViewWrapper
      className={`wb-media ${selected ? "is-selected" : ""}`}
      data-media-id={node.attrs.mediaId}
      data-align={node.attrs.align ?? "left"}
    >
      <figure
        ref={figure}
        style={{ width, maxWidth: "100%" }}
        contentEditable={false}
      >
        <img
          src={urls[node.attrs.mediaId]}
          alt={String(node.attrs.alt ?? "")}
          draggable={false}
        />
        {node.attrs.caption ? (
          <figcaption>{node.attrs.caption}</figcaption>
        ) : null}
        {selected && editor.isEditable ? (
          <button
            className="resize-handle"
            aria-label={t("resize")}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                updateAttributes({
                  width: Math.max(
                    40,
                    Math.min(8000, width + (e.key === "ArrowRight" ? 10 : -10)),
                  ),
                });
              }
            }}
          />
        ) : null}
      </figure>
    </NodeViewWrapper>
  );
}
export const MediaNode = Node.create({
  name: "media",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      mediaId: { default: null },
      width: { default: 600 },
      align: { default: "left" },
      alt: { default: "" },
      caption: { default: "" },
    };
  },
  // Remote HTML images are not silently fetched or converted into owned originals.
  parseHTML() {
    return [];
  },
  renderHTML({ node }) {
    return [
      "figure",
      { "data-wonboard-media": node.attrs.mediaId },
      ["figcaption", {}, node.attrs.caption || ""],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaView);
  },
});
