import { fontFamily, type FontId } from "./typography";
export const documentStyleNames = ["title", "paragraph", "h1", "h2", "h3", "blockquote"] as const;
export type DocumentStyleName = typeof documentStyleNames[number];
export type DocumentTextStyle = { fontFamily?: FontId; fontSize?: number; color?: string; lineHeight?: number };
export type DocumentStyles = Partial<Record<DocumentStyleName, DocumentTextStyle>>;
export function documentTextStyle(styles: DocumentStyles = {}, name: DocumentStyleName, defaultFont?: FontId) {
  const body = { fontFamily: defaultFont, fontSize: 19.3642, color: "#111111", lineHeight: 1.4, ...styles.paragraph };
  const defaults = name === "title" ? { fontSize: 39.0388, lineHeight: 1.125 }
    : name === "h1" ? { fontSize: body.fontSize * 2, lineHeight: 1.2 }
    : name === "h2" ? { fontSize: body.fontSize * 1.65, lineHeight: 1.2 }
    : name === "h3" ? { fontSize: body.fontSize * 1.3, lineHeight: 1.2 } : {};
  return { ...body, ...defaults, ...styles[name] };
}
export function documentStyleCss(styles: DocumentStyles | undefined, name: DocumentStyleName, defaultFont?: FontId) {
  const value = documentTextStyle(styles, name, defaultFont);
  return { fontFamily: fontFamily(value.fontFamily), fontSize: `${value.fontSize}px`, color: value.color, lineHeight: value.lineHeight };
}
export function documentStyleVariables(styles: DocumentStyles | undefined, defaultFont?: FontId) {
  return Object.fromEntries(documentStyleNames.flatMap(name => Object.entries(documentStyleCss(styles, name, defaultFont))
    .map(([key, value]) => [`--wb-${name}-${key}`, value])));
}
