import { isVideo, attachmentNodes } from "./attachments";
export * from "./attachments";
export type Locale = "ko" | "en";
export type Mark = { type: string; attrs?: Record<string, unknown> };
export type ContentNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: ContentNode[];
};
export type Media = {
  id: string;
  originalName: string;
  mime: "image/png" | "image/jpeg";
  width: number;
  height: number;
  size: number;
  sha256: string;
};
export type WriterDocument = {
  schemaVersion: 1;
  documentId: string;
  revision: number;
  title: string;
  locale: Locale;
  content: ContentNode;
  media: Record<string, Media>;
  autoRenameAttachments?: boolean;
  updatedAt: string;
};
export type Draft = { document: WriterDocument; blobs: Record<string, Blob> };
export const limits = {
  title: 10000,
  // alt/caption/language/type 는 validateDocument 가 이 값으로 거른다. 입력 필드도
  // 같은 상수를 써야 화면에서 넘긴 값이 저장 단계에서만 거부되는 일이 없다.
  attributeText: 10000,
  imageBytes: 20 * 1024 * 1024,
  pixels: 40_000_000,
  images: 100,
  archiveBytes: 256 * 1024 * 1024,
  text: 2_000_000,
};
export const emptyContent = (): ContentNode => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
export function newDraft(locale: Locale = "ko"): Draft {
  return {
    document: {
      schemaVersion: 1,
      documentId: crypto.randomUUID(),
      revision: 0,
      title: "",
      locale,
      content: emptyContent(),
      media: {},
      updatedAt: new Date().toISOString(),
    },
    blobs: {},
  };
}
export class DocumentError extends Error {
  constructor(
    public code:
      | "invalidDocument"
      | "futureDocument"
      | "missingMedia"
      | "invalidImage"
      | "imageLimit"
      | "archiveLimit"
      | "corruptBackup",
  ) {
    super(code);
  }
}
const idPattern =
  /^(?!(?:__proto__|constructor|prototype)$)[a-zA-Z0-9_-]{1,80}$/;
// 편집기 클립보드 규칙도 이 판정을 써야 한다 — 붙여넣기에서 받아들이는 id 와
// validateDocument 가 통과시키는 id 가 갈리면 붙여넣은 순간 저장이 막힌다.
export const isMediaId = (value: unknown): value is string =>
  typeof value === "string" && idPattern.test(value);

