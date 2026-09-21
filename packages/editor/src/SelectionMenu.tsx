import type { Editor } from "@tiptap/core";
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus";
import type { Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { Icon } from "./icons";
import { applyVariant, currentVariant, hasTextSelection, variants, type Variant } from "./blockActions";

// BubbleMenu 는 이 값이 바뀔 때마다 플러그인을 다시 설정하고 편집기 갱신을 부른다.
// 렌더마다 새로 만들면 갱신이 다시 렌더를 부르는 무한 반복이 되므로 모듈에 한 번만 둔다.
const menuOptions = { placement: "top", offset: 8, flip: true, shift: { padding: 8 } } as const;
const shouldShow: NonNullable<BubbleMenuProps["shouldShow"]> = ({ editor, view, element }) =>
  editor.isEditable && hasTextSelection(editor) && !editor.isActive("codeBlock") &&
  (view.hasFocus() || element.contains(document.activeElement));

/** 글자를 드래그하면 바로 위에 뜨는 서식 막대. 우클릭이 없는 휴대폰에서도 같은 기능을 쓴다. */
export function SelectionMenu({ editor, locale, composing, onLink }: {
  editor: Editor; locale: Locale; composing: boolean; onLink(): void;
}) {
  const t = translator(locale);
  const attrs = editor.getAttributes("textStyle");
  return (
    <BubbleMenu editor={editor} className="selection-menu" role="toolbar" aria-label={t("selectionToolbar")}
      options={menuOptions} shouldShow={shouldShow}>
      <select aria-label={t("styles")} value={currentVariant(editor)} disabled={composing}
        onChange={e => applyVariant(editor, e.target.value as Variant)}>
        {variants.map(v => <option key={v} value={v}>{t(v)}</option>)}
      </select>
      {(["bold", "italic", "underline", "strike"] as const).map((mark, i) => (
        <button key={mark} type="button" title={t(mark)} aria-label={t(mark)} aria-pressed={editor.isActive(mark)} disabled={composing}
          onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleMark(mark).run()}>
          <span className={`mark-${mark}`} aria-hidden="true">{["B", "I", "U", "S"][i]}</span>
        </button>
      ))}
      <label className="writing-color" title={t("writingColor")}>
        <span aria-hidden="true">A</span>
        <input type="color" aria-label={t("writingColor")} value={attrs.color ?? "#111111"} disabled={composing}
          onChange={e => editor.chain().setMark("textStyle", { color: e.target.value }).run()} />
      </label>
      <label className="writing-color writing-highlight" title={t("writingHighlight")}>
        <span aria-hidden="true" style={{ backgroundColor: attrs.highlight ?? "#fff0a3" }}>A</span>
        <input type="color" aria-label={t("writingHighlight")} value={attrs.highlight ?? "#fff0a3"} disabled={composing}
          onChange={e => editor.chain().setMark("textStyle", { highlight: e.target.value }).run()} />
      </label>
      <button type="button" title={t("link")} aria-label={t("link")} disabled={composing}
        onMouseDown={e => e.preventDefault()} onClick={onLink}><Icon name="link" /></button>
      <button type="button" title={t("textBox")} aria-label={t("textBox")} aria-pressed={editor.isActive("textBox")} disabled={composing || editor.isActive("textBox")}
        onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().wrapIn("textBox").run()}><Icon name="textBox" /></button>
    </BubbleMenu>
  );
}
