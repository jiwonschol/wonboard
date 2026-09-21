import { blockStyle, fontFamily, limits, plainText, textStyle, writingFonts, type ContentNode, type FontId } from "@wonboard/document";

// 게시판용 본문(PortableDocumentBody)과 같은 글자 크기·줄 간격·칸 모양으로 그린다.
const baseWidth = 720, minColumn = 64, maxScale = 2, padX = 10, padY = 6, base = 19.3642, lineRatio = 1.4;
const borderColor = "#c9ced6", headerColor = "#f2f4f7";
type Run = { text: string; font: string; color: string; highlight?: string; underline: boolean; strike: boolean; size: number };
type Piece = { run: Run; text: string; width: number };
type Line = { pieces: Piece[]; width: number; height: number; ascent: number; align?: string };

/** 글자 서식이 문단 서식(커서만 두고 적용한 스타일·크기·색·정렬)보다 우선한다. HTML 렌더러와 같은 순서다. */
function runsOf(paragraph: ContentNode, family: string, header: boolean): Run[] {
  const block = blockStyle(paragraph.attrs);
  const blockSize = block.fontSize ? parseFloat(String(block.fontSize)) : base;
  return (paragraph.content ?? []).map(node => {
    const marks = node.type === "text" ? node.marks ?? [] : [], has = (type: string) => marks.some(mark => mark.type === type);
    const styled = textStyle(marks.find(mark => mark.type === "textStyle")?.attrs);
    const size = styled.fontSize ? parseFloat(styled.fontSize) : blockSize;
    const weight = has("bold") ? 700 : styled.fontWeight ?? block.fontWeight ?? (header ? 600 : 400);
    const italic = has("italic") || styled.fontStyle || block.fontStyle;
    const face = has("code") ? writingFonts.find(font => font.id === "mono")!.family : styled.fontFamily ?? family;
    const text = node.type === "text" ? node.text ?? "" : node.type === "hardBreak" ? "\n" : plainText(node);
    return { text, size, font: `${italic ? "italic " : ""}${weight} ${size}px ${face}`,
      color: has("link") ? "#4f46e5" : styled.color ?? (block.color as string | undefined) ?? "#111111",
      highlight: styled.backgroundColor,
      underline: has("underline") || has("link"), strike: has("strike") };
  });
}
/** 영어는 단어 단위로, 한 칸보다 긴 단어와 한국어는 글자 단위로 줄을 바꾼다. */
function layout(context: CanvasRenderingContext2D, runs: Run[], maxWidth: number): Line[] {
  const lines: Line[] = [];
  let line: Line = { pieces: [], width: 0, height: base * lineRatio, ascent: base };
  const push = () => { lines.push(line); line = { pieces: [], width: 0, height: base * lineRatio, ascent: base }; };
  const place = (run: Run, text: string) => {
    context.font = run.font;
    const measured = context.measureText(text).width;
    if (line.width + measured > maxWidth && line.pieces.length) {
      if (!text.trim()) return;
      push();
    }
    if (measured > maxWidth && text.length > 1) {
      for (const char of text) place(run, char);
      return;
    }
    line.pieces.push({ run, text, width: measured });
    line.width += measured;
    line.height = Math.max(line.height, run.size * lineRatio);
    line.ascent = Math.max(line.ascent, run.size);
  };
  for (const run of runs) {
    run.text.split("\n").forEach((part, index) => {
      if (index) push();
      for (const token of part.match(/\s+|[^\s]+/gu) ?? [])
        if (/[ᄀ-ᇿ㄰-㆏가-힯]/u.test(token)) for (const char of token) place(run, char);
        else place(run, token);
    });
  }
  push();
  return lines;
}
/** 글꼴을 못 불러오면 그리지 않는다. 대체 글꼴로 그린 그림이 같은 ID로 저장돼 계속 재사용되는 것을 막는다. */
async function loadFonts(runs: Run[]) {
  const texts = runs.filter(run => run.text.trim());
  await Promise.all(texts.map(run => document.fonts.load(run.font, run.text).catch(() => [])));
  await document.fonts.ready;
  if (texts.some(run => !document.fonts.check(run.font, run.text))) throw new Error("fontUnavailable");
}
export function tableAlt(table: ContentNode) {
  const text = (table.content ?? []).map(row => (row.content ?? []).map(plainText).join(" | ")).join("\n");
  return text.slice(0, limits.attributeText);
}

const columnCount = (table: ContentNode) => Math.max(1, ...(table.content ?? []).map(row => row.content?.length ?? 0));
const boxInset = (paragraph: ContentNode) =>
  (typeof paragraph.attrs?.padding === "number" ? paragraph.attrs.padding : 0) +
  (typeof paragraph.attrs?.borderWidth === "number" ? paragraph.attrs.borderWidth : 0);
/**
 * 칸이 너무 좁아 글자가 겹치지 않도록, 열이 많으면 그림을 넓힌다. 문단 여백·테두리를 빼고도
 * 글자 자리가 남게 잰다. 게시판에서는 폭에 맞춰 줄어든다.
 */
export function tableImageWidth(table: ContentNode) {
  const inset = Math.max(0, ...(table.content ?? []).flatMap(row => (row.content ?? []).flatMap(cell => (cell.content ?? []).map(boxInset))));
  return Math.max(baseWidth, columnCount(table) * (minColumn + inset * 2));
}
const gradients: Record<string, [string, string]> = { light: ["#ffffff", "#e5e7eb"], blue: ["#eff6ff", "#bfdbfe"] };
type Box = { lines: Line[]; padding: number; border: number; borderColor: string; background?: string; gradient?: [string, string]; height: number };

