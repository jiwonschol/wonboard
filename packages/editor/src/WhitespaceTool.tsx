import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import type { Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { whitespaceChanges, type SpaceChange } from "./whitespace";

export function WhitespaceTool({ editor, locale, disabled }: { editor: Editor; locale: Locale; disabled: boolean }) {
  const t = translator(locale);
  const dialog = useRef<HTMLDialogElement>(null);
  const [review, setReview] = useState<{ doc: Node; changes: SpaceChange[] } | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(() => { if (review) dialog.current?.showModal(); }, [review]);
  const dismiss = () => { setReview(null); editor.commands.focus(); };
  return <>
    <button type="button" disabled={disabled} onMouseDown={e => e.preventDefault()}
      onClick={() => { setStale(false); setReview({ doc: editor.state.doc, changes: whitespaceChanges(editor.state.doc) }); }}>
      {t("tidySpaces")}
    </button>
    {review && createPortal(<dialog ref={dialog} className="whitespace-dialog" aria-label={t("tidySpaces")} onCancel={dismiss}>
      <h2>{t("tidySpaces")}</h2>
      <p>{t("tidySpacesHint")}</p>
      {stale ? <p role="alert">{t("tidySpacesStale")}</p> : null}
      <p role="status">{review.changes.length ? `${t("tidySpacesCount")} ${review.changes.length}` : t("tidySpacesNone")}</p>
      <div className="whitespace-changes">
        {review.changes.slice().reverse().slice(0, 20).map((change, index) => <section key={index}>
          {change.kind === "paragraph" ? <p>{t("tidySpacesBlank")}</p> : <>
            <span>{t("tidySpacesBefore")}</span><pre>{change.before.replaceAll(" ", "·")}</pre>
            <span>{t("tidySpacesAfter")}</span><pre>{change.after.replaceAll(" ", "·") || t("tidySpacesEmpty")}</pre>
          </>}
        </section>)}
      </div>
      <p className="whitespace-note">{t("tidySpacesPreview")}</p>
      <div className="whitespace-actions">
        <button type="button" onClick={dismiss}>{t("close")}</button>
        <button type="button" disabled={disabled || stale || !review.changes.length} onClick={() => {
          if (!editor.isEditable || editor.view.composing || !editor.state.doc.eq(review.doc)) { setStale(true); return; }
          const tr = closeHistory(editor.state.tr);
          for (const change of review.changes) tr.delete(change.from, change.to);
          editor.view.dispatch(tr);
          editor.view.dispatch(closeHistory(editor.state.tr));
          dismiss();
        }}>{t("apply")}</button>
      </div>
    </dialog>, document.body)}
  </>;
}
