import {
  attachmentFilename,
  attachmentNodes,
  DocumentError,
  fileTitle,
  isVideo,
  safeLink,
  sha256,
  validateDocument,
  videoSourceUrl,
  zipFiles,
  type ContentNode,
  type Draft,
  type WriterDocument,
} from "@wonboard/document";

// PC 저장: 글을 사용자의 기기 안에서 파일로 바꾼다. 서버로 보내는 길은 없다.

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// 흔한 파일 시스템은 이름 하나를 UTF-8로 255바이트까지만 받는다. 확장자와 번호가 붙을 자리를 남긴다.
const nameBytes = 200;
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
/** 글자를 쪼개지 않고 `limit` 바이트 안으로 줄인다. */
function fit(text: string, limit: number) {
  const letters = Array.from(text);
  while (letters.length && bytes(letters.join("")) > limit) letters.pop();
  return letters.join("").trim();
}

/** Windows가 받지 않는 이름을 피한다: 끝의 점·공백을 떼고, 장치 이름(CON, NUL, COM1, COM¹ 등)은 앞에 _를 붙인다. */
function safeStem(stem: string) {
  const value = stem.replace(/[. ]+$/, "");
  return /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])$/i.test(value.split(".")[0].trim()) ? `_${value}` : value;
}

/** 저장할 파일의 이름(확장자 제외). 제목이 비면 제품 이름을 쓴다. */
export const saveName = (document: WriterDocument) => safeStem(fit(fileTitle(document.title), nameBytes)) || "wonboard";

/**
 * 본문에 나오는 순서대로 사진 ID → 파일 이름. 텍스트의 "[사진: 이름]"과 마크다운 ZIP의
 * 파일이 같은 이름을 쓴다. 경로·주소에서 뜻이 달라지는 글자를 빼고, 겹치는 이름은 번호로 가른다.
 */
