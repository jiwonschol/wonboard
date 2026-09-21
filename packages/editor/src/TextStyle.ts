import { Mark } from "@tiptap/core";
import { textStyle, textVariants, variantStyle, writingFonts } from "@wonboard/document";

export const cssColor = (value: string | null | undefined) => {
  if (!value) return null;
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const match = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(value);
  return match ? `#${match.slice(1).map(n => Number(n).toString(16).padStart(2, "0")).join("")}` : null;
};

export const TextStyle = Mark.create({
  name: "textStyle",
  addAttributes() {
    return Object.fromEntries(["fontFamily", "fontSize", "color", "highlight", "variant"].map(key => [key, { default: null, rendered: false, parseHTML: () => null }]));
  },
  parseHTML() {
    return [{ tag: "span[style]", getAttrs: element => {
      const style = (element as HTMLElement).style;
      const firstFamily = style.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      const font = writingFonts.find(font => font.family.split(",")[0].replace(/["']/g, "") === firstFamily);
      const size = /^\d+(\.\d+)?px$/.test(style.fontSize) ? parseFloat(style.fontSize) : NaN;
      const marker = (element as HTMLElement).getAttribute("data-wb-variant");
      const variant = (textVariants as readonly string[]).includes(marker ?? "") ? marker : null;
      // 스타일이 만든 글자 크기는 스타일 값으로 되읽는다. 크기로도 읽으면 붙여넣은 뒤 두 값이 겹친다.
      const fromVariant = variant !== null && `${size}px` === variantStyle(variant).fontSize;
      const attrs = { fontFamily: font?.id ?? null, fontSize: size >= 12 && size <= 96 && !fromVariant ? size : null,
        color: cssColor(style.color), highlight: cssColor(style.backgroundColor), variant };
      return Object.values(attrs).some(value => value !== null) ? attrs : false;
    } }];
  },
  renderHTML({ mark }) {
    const style = Object.entries(textStyle(mark.attrs))
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}:${value}`)
      .join(";");
    return ["span", { style, ...(mark.attrs.variant ? { "data-wb-variant": mark.attrs.variant } : {}) }, 0];
  },
});
