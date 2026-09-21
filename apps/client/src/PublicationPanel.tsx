import { useEffect, useRef, useState } from "react";
import type { Draft, Locale } from "@wonboard/document";
import { plainText, referencedFileIds } from "@wonboard/document";
import type { FileShare } from "./fileLibrary";
import { translator } from "@wonboard/locales";
import { prepareImageVariants, publishImages, publications, type Publication } from "./publishing";
import { sitesRequest } from "./draftRepository";
import { tableNodes, withoutNodes } from "@wonboard/renderer";

export function PublicationPanel({ locale, documentId, save, snapshot, canPublish, onBusy, onClose }: {
  locale: Locale; documentId: string; save(): Promise<boolean>; snapshot(): Draft | null;
  canPublish(): boolean;
  onBusy(value: boolean): void; onClose(): void;
}) {
  const t = translator(locale);
  const [accepted, setAccepted] = useState(false);
  // 표가 있는 글에서만 묻는다. 표를 지원하지 않는 게시판을 판별할 수 없어 사용자가 고른다.
  const [hasTables] = useState(() => { const draft = snapshot(); return Boolean(draft && tableNodes(draft.document.content).length); });
  const [tablesAsImages, setTablesAsImages] = useState(false);
  const [working, setWorking] = useState(false);
  const [items, setItems] = useState<Publication[]>([]);
  const [html, setHtml] = useState("");
  const [message, setMessage] = useState("");
  const [writingUrl, setWritingUrl] = useState(""), [writingExpiry, setWritingExpiry] = useState("");
  const writingOperation = useRef<{ key: string; id: string } | null>(null);
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
    catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setMessage(t(reason === "tooManyTables" || reason === "tableTooLarge" || reason === "fontUnavailable" ? reason : "publishFailed"));
    }
    finally { setWorking(false); onBusy(false); }
  }
  async function publish() {
    setHtml(""); draftText.current = "";
    if (!accepted || !canPublish() || !(await save()) || !canPublish()) throw new Error("storageFailed");
    const draft = snapshot();
    if (!draft || draft.document.documentId !== documentId) throw new Error("storageFailed");
    const fileUrls: Record<string, string> = {};
    // 표를 그림으로 내보내면 표 안의 파일 링크는 결과에 남지 않는다. 공개 공유가 없어도 막지 않는다.
    const fileIds = referencedFileIds(tablesAsImages ? withoutNodes(draft.document.content, node => node.type === "table") : draft.document.content);
    if (fileIds.length) {
      const shares: FileShare[] = await (await sitesRequest("/api/file-shares")).json();
      for (const id of fileIds) {
        const share = shares.find(value => value.fileId === id && value.active);
        if (!share) { setMessage(t("privateFile")); return; }
        fileUrls[id] = new URL(share.url, location.origin).href;
      }
    }
    const published = await publishImages(draft, tablesAsImages);
    const urls = { ...published.urls, ...fileUrls };
    // The HTML serializer is needed only after an explicit export action.
    const { exportHtml } = await import("./htmlExport");
    setHtml(exportHtml(draft.document, urls, published.tableImages));
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
  async function shareWriting() {
    setWritingUrl("");
    if (!accepted || !canPublish() || !(await save()) || !canPublish()) throw new Error("storageFailed");
    const draft = snapshot();
    if (!draft || draft.document.documentId !== documentId) throw new Error("storageFailed");
    const expiresAt = writingExpiry ? new Date(writingExpiry).toISOString() : null;
    const key = JSON.stringify([documentId, draft.document.revision, expiresAt]);
    if (writingOperation.current?.key !== key) writingOperation.current = { key, id: crypto.randomUUID() };
    try {
      const variants = await prepareImageVariants(draft);
      if (!canPublish()) throw new Error("storageFailed");
      const result = await (await sitesRequest("/api/snapshots", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, documentRevision: draft.document.revision, variants, expiresAt, operationId: writingOperation.current.id }) })).json();
      setWritingUrl(new URL(result.url, location.origin).href); writingOperation.current = null;
    } catch (error) {
      if (error instanceof Error && error.message === "privateFile") { setMessage(t("privateFile")); return; }
      throw error;
    }
  }
  const active = items.filter(item => item.published);
  return <dialog ref={panel} className="publication-dialog" aria-labelledby="publication-title"
    onCancel={event => { event.preventDefault(); if (!working) onClose(); }}>
    <header><h2 id="publication-title">{t("prepareExport")}</h2><button disabled={working} onClick={onClose}>{t("close")}</button></header>
    <p>{t("publishNotice")}</p>
    <label className="sites-consent"><input type="checkbox" checked={accepted} disabled={working} onChange={e => setAccepted(e.target.checked)} />{t("publishAccept")}</label>
    {hasTables ? <label className="sites-consent"><input type="checkbox" checked={tablesAsImages} disabled={working}
      onChange={e => setTablesAsImages(e.target.checked)} />{t("tablesAsImages")}</label> : null}
    {hasTables && tablesAsImages ? <p>{t("tablesAsImagesNotice")}</p> : null}
    <button className="publish-button" disabled={!accepted || working || !canPublish()} onClick={() => void run(publish)}>{t(working ? "saving" : "publishImages")}</button>
    <section aria-label={t("sharedWriting")}><p>{t("snapshotNotice")}</p>
      <label>{t("shareExpiry")}<input type="datetime-local" disabled={working} value={writingExpiry} onChange={event => setWritingExpiry(event.target.value)} /></label>
      <button disabled={!accepted || working || !canPublish()} onClick={() => void run(shareWriting)}>{t("createSnapshot")}</button>
      {writingUrl ? <input aria-label={t("sharedWritingUrl")} readOnly value={writingUrl} onFocus={event => event.target.select()} /> : null}
    </section>
    <p role="status">{message}</p>
    {active.length > 0 && <details><summary>{t("publicImageCount", { count: active.length })}</summary><ul>{active.map(item =>
      <li key={item.publicId}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a></li>)}</ul></details>}
    {html && <><p>{t("exportCompatibility")}</p><div className="export-actions">
      <button onClick={() => void copy(true)}>{t("copyFormatted")}</button><button onClick={() => void copy(false)}>{t("copyHtml")}</button>
    </div><textarea aria-label={t("exportHtml")} value={html} readOnly onFocus={e => e.target.select()} /></>}
    {active.length > 0 && <p>{t("distributionManagedSeparately")}</p>}
  </dialog>;
}
