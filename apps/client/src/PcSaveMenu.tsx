import { useEffect, useRef, useState } from "react";
import type { Draft, Locale, WriterDocument } from "@wonboard/document";
import { DocumentPreview } from "@wonboard/renderer";
import { translator, type MessageKey } from "@wonboard/locales";
import { download, imageNames, markdownFile, textFile } from "./pcSave";

/**
 * 인쇄할 본문. 화면에서는 보이지 않는 자리에 그려 두고(글꼴과 사진을 미리 불러오려고),
 * 인쇄할 때는 style.css의 print 규칙이 이것만 남긴다. 인쇄 창이 닫히면 `onDone`을 부른다.
 */
export function PrintDocument({ document: value, mediaUrls, onDone }: {
  document: WriterDocument; mediaUrls: Record<string, string>; onDone(): void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const title = document.title;
    const finish = () => { if (active) onDone(); };
    window.addEventListener("afterprint", finish);
    void (async () => {
      await Promise.all(Array.from(root.current!.querySelectorAll("img"), image => image.decode().catch(() => {})));
      // 화면을 한 번 그린 뒤에 연다. 배치가 끝나야 이 글이 쓰는 글꼴 조각의 내려받기가 시작되고,
      // 인쇄 창은 화면을 멈추므로 그 전에 그리지 않으면 닫힌 PC 저장 메뉴가 뒤에 남아 보인다.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await document.fonts.ready;
      if (!active) return;
      // 브라우저는 문서 제목을 PDF 파일 이름으로 제안한다.
      if (value.title) document.title = value.title;
      window.print();
    })();
    return () => { active = false; window.removeEventListener("afterprint", finish); document.title = title; };
  }, []);
  return <div className="print-root" ref={root} aria-hidden="true"><DocumentPreview document={value} mediaUrls={mediaUrls} print /></div>;
}

function TextWarning({ locale, photos, onConfirm, onClose }: { locale: Locale; photos: number; onConfirm(): void; onClose(): void }) {
  const t = translator(locale), dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current!, trigger = document.activeElement as HTMLElement | null;
    node.showModal();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={dialog} className="publication-dialog trash-dialog" aria-labelledby="text-warning-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="text-warning-title">{t("saveText")}</h2>
    <p>{t("textPhotoWarning", { count: photos })}</p>
    <div className="trash-dialog-actions"><button onClick={onClose}>{t("trashCancel")}</button>
      <button autoFocus onClick={onConfirm}>{t("saveTextConfirm")}</button></div>
  </dialog>;
}

export function PcSaveMenu({ locale, disabled, formatsDisabled, snapshot, onPdf, onBackup, onNotice, onError, onClose }: {
  locale: Locale; disabled: boolean;
  /** 읽기 전용으로 얼어붙은 글은 내용을 믿을 수 없어 백업만 받는다. */
  formatsDisabled: boolean;
  snapshot(): Draft | null; onPdf(): void; onBackup(): void;
  onNotice(key: MessageKey): void; onError(error: unknown): void; onClose(): void;
}) {
  const t = translator(locale);
  const [warning, setWarning] = useState<Draft | null>(null);
  const [working, setWorking] = useState(false);
  async function run(action: () => Promise<void> | void) {
    setWorking(true);
    try { await action(); }
    catch (error) { onError(error); }
    finally { setWorking(false); onClose(); }
  }
  const saveText = (draft: Draft) => run(() => {
    const file = textFile(draft, name => t("photoPlaceholder", { name }));
    download(file.blob, file.name);
  });
  const off = disabled || working, formatsOff = off || formatsDisabled;
  return <div className="options-menu pc-save-menu" role="dialog" aria-label={t("pcSave")}>
    <p>{t("pcSaveHint")}</p>
    <button disabled={formatsOff} onClick={() => { onPdf(); onClose(); }}>{t("savePdf")}</button>
    <p>{t("savePdfHint")}</p>
    <button disabled={formatsOff} onClick={() => {
      const draft = snapshot();
      if (!draft) return;
      if (imageNames(draft.document).size) setWarning(draft); else void saveText(draft);
    }}>{t("saveText")}</button>
    <button disabled={formatsOff} onClick={() => {
      const draft = snapshot();
      if (draft) void run(async () => {
        const file = await markdownFile(draft);
        download(file.blob, file.name);
        if (file.photos) onNotice("markdownZipSaved");
      });
    }}>{t("saveMarkdown")}</button>
    <hr />
    <button disabled={off} onClick={() => { onBackup(); onClose(); }}>{t("backup")}</button>
    <p>{t("backupHint")}</p>
    <button onClick={onClose}>{t("close")}</button>
    {warning && <TextWarning locale={locale} photos={imageNames(warning.document).size}
      onConfirm={() => void saveText(warning)} onClose={() => setWarning(null)} />}
  </div>;
}
