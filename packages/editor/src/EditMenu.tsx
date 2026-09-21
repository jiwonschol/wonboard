import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import type { Locale } from "@wonboard/document";
import { translator, type MessageKey } from "@wonboard/locales";
import { Icon } from "./icons";
import { looksLikeMarkdown, markdownToHtml } from "./markdown";
import { applyVariant, currentVariant, hasTextSelection, isBlockType, turnInto, turnIntoTypes, unwrapTextBox, variants } from "./blockActions";

/** 데스크톱 앱만 주는 기능. 웹에는 Shift+우클릭으로 여는 브라우저 메뉴가 같은 일을 한다. */
export type DesktopEditing = {
  isMisspelled(word: string): boolean;
  suggestions(word: string): string[];
  paste(): void;
};
export type EditMenuTarget = { x: number; y: number; word?: { text: string; from: number; to: number } };

const headingLabel = (t: (key: MessageKey) => string, type: string) =>
  type.startsWith("heading") ? `${t("heading")} ${type.slice(7)}` : t(type as MessageKey);

export function EditMenu({ editor, locale, target, desktop, onClose }: {
  editor: Editor; locale: Locale; target: EditMenuTarget; desktop?: DesktopEditing; onClose(): void;
}) {
  const t = translator(locale);
  const menu = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  const [position, setPosition] = useState({ left: target.x, top: target.y });
  useLayoutEffect(() => {
    const rect = menu.current!.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(target.x, innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(target.y, innerHeight - rect.height - 8)),
    });
    menu.current!.querySelector<HTMLElement>("[role=menuitem]:not(:disabled)")?.focus();
  }, [target]);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) onClose();
    };
    document.addEventListener("pointerdown", dismiss);
    addEventListener("resize", onClose);
    return () => { document.removeEventListener("pointerdown", dismiss); removeEventListener("resize", onClose); };
  }, [onClose]);
  const selected = hasTextSelection(editor);
  const suggestions = target.word && desktop ? desktop.suggestions(target.word.text).slice(0, 5) : [];
  function run(action: () => void) {
    action();
    onClose();
  }
  function clipboard(command: "cut" | "copy") {
    // commands.focus() 는 한 프레임 뒤에 초점을 옮긴다. 복사는 초점이 본문에 있어야 하므로 바로 옮긴다.
    editor.view.focus();
    document.execCommand(command);
    onClose();
  }
  async function paste() {
    editor.view.focus();
    if (desktop) return run(() => desktop.paste());
    try {
      // 브라우저가 읽기 권한을 묻거나 거부할 수 있다. 거부되면 단축키를 안내한다.
      for (const item of await navigator.clipboard.read()) {
        if (item.types.includes("text/html")) {
          editor.view.pasteHTML(await (await item.getType("text/html")).text());
          return onClose();
        }
        if (item.types.includes("text/plain")) {
          // 단축키 붙여넣기와 같은 규칙으로 마크다운만 서식으로 바꾼다.
          const text = await (await item.getType("text/plain")).text();
          if (looksLikeMarkdown(text) && !editor.state.selection.$from.parent.type.spec.code)
            editor.view.pasteHTML(markdownToHtml(text));
          else editor.view.pasteText(text);
          return onClose();
        }
      }
      onClose();
    } catch {
      setNotice(t("pasteUnavailable"));
    }
  }
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); editor.view.focus(); }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...menu.current!.querySelectorAll<HTMLElement>("[role=menuitem]:not(:disabled)")];
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[(index + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
  }
  const item = (label: ReactNode, action: () => void, options: { disabled?: boolean; pressed?: boolean; icon?: string } = {}) => (
    <button type="button" role="menuitem" disabled={options.disabled} aria-pressed={options.pressed}
      onMouseDown={e => e.preventDefault()} onClick={action}>
      {options.icon ? <Icon name={options.icon} /> : null}<span>{label}</span>
    </button>
  );
  const table = editor.isActive("table");
  return (
    <div ref={menu} className="edit-menu" role="menu" aria-label={t("editMenu")} style={position} onKeyDown={onKeyDown}>
      {target.word && desktop ? (
        <div role="group" aria-label={t("spellingSuggestions")}>
          {suggestions.length ? suggestions.map(word => <div key={word}>{item(word, () => run(() =>
            editor.chain().focus().insertContentAt({ from: target.word!.from, to: target.word!.to }, word).run()))}</div>)
            : <p className="edit-menu-note">{t("noSpellingSuggestions")}</p>}
          <hr />
        </div>
      ) : null}
      <div role="group">
        {item(t("cut"), () => clipboard("cut"), { disabled: editor.state.selection.empty })}
        {item(t("copy"), () => clipboard("copy"), { disabled: editor.state.selection.empty })}
        {item(t("paste"), () => void paste())}
      </div>
      {notice ? <p className="edit-menu-note" role="status">{notice}</p> : null}
      {selected ? (
        <>
          <hr />
          <div role="group" aria-label={t("styles")} className="edit-menu-row">
            {(["bold", "italic", "underline", "strike"] as const).map((mark, i) => (
              <button key={mark} type="button" role="menuitem" aria-label={t(mark)} title={t(mark)} aria-pressed={editor.isActive(mark)}
                onMouseDown={e => e.preventDefault()} onClick={() => run(() => editor.chain().focus().toggleMark(mark).run())}>
                <span className={`mark-${mark}`} aria-hidden="true">{["B", "I", "U", "S"][i]}</span>
              </button>
            ))}
          </div>
          <div role="group" aria-label={t("styles")}>
            {variants.map(v => <div key={v}>{item(t(v), () => run(() => applyVariant(editor, v)), { pressed: currentVariant(editor) === v })}</div>)}
          </div>
        </>
      ) : null}
      <hr />
      <div role="group" aria-label={t("turnInto")}>
        <p className="edit-menu-note">{t("turnInto")}</p>
        {turnIntoTypes.map(type => <div key={type}>{item(headingLabel(t, type), () => run(() => turnInto(editor, type)),
          { pressed: isBlockType(editor, type), icon: type.startsWith("heading") ? "heading" : type })}</div>)}
      </div>
      {editor.isActive("textBox") ? <>{item(t("removeTextBox"), () => run(() => unwrapTextBox(editor)))}</> : null}
      {table ? (
        <>
          <hr />
          <div role="group" aria-label={t("table")}>
            {item(t("tableAddRowAfter"), () => run(() => editor.chain().focus().addRowAfter().run()))}
            {item(t("tableAddColumnAfter"), () => run(() => editor.chain().focus().addColumnAfter().run()))}
            {item(t("tableDeleteRow"), () => run(() => editor.chain().focus().deleteRow().run()))}
            {item(t("tableDeleteColumn"), () => run(() => editor.chain().focus().deleteColumn().run()))}
            {item(t("tableToggleHeader"), () => run(() => editor.chain().focus().toggleHeaderRow().run()))}
            {item(t("tableDelete"), () => run(() => editor.chain().focus().deleteTable().run()))}
          </div>
        </>
      ) : null}
      <p className="edit-menu-note">{t("nativeMenuHint")}</p>
    </div>
  );
}
