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
import { isMediaId, limits, type Locale } from "@wonboard/document";

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
  addOptions() {
    return {
      // 붙여넣은 사진이 **이 초안에 실제로 있는지**는 노드 명세가 혼자 알 수 없다.
      // 편집기가 현재 초안의 media 집합을 넣어 준다. 기본값은 닫는 쪽이다 —
      // 배선이 빠지면 조용히 깨진 노드를 만드는 대신 붙여넣기를 거부한다.
      ownsMedia: ((_mediaId: string) => false) as (
        mediaId: string,
      ) => boolean,
    };
  },
  addAttributes() {
    return {
      mediaId: { default: null },
      width: { default: 600 },
      align: { default: "left" },
      alt: { default: "" },
      caption: { default: "" },
    };
  },
  // 원격 HTML 이미지는 여전히 받지 않는다. 다만 규칙이 하나도 없으면 편집기가
  // 직렬화한 자기 표식조차 되읽지 못해, 이미지를 잘라내 옮기면 유일한 배치가
  // 사라지고 복사해도 복제가 안 된다. Wonboard 가 쓴 표식만 좁게 되읽는다.
  parseHTML() {
    return [
      {
        tag: "figure[data-wonboard-media]",
        getAttrs: (element: HTMLElement) => {
          const mediaId = element.getAttribute("data-wonboard-media");
          // 다른 초안에서 복사한 사진은 id 모양만 맞고 이 초안에는 원본도 메타도
          // 없다. 그대로 받으면 깨진 노드가 생겨 이후 저장·백업이 missingMedia 로
          // 실패한다. 모양이 아니라 소유로 판정한다.
          if (!isMediaId(mediaId) || !this.options.ownsMedia(mediaId))
            return false;
          const width = Number(element.getAttribute("data-wonboard-width"));
          const align = String(element.getAttribute("data-wonboard-align"));
          return {
            mediaId,
            width:
              Number.isFinite(width) && width >= 40 && width <= 8000
                ? width
                : 600,
            align: ["left", "center", "right"].includes(align) ? align : "left",
            alt: (element.getAttribute("data-wonboard-alt") ?? "").slice(
              0,
              limits.attributeText,
            ),
            caption: (
              element.querySelector("figcaption")?.textContent ?? ""
            ).slice(0, limits.attributeText),
          };
        },
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "figure",
      {
        "data-wonboard-media": node.attrs.mediaId,
        "data-wonboard-width": String(node.attrs.width),
        "data-wonboard-align": String(node.attrs.align),
        "data-wonboard-alt": String(node.attrs.alt ?? ""),
      },
      ["figcaption", {}, node.attrs.caption || ""],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaView);
  },
});
