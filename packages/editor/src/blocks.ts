import { Node } from "@tiptap/core";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { textBoxDefaults, textBoxStyle } from "@wonboard/document";
import { cssColor } from "./TextStyle";

const dashed = (key: string) => key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
const inRange = (min: number, max: number) => (raw: string | null) => {
  const value = Number(raw);
  return raw !== null && raw !== "" && Number.isInteger(value) && value >= min && value <= max ? value : null;
};
// 원보드가 내보낸 HTML은 data-wb-* 표식이 없고 인라인 스타일만 있다. 둘 다 되읽어야
// 내보낸 글을 다시 붙여넣었을 때 글상자 색이 기본값으로 돌아가지 않는다.
const textBoxAttributes = {
  backgroundColor: (element: HTMLElement) =>
    cssColor(element.getAttribute("data-wb-background-color") ?? element.style.backgroundColor),
  borderColor: (element: HTMLElement) =>
    cssColor(element.getAttribute("data-wb-border-color") ?? element.style.borderTopColor),
  borderWidth: (element: HTMLElement) =>
    inRange(0, 8)(element.getAttribute("data-wb-border-width") ?? (element.style.borderTopWidth ? String(parseFloat(element.style.borderTopWidth)) : null)),
  padding: (element: HTMLElement) =>
    inRange(0, 80)(element.getAttribute("data-wb-padding") ?? (element.style.paddingTop ? String(parseFloat(element.style.paddingTop)) : null)),
};

export const TextBox = Node.create({
  name: "textBox",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return Object.fromEntries(Object.entries(textBoxAttributes).map(([key, parse]) => [key, {
      default: textBoxDefaults[key as keyof typeof textBoxDefaults],
      parseHTML: (element: HTMLElement) => parse(element) ?? textBoxDefaults[key as keyof typeof textBoxDefaults],
      renderHTML: () => ({}),
    }]));
  },
  parseHTML() {
    return [{ tag: "div[data-wb-text-box]" }];
  },
  renderHTML({ node }) {
    const style = Object.entries(textBoxStyle(node.attrs))
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${dashed(key)}:${value}`)
      .join(";");
    const markers = Object.fromEntries(Object.keys(textBoxAttributes)
      .map(key => [`data-wb-${dashed(key)}`, String(node.attrs[key])]));
    return ["div", { "data-wb-text-box": "", class: "wb-text-box", style, ...markers }, 0];
  },
});

// 셀 병합과 열 너비 조절은 지원하지 않는다. 붙여넣은 표의 병합·너비 표식은 버리고
// 칸에는 문단만 둔다. 문서 검증이 받는 모양과 편집기가 만드는 모양을 같게 유지한다.
const flatCell = {
  content: "paragraph+",
  addAttributes(this: { parent?: () => Record<string, unknown> }) {
    return {
      ...this.parent?.(),
      colspan: { default: 1, parseHTML: () => 1 },
      rowspan: { default: 1, parseHTML: () => 1 },
      colwidth: { default: null, parseHTML: () => null },
    };
  },
};
export const tableExtensions = [
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader.extend(flatCell),
  TableCell.extend(flatCell),
];
