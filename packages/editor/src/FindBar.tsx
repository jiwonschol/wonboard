import { useState } from "react";
import type { Editor } from "@tiptap/core";
import { isComposingKey, type Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { Icon } from "./icons";
import { findState, replaceAll, replaceCurrent, setQuery, step } from "./find";

export function FindBar({ editor, locale, onClose }: { editor: Editor; locale: Locale; onClose(): void }) {
  const t = translator(locale);
  const [query, setText] = useState(findState(editor).query);
  const [replacement, setReplacement] = useState("");
  const { matches, current } = findState(editor);
  function close() {
    setQuery(editor, "");
    onClose();
    editor.view.focus();
  }
  return (
    <div className="find-bar" role="search" aria-label={t("find")}
      onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } }}>
      <Icon name="search" />
      <input autoFocus aria-label={t("find")} placeholder={t("find")} value={query}
        onChange={e => { setText(e.target.value); setQuery(editor, e.target.value); }}
        onKeyDown={e => {
          if (e.key !== "Enter" || isComposingKey(e.nativeEvent)) return;
          e.preventDefault();
          step(editor, e.shiftKey ? -1 : 1);
        }} />
      <span className="find-count" role="status">
        {query ? (matches.length ? t("findCount", { current: current + 1, total: matches.length }) : t("findNone")) : ""}
      </span>
      <button type="button" aria-label={t("findPrevious")} title={t("findPrevious")} disabled={!matches.length} onClick={() => step(editor, -1)}>↑</button>
      <button type="button" aria-label={t("findNext")} title={t("findNext")} disabled={!matches.length} onClick={() => step(editor, 1)}>↓</button>
      {editor.isEditable ? (
        <>
          <input aria-label={t("replaceWith")} placeholder={t("replaceWith")} value={replacement}
            onChange={e => setReplacement(e.target.value)} />
          <button type="button" disabled={!matches.length} onClick={() => replaceCurrent(editor, replacement)}>{t("replace")}</button>
          <button type="button" disabled={!matches.length} onClick={() => replaceAll(editor, replacement)}>{t("replaceAll")}</button>
        </>
      ) : null}
      <button type="button" className="icon-button" aria-label={t("close")} onClick={close}><Icon name="close" /></button>
    </div>
  );
}