export function imageNames(document: WriterDocument): Map<string, string> {
  const names = new Map<string, string>(), taken = new Set<string>();
  for (const node of attachmentNodes(document.content)) {
    const id = String(node.attrs?.mediaId);
    if (node.type !== "media" || names.has(id) || !Object.hasOwn(document.media, id)) continue;
    let raw = attachmentFilename(document, id).normalize("NFC")
      .replace(/[\u0000-\u001f\u007f<>:"/\\|?*#%&]/g, "_").trim().replace(/[. ]+$/, "");
    if (!raw) raw = "image";
    // 확장자가 사진 형식과 다르면(없거나 .txt 등) 맞는 확장자를 덧붙인다. 그래야 어디서 열어도 그림으로 읽힌다.
    const dot = raw.lastIndexOf("."), png = document.media[id].mime === "image/png";
    const split = dot > 0 && (png ? /^\.png$/i : /^\.jpe?g$/i).test(raw.slice(dot));
    const extension = split ? raw.slice(dot) : png ? ".png" : ".jpg", stem = safeStem(fit(split ? raw.slice(0, dot) : raw, nameBytes - bytes(extension))) || "image";
    let name = stem + extension;
    // 대소문자만 다른 이름은 Windows·macOS에서 같은 파일이 된다.
    for (let count = 2; taken.has(name.toLowerCase()); count++) name = `${stem}-${count}${extension}`;
    taken.add(name.toLowerCase());
    names.set(id, name);
  }
  return names;
}

const inlineText = (node: ContentNode): string =>
  node.type === "text" ? node.text ?? ""
    : node.type === "hardBreak" ? "\n"
      : node.type === "fileRef" ? String(node.attrs?.label ?? "")
        : (node.content ?? []).map(inlineText).join("");

/** 번호 목록의 표시. 문서가 가진 알파벳·로마자 번호를 그대로 쓴다. */
function orderedMarker(type: unknown, value: number) {
  let letters = "", roman = "";
  for (let rest = value; rest > 0; rest = Math.floor((rest - 1) / 26)) letters = String.fromCharCode(97 + (rest - 1) % 26) + letters;
  let rest = value;
  for (const [amount, sign] of [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]] as const)
    for (; rest >= amount; rest -= amount) roman += sign;
  const label = type === "a" ? letters : type === "A" ? letters.toUpperCase()
    // 로마 숫자는 3999까지만 쓴다. 브라우저도 그 뒤로는 숫자로 보여 준다.
    : (type === "i" || type === "I") && value <= 3999 ? (type === "i" ? roman : roman.toUpperCase()) : String(value);
  return `${label}. `;
}

const videoLabel = (attrs: Record<string, unknown>) => `${attrs.provider === "youtube" ? "YouTube" : "Vimeo"} · ${attrs.videoId}`;

/** 서식 없는 글. 사진 자리에는 `photo(파일 이름)`이 돌려준 표시만 남는다. */
export function toPlainText(document: WriterDocument, photo: (name: string) => string): string {
  const names = imageNames(document);
  const lines = (node: ContentNode): string[] => {
    const attrs = node.attrs ?? {}, children = node.content ?? [];
    if (node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock") return inlineText(node).split("\n");
    if (node.type === "horizontalRule") return ["---"];
    if (node.type === "media") {
      const name = names.get(String(attrs.mediaId));
      return [...(name ? [photo(name)] : []), ...(attrs.caption ? [String(attrs.caption)] : [])];
    }
    if (node.type === "video") return isVideo(attrs) ? [videoSourceUrl(attrs)] : [];
    if (node.type === "bulletList" || node.type === "orderedList")
      return children.flatMap((item, index) => {
        const marker = node.type === "bulletList" ? "- " : orderedMarker(attrs.type, Number(attrs.start ?? 1) + index);
        return (item.content ?? []).flatMap(lines).map((line, row) => (row ? " ".repeat(marker.length) : marker) + line);
      });
    if (node.type === "table")
      return children.map(row => (row.content ?? []).map(cell => (cell.content ?? []).map(inlineText).join(" ").replace(/[\t\n]/g, " ")).join("\t"));
    return children.flatMap(lines);
  };
  return [...(document.title ? [document.title, ""] : []), ...lines(document.content)].join("\n") + "\n";
}

// 마크다운 문법으로 읽힐 수 있는 글자. 줄 첫머리에서만 뜻이 생기는 글자는 startOfLine이 따로 막는다.
// 이어진 공백은 읽는 쪽이 하나로 줄이므로 둘째부터 줄바꿈 없는 공백으로 바꿔 남긴다.
const escapeText = (text: string) => text.replace(/[\\`*_[\]<>~|&]/g, "\\$&").replace(/(?<= ) /g, "&nbsp;");
// 줄 첫머리의 공백은 마크다운이 버리거나 코드 블록으로 읽는다. 줄바꿈 없는 공백으로 바꿔 들여쓰기를 남긴다.
const startOfLine = (line: string) => /^[ \t]/.test(line)
  ? line.replace(/^[ \t]+/, run => run.replace(/\t/g, "    ").replace(/ /g, "&nbsp;"))
  : line.replace(/^([#>+\-=])/, "\\$1").replace(/^(\d+)([.)])/, "$1\\$2");
function codeSpan(text: string, inTable: boolean) {
  const value = text.replace(/\n/g, " "), fence = "`".repeat(Math.max(0, ...[...value.matchAll(/`+/g)].map(run => run[0].length)) + 1);
  // 양끝이 모두 공백이면 읽는 쪽이 하나씩 떼어 내므로, 그때도 한 칸씩 더 준다.
  const padding = /^`|`$/.test(value) || (value.startsWith(" ") && value.endsWith(" ") && value.trim() !== "") ? " " : "";
  return fence + padding + (inTable ? value.replace(/\|/g, "\\|") : value) + padding + fence;
}
/** 강조·링크 기호는 공백이나 줄바꿈에 붙으면 제대로 읽히지 않으므로 가장자리의 그것들을 기호 밖으로 낸다. */
function wrap(inner: string, open: string, close = open) {
  const [, lead, core, trail] = /^((?:\s|\\\n|<br>)*)([\s\S]*?)((?:\s|\\\n|<br>)*)$/.exec(inner)!;
  return core ? lead + open + core + close + trail : inner;
}
/** 제목 줄 끝의 #은 닫는 표시로 읽혀 사라지므로 막는다. */
const headingLine = (level: number, text: string) => `${"#".repeat(level)} ${text.replace(/#+$/, run => run.replace(/#/g, "\\#"))}`;
const emphasis = [["bold", "**"], ["italic", "*"], ["strike", "~~"]] as const;
const hasMark = (node: ContentNode, type: string) => node.marks?.some(mark => mark.type === type) ?? false;
/** 링크의 주소와 제목(풍선 도움말)을 줄바꿈으로 이은 값. 링크가 아니면 빈 문자열이다. 주소에는 공백이 없다. */
const linkOf = (node: ContentNode) => {
  const attrs = node.marks?.find(mark => mark.type === "link")?.attrs;
  return safeLink(attrs?.href) ? `${attrs.href}\n${typeof attrs.title === "string" ? attrs.title.replace(/\s+/g, " ").trim() : ""}` : "";
};
const linkTitle = (title: string) => title ? ` "${escapeText(title).replace(/"/g, '\\"')}"` : "";
// 주소 안의 &와 역슬래시는 마크다운이 문자 참조(&copy; 등)나 이스케이프로 읽으므로 역슬래시로 막는다.
// 표 안에서는 주소의 |도 칸을 나누는 글자로 읽히므로 %7C로 바꾼다.
const destination = (href: string, inTable: boolean) => {
  const value = (inTable ? href.replace(/\|/g, "%7C") : href).replace(/[\\&]/g, "\\$&");
  return /[()<>]/.test(value) ? `<${value.replace(/[<>]/g, encodeURIComponent)}>` : value;
};
/** 칸 가장자리의 공백은 표 문법이 떼어 내므로 줄바꿈 없는 공백으로 바꿔 남긴다. */
const edgeSpaces = (text: string) => text.replace(/^[ \t]+|[ \t]+$/g, run => run.replace(/\t/g, "    ").replace(/ /g, "&nbsp;"));

/**
 * 문단 안의 글. 이웃한 글자가 같은 서식이면 한 번만 감싼다. 밑줄·글자색·글꼴·크기처럼
 * 마크다운에 없는 서식은 기호 없이 글자만 남긴다.
 */
function inline(nodes: ContentNode[], lineBreak: string, inTable: boolean, level = -1): string {
  const runs = <T,>(key: (node: ContentNode) => T, render: (run: ContentNode[], value: T) => string) => {
    let out = "";
    for (let start = 0; start < nodes.length;) {
      const value = key(nodes[start]);
      let end = start + 1;
      while (end < nodes.length && key(nodes[end]) === value) end++;
      out += render(nodes.slice(start, end), value);
      start = end;
    }
    return out;
  };
  if (level === -1)
    return runs(linkOf, (run, link) => {
      const text = inline(run, lineBreak, inTable, 0), [href, title] = link.split("\n");
      return href ? wrap(text, "[", `](${destination(href, inTable)}${linkTitle(title)})`) : text;
    });
  if (level < emphasis.length)
    return runs(node => hasMark(node, emphasis[level][0]), (run, marked) => {
      const text = inline(run, lineBreak, inTable, level + 1);
      return marked ? wrap(text, emphasis[level][1]) : text;
    });
  return nodes.map(node => {
    if (node.type === "hardBreak") return lineBreak;
    if (node.type === "fileRef") return escapeText(String(node.attrs?.label ?? ""));
    const text = node.text ?? "";
    return hasMark(node, "code") ? codeSpan(text, inTable) : escapeText(text).replace(/\n/g, lineBreak);
  }).join("");
}

/** 사진 경로. 공백·괄호가 든 이름은 꺾쇠로 감싸 글자 그대로의 파일 이름을 가리킨다. */
const imagePath = (name: string) => /[\s()]/.test(name) ? `<images/${name}>` : `images/${name}`;

/**
 * 마크다운. 사진은 `images/파일 이름`을 가리킨다(`imageNames`와 같은 이름).
 * 글상자·정렬·배경처럼 표현할 수 없는 블록 서식은 안의 글을 일반 글로 남긴다.
 */
export function toMarkdown(document: WriterDocument): string {
  const names = imageNames(document);
  const blocks = (nodes: ContentNode[]) => nodes.map(block).filter(lines => lines.length);
  const join = (parts: string[][]) => parts.flatMap((lines, index) => index ? ["", ...lines] : lines);
  const block = (node: ContentNode): string[] => {
    const attrs = node.attrs ?? {}, children = node.content ?? [];
    if (node.type === "paragraph") {
      // 문단 끝의 줄바꿈 표시는 화면에 역슬래시로 남으므로 뗀다.
      const text = inline(children, "\\\n", false).replace(/(?:\\\n)+$/, "");
      return text.trim() ? text.split("\n").map(startOfLine) : [];
    }
    if (node.type === "heading") {
      // 제목은 한 줄이어야 하므로 제목 안의 줄바꿈은 <br>로 남긴다.
      const text = edgeSpaces(inline(children, "<br>", false).replace(/(?:<br>)+$/, ""));
      return text.trim() ? [headingLine(attrs.level === 2 ? 2 : attrs.level === 3 ? 3 : 1, text)] : [];
    }
    if (node.type === "codeBlock") {
      const code = inlineText(node), language = /^[\w+#.-]{1,40}$/.test(String(attrs.language ?? "")) ? String(attrs.language) : "";
      const fence = "`".repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map(run => run[0].length + 1)));
      return [fence + language, ...code.split("\n"), fence];
    }
    if (node.type === "horizontalRule") return ["---"];
    if (node.type === "blockquote") return join(blocks(children)).map(line => line ? `> ${line}` : ">");
    if (node.type === "bulletList" || node.type === "orderedList")
      return children.flatMap((item, index) => {
        const marker = node.type === "bulletList" ? "- " : `${Number(attrs.start ?? 1) + index}. `;
        // 문단 바로 뒤의 하위 목록은 빈 줄 없이 붙여야 목록 전체가 느슨한 목록으로 바뀌지 않는다.
        const body = (item.content ?? []).reduce<string[]>((lines, child) => {
          const next = block(child);
          if (!next.length) return lines;
          const nested = child.type === "bulletList" || child.type === "orderedList";
          return lines.length ? [...lines, ...(nested ? [] : [""]), ...next] : next;
        }, []);
        return (body.length ? body : [""]).map((line, row) => row ? (line ? " ".repeat(marker.length) + line : "") : (marker + line).trimEnd());
      });
    if (node.type === "media") {
      const name = names.get(String(attrs.mediaId));
      const alt = escapeText(String(attrs.alt ?? "")).replace(/\s+/g, " ");
      const caption = escapeText(String(attrs.caption ?? "")).replace(/\s+/g, " ").trim();
      return [...(name ? [`![${alt}](${imagePath(name)})`] : []), ...(caption ? ["", startOfLine(caption)] : [])];
    }
    if (node.type === "video") return isVideo(attrs) ? [`[${escapeText(videoLabel(attrs))}](${videoSourceUrl(attrs)})`] : [];
    if (node.type === "table") {
      const rows = children.map(row => (row.content ?? []).map(cell =>
        (cell.content ?? []).map(paragraph => inline(paragraph.content ?? [], "<br>", true)).filter(text => text.trim()).map(edgeSpaces).join("<br>")));
      const width = Math.max(1, ...rows.map(row => row.length));
      const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, index) => cells[index] ?? "").join(" | ")} |`;
      const align = Array.from({ length: width }, (_, index) => {
        const value = children[0]?.content?.[index]?.attrs?.align;
        return value === "center" ? ":-:" : value === "right" ? "--:" : "---";
      });
      // 마크다운 표는 머리 행이 꼭 있어야 한다. 머리 행을 끈 표는 빈 머리 행을 두어 첫 행이 머리 행으로 바뀌지 않게 한다.
      const headed = children[0]?.content?.some(cell => cell.type === "tableHeader");
      return rows.length ? [line(headed ? rows[0] : []), line(align), ...rows.slice(headed ? 1 : 0).map(line)] : [];
    }
    return join(blocks(children));
  };
  const title = escapeText(document.title).replace(/\s+/g, " ").trim();
  return join([...(title ? [[headingLine(1, title)]] : []), ...blocks(document.content.content ?? [])]).join("\n") + "\n";
}

/** 사진 원본. 백업과 같은 기준으로, 없거나 보관 중에 바뀐 사진은 성한 것처럼 내보내지 않는다. */
export async function photoBytes(draft: Draft, id: string): Promise<ArrayBuffer> {
  const media = draft.document.media[id], blob = draft.blobs[id];
  if (!blob || blob.size !== media.size) throw new DocumentError("missingMedia");
  const buffer = await blob.arrayBuffer();
  if ((await sha256(buffer)) !== media.sha256) throw new Error("damagedPhoto");
  return buffer;
}

export type SavedFile = { blob: Blob; name: string; photos: number };

export function textFile(draft: Draft, photo: (name: string) => string): SavedFile {
  validateDocument(draft.document);
  return { blob: new Blob([toPlainText(draft.document, photo)], { type: "text/plain;charset=utf-8" }),
    name: `${saveName(draft.document)}.txt`, photos: imageNames(draft.document).size };
}

/** 사진이 없으면 .md 하나, 있으면 .md와 `images/` 아래 사진 원본을 묶은 ZIP. */
export async function markdownFile(draft: Draft): Promise<SavedFile> {
  validateDocument(draft.document);
  const name = saveName(draft.document), names = imageNames(draft.document);
  const markdown = new TextEncoder().encode(toMarkdown(draft.document));
  if (!names.size) return { blob: new Blob([markdown], { type: "text/markdown;charset=utf-8" }), name: `${name}.md`, photos: 0 };
  const files: Record<string, Uint8Array> = { [`${name}.md`]: markdown };
  for (const [id, filename] of names) files[`images/${filename}`] = new Uint8Array(await photoBytes(draft, id));
  return { blob: new Blob([await zipFiles(files)], { type: "application/zip" }), name: `${name}.zip`, photos: names.size };
}
