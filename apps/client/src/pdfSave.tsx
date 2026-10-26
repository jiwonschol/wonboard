import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { DocumentPreview } from "@wonboard/renderer";
import { validateDocument, type Draft } from "@wonboard/document";
import { PDFDict, PDFDocument, PDFName, PDFOperator, PDFOperatorNames, PDFString, TextRenderingMode, clip, endPath, rectangle,
  degrees, rgb, pushGraphicsState, popGraphicsState, setTextRenderingMode, setLineWidth, setStrokingRgbColor, type PDFPage } from "pdf-lib";
import { imageNames, orderedMarker, photoBytes, saveName, type SavedFile } from "./pcSave";
import { pdfFonts, type PdfFont } from "./pdfFonts";

// CSS가 배치한 글자·사진·테두리를 PDF의 글자·그림·선으로 옮긴다. 화면 캡처는 하지 않는다.
// 단위: CSS px -> PDF pt. 기존 인쇄와 같은 A4, 위아래 16mm, 좌우 18mm.
const pt = 72 / 96, mm = 72 / 25.4;
const width = 210 * mm, height = 297 * mm, left = 18 * mm, top = 16 * mm;
const bodyWidth = (width - left * 2) / pt, bodyHeight = (height - top * 2) / pt;
type Box = { x: number; y: number; width: number; height: number };
type Text = Box & { text: string; style: CSSStyleDeclaration; font: PdfFont; baseline: number; decoration: string; href?: string };
type Page = { start: number; end: number; pdf: PDFPage };
const number = (value: string) => parseFloat(value) || 0;
function color(value: string) {
  const parts = value.match(/[\d.]+/g)?.map(Number);
  return parts && parts.length >= 3 && (parts.length < 4 || parts[3] > 0) ? rgb(parts[0] / 255, parts[1] / 255, parts[2] / 255) : undefined;
}