/** 표 하나를 PNG로 그린다. 게시판이 표를 지원하지 않을 때만 쓴다. */
export async function renderTableImage(table: ContentNode, defaultFont?: FontId): Promise<{ blob: Blob; width: number }> {
  const family = fontFamily(defaultFont) ?? fontFamily()!;
  const width = tableImageWidth(table), columnWidth = (width - 1) / columnCount(table);
  const rows = (table.content ?? []).map(row => (row.content ?? []).map(cell => ({
    header: cell.type === "tableHeader",
    align: ["center", "right"].includes(String(cell.attrs?.align)) ? String(cell.attrs?.align) : "left",
    paragraphs: (cell.content ?? []).map(paragraph => ({ attrs: paragraph.attrs ?? {}, runs: runsOf(paragraph, family, cell.type === "tableHeader") })),
  })));
  await loadFonts(rows.flat().flatMap(cell => cell.paragraphs.flatMap(paragraph => paragraph.runs)));
  const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
  if (!context) throw new Error("invalidImage");
  // 문단의 여백·테두리·배경(커서만 두고 준 문단 서식)은 게시판용 HTML처럼 문단 상자로 그린다.
  const laidOut = rows.map(row => row.map(cell => ({ ...cell, boxes: cell.paragraphs.map(({ attrs, runs }): Box => {
    const padding = typeof attrs.padding === "number" ? attrs.padding : 0;
    const border = typeof attrs.borderWidth === "number" ? attrs.borderWidth : 0;
    const inner = columnWidth - padX * 2 - (padding + border) * 2;
    // 문단에 정렬을 직접 골랐으면(왼쪽 포함) 그것이, 아니면 칸의 정렬이 적용된다. 게시판용 HTML과 같다.
    const align = typeof attrs.textAlign === "string" ? attrs.textAlign : cell.align;
    const lines = layout(context, runs, inner).map(line => ({ ...line, align }));
    return { lines, padding, border, borderColor: typeof attrs.textColor === "string" ? attrs.textColor : "#111111",
      background: typeof attrs.backgroundColor === "string" ? attrs.backgroundColor : undefined,
      gradient: gradients[String(attrs.gradient)],
      height: lines.reduce((sum, line) => sum + line.height, 0) + (padding + border) * 2 };
  }) })));
  const heights = laidOut.map(row => Math.max(base * lineRatio, ...row.map(cell => cell.boxes.reduce((sum, box) => sum + box.height, 0))) + padY * 2);
  const height = heights.reduce((sum, value) => sum + value, 0) + 1;
  // 서버의 사진 화소 한도와 브라우저 캔버스 한도(Safari는 약 1,670만 화소, 한 변 16,384) 안에서
  // 가장 선명하게 그린다. 1배로도 넘치는 표는 그리지 않고 알린다.
  const scale = Math.min(maxScale, Math.sqrt(Math.min(limits.pixels, 16_000_000) / (width * height)), 16_384 / height, 16_384 / width);
  if (scale < 1) throw new Error("tableTooLarge");
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.textBaseline = "alphabetic";
  let top = 0.5;
  laidOut.forEach((row, rowIndex) => {
    row.forEach((cell, column) => {
      const left = 0.5 + column * columnWidth;
      if (cell.header) {
        context.fillStyle = headerColor;
        context.fillRect(left, top, columnWidth, heights[rowIndex]);
      }
      let y = top + padY;
      for (const box of cell.boxes) {
        const boxLeft = left + padX, boxWidth = columnWidth - padX * 2;
        if (box.gradient) {
          const fill = context.createLinearGradient(boxLeft, y, boxLeft + boxWidth, y + box.height);
          fill.addColorStop(0, box.gradient[0]);
          fill.addColorStop(1, box.gradient[1]);
          context.fillStyle = fill;
          context.fillRect(boxLeft, y, boxWidth, box.height);
        } else if (box.background) {
          context.fillStyle = box.background;
          context.fillRect(boxLeft, y, boxWidth, box.height);
        }
        if (box.border) {
          context.strokeStyle = box.borderColor;
          context.lineWidth = box.border;
          context.strokeRect(boxLeft + box.border / 2, y + box.border / 2, boxWidth - box.border, box.height - box.border);
        }
        const inset = box.padding + box.border, textWidth = boxWidth - inset * 2;
        let lineTop = y + inset;
        for (const line of box.lines) {
          let x = boxLeft + inset + (line.align === "center" ? (textWidth - line.width) / 2 : line.align === "right" ? textWidth - line.width : 0);
          const baseline = lineTop + (line.height - line.ascent) / 2 + line.ascent * 0.82;
          for (const piece of line.pieces) {
            if (piece.run.highlight) {
              context.fillStyle = piece.run.highlight;
              context.fillRect(x, lineTop, piece.width, line.height);
            }
            context.font = piece.run.font;
            context.fillStyle = piece.run.color;
            context.fillText(piece.text, x, baseline);
            if (piece.run.underline) context.fillRect(x, baseline + 2, piece.width, 1);
            if (piece.run.strike) context.fillRect(x, baseline - piece.run.size * 0.3, piece.width, 1);
            x += piece.width;
          }
          lineTop += line.height;
        }
        y += box.height;
      }
      context.strokeStyle = borderColor;
      context.lineWidth = 1;
      context.strokeRect(left, top, columnWidth, heights[rowIndex]);
    });
    top += heights[rowIndex];
  });
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    value => value ? resolve(value) : reject(new Error("invalidImage")), "image/png"));
  return { blob, width };
}