// PNG dimensions and animation metadata live in the container, so inspect them
// before a browser decoder can allocate the bitmap. JPEG dimensions are checked
// after decoding because this small contract deliberately does not duplicate a
// JPEG parser.
export function inspectImageBytes(
  bytes: Uint8Array,
): "image/png" | "image/jpeg" {
  const mime = imageMime(bytes);
  if (mime !== "image/png") return mime;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset + 12 <= view.byteLength) {
    const size = view.getUint32(offset);
    if (size > view.byteLength - offset - 12)
      throw new DocumentError("invalidImage");
    const type = String.fromCharCode(
      ...new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4),
    );
    if (type === "acTL") throw new DocumentError("invalidImage");
    if (type === "IHDR") {
      if (size !== 13) throw new DocumentError("invalidImage");
      const width = view.getUint32(offset + 8);
      const height = view.getUint32(offset + 12);
      if (width === 0 || height === 0 || width * height > limits.pixels)
        throw new DocumentError("imageLimit");
    }
    offset += size + 12;
  }
  return mime;
}
const hexColor = /^#[\da-f]{6}$/i;
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
function requireThat(condition: unknown): asserts condition {
  if (!condition) throw new DocumentError("invalidDocument");
}
export function safeLink(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length > 4096 ||
    /[\u0000-\u0020]/.test(value)
  )
    return false;
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
const blockNodes = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "codeBlock",
  "horizontalRule",
  "media",
  "video",
]);
const inlineNodes = new Set(["text", "hardBreak"]);
const allowedAttrs: Record<string, string[]> = {
  paragraph: [
    "textAlign",
    "variant",
    "fontSize",
    "textColor",
    "backgroundColor",
    "gradient",
    "padding",
    "borderWidth",
  ],
  heading: [
    "level",
    "textAlign",
    "variant",
    "fontSize",
    "textColor",
    "backgroundColor",
    "gradient",
    "padding",
    "borderWidth",
  ],
  orderedList: ["start", "type"],
  codeBlock: ["language"],
  media: ["mediaId", "width", "align", "alt", "caption"],
  video: ["provider", "videoId", "privacyHash", "startSeconds", "autoplay"],
};
export function validateDocument(
  value: unknown,
): asserts value is WriterDocument {
  requireThat(isObject(value));
  if (value.schemaVersion !== 1) throw new DocumentError("futureDocument");
  requireThat(
    typeof value.documentId === "string" && idPattern.test(value.documentId),
  );
  requireThat(
    Number.isSafeInteger(value.revision) && Number(value.revision) >= 0,
  );
  requireThat(
    typeof value.title === "string" && value.title.length <= limits.title,
  );
  requireThat(value.locale === "ko" || value.locale === "en");
  requireThat(
    value.autoRenameAttachments === undefined ||
      typeof value.autoRenameAttachments === "boolean",
  );
  requireThat(
    typeof value.updatedAt === "string" &&
      Number.isFinite(Date.parse(value.updatedAt)),
  );
  requireThat(
    isObject(value.media) && Object.keys(value.media).length <= limits.images,
  );
  for (const [key, m] of Object.entries(value.media)) {
    requireThat(isObject(m) && key === m.id && idPattern.test(key));
    requireThat(
      typeof m.originalName === "string" && m.originalName.length <= 1024,
    );
    requireThat(m.mime === "image/png" || m.mime === "image/jpeg");
    requireThat(
      Number.isSafeInteger(m.width) &&
        Number.isSafeInteger(m.height) &&
        Number(m.width) > 0 &&
        Number(m.height) > 0 &&
        Number(m.width) * Number(m.height) <= limits.pixels,
    );
    requireThat(
      Number.isSafeInteger(m.size) &&
        Number(m.size) > 0 &&
        Number(m.size) <= limits.imageBytes,
    );
    requireThat(
      typeof m.sha256 === "string" && /^[a-f0-9]{64}$/.test(m.sha256),
    );
  }
  let nodeCount = 0;
  let textLength = 0;
  const walk = (n: unknown, parent: string, depth: number) => {
    requireThat(
      isObject(n) &&
        typeof n.type === "string" &&
        depth < 40 &&
        ++nodeCount < 100_000,
    );
    const type = n.type;
    const allowed =
      parent === ""
        ? type === "doc"
        : parent === "doc" || parent === "blockquote" || parent === "listItem"
          ? blockNodes.has(type)
          : parent === "bulletList" || parent === "orderedList"
            ? type === "listItem"
            : parent === "codeBlock"
              ? type === "text"
              : (parent === "paragraph" || parent === "heading") &&
                inlineNodes.has(type);
    if (!allowed) throw new DocumentError("futureDocument");
    if (type === "text") {
      requireThat(typeof n.text === "string" && n.text.length > 0);
      textLength += n.text.length;
    } else requireThat(n.text === undefined);
    requireThat(textLength <= limits.text);
    if (n.attrs !== undefined) {
      requireThat(isObject(n.attrs));
      for (const [key, v] of Object.entries(n.attrs)) {
        if (!(allowedAttrs[type] ?? []).includes(key))
          throw new DocumentError("futureDocument");
        if (v === null) continue;
        if (key === "textAlign" || key === "align")
          requireThat(["left", "center", "right"].includes(String(v)));
        if (key === "variant")
          requireThat(
            ["default", "display", "subtitle", "annotation"].includes(
              String(v),
            ),
          );
        if (key === "fontSize")
          requireThat(typeof v === "number" && v >= 12 && v <= 96);
        if (key === "textColor" || key === "backgroundColor")
          requireThat(typeof v === "string" && hexColor.test(v));
        if (key === "gradient")
          requireThat(["none", "light", "blue"].includes(String(v)));
        if (key === "padding")
          requireThat(typeof v === "number" && v >= 0 && v <= 80);
        if (key === "borderWidth")
          requireThat(typeof v === "number" && v >= 0 && v <= 8);
        if (key === "level")
          requireThat([1, 2, 3].includes(Number(v)) && typeof v === "number");
        if (key === "width")
          requireThat(
            typeof v === "number" && Number.isFinite(v) && v >= 40 && v <= 8000,
          );
        if (key === "mediaId")
          requireThat(typeof v === "string" && idPattern.test(v));
        if (["alt", "caption", "language", "type"].includes(key))
          requireThat(
            typeof v === "string" && v.length <= limits.attributeText,
          );
        if (key === "start")
          requireThat(
            Number.isSafeInteger(v) && Number(v) >= 1 && Number(v) <= 100000,
          );
      }
    }
    if (type === "media") {
      requireThat(isObject(n.attrs) && typeof n.attrs.mediaId === "string");
      if (!Object.hasOwn(value.media as object, n.attrs.mediaId))
        throw new DocumentError("missingMedia");
    }
    if (type === "video") requireThat(isVideo(n.attrs));
    if (n.marks !== undefined) {
      requireThat(
        Array.isArray(n.marks) && inlineNodes.has(type) && n.marks.length <= 7,
      );
      for (const mark of n.marks) {
        requireThat(isObject(mark));
        if (
          !["bold", "italic", "underline", "strike", "code", "link"].includes(
            String(mark.type),
          )
        )
          throw new DocumentError("futureDocument");
        if (mark.type === "link") {
          requireThat(isObject(mark.attrs) && safeLink(mark.attrs.href));
          for (const [key, value] of Object.entries(mark.attrs)) {
            if (!["href", "target", "rel", "class", "title"].includes(key))
              throw new DocumentError("futureDocument");
            if (key !== "href" && value !== null)
              requireThat(
                typeof value === "string" &&
                  value.length <= limits.attributeText,
              );
          }
        } else if (mark.attrs !== undefined) {
          requireThat(isObject(mark.attrs));
          if (Object.keys(mark.attrs).length)
            throw new DocumentError("futureDocument");
        }
      }
    }
    if (n.content !== undefined) {
      requireThat(Array.isArray(n.content));
      for (const child of n.content) walk(child, type, depth + 1);
    }
    if (
      ["doc", "blockquote", "bulletList", "orderedList", "listItem"].includes(
        type,
      )
    )
      requireThat(Array.isArray(n.content) && n.content.length > 0);
    if (type === "listItem")
      requireThat((n.content as ContentNode[])[0].type === "paragraph");
  };
  walk(value.content, "", 0);
}
export function plainText(node: ContentNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "media") return String(node.attrs?.caption ?? "");
  return (node.content ?? [])
    .map(plainText)
    .join(
      ["doc", "blockquote", "bulletList", "orderedList", "listItem"].includes(
        node.type,
      )
        ? "\n"
        : "",
    );
}
export const characterCount = (text: string, locale: Locale) =>
  Array.from(
    new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text),
  ).length;
