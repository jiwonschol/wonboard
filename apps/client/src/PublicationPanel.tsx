import { useEffect, useRef, useState } from "react";
import type { Draft, Locale } from "@wonboard/document";
import { plainText } from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { publishImages, publications, type Publication } from "./publishing";
import { sitesRequest } from "./draftRepository";

export function PublicationPanel({ locale, documentId, save, snapshot, onBusy, onClose }: {
  locale: Locale; documentId: string; save(): Promise<boolean>; snapshot(): Draft | null;
  onBusy(value: boolean): void; onClose(): void;
}) {
  const t = translator(locale);
  const [accepted, setAccepted] = useState(false);
  const [working, setWorking] = useState(false);
  const [items, setItems] = useState<Publication[]>([]);
  const [html, setHtml] = useState("");
  const [message, setMessage] = useState("");
  const draftText = useRef("");
  const panel = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = panel.current!;
    dialog.showModal();
    let active = true;
    void publications(documentId).then(value => { if (active) setItems(value); })
      .catch(() => { if (active) setMessage(t("publishFailed")); });
    return () => { active = false; dialog.close(); };
  }, [documentId]);
  async function run(action: () => Promise<void>) {
    if (working) return;
    setWorking(true); onBusy(true); setMessage("");
    try { await action(); }
    catch { setMessage(t("publishFailed")); }
    finally { setWorking(false); onBusy(false); }
  }
  async function publish() {
    if (!accepted || !(await save())) throw new Error("storageFailed");
    const draft = snapshot();
    if (!draft || draft.document.documentId !== documentId) throw new Error("storageFailed");
    const urls = await publishImages(draft);
    // The HTML serializer is needed only after an explicit export action.
    const { exportHtml } = await import("./htmlExport");
    setHtml(exportHtml(draft.document, urls));
    draftText.current = plainText(draft.document.content);
    setItems(await publications(documentId));
    setMessage(t("publishReady"));
  }
  async function copy(formatted: boolean) {
    try {
      if (formatted) await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([draftText.current], { type: "text/plain" }),
      })]);
      else await navigator.clipboard.writeText(html);
      setMessage(t("copied"));
    } catch { setMessage(t("copyManually")); }
  }
  const active = items.filter(item => item.published);
  return <dialog ref={panel} className="publication-dialog" aria-labelledby="publication-title"
    onCancel={event => { event.preventDefault(); if (!working) onClose(); }}>
    <header><h2 id="publication-title">{t("prepareExport")}</h2><button disabled={working} onClick={onClose}>{t("close")}</button></header>
    <p>{t("publishNotice")}</p>
    <label className="sites-consent"><input type="checkbox" checked={accepted} disabled={working} onChange={e => setAccepted(e.target.checked)} />{t("publishAccept")}</label>
    <button className="publish-button" disabled={!accepted || working} onClick={() => void run(publish)}>{t(working ? "saving" : "publishImages")}</button>
    <p role="status">{message}</p>
    {active.length > 0 && <details><summary>{t("publicImageCount", { count: active.length })}</summary><ul>{active.map(item =>
      <li key={item.publicId}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a></li>)}</ul></details>}
    {html && <><p>{t("exportCompatibility")}</p><div className="export-actions">
      <button onClick={() => void copy(true)}>{t("copyFormatted")}</button><button onClick={() => void copy(false)}>{t("copyHtml")}</button>
    </div><textarea aria-label={t("exportHtml")} value={html} readOnly onFocus={e => e.target.select()} /></>}
    {active.length > 0 && <details className="withdraw-section"><summary>{t("withdrawImages")}</summary><p>{t("withdrawNotice")}</p>
      <button disabled={working} onClick={() => void run(async () => {
        await sitesRequest(`/api/documents/${documentId}/publications`, { method: "DELETE" });
        setItems(await publications(documentId)); setHtml(""); setMessage(t("withdrawn"));
      })}>{t("confirmWithdraw")}</button></details>}
  </dialog>;
}
