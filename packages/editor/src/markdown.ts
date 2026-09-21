import { Marked } from "marked";

// 커뮤니티 글에는 `#해시태그`, `1. 첫째` 같은 줄이 흔하다. 그런 글이 제목·목록으로 바뀌지
// 않도록, 마크다운으로만 쓰는 표시가 하나라도 있을 때만 서식으로 바꾼다.
const signals = [
  /^#{1,6}[ \t]+\S/m,
  /^(```|~~~)/m,
  /^\s*\|?.*\|.*\n\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/m,
  /\*\*[^*\n]+\*\*/,
  /__[^_\n]+__/,
  /\[[^\]\n]+\]\((https?:|mailto:)[^)\s]+\)/,
];
export const looksLikeMarkdown = (text: string) => signals.some(signal => signal.test(text));

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// 마크다운 안의 HTML 조각은 실행하지도 되살리지도 않고 글자 그대로 둔다.
// 원격 그림은 편집기가 받지 않는다(사진은 원보드가 원본을 가진 것만). 그림 문법은 글자로 남긴다.
const marked = new Marked({ gfm: true, breaks: false, renderer: {
  html: ({ text }) => escape(text),
  image: ({ href, text }) => escape(`![${text}](${href})`),
} });
export const markdownToHtml = (text: string) => marked.parse(text, { async: false });