export function matchesQuery(
  text: string,
  query: string,
  locale: Locale,
): boolean {
  return text
    .normalize("NFC")
    .toLocaleLowerCase(locale)
    .includes(query.normalize("NFC").toLocaleLowerCase(locale));
}
export const isComposingKey = (e: {
  isComposing?: boolean;
  keyCode?: number;
}) => e.isComposing === true || e.keyCode === 229;
export function blockStyle(
  attrs: Record<string, unknown> = {},
): Record<string, string | number | undefined> {
  const variant = attrs.variant;
  return {
    textAlign: String(attrs.textAlign ?? "left"),
    fontSize: attrs.fontSize
      ? `${attrs.fontSize}px`
      : variant === "display"
        ? "36px"
        : variant === "annotation"
          ? "14px"
          : undefined,
    fontWeight: variant === "display" ? 500 : undefined,
    fontStyle: variant === "subtitle" ? "italic" : undefined,
    color: attrs.textColor ? String(attrs.textColor) : undefined,
    backgroundColor: attrs.backgroundColor
      ? String(attrs.backgroundColor)
      : undefined,
    backgroundImage:
      attrs.gradient === "light"
        ? "linear-gradient(135deg,#ffffff,#e5e7eb)"
        : attrs.gradient === "blue"
          ? "linear-gradient(135deg,#eff6ff,#bfdbfe)"
          : undefined,
    padding: attrs.padding ? `${attrs.padding}px` : undefined,
    border: attrs.borderWidth
      ? `${attrs.borderWidth}px solid currentColor`
      : undefined,
  };
}
export async function sha256(bytes: ArrayBuffer): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function imageMime(bytes: Uint8Array): Media["mime"] {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  throw new DocumentError("invalidImage");
}
/** Snapshot without session-only undo media. Never mutate the live draft. */
export function withoutUnusedMedia(draft: Draft): Draft {
  validateDocument(draft.document);
  const used = new Set(
    attachmentNodes(draft.document.content)
      .filter((node) => node.type === "media")
      .map((node) => String(node.attrs?.mediaId)),
  );
  return {
    document: {
      ...draft.document,
      media: Object.fromEntries(
        Object.entries(draft.document.media).filter(([id]) => used.has(id)),
      ),
    },
    blobs: Object.fromEntries(
      Object.entries(draft.blobs).filter(([id]) => used.has(id)),
    ),
  };
}
export { exportBackup, exportRawBackup, importBackup } from "./backup";
