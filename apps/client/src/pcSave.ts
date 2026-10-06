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

// ── 마크다운 ──
// 기준: 편집 화면에 보이는 글자(공백과 줄바꿈 포함)가 마크다운을 읽은 결과에도 그대로 보여야 한다.
// 공백·줄바꿈·이스케이프 규칙은 여기 한곳에 둔다. 블록마다 따로 다듬지 않는다.
// 1. 글자: escapeText가 문법 글자를 막는다. 줄 첫머리에서만 뜻이 생기는 글자는 blockStart가 막는다.
// 2. 줄바꿈: inline은 줄바꿈을 BREAK로만 낸다. 블록이 BREAK에서 줄을 나눈 뒤 자기 방식으로 잇는다.
//    문단과 사진 설명은 paragraphLines(역슬래시 줄바꿈, 빈 줄은 <br>), 한 줄이어야 하는 제목과 표 칸은 oneLine(<br>)이다.
// 3. 공백: visible이 문단을 그리기 전에, 줄 가장자리의 공백과 이어진 공백의 둘째부터를 NBSP(&nbsp;)로 표시해 둔다.
//    서식 기호가 사이에 끼어도 보이는 글자 기준으로 센다. 탭은 네 칸이다.
// 4. 속성(사진 대체 글, 링크 제목)은 보이는 글이 아니므로 공백을 바꾸지 않고, 줄바꿈과 탭만 문자 참조(&#10; &#9;)로 쓴다.
// 마크다운으로 옮길 수 없어 가장 가까운 표현을 쓰는 것(글자는 잃지 않는다):
// - 강조(굵게·기울임·취소선) 가장자리의 공백과 줄바꿈은 기호 밖으로 낸다. 기호가 공백에 붙으면 강조로 읽히지 않는다.
// - 강조 가장자리가 문장부호이고 바로 옆이 글자이면 기호가 강조로 읽히지 않으므로 그 사이에 빈 주석(<!-- -->)을 둔다.
// - 코드 글자 안은 글자 그대로다. 공백을 &nbsp;로 바꾸면 그 글자가 보이므로 바꾸지 않는다. 줄바꿈에서는 코드 표시를 나눈다.
// - 본문의 빈 문단은 남기지 않는다(문단 사이 빈 줄과 구별되지 않는다).
// - 링크 표시가 없는 주소 글자를 읽는 쪽이 링크로 만드는 것은 막지 않는다(글자는 같다).
const BREAK = "\u0000", CODE_SPACE = "\u0001", NBSP = "\u0002", SEPARATOR = "<!-- -->";
const withoutMarkers = (text: string) => text.replace(/[\u0000-\u0002]/g, "");
const escapeText = (text: string) => text.replace(/[\\`*_[\]<>~|&]/g, "\\$&");
const escapeAttribute = (text: string) => escapeText(withoutMarkers(text)).replace(/"/g, "\\\"").replace(/\r/g, "&#13;").replace(/\n/g, "&#10;").replace(/\t/g, "&#9;");
const blockStart = (line: string) => line.replace(/^([#>+\-=])/, "\\$1").replace(/^(\d+)([.)])/, "$1\\$2");
const oneLine = (text: string) => text.split(BREAK).join("<br>");
/**
 * 줄마다 하나씩. 글이 있는 줄 사이는 역슬래시 줄바꿈으로 잇고, 빈 줄(이어진 줄바꿈)은 그만큼의 <br>로 옆줄에 붙인다.
 * <br>만 있는 줄이나 역슬래시로 끝나는 마지막 줄은 줄바꿈으로 읽히지 않기 때문이다.
 */
function paragraphLines(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  let empty = 0;
  for (const line of text.split(BREAK)) {
    if (!line) { empty++; continue; }
    if (out.length) out[out.length - 1] += "\\";
    out.push(empty ? "<br>".repeat(empty) + line : blockStart(line));
    empty = 0;
  }
  // 글 뒤에 남은 빈 줄. 줄이 하나도 없으면 줄바꿈뿐인 문단이다(빈 줄 수가 줄바꿈 수보다 하나 많다).
  if (out.length) out[out.length - 1] += "<br>".repeat(empty); else out.push("<br>".repeat(empty - 1));
  return out;
}
/** 코드 글자. 줄바꿈에서는 코드 표시를 나누고 그 사이에 줄바꿈을 둔다. */
function codeSpan(text: string, inTable: boolean) {
  return text.split(/\r?\n/).map(value => {
    if (!value) return "";
    const fence = "`".repeat(Math.max(0, ...[...value.matchAll(/`+/g)].map(run => run[0].length)) + 1);
    // 양끝이 모두 공백이면 읽는 쪽이 하나씩 떼어 내므로, 그때도 한 칸씩 더 준다.
    const padding = /^`|`$/.test(value) || (value.startsWith(" ") && value.endsWith(" ") && value.trim() !== "") ? " " : "";
    return (fence + padding + (inTable ? value.replace(/\|/g, "\\|") : value) + padding + fence).replace(/ /g, CODE_SPACE);
  }).join(BREAK);
}
const isWord = (char: string | undefined) => Boolean(char) && !/[\s\u0000-\u0002\p{P}\p{S}]/u.test(char!);
const isMark = (char: string | undefined) => char === "*" || char === "~";
const isPunctuation = (char: string | undefined) => Boolean(char) && /[\p{P}\p{S}]/u.test(char!);
/**
 * 강조 기호로 감싼다. `before`와 `after`는 바로 옆에 올 글이다.
 * 가장자리의 공백·줄바꿈은 기호 밖으로 내고, 기호가 강조로 읽히지 않을 자리(문장부호와 글자 사이, 같은 기호끼리 맞닿는 곳)에는 빈 주석을 둔다.
 */
