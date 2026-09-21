import { Fragment, type ReactNode, type CSSProperties } from "react";
import {
  blockStyle,
  textBoxStyle,
  textStyle,
  writingFonts,
  fontFamily,
  safeLink,
  isVideo,
  videoEmbedUrl,
  videoSourceUrl,
  type ContentNode,
  type WriterDocument,
} from "@wonboard/document";
/** 게시판이 표를 지원하지 않을 때 표 대신 넣는 게시용 그림. */
export type TableImage = { src: string; alt: string; width: number };
export type TableImages = ReadonlyMap<ContentNode, TableImage>;
export function tableNodes(node: ContentNode): ContentNode[] {
  if (node.type === "table") return [node];
  return (node.content ?? []).flatMap(tableNodes);
}
/** 한 번의 내보내기에서 그림으로 바꾸는 표의 상한. 문서당 사진 한도와 같은 규모로 둔다. */
export const maxTableImages = 50;
// 그리는 방식이나 글꼴 파일이 바뀌면 올린다. 바뀌지 않은 표도 새로 그려 예전 그림을 계속 쓰지 않게 한다.
const tableImageVersion = 1;
/** 표 내용과 글꼴이 같으면 같은 값. 다시 게시할 때 바뀌지 않은 표의 주소를 그대로 쓴다. */
export async function tableImageId(node: ContentNode, font: string | undefined) {
  const bytes = new TextEncoder().encode(JSON.stringify([tableImageVersion, font ?? "sans", node]));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `table-${Array.from(digest.slice(0, 20), b => b.toString(16).padStart(2, "0")).join("")}`;
}
const orderedListTypes = ["1", "a", "A", "i", "I"] as const;
const listType = (value: unknown) =>
  (orderedListTypes as readonly string[]).includes(String(value))
    ? (String(value) as (typeof orderedListTypes)[number])
    : undefined;
