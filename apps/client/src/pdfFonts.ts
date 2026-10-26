import fontkit, { type Font } from "@pdf-lib/fontkit";
import decompress from "woff2-encoder/decompress";
import { type PDFDocument, type PDFFont } from "pdf-lib";

// 편집기가 이미 싣는 같은 출처의 @font-face만 쓴다. 글이나 글자를 외부로 전송하지 않는다.
// unicode-range로 나뉜 WOFF2도 읽고, PDF에는 실제 사용한 글리프만 넣는다.
type VariableFont = Font & { variationAxes?: Record<string, { min: number; max: number }>; getVariation(axes: Record<string, number>): Font };
type Face = { family: string; url: string; low: number; high: number; ranges: [number, number][] };
export type PdfFont = { pdf: PDFFont; source: Font; weight: number };
const unquote = (value: string) => value.trim().replace(/^["']|["']$/g, "");
const families = (value: string) => value.split(",").map(unquote);

function fontFaces(): Face[] {
  const faces: Face[] = [];
  function read(rules: CSSRuleList, base: string) {
    for (const rule of rules) {
      if (rule instanceof CSSImportRule) { if (rule.styleSheet) read(rule.styleSheet.cssRules, rule.href); continue; }
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const style = rule.style, src = /url\(["']?([^"')]+)["']?\)/.exec(style.getPropertyValue("src"));
      if (!src) continue;
      const url = new URL(src[1], base);
      if (url.origin !== location.origin || !["http:", "https:", "file:"].includes(url.protocol)) continue;
      const weights = style.getPropertyValue("font-weight").split(/\s+/).map(Number);
      const ranges = style.getPropertyValue("unicode-range").split(",").filter(Boolean).map(range => {
        const [start, end] = range.trim().replace(/^U\+/i, "").split("-");
        return [parseInt(start.replace(/\?/g, "0"), 16), parseInt((end ?? start).replace(/\?/g, "f"), 16)] as [number, number];
      });
      faces.push({ family: unquote(style.getPropertyValue("font-family")), url: url.href,
        low: weights[0] || 400, high: weights[1] || weights[0] || 400, ranges });
    }
  }
  for (const sheet of document.styleSheets) {
    // 앱 CSS는 같은 출처다. 다른 출처의 확장 프로그램 스타일은 읽을 수 없고 내보낼 글꼴도 아니다.
    if (sheet.href && new URL(sheet.href).origin !== location.origin) continue;
    read(sheet.cssRules, sheet.href ?? document.baseURI);
  }
  return faces;
}

export function pdfFonts(document: PDFDocument) {
  const faces = fontFaces(), buffers = new Map<string, Promise<Uint8Array>>(), loaded = new Map<string, Promise<PdfFont>>();
  const known = new Set(faces.map(face => face.family));
  // Manrope의 한글처럼 선택한 글꼴에 없는 글자는 편집기와 같은 Pretendard 폴백을 쓴다.
  // OS 글꼴을 선택한 글은 pdfFile이 먼저 거부한다. 몰래 다른 글꼴로 바꾸지 않는다.
  const portableFamily = (value: string) => families(value).filter(name => known.has(name)).concat("Pretendard Variable");
  async function load(face: Face, weight: number) {
    const actual = Math.max(face.low, Math.min(face.high, weight)), key = `${face.url}:${actual}`;
    let promise = loaded.get(key);
    if (!promise) {
      promise = (async () => {
        let buffer = buffers.get(face.url);
        if (!buffer) {
          buffer = fetch(face.url).then(async response => {
            if (!response.ok) throw new Error(`PDF font: ${response.status}`);
            const bytes = new Uint8Array(await response.arrayBuffer());
            return String.fromCharCode(...bytes.subarray(0, 4)) === "wOF2" ? decompress(bytes) : bytes;
          });
          buffers.set(face.url, buffer);
        }
        const bytes = await buffer, base = fontkit.create(bytes) as VariableFont;
        const source = base.variationAxes?.wght ? base.getVariation({ wght: actual }) : base;
        // pdf-lib에 이 굵기의 인스턴스를 전달해야 가변 글꼴이 가장 가는 기본값으로 저장되지 않는다.
        document.registerFontkit({ create: () => source });
        const pdf = await document.embedFont(bytes, { subset: true });
        return { pdf, source, weight: actual };
      })();
      loaded.set(key, promise);
    }
    return promise;
  }
  async function forText(text: string, family: string, weight: number): Promise<PdfFont> {
    const points = Array.from(text, char => char.codePointAt(0)!);
    for (const name of portableFamily(family)) {
      const candidates = faces.filter(face => face.family === name && points.every(point =>
        !face.ranges.length || face.ranges.some(([low, high]) => point >= low && point <= high)));
      candidates.sort((a, b) => Math.abs(weight - Math.max(a.low, Math.min(a.high, weight))) - Math.abs(weight - Math.max(b.low, Math.min(b.high, weight))));
      for (const face of candidates) {
        const font = await load(face, weight);
        if (points.every(point => font.source.hasGlyphForCodePoint(point))) return font;
      }
    }
    throw new Error(`PDF font has no glyph for U+${points[0].toString(16).toUpperCase()}`);
  }
  return { portableFamily, forText };
}