function emphasize(inner: string, mark: string, before: string, after: string) {
  const [, lead, core, trail] = /^([\s\u0000\u0002]*)([\s\S]*?)([\s\u0000\u0002]*)$/.exec(inner)!;
  if (!core) return inner;
  const left = before[before.length - 1], right = after[0];
  const open = !lead && (isMark(left) || (isPunctuation(core[0]) && isWord(left))) ? SEPARATOR : "";
  const close = !trail && (isMark(right) || (isPunctuation(core[core.length - 1]) && isWord(right))) ? SEPARATOR : "";
  return lead + open + mark + core + mark + close + trail;
}
/** 제목 줄 끝의 #은 닫는 표시로 읽혀 사라지므로 막는다. */
const headingLine = (level: number, text: string) => `${"#".repeat(level)} ${text.replace(/#+$/, run => run.replace(/#/g, "\\#"))}`;
const emphasis = [["bold", "**"], ["italic", "*"], ["strike", "~~"]] as const;
const hasMark = (node: ContentNode, type: string) => node.marks?.some(mark => mark.type === type) ?? false;
/** 링크의 주소와 제목(풍선 도움말)을 줄바꿈으로 이은 값. 링크가 아니면 빈 문자열이다. 주소에는 공백이 없어 첫 줄바꿈이 경계다. */
const linkOf = (node: ContentNode) => {
  const attrs = node.marks?.find(mark => mark.type === "link")?.attrs;
  return safeLink(attrs?.href) ? `${attrs.href}\n${typeof attrs.title === "string" ? attrs.title : ""}` : "";
};
const linkTitle = (title: string) => title ? ` "${escapeAttribute(title)}"` : "";
// 주소는 꺾쇠 없이 쓴다. &는 문자 참조(&copy; 등)로 읽히지 않게 &amp;로, 역슬래시와 괄호는 역슬래시로 막는다.
// 주소에 쓸 수 없는 <, >는 %로 바꾸고, 표 안에서는 칸을 나누는 |도 %7C로 바꾼다.
const destination = (href: string, inTable: boolean) => (inTable ? href.replace(/\|/g, "%7C") : href)
  .replace(/[<>]/g, encodeURIComponent).replace(/[\\()]/g, "\\$&").replace(/&/g, "&amp;");