function renderNode(
  node: ContentNode,
  urls: Record<string, string>,
  portable = false,
  parent = "",
  videoLinksOnly = false,
  tableImages?: TableImages,
): ReactNode {
  const children = node.content?.map((child, i) => (
    <Fragment key={i}>{renderNode(child, urls, portable, node.type, videoLinksOnly, tableImages)}</Fragment>
  ));
  const attrs = node.attrs ?? {};
  const margin = portable ? { margin: ["listItem", "tableCell", "tableHeader"].includes(parent) ? "0" : "0 0 1.35em" } : {};
  const style = { ...margin, ...blockStyle(attrs) } as CSSProperties;
  // 칸 안에서 정렬을 고르지 않은 문단은 칸의 정렬을 따른다.
  if (["tableCell", "tableHeader"].includes(parent) && (attrs.textAlign ?? null) === null) delete style.textAlign;
  if (node.type === "text")
    return (node.marks ?? []).reduce<ReactNode>((content, mark) => {
      if (mark.type === "bold") return <strong>{content}</strong>;
      if (mark.type === "italic") return <em>{content}</em>;
      if (mark.type === "underline") return <u>{content}</u>;
      if (mark.type === "strike") return <s>{content}</s>;
      if (mark.type === "code") return <code style={portable ? { fontFamily: writingFonts[3].family } : undefined}>{content}</code>;
      // 표식을 달아 미리보기·내보낸 글을 다시 붙여넣어도 드래그로 준 스타일이 되살아나게 한다.
      if (mark.type === "textStyle") return <span style={textStyle(mark.attrs)}
        data-wb-variant={typeof mark.attrs?.variant === "string" ? mark.attrs.variant : undefined}>{content}</span>;
      if (mark.type === "link" && safeLink(mark.attrs?.href))
        return (
          <a href={mark.attrs.href} title={typeof mark.attrs.title === "string" ? mark.attrs.title : undefined} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        );
      return content;
    }, node.text);
  if (node.type === "hardBreak") return <br />;
  if (node.type === "fileRef") {
    const href = urls[String(attrs.fileId)];
    return href && ((!portable && href.startsWith("blob:")) || safeLink(href))
      ? <a href={href} download={String(attrs.label)} rel="noopener noreferrer">{String(attrs.label)}</a>
      : <span data-private-file={String(attrs.fileId)}>{String(attrs.label)}</span>;
  }
  if (node.type === "paragraph")
    return <p style={{ ...(portable ? { minHeight: "1.4em" } : {}), ...style }}>{children?.length ? children : <br />}</p>;
  if (node.type === "heading") {
    const Tag = attrs.level === 2 ? "h2" : attrs.level === 3 ? "h3" : "h1";
    return <Tag style={{ ...(portable ? { fontSize: attrs.level === 1 ? "2em" : attrs.level === 3 ? "1.3em" : "1.65em", lineHeight: 1.2, fontWeight: 500 } : {}), ...style }}>{children}</Tag>;
  }
  // 게시판은 외부 CSS·class를 버리므로 글상자와 표는 인라인 스타일만으로 모양을 갖춘다.
  if (node.type === "textBox")
    return <div data-wb-text-box="" style={{ ...(portable ? { margin: "0 0 1.35em" } : {}), ...textBoxStyle(attrs) } as CSSProperties}>{children}</div>;
  const tableImage = node.type === "table" ? tableImages?.get(node) : undefined;
  if (tableImage)
    return <div style={{ ...margin, lineHeight: 0 }}><img src={tableImage.src} alt={tableImage.alt} width={tableImage.width}
      style={{ display: "block", width: "100%", maxWidth: tableImage.width, height: "auto" }} /></div>;
  if (node.type === "table")
    return <table style={portable ? { ...margin, borderCollapse: "collapse", width: "100%" } : undefined}><tbody>{children}</tbody></table>;
  if (node.type === "tableRow") return <tr>{children}</tr>;
  if (node.type === "tableCell" || node.type === "tableHeader") {
    const Cell = node.type === "tableHeader" ? "th" : "td";
    const align = ["left", "center", "right"].includes(String(attrs.align)) ? String(attrs.align) as CSSProperties["textAlign"] : undefined;
    return <Cell style={{ ...(portable ? { border: "1px solid #c9ced6", padding: "6px 10px", verticalAlign: "top",
      textAlign: align ?? "left", ...(node.type === "tableHeader" ? { backgroundColor: "#f2f4f7", fontWeight: 600 } : {}) } : { textAlign: align }) }}>{children}</Cell>;
  }
  if (node.type === "blockquote") return <blockquote style={portable ? { ...margin, borderLeft: "3px solid #111", paddingLeft: "1.25em" } : undefined}>{children}</blockquote>;
  if (node.type === "bulletList") return <ul style={portable ? { ...margin, paddingLeft: "1.6em" } : undefined}>{children}</ul>;
  if (node.type === "orderedList")
    return (
      <ol
        start={Number(attrs.start ?? 1)}
        // 문서는 `type` 을 보존하고 편집기도 그대로 보여주는데 미리보기만 버리면
        // 알파벳·로마자 목록이 숫자로 되돌아간다. HTML 이 아는 다섯 값만 넘긴다.
        type={listType(attrs.type)}
        style={portable ? { ...margin, paddingLeft: "1.6em" } : undefined}
      >
        {children}
      </ol>
    );
  if (node.type === "listItem") return <li>{children}</li>;
  if (node.type === "codeBlock")
    return (
      <pre style={portable ? { ...margin, background: "#f5f5f5", padding: 16, overflow: "auto", fontSize: 15, whiteSpace: "pre-wrap" } : undefined}>
        <code style={portable ? { fontFamily: writingFonts[3].family } : undefined}>{children}</code>
      </pre>
    );
  if (node.type === "horizontalRule") return <hr style={portable ? { border: 0, borderTop: "1px solid #bbb", margin: "2em 0" } : undefined} />;
  if (node.type === "video" && isVideo(attrs))
    return (
      <figure className="wb-video-player">
        {!videoLinksOnly && <iframe
          style={portable ? { width: "100%", aspectRatio: "16 / 9", border: 0 } : undefined}
          src={videoEmbedUrl(attrs)}
          title={`${attrs.provider === "youtube" ? "YouTube" : "Vimeo"} ${attrs.videoId}`}
          loading="lazy"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />}
        <figcaption>
          <a
            href={videoSourceUrl(attrs)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {attrs.provider === "youtube" ? "YouTube" : "Vimeo"} ·{" "}
            {attrs.videoId}
          </a>
        </figcaption>
      </figure>
    );
  if (node.type === "media")
    return (
      <div className="wb-media" data-align={attrs.align ?? "left"} style={portable ? { margin: "1.35em 0", textAlign: (attrs.align ?? "left") as CSSProperties["textAlign"] } : undefined}>
        <figure style={{ width: Number(attrs.width ?? 600), maxWidth: "100%", ...(portable ? { display: "inline-block", margin: 0, lineHeight: 0 } : {}) }}>
          <img
            src={urls[String(attrs.mediaId)]}
            alt={String(attrs.alt ?? "")}
            loading="lazy"
            width={portable ? Number(attrs.width ?? 600) : undefined}
            style={portable ? { display: "block", width: "100%", maxWidth: "100%", height: "auto" } : undefined}
          />
          {attrs.caption ? (
            <figcaption style={portable ? { lineHeight: 1.5, fontSize: 14, textAlign: "center", padding: "8px 0" } : undefined}>{String(attrs.caption)}</figcaption>
          ) : null}
        </figure>
      </div>
    );
  return children;
}
export function PortableDocumentBody({ document, mediaUrls, videoLinksOnly = false, tableImages }: {
  document: WriterDocument; mediaUrls: Record<string, string>; videoLinksOnly?: boolean; tableImages?: TableImages;
}) {
  return <div lang={document.locale} style={{ color: "#111", fontFamily: fontFamily(document.defaultFont),
    fontSize: "19.3642px", lineHeight: 1.4, fontWeight: 400, letterSpacing: "-0.1px",
    whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{renderNode(document.content, mediaUrls, true, "", videoLinksOnly, tableImages)}</div>;
}
export function DocumentPreview({
  document,
  mediaUrls,
}: {
  document: WriterDocument;
  mediaUrls: Record<string, string>;
}) {
  return (
    <article className="document-page preview-page" lang={document.locale} style={{ fontFamily: fontFamily(document.defaultFont) }}>
      <h1 className="document-title">{document.title}</h1>
      <div className="tiptap">{renderNode(document.content, mediaUrls)}</div>
    </article>
  );
}
