import {
  isVideo,
  textBoxDefaults,
  validateDocument,
  videoSourceUrl,
  writingFonts,
  zipFiles,
  type ContentNode,
  type Draft,
  type Mark,
  type WriterDocument,
} from "@wonboard/document";
import { imageNames, lineBreaks, linkOf, photoBytes, runs, saveName, videoLabel, type SavedFile } from "./pcSave";

// PC 저장: 워드 파일(.docx). 다른 워드프로세서에서 이어 고치려는 사람을 위한 형식이다.
// 똑같이 보이는 문서는 PDF가 맡으므로, 여기서는 글자와 구조(제목·목록·표·사진)와 글자 서식을 옮기는 데 집중한다.
// 워드 파일은 XML 몇 개를 ZIP으로 묶은 것이라 패키지 없이 직접 만든다.
// 규칙:
// 1. 글자: 편집 화면에 보이는 글자가 공백까지 그대로 들어간다(xml:space="preserve"). 줄바꿈(줄바꿈 노드, 글자 안의
//    LF·CR·U+2028·U+2029)은 워드의 줄바꿈(<w:br/>)으로, 탭은 <w:tab/>으로 쓴다.
// 2. XML에 쓸 수 없는 글자(탭·줄바꿈을 뺀 U+0000~U+001F, U+FFFE, U+FFFF)는 뺀다. 한 글자라도 들어가면 워드가 파일을 열지 못하고,
//    워드 파일에는 이 글자를 적는 다른 방법이 없다. 짝이 없는 서러게이트는 UTF-8로 바꿀 때 U+FFFD가 된다.
// 3. 크기: 화면의 1px을 0.75pt로 옮긴다(CSS의 정의와 같다). 종이는 A4, 여백은 사방 1인치다.
// 4. 글꼴은 이름만 적는다. 받는 컴퓨터에 그 글꼴이 없으면 그 프로그램이 다른 글꼴로 보여 준다.
// 워드에 같은 것이 없어 가장 가까운 표현을 쓰는 것(글자는 잃지 않는다):
// - 글상자는 칸이 하나인 표로 옮긴다. 문단의 그러데이션 배경은 중간색 하나로 칠한다.
// - 여러 겹의 인용은 들여쓰기만 깊어지고 왼쪽 줄은 하나다.
// - 번호 목록의 시작 번호는 워드가 받는 32767까지만 쓴다. 목록은 아홉 단계까지 번호 모양이 있고 더 깊으면 들여쓰기만 깊어진다.
// - 영상은 링크로, 첨부 파일은 이름만 남긴다.

const mainNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRelNs = "http://schemas.openxmlformats.org/package/2006/relationships";
const drawingNs = "http://schemas.openxmlformats.org/drawingml/2006/main";
const pictureNs = "http://schemas.openxmlformats.org/drawingml/2006/picture";
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const escapeXml = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// 속성 안의 줄바꿈과 탭은 읽는 쪽이 공백으로 바꾸므로 문자 참조로 쓴다.
const escapeAttribute = (text: string) => escapeXml(text).replace(/"/g, "&quot;")
  .replace(/\r/g, "&#13;").replace(/\n/g, "&#10;").replace(/\t/g, "&#9;");

// 길이 단위. 트윕은 1/20pt, 글자 크기는 1/2pt, 테두리 두께는 1/8pt, 그림 크기(EMU)는 1px에 9525다.
const twips = (px: number) => Math.round(px * 15);
const halfPoints = (px: number) => Math.round(px * 1.5);
const borderSize = (px: number) => Math.min(96, Math.max(2, Math.round(px * 6)));
const pageWidth = 11906, pageHeight = 16838, pageMargin = 1440;
const bodyPx = 19.3642, paragraphGap = twips(bodyPx * 1.35), listStep = 720, hanging = 360, levels = 9;
const hex = (value: unknown) => typeof value === "string" && /^#[\da-f]{6}$/i.test(value) ? value.slice(1).toUpperCase() : undefined;
/** 글꼴 이름. '기본 고딕'은 기기마다 다른 글꼴이라 워드에 흔한 한글 고딕 이름을 적는다. */
const fontName = (id: unknown) => id === "system" ? "맑은 고딕" : writingFonts.find(font => font.id === id)?.name;
const codeFont = fontName("mono")!;
const variantSize = (variant: unknown) => variant === "display" ? 36 : variant === "annotation" ? 14 : undefined;

/** 글자 서식. 문단이 정한 값 위에 글자의 서식이 덮인다. */
type Look = { link?: boolean; font?: string; bold?: boolean; italic?: boolean; strike?: boolean; underline?: boolean; color?: string; size?: number; fill?: string };
// 요소의 순서는 워드 파일 규격이 정한 순서다.
const runProps = (look: Look) => {
  const font = look.font ? escapeAttribute(look.font) : "";
  const inner = (look.link ? '<w:rStyle w:val="Hyperlink"/>' : "")
    + (font ? `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>` : "")
    + (look.bold ? "<w:b/><w:bCs/>" : "") + (look.italic ? "<w:i/><w:iCs/>" : "") + (look.strike ? "<w:strike/>" : "")
    + (look.color ? `<w:color w:val="${look.color}"/>` : "")
    + (look.size ? `<w:sz w:val="${look.size}"/><w:szCs w:val="${look.size}"/>` : "")
    + (look.underline ? '<w:u w:val="single"/>' : "")
    + (look.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${look.fill}"/>` : "");
  return inner ? `<w:rPr>${inner}</w:rPr>` : "";
};
function withMarks(base: Look, marks: Mark[] = []): Look {
  const look = { ...base };
  for (const mark of marks) {
    const attrs = mark.attrs ?? {};
    if (mark.type === "bold") look.bold = true;
    else if (mark.type === "italic") look.italic = true;
    else if (mark.type === "underline") look.underline = true;
    else if (mark.type === "strike") look.strike = true;
    else if (mark.type === "code") look.font = codeFont;
    else if (mark.type === "textStyle") {
      const size = typeof attrs.fontSize === "number" ? attrs.fontSize : variantSize(attrs.variant);
      look.font = fontName(attrs.fontFamily) ?? look.font;
      look.color = hex(attrs.color) ?? look.color;
      look.fill = hex(attrs.highlight) ?? look.fill;
      if (size) look.size = halfPoints(size);
      if (attrs.variant === "subtitle") look.italic = true;
    }
  }
  return look;
}
/** 글자 한 덩이. 줄바꿈과 탭은 워드의 요소로 나눠 쓴다(규칙 1). */
function textRun(text: string, look: Look) {
  const parts: string[] = [];
  for (const [row, line] of text.split(lineBreaks).entries()) {
    if (row) parts.push("<w:br/>");
    for (const [column, piece] of line.split("\t").entries()) {
      if (column) parts.push("<w:tab/>");
      const value = escapeXml(piece);
      if (value) parts.push(`<w:t xml:space="preserve">${value}</w:t>`);
    }
  }
  return parts.length ? `<w:r>${runProps(look)}${parts.join("")}</w:r>` : "";
}

type Border = { size: number; color: string; space: number };
const edge = (side: string, border: Border) => `<w:${side} w:val="single" w:sz="${border.size}" w:space="${border.space}" w:color="${border.color}"/>`;
const tableStart = "<w:tbl>";
/** 표 둘이 맞닿으면 워드가 하나로 합치므로 그 사이에 빈 문단을 둔다. */
const join = (blocks: string[]) => blocks.map((block, index) =>
  index && block.startsWith(tableStart) && blocks[index - 1].startsWith(tableStart) ? `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>${block}` : block).join("");
/** 표의 칸은 문단으로 끝나야 한다. */
const cellBody = (blocks: string[]) => join(blocks) + (blocks.length && !blocks[blocks.length - 1].startsWith(tableStart) ? "" : "<w:p/>");

type Context = {
  /** 왼쪽 들여쓰기와, 들여쓰기를 빼기 전의 너비(트윕). */
  indent: number; width: number;
  /** 문단 아래 간격. `tail`은 이 묶음의 마지막 문단에만 쓰는 간격이다(목록 전체의 아래 간격). */
  after: number; tail?: number;
  quote?: boolean; depth: number;
  /** 목록 항목의 번호. 항목은 늘 문단으로 시작하고(문서 검증), 그 첫 문단이 가져가며 비운다. */
  item?: { numbering: string };
  align?: string; bold?: boolean;
};
/** 한 단계 더 들여 쓴 자리. 깊이 겹쳐도 글이 들어갈 너비(2인치)는 남긴다. */
const deeper = (context: Context, step: number) => Math.max(context.indent, Math.min(context.indent + step, context.width - 2880));
type Paragraph = { style?: string; keepNext?: boolean; border?: string; fill?: string; after?: number; align?: unknown };

/** 워드 파일을 이루는 XML들과, 사진 ID → 파일 안의 경로. */
export function toWordParts(document: WriterDocument): { files: Record<string, string>; pictures: Map<string, string> } {
  const names = imageNames(document), pictures = new Map<string, string>();
  const relations: string[] = [], linkIds = new Map<string, string>(), numbers: string[] = [];
  let drawings = 0;
  const relation = (type: string, target: string, external = false) => {
    const id = `rId${relations.length + 1}`;
    relations.push(`<Relationship Id="${id}" Type="${relNs}/${type}" Target="${escapeAttribute(target)}"${external ? ' TargetMode="External"' : ""}/>`);
    return id;
  };
  relation("numbering", "numbering.xml");
  relation("styles", "styles.xml");
  for (const [index, id] of [...names.keys()].entries()) pictures.set(id, `word/media/image${index + 1}.${document.media[id].mime === "image/png" ? "png" : "jpeg"}`);
  const pictureIds = new Map([...pictures].map(([id, path]) => [id, relation("image", path.slice("word/".length))]));
  const linkId = (href: string) => linkIds.get(href) ?? linkIds.set(href, relation("hyperlink", href, true)).get(href)!;
  const hyperlink = (href: string, title: string, inner: string) =>
    `<w:hyperlink r:id="${linkId(href)}"${title ? ` w:tooltip="${escapeAttribute(title)}"` : ""} w:history="1">${inner}</w:hyperlink>`;

  function paragraph(context: Context, options: Paragraph, inner: string) {
    const numbering = context.item?.numbering ?? "";
    if (context.item) context.item.numbering = "";
    const border = options.border ?? (context.quote ? edge("left", { size: 18, color: "111111", space: 12 }) : "");
    const after = options.after ?? context.tail ?? context.after;
    const align = options.align ?? context.align;
    const props = (options.style ? `<w:pStyle w:val="${options.style}"/>` : "") + (options.keepNext ? "<w:keepNext/>" : "") + numbering
      + (border ? `<w:pBdr>${border}</w:pBdr>` : "")
      + (options.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.fill}"/>` : "")
      + (after === paragraphGap ? "" : `<w:spacing w:after="${after}"/>`)
      + (context.indent || numbering ? `<w:ind w:left="${context.indent}"${numbering ? ` w:hanging="${hanging}"` : ""}/>` : "")
      + (align === "center" || align === "right" ? `<w:jc w:val="${align}"/>` : "");
    return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}${inner}</w:p>`;
  }

  function inline(nodes: ContentNode[], base: Look) {
    return runs(nodes, linkOf).map(([link, run]) => {
      const look = link ? { ...base, link: true } : base;
      const inner = run.map(node => node.type === "hardBreak" ? "<w:r><w:br/></w:r>"
        : textRun(node.type === "fileRef" ? String(node.attrs?.label ?? "") : node.text ?? "", withMarks(look, node.marks))).join("");
      const cut = link.indexOf("\n");
      return link && inner ? hyperlink(link.slice(0, cut), link.slice(cut + 1), inner) : inner;
    }).join("");
  }
  /** 마지막 블록만 `tail`을 물려받는다. */
  const blocks = (nodes: ContentNode[], context: Context) =>
    nodes.flatMap((node, index) => block(node, index === nodes.length - 1 ? context : { ...context, tail: undefined }));
  function block(node: ContentNode, context: Context): string[] {
    const attrs = node.attrs ?? {}, children = node.content ?? [];
    if (node.type === "paragraph" || node.type === "heading") {
      const size = typeof attrs.fontSize === "number" ? attrs.fontSize : variantSize(attrs.variant);
      const base: Look = { bold: context.bold, color: hex(attrs.textColor), size: size ? halfPoints(size) : undefined, italic: attrs.variant === "subtitle" };
      const width = typeof attrs.borderWidth === "number" ? attrs.borderWidth : 0;
      const box: Border = { size: borderSize(width), color: base.color ?? "auto", space: Math.min(31, Math.round(Number(attrs.padding ?? 0) * 0.75)) };
      return [paragraph(context, {
        style: node.type === "heading" ? `Heading${attrs.level === 2 ? 2 : attrs.level === 3 ? 3 : 1}` : undefined,
        border: width ? ["top", "left", "bottom", "right"].map(side => edge(side, box)).join("") : undefined,
        fill: attrs.gradient === "light" ? "F2F3F5" : attrs.gradient === "blue" ? "D7E8FE" : hex(attrs.backgroundColor),
        align: attrs.textAlign ?? undefined,
      }, inline(children, base))];
    }
    if (node.type === "codeBlock")
      return [paragraph(context, { fill: "F5F5F5" }, textRun(children.map(child => child.text ?? "").join(""), { font: codeFont, size: halfPoints(15) }))];
    if (node.type === "horizontalRule")
      return [paragraph(context, { border: edge("bottom", { size: 6, color: "BBBBBB", space: 1 }) }, "")];
    if (node.type === "media") {
      const id = String(attrs.mediaId), name = names.get(id), caption = String(attrs.caption ?? "");
      const out: string[] = [];
      if (name) {
        const media = document.media[id], width = Number(attrs.width ?? 600);
        // 쪽 안에 들어가도록 비율을 지키며 줄인다.
        const scale = Math.min(1, Math.max(1, context.width - context.indent) / twips(width), (pageHeight - 2 * pageMargin - 720) / twips(width * media.height / media.width));
        const cx = Math.max(1, Math.round(width * scale * 9525)), cy = Math.max(1, Math.round(width * media.height / media.width * scale * 9525));
        const number = ++drawings, title = escapeAttribute(name);
        out.push(paragraph(context, { keepNext: Boolean(caption), after: caption ? 120 : undefined, align: attrs.align }, "<w:r><w:drawing>"
          + `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>`
          + `<wp:docPr id="${number}" name="${title}" descr="${escapeAttribute(String(attrs.alt ?? ""))}"/>`
          + `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${drawingNs}" noChangeAspect="1"/></wp:cNvGraphicFramePr>`
          + `<a:graphic xmlns:a="${drawingNs}"><a:graphicData uri="${pictureNs}"><pic:pic xmlns:pic="${pictureNs}">`
          + `<pic:nvPicPr><pic:cNvPr id="${number}" name="${title}"/><pic:cNvPicPr/></pic:nvPicPr>`
          + `<pic:blipFill><a:blip r:embed="${pictureIds.get(id)}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
          + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
          + "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"));
      }
      if (caption) out.push(paragraph(context, { align: attrs.align }, textRun(caption, { size: halfPoints(14) })));
      return out;
    }
    if (node.type === "video") {
      if (!isVideo(attrs)) return [];
      return [paragraph(context, {}, hyperlink(videoSourceUrl(attrs), "", textRun(videoLabel(attrs), { link: true })))];
    }
    if (node.type === "blockquote") return blocks(children, { ...context, indent: deeper(context, 480), quote: true });
    if (node.type === "bulletList" || node.type === "orderedList") {
      const level = Math.min(context.depth, levels - 1);
      const kind = node.type === "bulletList" ? 0 : 1 + Math.max(0, ["1", "a", "A", "i", "I"].indexOf(String(attrs.type)));
      const start = Math.min(32767, Number(attrs.start ?? 1));
      numbers.push(`<w:num w:numId="${numbers.length + 1}"><w:abstractNumId w:val="${kind}"/>`
        + `<w:lvlOverride w:ilvl="${level}"><w:startOverride w:val="${start}"/></w:lvlOverride></w:num>`);
      const numbering = `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numbers.length}"/></w:numPr>`;
      const tail = context.tail ?? context.after;
      return children.flatMap((item, index) => blocks(item.content ?? [], { ...context, indent: deeper(context, listStep), depth: context.depth + 1,
        after: 0, tail: index === children.length - 1 ? tail : undefined, item: { numbering } }));
    }
    if (node.type === "table" || node.type === "textBox") {
      const width = Math.max(1, context.width - context.indent);
      const tableProps = (border: Border | null, margin: [number, number]) => `<w:tblPr><w:tblW w:w="${width}" w:type="dxa"/>`
        + (context.indent ? `<w:tblInd w:w="${context.indent}" w:type="dxa"/>` : "")
        + `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(side => border ? edge(side, border) : `<w:${side} w:val="nil"/>`).join("")}</w:tblBorders>`
        + '<w:tblLayout w:type="fixed"/>'
        + `<w:tblCellMar>${["top", "left", "bottom", "right"].map((side, index) => `<w:${side} w:w="${margin[index % 2]}" w:type="dxa"/>`).join("")}</w:tblCellMar></w:tblPr>`;
      const cell = (size: number, fill: string | undefined, body: string) =>
        `<w:tc><w:tcPr><w:tcW w:w="${size}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ""}</w:tcPr>${body}</w:tc>`;
      if (node.type === "textBox") {
        const line = typeof attrs.borderWidth === "number" ? attrs.borderWidth : textBoxDefaults.borderWidth;
        const padding = twips(typeof attrs.padding === "number" ? attrs.padding : textBoxDefaults.padding);
        const inside: Context = { indent: 0, width: Math.max(1, width - 2 * padding), after: twips(bodyPx * 0.8), tail: 0, depth: 0 };
        return [tableStart + tableProps(line ? { size: borderSize(line), color: hex(attrs.borderColor) ?? hex(textBoxDefaults.borderColor)!, space: 0 } : null, [padding, padding])
          + `<w:tblGrid><w:gridCol w:w="${width}"/></w:tblGrid><w:tr>`
          + cell(width, hex(attrs.backgroundColor) ?? hex(textBoxDefaults.backgroundColor), cellBody(blocks(children, inside))) + "</w:tr></w:tbl>"];
      }
      // 행마다 칸 수가 다르면 가장 긴 행에 맞춰 빈 칸으로 채운다.
      const columns = Math.max(1, ...children.map(row => row.content?.length ?? 0)), size = Math.max(1, Math.floor(width / columns));
      const marginX = twips(10), marginY = twips(6);
      const rows = children.map(row => `<w:tr>${Array.from({ length: columns }, (_, index) => {
        const item = row.content?.[index], header = item?.type === "tableHeader";
        const inside: Context = { indent: 0, width: Math.max(1, size - 2 * marginX), after: 0, depth: 0, align: String(item?.attrs?.align ?? ""), bold: header };
        return cell(size, header ? "F2F4F7" : undefined, cellBody(item ? blocks(item.content ?? [], inside) : []));
      }).join("")}</w:tr>`).join("");
      return [tableStart + tableProps({ size: 6, color: "C9CED6", space: 0 }, [marginY, marginX])
        + `<w:tblGrid>${`<w:gridCol w:w="${size}"/>`.repeat(columns)}</w:tblGrid>${rows}</w:tbl>`];
    }
    return blocks(children, context);
  }

  const root: Context = { indent: 0, width: pageWidth - 2 * pageMargin, after: paragraphGap, depth: 0 };
  const title = textRun(document.title, {});
  const body = join([...(title ? [paragraph(root, { style: "Title" }, title)] : []), ...blocks(document.content.content ?? [], root)]);
  const namespaces = `xmlns:w="${mainNs}" xmlns:r="${relNs}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"`;
  const font = escapeAttribute(fontName(document.defaultFont ?? "sans")!), language = document.locale === "ko" ? "ko-KR" : "en-US";
  const heading = (level: number, em: number) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/>`
    + `<w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:line="288" w:lineRule="auto"/><w:outlineLvl w:val="${level - 1}"/></w:pPr>`
    + `<w:rPr><w:sz w:val="${halfPoints(bodyPx * em)}"/><w:szCs w:val="${halfPoints(bodyPx * em)}"/></w:rPr></w:style>`;
  const formats = [["bullet", "•"], ["decimal"], ["lowerLetter"], ["upperLetter"], ["lowerRoman"], ["upperRoman"]];
  return { pictures, files: {
    "[Content_Types].xml": `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
      + ["document.main", "styles", "numbering"].map(part => `<Override PartName="/word/${part.split(".")[0]}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${part}+xml"/>`).join("")
      + "</Types>",
    "_rels/.rels": `${declaration}<Relationships xmlns="${packageRelNs}"><Relationship Id="rId1" Type="${relNs}/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `${declaration}<w:document ${namespaces}><w:body>${body}`
      + `<w:sectPr><w:pgSz w:w="${pageWidth}" w:h="${pageHeight}"/><w:pgMar ${["top", "right", "bottom", "left"].map(side => `w:${side}="${pageMargin}"`).join(" ")} w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`
      + "</w:body></w:document>",
    "word/_rels/document.xml.rels": `${declaration}<Relationships xmlns="${packageRelNs}">${relations.join("")}</Relationships>`,
    "word/styles.xml": `${declaration}<w:styles xmlns:w="${mainNs}"><w:docDefaults>`
      + `<w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/>`
      + `<w:sz w:val="${halfPoints(bodyPx)}"/><w:szCs w:val="${halfPoints(bodyPx)}"/><w:lang w:val="${language}" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault>`
      + `<w:pPrDefault><w:pPr><w:spacing w:after="${paragraphGap}" w:line="336" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
      + '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>'
      + '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
      + `<w:pPr><w:spacing w:line="270" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="${halfPoints(39.0388)}"/><w:szCs w:val="${halfPoints(39.0388)}"/></w:rPr></w:style>`
      + heading(1, 2) + heading(2, 1.65) + heading(3, 1.3)
      + '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'
      + "</w:styles>",
    "word/numbering.xml": `${declaration}<w:numbering xmlns:w="${mainNs}">`
      + formats.map(([format, bullet], kind) => `<w:abstractNum w:abstractNumId="${kind}"><w:multiLevelType w:val="hybridMultilevel"/>`
        + Array.from({ length: levels }, (_, level) => `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${format}"/>`
          + `<w:lvlText w:val="${bullet ?? `%${level + 1}.`}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${listStep * (level + 1)}" w:hanging="${hanging}"/></w:pPr></w:lvl>`).join("")
        + "</w:abstractNum>").join("")
      + numbers.join("") + "</w:numbering>",
  } };
}

/** 워드 파일. 사진은 원본 그대로 파일 안에 들어간다. */
export async function wordFile(draft: Draft): Promise<SavedFile> {
  validateDocument(draft.document);
  const { files, pictures } = toWordParts(draft.document), encoder = new TextEncoder();
  const entries: Parameters<typeof zipFiles>[0] = {};
  for (const [path, text] of Object.entries(files)) entries[path] = [encoder.encode(text), { level: 6 }];
  for (const [id, path] of pictures) entries[path] = new Uint8Array(await photoBytes(draft, id));
  return { blob: new Blob([await zipFiles(entries)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    name: `${saveName(draft.document)}.docx`, photos: pictures.size };
}