/** 이웃한 노드를 같은 값끼리 묶는다. */
function runs<T>(nodes: ContentNode[], key: (node: ContentNode) => T): [T, ContentNode[]][] {
  const out: [T, ContentNode[]][] = [];
  for (const node of nodes) {
    const value = key(node), last = out[out.length - 1];
    if (last && last[0] === value) last[1].push(node); else out.push([value, [node]]);
  }
  return out;
}

/**
 * 그리기 전의 준비(규칙 3). 첨부 파일 이름을 글자로 바꾸고, 서식이 같은 이웃 글자를 합치고,
 * 보이는 글자 기준으로 줄 가장자리의 공백과 이어진 공백의 둘째부터를 NBSP로 바꾼다.
 */
function visible(nodes: ContentNode[]): ContentNode[] {
  const merged: ContentNode[] = [];
  for (const node of nodes) {
    if (node.type === "hardBreak") { merged.push({ type: "hardBreak" }); continue; }
    const text = withoutMarkers(node.type === "fileRef" ? String(node.attrs?.label ?? "") : node.text ?? "");
    // 글자 안의 줄바꿈도 줄바꿈 노드로 나눈다. 그래야 코드·링크·강조가 줄 단위로 닫힌다.
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      if (index) merged.push({ type: "hardBreak" });
      const last = merged[merged.length - 1];
      if (!line) continue;
      if (last?.type === "text" && JSON.stringify(last.marks ?? []) === JSON.stringify(node.marks ?? [])) last.text += line;
      else merged.push({ type: "text", text: line, ...(node.marks?.length ? { marks: node.marks } : {}) });
    }
  }
  // 앞에서 뒤로: 줄 첫머리의 공백과 공백 뒤의 공백. 뒤에서 앞으로: 줄 끝의 공백.
  let edge = true, space = false;
  for (const node of merged) {
    if (node.type === "hardBreak") { edge = true; space = false; continue; }
    if (hasMark(node, "code")) { edge = space = false; continue; }
    node.text = node.text!.replace(/\t/g, "    ").replace(/[\s\S]/g, char => {
      if (char === "\n") { edge = true; space = false; return char; }
      if (char !== " ") { edge = space = false; return char; }
      const keep = edge || space;
      space = true;
      return keep ? NBSP : char;
    });
  }
  edge = true;
  for (const node of [...merged].reverse()) {
    if (node.type === "hardBreak") { edge = true; continue; }
    if (hasMark(node, "code")) { edge = false; continue; }
    node.text = Array.from(node.text!).reverse().map(char => {
      if (char === "\n") { edge = true; return char; }
      if (char === NBSP) return char;
      if (char !== " ") { edge = false; return char; }
      return edge ? NBSP : char;
    }).reverse().join("");
  }
  return merged;
}

/**
 * 문단 안의 글. 이웃한 글자가 같은 서식이면 한 번만 감싼다. 밑줄·글자색·글꼴·크기처럼
 * 마크다운에 없는 서식은 기호 없이 글자만 남긴다. 줄바꿈은 BREAK로 낸다.
 */