/** 누른 순간의 사본만 그린다. 준비 중 글을 바꿔도 내용·사진 URL은 이 내보내기가 소유한다. */
export async function pdfFile(draft: Draft): Promise<SavedFile> {
  const value = draft.document;
  validateDocument(value);
  const deviceFont = (font: unknown) => font === "system" || font === "dotum";
  const usesDeviceFont = (node: typeof value.content): boolean =>
    (node.marks ?? []).some(mark => mark.type === "textStyle" && deviceFont(mark.attrs?.fontFamily)) || (node.content ?? []).some(usesDeviceFont);
  if (deviceFont(value.defaultFont) || usesDeviceFont(value.content)) throw new Error("pdfDeviceFonts");
  const images = new Map(await Promise.all([...imageNames(value).keys()].map(async id => [id, await photoBytes(draft, id)] as const)));
  const urls = Object.fromEntries([...images].map(([id, bytes]) => [id, URL.createObjectURL(new Blob([bytes as BlobPart], { type: value.media[id].mime }))]));
  const host = document.createElement("div");
  host.className = "pdf-root";
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, { position: "absolute", left: "-10000px", top: "0", width: `${bodyWidth}px`, visibility: "hidden" });
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<DocumentPreview document={value} mediaUrls={urls} print />));
    const article = host.querySelector<HTMLElement>("article")!;
    Object.assign(article.style, { margin: "0", padding: "0", maxWidth: "none" });
    host.querySelector<HTMLElement>(".tiptap")!.style.minHeight = "0";
    const pdf = await PDFDocument.create();
    pdf.setTitle(value.title); pdf.setCreator("Wonboard"); pdf.setLanguage(value.locale);
    const fonts = pdfFonts(pdf);
    // 브라우저와 PDF가 같은 글꼴 순서를 쓴다. 자손의 원래 값을 먼저 읽어 상속을 보존한다.
    const elements = [article, ...article.querySelectorAll<HTMLElement>("*")];
    const families = elements.map(element => fonts.portableFamily(getComputedStyle(element).fontFamily).map(name => `"${name}"`).join(","));
    elements.forEach((element, index) => { element.style.fontFamily = families[index]; });
    // 브라우저가 그리는 ::marker도 실제 텍스트로 만들어 같은 배치 경로에 태운다.
    for (const list of host.querySelectorAll<HTMLOListElement>("ol, ul")) {
      for (const [index, item] of Array.from(list.children).entries()) {
        const li = item as HTMLElement, marker = document.createElement("span");
        marker.textContent = list.tagName === "OL" ? orderedMarker(list.type, (list.start || 1) + index) : "• ";
        Object.assign(marker.style, { position: "absolute", right: "100%", whiteSpace: "pre" });
        li.style.position = "relative"; li.style.listStyle = "none"; li.prepend(marker);
      }
    }
    await Promise.all(Array.from(host.querySelectorAll("img"), image => image.decode()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await document.fonts.ready;
    // 사진과 설명을 한 쪽에 맞춘다. 인쇄 경로의 CSS·높이 계산에는 손대지 않는다.
    for (const media of host.querySelectorAll<HTMLElement>(".wb-media")) {
      const image = media.querySelector("img")!, caption = media.querySelector("figcaption");
      image.style.maxHeight = `${Math.max(bodyHeight - (caption?.getBoundingClientRect().height ?? 0), bodyHeight / 3) - 1}px`;
      image.style.objectFit = "contain";
    }
    const origin = article.getBoundingClientRect();
    const box = (rect: DOMRect): Box => ({ x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height });
    const texts: Text[] = [], canvas = document.createElement("canvas").getContext("2d")!;
    const segmenter = new Intl.Segmenter(value.locale, { granularity: "grapheme" });
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement!, style = getComputedStyle(parent);
      canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      let decoration = "";
      for (let element: HTMLElement | null = parent; element && element !== host; element = element.parentElement)
        decoration += " " + getComputedStyle(element).textDecorationLine;
      for (const { segment, index } of segmenter.segment(node.textContent ?? "")) {
        if (/^[\r\n\t]$/.test(segment)) continue;
        range.setStart(node, index); range.setEnd(node, index + segment.length);
        const rect = range.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const bounds = box(rect), metrics = canvas.measureText(segment);
        const font = await fonts.forText(segment, style.fontFamily, number(style.fontWeight));
        texts.push({ ...bounds, text: segment, style, font, decoration,
          baseline: bounds.y + bounds.height - metrics.fontBoundingBoxDescent,
          href: parent.closest<HTMLAnchorElement>("a[href]")?.href });
      }
    }
    // 쪽 경계가 글줄·사진 묶음·표·글상자·제목 바로 뒤를 지나지 않게 앞쪽 안전 지점으로 옮긴다.
    // 한 쪽보다 큰 표·글상자는 브라우저 인쇄처럼 글줄·행 단위로만 나눈다.
    const keep = Array.from(article.querySelectorAll<HTMLElement>(".wb-media, img, table, tr, pre, [data-wb-text-box]"), element => box(element.getBoundingClientRect()));
    for (const heading of article.querySelectorAll<HTMLElement>("h1, h2, h3")) {
      const bounds = box(heading.getBoundingClientRect()), next = heading.nextElementSibling;
      if (next) bounds.height += Math.min(40, next.getBoundingClientRect().height) + number(getComputedStyle(heading).marginBottom);
      keep.push(bounds);
    }
    const total = texts.reduce((bottom, text) => Math.max(bottom, text.y + text.height), article.scrollHeight);
    const pages: Page[] = [];
    for (let start = 0; start < total;) {
      let end = Math.min(start + bodyHeight, total), changed = true;
      while (changed) {
        changed = false;
        for (const bounds of [...keep, ...texts]) {
          if (bounds.y > start + 0.5 && bounds.y < end && bounds.y + bounds.height > end + 0.5 && bounds.height <= bodyHeight) {
            end = bounds.y; changed = true;
          }
        }
      }
      pages.push({ start, end, pdf: pdf.addPage([width, height]) });
      start = end;
    }
    // 큰 글꼴의 글리프 상자는 첫 줄의 위로 나올 수 있다. 그 글자도 첫 쪽에 속한다.
    const pageAt = (y: number) => pages.find(page => y < page.end) ?? pages[pages.length - 1];
    const rect = (page: Page, bounds: Box, fill: ReturnType<typeof rgb>) => {
      const y = Math.max(bounds.y, page.start), bottom = Math.min(bounds.y + bounds.height, page.end);
      if (bottom > y) page.pdf.drawRectangle({ x: left + bounds.x * pt, y: height - top - (bottom - page.start) * pt,
        width: bounds.width * pt, height: (bottom - y) * pt, color: fill });
    };
    let gradientId = 0;
    const gradient = (page: Page, bounds: Box, css: string) => {
      const colors = css.match(/rgba?\([^)]+\)/g)?.map(color);
      if (!colors?.[0] || !colors[1]) return;
      const key = PDFName.of(`WbGradient${gradientId++}`), resources = page.pdf.node.normalizedEntries().Resources;
      const shading = resources.lookupMaybe(PDFName.of("Shading"), PDFDict) ?? pdf.context.obj({});
      resources.set(PDFName.of("Shading"), shading);
      const x = left + bounds.x * pt, y = height - top - (bounds.y - page.start) * pt;
      const w = bounds.width * pt, h = bounds.height * pt, distance = (w + h) / 4;
      // 문서 스키마의 두 색·135도 그러데이션을 벡터로 저장한다.
      shading.set(key, pdf.context.register(pdf.context.obj({ ShadingType: 2, ColorSpace: "DeviceRGB",
        Coords: [x + w / 2 - distance, y - h / 2 + distance, x + w / 2 + distance, y - h / 2 - distance],
        Function: { FunctionType: 2, Domain: [0, 1], C0: [colors[0].red, colors[0].green, colors[0].blue],
          C1: [colors[1].red, colors[1].green, colors[1].blue], N: 1 }, Extend: [true, true] })));
      const start = Math.max(bounds.y, page.start), end = Math.min(bounds.y + bounds.height, page.end);
      page.pdf.pushOperators(pushGraphicsState(), rectangle(x, height - top - (end - page.start) * pt, w, (end - start) * pt),
        clip(), endPath(), PDFOperator.of(PDFOperatorNames.ShadingFill, [key]), popGraphicsState());
    };
    // 배경과 테두리는 자손의 글자보다 먼저 그린다. 표의 선도 CSS가 계산한 위치를 쓴다.
    for (const element of elements) {
      const style = getComputedStyle(element), bounds = box(element.getBoundingClientRect());
      const fill = color(style.backgroundColor);
      for (const page of pages) {
        if (bounds.y >= page.end || bounds.y + bounds.height <= page.start) continue;
        const radius = Math.min(number(style.borderRadius), bounds.width / 2, bounds.height / 2) * pt;
        if (radius && bounds.y >= page.start && bounds.y + bounds.height <= page.end) {
          const w = bounds.width * pt, h = bounds.height * pt, r = radius;
          page.pdf.drawSvgPath(`M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`,
            { x: left + bounds.x * pt, y: height - top - (bounds.y - page.start) * pt,
              color: fill, borderColor: color(style.borderTopColor), borderWidth: number(style.borderTopWidth) * pt });
          continue;
        }
        if (fill) {
          // 여러 줄에 걸친 형광펜은 각 줄의 글자 뒤만 채운다.
          const fragments = style.display === "inline" ? Array.from(element.getClientRects(), box) : [bounds];
          for (const fragment of fragments) rect(page, fragment, fill);
        }
        if (style.backgroundImage !== "none") gradient(page, bounds, style.backgroundImage);
        const edges = [
          { x: bounds.x, y: bounds.y, width: bounds.width, height: number(style.borderTopWidth), color: style.borderTopColor },
          { x: bounds.x, y: bounds.y + bounds.height - number(style.borderBottomWidth), width: bounds.width, height: number(style.borderBottomWidth), color: style.borderBottomColor },
          { x: bounds.x, y: bounds.y, width: number(style.borderLeftWidth), height: bounds.height, color: style.borderLeftColor },
          { x: bounds.x + bounds.width - number(style.borderRightWidth), y: bounds.y, width: number(style.borderRightWidth), height: bounds.height, color: style.borderRightColor },
        ];
        for (const edge of edges) { const ink = color(edge.color); if (ink && edge.width && edge.height) rect(page, edge, ink); }
      }
    }
    for (const image of host.querySelectorAll("img")) {
      const bounds = box(image.getBoundingClientRect()), id = Object.keys(urls).find(id => urls[id] === image.src)!;
      const bytes = images.get(id)!;
      let embedded;
      if (value.media[id].mime === "image/jpeg") {
        // 브라우저가 EXIF 회전·반전을 적용해 디코딩한 사진을 원래 해상도의 PNG로 넣는다.
        // JPEG 원본을 그대로 넣는 pdf-lib는 EXIF 방향을 적용하지 않는다. 본문 글자는 계속 텍스트다.
        const pixels = document.createElement("canvas");
        pixels.width = image.naturalWidth; pixels.height = image.naturalHeight;
        try {
          pixels.getContext("2d")!.drawImage(image, 0, 0);
          const png = await new Promise<Blob>((resolve, reject) => pixels.toBlob(blob =>
            blob ? resolve(blob) : reject(new Error("invalidImage")), "image/png"));
          embedded = await pdf.embedPng(await png.arrayBuffer());
        } finally { pixels.width = pixels.height = 0; }
      } else embedded = await pdf.embedPng(bytes);
      // object-fit: contain은 상자 안에서 가운데에 맞춘다.
      const scale = Math.min(bounds.width / embedded.width, bounds.height / embedded.height);
      const w = embedded.width * scale, h = embedded.height * scale;
      const page = pageAt(bounds.y);
      page.pdf.drawImage(embedded, { x: left + (bounds.x + (bounds.width - w) / 2) * pt,
        y: height - top - (bounds.y - page.start + (bounds.height + h) / 2) * pt, width: w * pt, height: h * pt });
    }
    for (const text of texts) {
      const page = pageAt(text.y);
      const size = number(text.style.fontSize) * pt, ink = color(text.style.color) ?? rgb(0, 0, 0);
      const x = left + text.x * pt, y = height - top - (text.baseline - page.start) * pt;
      const bold = number(text.style.fontWeight) >= 600 && text.font.weight < 600;
      if (bold) page.pdf.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.FillAndOutline),
        setLineWidth(size / 35), setStrokingRgbColor(ink.red, ink.green, ink.blue));
      page.pdf.drawText(text.text, { x, y, size, font: text.font.pdf, color: ink,
        xSkew: text.style.fontStyle === "italic" ? degrees(12) : undefined });
      if (bold) page.pdf.pushOperators(popGraphicsState());
      for (const [name, offset] of [["underline", -size * 0.12], ["line-through", size * 0.3]] as const)
        if (text.decoration.includes(name)) page.pdf.drawLine({ start: { x, y: y + offset }, end: { x: x + text.width * pt, y: y + offset }, thickness: size / 20, color: ink });
      if (text.href && /^https?:|^mailto:/i.test(text.href)) {
        const annotation = pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, y - size * 0.2, x + text.width * pt, y + size],
          Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(text.href) } });
        page.pdf.node.addAnnot(pdf.context.register(annotation));
      }
    }
    return { name: `${saveName(value)}.pdf`, blob: new Blob([await pdf.save() as BlobPart], { type: "application/pdf" }), photos: images.size };
  } catch (error) {
    console.warn("Wonboard PDF export failed", error);
    throw error;
  } finally {
    root.unmount(); host.remove(); Object.values(urls).forEach(url => URL.revokeObjectURL(url));
  }
}
