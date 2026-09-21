import { useEffect, useRef, useState, type DragEvent, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import type { Locale } from "@wonboard/document";
import { translator, type MessageKey } from "@wonboard/locales";
import { Icon } from "./icons";
import { deleteBlock, duplicateBlock, isBlockType, moveBlock, topLevelBlocks, turnInto, turnIntoTypes } from "./blockActions";

/** 문단 왼쪽의 ⋮⋮ 손잡이. 끌어서 옮기고, 누르면 이 블록을 바꾸는 메뉴가 열린다. */
export function BlockHandle({ editor, locale, page }: { editor: Editor; locale: Locale; page: RefObject<HTMLDivElement | null> }) {
  const t = translator(locale);
  const [hover, setHover] = useState<{ index: number; top: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = page.current;
    if (!element || menu) return;
    let frame = 0;
    const track = (event: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pageTop = element.getBoundingClientRect().top;
        const blocks = topLevelBlocks(editor);
        for (let index = 0; index < blocks.length; index++) {
          const dom = editor.view.nodeDOM(blocks[index].pos);
          if (!(dom instanceof HTMLElement)) continue;
          const rect = dom.getBoundingClientRect();
          if (event.clientY >= rect.top - 4 && event.clientY <= rect.bottom + 4)
            return setHover({ index, top: rect.top - pageTop });
        }
      });
    };
    element.addEventListener("mousemove", track);
    return () => { cancelAnimationFrame(frame); element.removeEventListener("mousemove", track); };
  }, [editor, page, menu]);
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !menuRef.current?.parentElement?.contains(event.target)) setMenu(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [menu]);
  const blocks = topLevelBlocks(editor);
  if (!editor.isEditable || !hover || hover.index >= blocks.length) return null;
  const block = blocks[hover.index];
  const textual = editor.state.doc.child(hover.index).isTextblock || ["bulletList", "orderedList", "blockquote", "textBox"].includes(block.type);
  function dragStart(event: DragEvent) {
    const { view } = editor;
    const selection = NodeSelection.create(view.state.doc, block.pos);
    view.dispatch(view.state.tr.setSelection(selection));
    const slice = selection.content();
    const { dom, text } = view.serializeForClipboard(slice);
    event.dataTransfer.clearData();
    event.dataTransfer.setData("text/html", dom.innerHTML);
    event.dataTransfer.setData("text/plain", text);
    event.dataTransfer.effectAllowed = "copyMove";
    const node = view.nodeDOM(block.pos);
    if (node instanceof HTMLElement) event.dataTransfer.setDragImage(node, 0, 0);
    // ProseMirror 는 이 값을 보고 놓는 자리로 블록을 옮긴다(복사가 아니라 이동).
    view.dragging = { slice, move: true };
  }
  function act(action: () => unknown) {
    action();
    setMenu(false);
    editor.view.focus();
  }
  const selectBlock = () => editor.chain().focus().setTextSelection(Math.min(block.pos + 1, editor.state.doc.content.size)).run();
  return (
    <div className="block-handle" style={{ top: hover.top }}>
      <button type="button" draggable aria-label={t("blockHandle")} title={t("blockHandle")} aria-expanded={menu}
        onDragStart={dragStart} onClick={() => { selectBlock(); setMenu(!menu); }}>
        <Icon name="grip" />
      </button>
      {menu ? (
        <div ref={menuRef} className="edit-menu block-menu" role="menu" aria-label={t("blockHandle")}
          onKeyDown={e => { if (e.key === "Escape") { setMenu(false); editor.view.focus(); } }}>
          <button type="button" role="menuitem" disabled={hover.index === 0} onClick={() => act(() => moveBlock(editor, hover.index, -1))}>{t("moveUp")}</button>
          <button type="button" role="menuitem" disabled={hover.index === blocks.length - 1} onClick={() => act(() => moveBlock(editor, hover.index, 1))}>{t("moveDown")}</button>
          <button type="button" role="menuitem" onClick={() => act(() => duplicateBlock(editor, hover.index))}>{t("duplicate")}</button>
          <button type="button" role="menuitem" onClick={() => act(() => deleteBlock(editor, hover.index))}>{t("deleteBlock")}</button>
          {textual ? (
            <div role="group" aria-label={t("turnInto")}>
              <hr />
              <p className="edit-menu-note">{t("turnInto")}</p>
              {turnIntoTypes.map(type => (
                <button key={type} type="button" role="menuitem" aria-pressed={isBlockType(editor, type)}
                  onClick={() => act(() => { selectBlock(); turnInto(editor, type); })}>
                  <Icon name={type.startsWith("heading") ? "heading" : type} />
                  <span>{type.startsWith("heading") ? `${t("heading")} ${type.slice(7)}` : t(type as MessageKey)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
