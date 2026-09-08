import { useEffect, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { writingFonts, primaryFontIds, type FontId, type Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { Icon } from "./icons";
import pretendardLicense from "./licenses/Pretendard-OFL.txt?url";
import serifLicense from "@fontsource-variable/noto-serif-kr/LICENSE?url";
import softLicense from "@fontsource/gowun-dodum/LICENSE?url";
import monoLicense from "@fontsource/nanum-gothic-coding/LICENSE?url";
import notoSansLicense from "@fontsource-variable/noto-sans-kr/LICENSE?url";
import nanumSerifLicense from "@fontsource/nanum-myeongjo/LICENSE?url";
import gowunSerifLicense from "@fontsource/gowun-batang/LICENSE?url";
import manropeLicense from "@fontsource-variable/manrope/LICENSE?url";
import nanumGothicLicense from "@fontsource/nanum-gothic/LICENSE?url";

const fontLicenses: Partial<Record<FontId, string>> = { sans: pretendardLicense, serif: serifLicense, soft: softLicense, mono: monoLicense,
  "noto-sans": notoSansLicense, "nanum-serif": nanumSerifLicense, "gowun-serif": gowunSerifLicense, manrope: manropeLicense, "nanum-gothic": nanumGothicLicense };
const supplementalNoticeKey = "wonboard:supplemental-font-notice:v1";
const primaryFonts = primaryFontIds.map(id => writingFonts.find(font => font.id === id)!);
const supplementalFonts = writingFonts.filter(font => !primaryFontIds.includes(font.id));

export function WritingToolbar({ editor, defaultFont = "sans", locale, composing, onLink, expanded = false, actions }: {
  editor: Editor; locale: Locale; composing: boolean; onLink(): void;
  defaultFont?: FontId;
  expanded?: boolean; actions?: ReactNode;
}) {
  const t = translator(locale);
  const attrs = editor.getAttributes("textStyle");
  const blockType = editor.isActive("heading") ? "heading" : "paragraph";
  const block = editor.getAttributes(blockType);
  const disabled = !editor.isEditable || composing || editor.isActive("media") || editor.isActive("video");
  const effectiveSize = attrs.fontSize ?? block.fontSize;
  const [size, setSize] = useState(String(effectiveSize ?? ""));
  const [showFontNotice, setShowFontNotice] = useState(false);
  const selectedFont = attrs.fontFamily ?? defaultFont;
  function selectFont(id: string) {
    setStyle("fontFamily", id);
    if (!primaryFontIds.includes(id as FontId)) {
      let seen = false;
      try { seen = localStorage.getItem(supplementalNoticeKey) === "seen"; } catch { /* Storage may be unavailable. */ }
      if (!seen) setShowFontNotice(true);
    }
  }
  function dismissFontNotice() {
    try { localStorage.setItem(supplementalNoticeKey, "seen"); } catch { /* The notice remains available next time. */ }
    setShowFontNotice(false);
  }
  function fontLabel(font: typeof writingFonts[number]) {
    if (locale !== "en") return font.name;
    if (font.id === "system") return "System Gothic";
    return font.family.split(",")[0].replaceAll('"', '').replace(" Variable", "");
  }
  useEffect(() => setSize(String(effectiveSize ?? "")), [effectiveSize, editor.state.selection.from, editor.state.selection.to]);
  function setStyle(key: string, value: string | number | null, focus = true) {
    if (disabled || editor.view.composing) return;
    const chain = editor.chain();
    if (focus) chain.focus();
    chain.setMark("textStyle", { [key]: value }).run();
  }
  function applySize(focus: boolean) {
    const value = Number(size);
    if (size === "") setStyle("fontSize", null, focus);
    else if (Number.isFinite(value) && value >= 12 && value <= 96) setStyle("fontSize", value, focus);
    else setSize(String(effectiveSize ?? ""));
  }
  function clearFormatting() {
    if (disabled || editor.view.composing) return;
    const { empty, from, $from } = editor.state.selection;
    const chain = editor.chain().focus();
    if (empty && $from.parent.isTextblock) {
      chain.setTextSelection({ from: $from.start(), to: $from.end() });
      chain.resetAttributes(blockType, ["fontSize", "textColor"]);
    }
    for (const mark of ["bold", "italic", "underline", "strike", "code", "textStyle"]) chain.unsetMark(mark);
    if (empty) chain.setTextSelection(from);
    chain.run();
  }
  return (
    <div className={`writing-toolbar${expanded ? " writing-toolbar-expanded" : ""}`} role="toolbar" aria-label={t(expanded ? "inspectorWritingTools" : "writingToolbar")}>
      <fieldset disabled={disabled} className="writing-controls">
        <legend className="visually-hidden">{t("writingToolbar")}</legend>
        <select className="writing-block" aria-label={t("writingStyle")}
          value={editor.isActive("heading") ? `h${block.level}` : editor.isActive("codeBlock") ? "codeBlock" : "paragraph"}
          onChange={e => {
            const chain = editor.chain().focus();
            if (e.target.value === "codeBlock") chain.setCodeBlock().run();
            else if (e.target.value === "paragraph") chain.setParagraph().run();
            else chain.setHeading({ level: Number(e.target.value.slice(1)) as 1 | 2 | 3 }).run();
          }}>
          <option value="paragraph">{t("paragraph")}</option>
          {[1, 2, 3].map(level => <option key={level} value={`h${level}`}>{t("heading")} {level}</option>)}
          <option value="codeBlock">{t("codeBlock")}</option>
        </select>
        <select className="writing-font" aria-label={t("writingFont")} value={selectedFont}
          title={t(primaryFontIds.includes(selectedFont) ? "primaryFonts" : "supplementalFontHint")}
          style={{ fontFamily: writingFonts.find(font => font.id === selectedFont)?.family }}
          onChange={e => selectFont(e.target.value)}>
          {[{ label: t("primaryFonts"), fonts: primaryFonts }, { label: t("supplementalFonts"), fonts: supplementalFonts }].map(({ label, fonts }) =>
            <optgroup key={label} label={label}>
              {fonts.map(font => <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>
                {fontLabel(font)}
              </option>)}
            </optgroup>)}
        </select>
        <input className="writing-size" type="number" min="12" max="96" step="1"
          aria-label={t("writingSize")} title={t("writingSize")} value={size} placeholder="—"
          onChange={e => setSize(e.target.value)} onBlur={() => applySize(false)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); applySize(true); }
            if (e.key === "Escape") { setSize(String(effectiveSize ?? "")); editor.commands.focus(); }
          }} />
        <span className="toolbar-divider" aria-hidden="true" />
        {(["bold", "italic", "underline", "strike"] as const).map((mark, i) => (
          <button key={mark} type="button" title={t(mark)} aria-label={t(mark)} aria-pressed={editor.isActive(mark)}
            onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleMark(mark).run()}>
            <span className={`mark-${mark}`} aria-hidden="true">{["B", "I", "U", "S"][i]}</span>
            {expanded ? <span>{t(mark)}</span> : null}
          </button>
        ))}
        <label className="writing-color" title={t("writingColor")}>
          <span aria-hidden="true">A</span>
          <input type="color" aria-label={t("writingColor")} value={attrs.color ?? block.textColor ?? "#111111"}
            onChange={e => setStyle("color", e.target.value, false)} />
        </label>
        <label className="writing-color writing-highlight" title={t("writingHighlight")}>
          <span aria-hidden="true" style={{ backgroundColor: attrs.highlight ?? "#fff0a3" }}>A</span>
          <input type="color" aria-label={t("writingHighlight")} value={attrs.highlight ?? "#fff0a3"}
            onChange={e => setStyle("highlight", e.target.value, false)} />
        </label>
        <span className="toolbar-divider" aria-hidden="true" />
              {(["left", "center", "right"] as const).map(align => <button key={align} type="button"
                title={t(align)} aria-label={t(align)}
                aria-pressed={(block.textAlign ?? "left") === align} onMouseDown={e => e.preventDefault()}
                onClick={() => editor.chain().focus().updateAttributes("paragraph", { textAlign: align }).updateAttributes("heading", { textAlign: align }).run()}><Icon name={`align-${align}`} />{expanded ? <span>{t(align)}</span> : null}</button>)}
        <span className="toolbar-divider" aria-hidden="true" />
              {(["bulletList", "orderedList", "blockquote"] as const).map(type => <button key={type} type="button"
                title={t(type)} aria-label={t(type)} aria-pressed={editor.isActive(type)} onMouseDown={e => e.preventDefault()}
                onClick={() => { const chain = editor.chain().focus(); if (type === "bulletList") chain.toggleBulletList().run(); else if (type === "orderedList") chain.toggleOrderedList().run(); else chain.toggleBlockquote().run(); }}><Icon name={type} />{expanded ? <span>{t(type)}</span> : null}</button>)}
        <button type="button" aria-label={t("horizontalRule")} title={t("horizontalRule")} onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Icon name="horizontalRule" />{expanded ? <span>{t("horizontalRule")}</span> : null}</button>
        <button type="button" aria-label={t("link")} title={t("link")} onMouseDown={e => e.preventDefault()} onClick={onLink}><Icon name="link" />{expanded ? <span>{t("link")}</span> : null}</button>
        <button type="button" aria-label={t("clearTextStyle")} title={t("clearTextStyleHint")} onMouseDown={e => e.preventDefault()} onClick={clearFormatting}><Icon name="clear-format" /><span>{t("clearTextStyleShort")}</span></button>
      </fieldset>
      {actions}
      {!expanded ? (
      <details className="writing-help">
        <summary aria-label={t("markdownHelp")} title={t("markdownHelp")}><Icon name="codeBlock" /></summary>
        <div className="writing-help-panel">
          <strong>{t("markdownHelp")}</strong><p>{t("markdownHint")}</p>
          <strong>{t("fontLicenses")}</strong>
          <p>{t("fontExportHint")}</p>
          <p>{t("systemFontHint")}</p>
          {writingFonts.filter(font => fontLicenses[font.id]).map(font => <a key={font.id} href={fontLicenses[font.id]} target="_blank" rel="noreferrer">{fontLabel(font)} · OFL 1.1</a>)}
        </div>
      </details>
      ) : null}
      {showFontNotice ? <div className="writing-font-notice" role="status">
        <div><strong>{t("supplementalFonts")}</strong><p>{t("supplementalFontHint")}</p></div>
        <button type="button" onClick={dismissFontNotice}>{t("fontNoticeUnderstood")}</button>
      </div> : null}
    </div>
  );
}
