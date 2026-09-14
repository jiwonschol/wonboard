/** Stable document values; never accept arbitrary CSS or a remote font URL. */
export const writingFonts = [
  { id: "sans", name: "Pretendard", family: '"Pretendard Variable", sans-serif' },
  { id: "serif", name: "Noto Serif KR", family: '"Noto Serif KR Variable", "Pretendard Variable", serif' },
  { id: "soft", name: "고운돋움", family: '"Gowun Dodum", "Pretendard Variable", sans-serif' },
  { id: "mono", name: "나눔고딕코딩", family: '"Nanum Gothic Coding", "Pretendard Variable", monospace' },
  { id: "noto-sans", name: "Noto Sans KR", family: '"Noto Sans KR Variable", "Pretendard Variable", sans-serif' },
  { id: "nanum-serif", name: "나눔명조", family: '"Nanum Myeongjo", "Noto Serif KR Variable", serif' },
  { id: "gowun-serif", name: "고운바탕", family: '"Gowun Batang", "Noto Serif KR Variable", serif' },
  { id: "manrope", name: "Manrope", family: '"Manrope Variable", "Pretendard Variable", sans-serif' },
  { id: "system", name: "기본 고딕", family: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
  { id: "nanum-gothic", name: "나눔고딕", family: '"Nanum Gothic", NanumGothic, "나눔고딕", sans-serif' },
  { id: "dotum", name: "돋움", family: 'Dotum, "돋움", AppleGothic, sans-serif' },
] as const;
export type FontId = typeof writingFonts[number]["id"];
export const primaryFontIds: readonly FontId[] = ["nanum-serif", "system", "nanum-gothic", "dotum"];
export const fontFamily = (id: string = "sans") => writingFonts.find(font => font.id === id)?.family;
export const isFontId = (value: unknown) => writingFonts.some(font => font.id === value);
export function textStyle(attrs: Record<string, unknown> = {}) {
  return {
    fontFamily: writingFonts.find(font => font.id === attrs.fontFamily)?.family,
    fontSize: typeof attrs.fontSize === "number" && attrs.fontSize >= 12 && attrs.fontSize <= 96 ? `${attrs.fontSize}px` : undefined,
    color: typeof attrs.color === "string" && /^#[\da-f]{6}$/i.test(attrs.color) ? attrs.color : undefined,
    backgroundColor: typeof attrs.highlight === "string" && /^#[\da-f]{6}$/i.test(attrs.highlight) ? attrs.highlight : undefined,
  };
}
