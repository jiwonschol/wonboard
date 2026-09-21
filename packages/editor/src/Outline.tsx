import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";

/** 제목 1~3만 모은 목차. 누르면 그 소제목으로 가고, 지금 읽는 소제목을 강조한다. */
export function Outline({ editor, locale }: { editor: Editor; locale: Locale }) {
  const t = translator(locale);
  const headings: { pos: number; level: number; text: string }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") headings.push({ pos, level: Number(node.attrs.level), text: node.textContent });
    return node.isBlock && !node.isTextblock;
  });
  const [active, setActive] = useState(-1);
  const key = headings.map(h => h.pos).join(",");
  useEffect(() => {
    const canvas = editor.view.dom.closest(".wb-canvas");
    if (!canvas) return;
    const update = () => {
      const top = canvas.getBoundingClientRect().top + 96;
      let current = -1;
      headings.forEach((heading, index) => {
        const dom = editor.view.nodeDOM(heading.pos);
        if (dom instanceof HTMLElement && dom.getBoundingClientRect().top <= top) current = index;
      });
      setActive(current);
    };
    update();
    canvas.addEventListener("scroll", update, { passive: true });
    return () => canvas.removeEventListener("scroll", update);
  }, [editor, key]);
  function go(pos: number) {
    editor.chain().focus().setTextSelection(Math.min(pos + 1, editor.state.doc.content.size)).run();
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  return (
    <nav className="outline" aria-label={t("overview")}>
      <h2>{t("overview")}</h2>
      {headings.length ? (
        <ol>
          {headings.map((heading, index) => (
            <li key={heading.pos} data-level={heading.level}>
              <button aria-current={index === active ? "location" : undefined} onClick={() => go(heading.pos)}>
                {heading.text.slice(0, 80) || `${t("heading")} ${heading.level}`}
              </button>
            </li>
          ))}
        </ol>
      ) : <p>{t("tableOfContentsEmpty")}</p>}
    </nav>
  );
}
