import { Fragment, type ReactNode, type CSSProperties } from "react";
import {
  blockStyle,
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
): ReactNode {
  const children = node.content?.map((child, i) => (
    <Fragment key={i}>{renderNode(child, urls, portable, node.type)}</Fragment>
  ));
  const attrs = node.attrs ?? {};
  const margin = portable ? { margin: parent === "listItem" ? "0" : "0 0 1.35em" } : {};
  const style = { ...margin, ...blockStyle(attrs) } as CSSProperties;
  if (node.type === "text")
    return (node.marks ?? []).reduce<ReactNode>((content, mark) => {
      if (mark.type === "bold") return <strong>{content}</strong>;
      if (mark.type === "italic") return <em>{content}</em>;
      if (mark.type === "underline") return <u>{content}</u>;
      if (mark.type === "strike") return <s>{content}</s>;
      if (mark.type === "code") return <code style={portable ? { fontFamily: writingFonts[3].family } : undefined}>{content}</code>;
      if (mark.type === "textStyle") return <span style={textStyle(mark.attrs)}>{content}</span>;
      if (mark.type === "link" && safeLink(mark.attrs?.href))
        return (
          <a href={mark.attrs.href} title={typeof mark.attrs.title === "string" ? mark.attrs.title : undefined} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        );
      return content;
    }, node.text);
  if (node.type === "hardBreak") return <br />;
  if (node.type === "paragraph")
    return <p style={{ ...(portable ? { minHeight: "1.4em" } : {}), ...style }}>{children?.length ? children : <br />}</p>;
  if (node.type === "heading") {
    const Tag = attrs.level === 2 ? "h2" : attrs.level === 3 ? "h3" : "h1";
    return <Tag style={{ ...(portable ? { fontSize: attrs.level === 1 ? "2em" : attrs.level === 3 ? "1.3em" : "1.65em", lineHeight: 1.2, fontWeight: 500 } : {}), ...style }}>{children}</Tag>;
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
        <iframe
          style={portable ? { width: "100%", aspectRatio: "16 / 9", border: 0 } : undefined}
          src={videoEmbedUrl(attrs)}
          title={`${attrs.provider === "youtube" ? "YouTube" : "Vimeo"} ${attrs.videoId}`}
          loading="lazy"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
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
export function PortableDocumentBody({ document, mediaUrls }: {
  document: WriterDocument; mediaUrls: Record<string, string>;
}) {
  return <div lang={document.locale} style={{ color: "#111", fontFamily: fontFamily(document.defaultFont),
    fontSize: "19.3642px", lineHeight: 1.4, fontWeight: 400, letterSpacing: "-0.1px",
    whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{renderNode(document.content, mediaUrls, true)}</div>;
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