function inline(source: ContentNode[], inTable: boolean): string {
  const render = (nodes: ContentNode[], level: number): string => {
    if (level === emphasis.length)
      return nodes.map(node => node.type === "hardBreak" ? BREAK
        : hasMark(node, "code") ? codeSpan(node.text!, inTable) : escapeText(node.text!).replace(/\r?\n/g, BREAK)).join("");
    const parts = runs(nodes, node => hasMark(node, emphasis[level][0])).map(([marked, run]) => ({ marked, text: render(run, level + 1) }));
    return parts.map((part, index) => part.marked
      ? emphasize(part.text, emphasis[level][1], parts[index - 1]?.text ?? "", parts[index + 1]?.text ?? "") : part.text).join("");
  };
  const pieces: string[] = [];
  for (const [link, run] of runs(visible(source), linkOf)) {
    const text = render(run, 0), cut = link.indexOf("\n"), last = pieces.length - 1;
    // 링크는 공백을 포함해 걸린 글 그대로를 덮는다.
    const piece = link && text ? `[${text}](${destination(link.slice(0, cut), inTable)}${linkTitle(link.slice(cut + 1))})` : text;
    // 느낌표 바로 뒤에 링크가 오면 그림(![…](…))으로 읽히므로 느낌표를 막는다.
    if (piece.startsWith("[") && pieces[last]?.endsWith("!")) pieces[last] = `${pieces[last].slice(0, -1)}\\!`;
    pieces.push(piece);
  }
  return pieces.join("");
}
/** 서식 없는 글 한 덩이(글 제목, 사진 설명)를 같은 규칙으로 바꾼다. */
const plain = (text: string) => text ? inline([{ type: "text", text }], false) : "";

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
    if (node.type === "paragraph") return paragraphLines(inline(children, false));
    if (node.type === "heading") {
      const text = oneLine(inline(children, false));
      return text ? [headingLine(attrs.level === 2 ? 2 : attrs.level === 3 ? 3 : 1, text)] : [];
    }
    if (node.type === "codeBlock") {
      const code = withoutMarkers(inlineText(node)), language = /^[\w+#.-]{1,40}$/.test(String(attrs.language ?? "")) ? String(attrs.language) : "";
      const fence = "`".repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map(run => run[0].length + 1)));
      // 닫는 표시 앞의 줄바꿈이 코드의 마지막 줄바꿈 몫을 하므로, 줄바꿈으로 끝나는 코드에 빈 줄을 더하지 않는다.
      return [fence + language, ...(code.endsWith("\n") ? code.slice(0, -1) : code).split("\n"), fence];
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
      const alt = escapeAttribute(String(attrs.alt ?? ""));
      const caption = paragraphLines(plain(String(attrs.caption ?? "")));
      return [...(name ? [`![${alt}](${imagePath(name)})`] : []), ...(caption.length ? ["", ...caption] : [])];
    }
    if (node.type === "video") return isVideo(attrs) ? [`[${escapeText(videoLabel(attrs))}](${videoSourceUrl(attrs)})`] : [];
    if (node.type === "table") {
      // 칸 안의 문단은 빈 문단까지 <br>로 잇는다.
      const rows = children.map(row => (row.content ?? []).map(cell =>
        (cell.content ?? []).map(paragraph => oneLine(inline(paragraph.content ?? [], true))).join("<br>")));
      const width = Math.max(1, ...rows.map(row => row.length));
      const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, index) => cells[index] ?? "").join(" | ")} |`;
      const align = Array.from({ length: width }, (_, index) => {
        const value = children[0]?.content?.[index]?.attrs?.align;
        return value === "center" ? ":-:" : value === "right" ? "--:" : "---";
      });
      // 마크다운 표는 머리 행이 꼭 있어야 하고 행 전체가 머리 행이다. 첫 행이 모두 머리 칸일 때만 머리 행으로 쓰고,
      // 아니면(머리 행을 껐거나 머리 칸이 섞였으면) 빈 머리 행을 두어 보통 칸이 머리 칸으로 바뀌지 않게 한다.
      const headed = Boolean(children[0]?.content?.length) && children[0].content!.every(cell => cell.type === "tableHeader");
      return rows.length ? [line(headed ? rows[0] : []), line(align), ...rows.slice(headed ? 1 : 0).map(line)] : [];
    }
    return join(blocks(children));
  };
  const title = oneLine(plain(document.title));
  return (join([...(title ? [[headingLine(1, title)]] : []), ...blocks(document.content.content ?? [])]).join("\n") + "\n").replaceAll(CODE_SPACE, " ").replaceAll(NBSP, "&nbsp;");
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
