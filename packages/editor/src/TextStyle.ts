import { Mark } from "@tiptap/core";
import { textStyle, writingFonts } from "@wonboard/document";

export const TextStyle = Mark.create({
  name: "textStyle",
  addAttributes() {
    return Object.fromEntries(["fontFamily", "fontSize", "color", "highlight"].map(key => [key, { default: null, rendered: false, parseHTML: () => null }]));
  },
  parseHTML() {
    return [{ tag: "span[style]", getAttrs: element => {
      const style = (element as HTMLElement).style;
      const firstFamily = style.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      const font = writingFonts.find(font => font.family.split(",")[0].replace(/["']/g, "") === firstFamily);
      const size = /^\d+(\.\d+)?px$/.test(style.fontSize) ? parseFloat(style.fontSize) : NaN;
      const color = (value: string) => {
        if (/^#[\da-f]{6}$/i.test(value)) return value;
        const match = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(value);
        return match ? `#${match.slice(1).map(n => Number(n).toString(16).padStart(2, "0")).join("")}` : null;
      };
      const attrs = { fontFamily: font?.id ?? null, fontSize: size >= 12 && size <= 96 ? size : null, color: color(style.color), highlight: color(style.backgroundColor) };
      return Object.values(attrs).some(value => value !== null) ? attrs : false;
    } }];
  },
  renderHTML({ mark }) {
    const style = Object.entries(textStyle(mark.attrs))
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}:${value}`)
      .join(";");
    return ["span", { style }, 0];
  },
});
