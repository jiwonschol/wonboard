import { Fragment, type ReactNode, type CSSProperties } from "react";
import {
  blockStyle,
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
): ReactNode {
  const children = node.content?.map((child, i) => (
    <Fragment key={i}>{renderNode(child, urls)}</Fragment>
  ));
  const attrs = node.attrs ?? {};
  const style = blockStyle(attrs) as CSSProperties;
  if (node.type === "text")
    return (node.marks ?? []).reduce<ReactNode>((content, mark) => {
      if (mark.type === "bold") return <strong>{content}</strong>;
      if (mark.type === "italic") return <em>{content}</em>;
      if (mark.type === "underline") return <u>{content}</u>;
      if (mark.type === "strike") return <s>{content}</s>;
      if (mark.type === "code") return <code>{content}</code>;
      if (mark.type === "link" && safeLink(mark.attrs?.href))
        return (
          <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        );
      return content;
    }, node.text);
  if (node.type === "hardBreak") return <br />;
  if (node.type === "paragraph")
    return <p style={style}>{children?.length ? children : <br />}</p>;
  if (node.type === "heading") {
    const Tag = attrs.level === 1 ? "h1" : attrs.level === 3 ? "h3" : "h2";
    return <Tag style={style}>{children}</Tag>;
  }
  if (node.type === "blockquote") return <blockquote>{children}</blockquote>;
  if (node.type === "bulletList") return <ul>{children}</ul>;
  if (node.type === "orderedList")
    return (
      <ol
        start={Number(attrs.start ?? 1)}
        // 문서는 `type` 을 보존하고 편집기도 그대로 보여주는데 미리보기만 버리면
        // 알파벳·로마자 목록이 숫자로 되돌아간다. HTML 이 아는 다섯 값만 넘긴다.
        type={listType(attrs.type)}
      >
        {children}
      </ol>
    );
  if (node.type === "listItem") return <li>{children}</li>;
  if (node.type === "codeBlock")
    return (
      <pre>
        <code>{children}</code>
      </pre>
    );
  if (node.type === "horizontalRule") return <hr />;
  if (node.type === "video" && isVideo(attrs))
    return (
      <figure className="wb-video-player">
        <iframe
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
      <div className="wb-media" data-align={attrs.align ?? "left"}>
        <figure style={{ width: Number(attrs.width ?? 600), maxWidth: "100%" }}>
          <img
            src={urls[String(attrs.mediaId)]}
            alt={String(attrs.alt ?? "")}
          />
          {attrs.caption ? (
            <figcaption>{String(attrs.caption)}</figcaption>
          ) : null}
        </figure>
      </div>
    );
  return children;
}
export function DocumentPreview({
  document,
  mediaUrls,
}: {
  document: WriterDocument;
  mediaUrls: Record<string, string>;
}) {
  return (
    <article className="document-page preview-page" lang={document.locale}>
      <h1 className="document-title">{document.title}</h1>
      <div className="tiptap">{renderNode(document.content, mediaUrls)}</div>
    </article>
  );
}
