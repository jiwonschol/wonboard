import { fontFamily, limits, plainText, textStyle, writingFonts, type ContentNode, type FontId } from "@wonboard/document";

// 게시판용 본문(PortableDocumentBody)과 같은 글자 크기·줄 간격·칸 모양으로 그린다.
const width = 720, scale = 2, padX = 10, padY = 6, base = 19.3642, lineRatio = 1.4;
const borderColor = "#c9ced6", headerColor = "#f2f4f7";
type Run = { text: string; font: string; color: string; highlight?: string; underline: boolean; strike: boolean; size: number };
type Piece = { run: Run; text: string; width: number };
type Line = { pieces: Piece[]; width: number; height: number; ascent: number };

function runsOf(paragraph: ContentNode, family: string, header: boolean): Run[] {
  return (paragraph.content ?? []).map(node => {
    if (node.type !== "text") return { text: node.type === "hardBreak" ? "\n" : plainText(node), font: `${header ? 600 : 400} ${base}px ${family}`,
      color: "#111111", underline: false, strike: false, size: base };
    const marks = node.marks ?? [], has = (type: string) => marks.some(mark => mark.type === type);
    const styled = textStyle(marks.find(mark => mark.type === "textStyle")?.attrs);
    const size = styled.fontSize ? parseFloat(styled.fontSize) : base;
    const weight = has("bold") ? 700 : styled.fontWeight ?? (header ? 600 : 400);
    const face = has("code") ? writingFonts.find(font => font.id === "mono")!.family : styled.fontFamily ?? family;
    return { text: node.text ?? "", size, font: `${has("italic") || styled.fontStyle ? "italic " : ""}${weight} ${size}px ${face}`,
      color: has("link") ? "#4f46e5" : styled.color ?? "#111111", highlight: styled.backgroundColor,
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
async function loadFonts(runs: Run[]) {
  await Promise.all(runs.filter(run => run.text.trim()).map(run => document.fonts.load(run.font, run.text).catch(() => [])));
  await document.fonts.ready;
}
export function tableAlt(table: ContentNode) {
  const text = (table.content ?? []).map(row => (row.content ?? []).map(plainText).join(" | ")).join("\n");
  return text.slice(0, limits.attributeText);
}

/** 표 하나를 PNG로 그린다. 게시판이 표를 지원하지 않을 때만 쓴다. */
export async function renderTableImage(table: ContentNode, defaultFont?: FontId): Promise<{ blob: Blob; width: number }> {
  const family = fontFamily(defaultFont) ?? fontFamily()!;
  const rows = (table.content ?? []).map(row => (row.content ?? []).map(cell => ({
    header: cell.type === "tableHeader",
    align: ["center", "right"].includes(String(cell.attrs?.align)) ? String(cell.attrs?.align) : "left",
    paragraphs: (cell.content ?? []).map(paragraph => runsOf(paragraph, family, cell.type === "tableHeader")),
  })));
  await loadFonts(rows.flat().flatMap(cell => cell.paragraphs.flat()));
  const columns = Math.max(1, ...rows.map(row => row.length));
  const columnWidth = (width - 1) / columns, textWidth = columnWidth - padX * 2;
  const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
  if (!context) throw new Error("invalidImage");
  const laidOut = rows.map(row => row.map(cell => ({ ...cell, lines: cell.paragraphs.flatMap(runs => layout(context, runs, textWidth)) })));
  const heights = laidOut.map(row => Math.max(base * lineRatio, ...row.map(cell => cell.lines.reduce((sum, line) => sum + line.height, 0))) + padY * 2);
  const height = heights.reduce((sum, value) => sum + value, 0) + 1;
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
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
      for (const line of cell.lines) {
        let x = left + padX + (cell.align === "center" ? (textWidth - line.width) / 2 : cell.align === "right" ? textWidth - line.width : 0);
        const baseline = y + (line.height - line.ascent) / 2 + line.ascent * 0.82;
        for (const piece of line.pieces) {
          if (piece.run.highlight) {
            context.fillStyle = piece.run.highlight;
            context.fillRect(x, y, piece.width, line.height);
          }
          context.font = piece.run.font;
          context.fillStyle = piece.run.color;
          context.fillText(piece.text, x, baseline);
          if (piece.run.underline || piece.run.strike) {
            context.fillRect(x, piece.run.underline ? baseline + 2 : baseline - piece.run.size * 0.3, piece.width, 1);
          }
          x += piece.width;
        }
        y += line.height;
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
