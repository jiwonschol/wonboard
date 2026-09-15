import { useEffect, useRef, useState } from "react";
import type { Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";

export function TrashDialog({ locale, action, count, working, message, onConfirm, onClose }: {
  locale: Locale; action: "move" | "remove" | "empty"; count: number; working: boolean; message: string;
  onConfirm(withdraw: boolean): Promise<void>; onClose(): void;
}) {
  const t = translator(locale), dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null);
  const [withdraw, setWithdraw] = useState(false);
  useEffect(() => {
    const node = dialog.current!, trigger = document.activeElement as HTMLElement | null;
    node.showModal(); cancel.current?.focus();
    return () => { node.close(); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  const label = action === "move" ? "moveToTrash" : action === "remove" ? "permanentlyDelete" : "emptyTrash";
  return <dialog ref={dialog} className="publication-dialog trash-dialog" aria-labelledby="trash-dialog-title"
    onCancel={event => { event.preventDefault(); if (!working) onClose(); }}>
    <h2 id="trash-dialog-title">{t(label)}</h2>
    {action !== "move" && <p>{t(action === "remove" ? "trashDeleteNotice" : "trashEmptyNotice")}</p>}
    {count > 0 && <><p>{t("trashPhotoNotice", { count })}</p>
      <label className="sites-consent"><input type="checkbox" checked={withdraw} disabled={working} onChange={e => setWithdraw(e.target.checked)} />{t("trashWithdraw")}</label></>}
    {message && <p role="alert">{message}</p>}
    <div className="trash-dialog-actions"><button ref={cancel} disabled={working} onClick={onClose}>{t("trashCancel")}</button>
      <button disabled={working} onClick={() => void onConfirm(withdraw)}>{t(label)}</button></div>
  </dialog>;
}
