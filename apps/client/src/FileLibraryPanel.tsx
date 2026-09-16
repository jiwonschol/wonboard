import { useEffect, useRef, useState } from "react";
import { translator, en, type MessageKey } from "@wonboard/locales";
import type { Locale } from "@wonboard/document";
import { fileExpired, type FileLibrary, type LibraryFile, type FileShare, type DistributedPhoto } from "./fileLibrary";

export function FileLibraryPanel({ library, locale, picking, onInsert, onClose }: {
  library: FileLibrary; locale: Locale; picking: boolean;
  onInsert(ids: string[]): Promise<void>; onClose(): void;
}) {
  const t = translator(locale), input = useRef<HTMLInputElement>(null), panel = useRef<HTMLElement>(null);
  const [files, setFiles] = useState<LibraryFile[]>([]), [query, setQuery] = useState("");
  const [trash, setTrash] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [distributed, setDistributed] = useState(false), [shares, setShares] = useState<FileShare[]>([]), [expiry, setExpiry] = useState("");
  const [cleanup, setCleanup] = useState("");
  const [photos, setPhotos] = useState<DistributedPhoto[]>([]);
  const [error, setError] = useState(""), [selected, setSelected] = useState<string[]>([]);
  const [failed, setFailed] = useState<File[]>([]), [renaming, setRenaming] = useState<string | null>(null), [name, setName] = useState("");
  const refresh = async () => {
    const [files, shared, pictures] = await Promise.all([library.list(), library.sharing?.list() ?? Promise.resolve([]), library.sharing?.photos() ?? Promise.resolve([])]);
    setFiles(files); setShares(shared); setPhotos(pictures);
  };
  const report = (error: unknown) => setError(error instanceof Error && Object.hasOwn(en, error.message) ? error.message : "storageFailed");
  useEffect(() => {
    let active = true;
    panel.current?.focus();
    Promise.all([library.list(), library.sharing?.list() ?? Promise.resolve([]), library.sharing?.photos() ?? Promise.resolve([])]).then(([value, shared, pictures]) => { if (active) { setFiles(value); setShares(shared); setPhotos(pictures); } }, error => { if (active) report(error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [library]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); await refresh(); } catch (error) { report(error); } finally { setBusy(false); }
  }
  async function upload(incoming: File[]) {
    await run(async () => {
      const failures: File[] = [];
      for (const file of incoming) {
        try { await library.upload(file); } catch (error) { failures.push(file); report(error); }
      }
      setFailed(failures);
    });
  }
  const visible = files.filter(file => Boolean(file.trashedAt) === trash && file.filename.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)));
  return <div className="file-library-backdrop">
    <section ref={panel} tabIndex={-1} className="file-library-panel" role="dialog" aria-modal="true" aria-label={t("fileLibrary")}
      onKeyDown={event => {
        if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); }
        if (event.key === "Tab") {
          const elements = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),[tabindex='0']")];
          const first = elements[0], last = elements.at(-1);
          if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <header><h2>{t("fileLibrary")}</h2><button disabled={busy} onClick={onClose}>{t("close")}</button></header>
      <p>{t("fileLibraryPolicy")}</p>
      <div className="file-library-tools">
        <button disabled={busy} aria-pressed={!trash && !distributed} onClick={() => { setTrash(false); setDistributed(false); setSelected([]); }}>{t("filesActive")}</button>
        <button disabled={busy} aria-pressed={trash && !distributed} onClick={() => { setTrash(true); setDistributed(false); setSelected([]); }}>{t("trash")}</button>
        {library.sharing ? <button disabled={busy} aria-pressed={distributed} onClick={() => { setDistributed(true); setSelected([]); }}>{t("distributedFiles")}</button> : null}
        <button disabled={busy} onClick={() => input.current?.click()}>{t("fileUpload")}</button>
        <input ref={input} hidden type="file" multiple onChange={event => { const incoming = [...(event.currentTarget.files ?? [])]; event.currentTarget.value = ""; void upload(incoming); }} />
      </div>
      <input type="search" aria-label={t("search")} placeholder={t("search")} value={query} onChange={event => setQuery(event.target.value)} />
      {library.sharing ? <><p>{t("shareFileNotice")}</p><label>{t("shareExpiry")}<input type="datetime-local" value={expiry} onChange={event => setExpiry(event.target.value)} /></label></> : null}
      {error ? <p role="alert">{t(error as MessageKey)} <button disabled={busy} onClick={() => void run(refresh)}>{t("trashRetry")}</button></p> : null}
      {failed.length ? <div role="status">{failed.map(file => file.name).join(", ")} <button disabled={busy} onClick={() => void upload(failed)}>{t("fileRetry")}</button></div> : null}
      {loading ? <p role="status">{t("loading")}</p> : distributed ? <ul className="file-library-list">{shares.filter(share => (share.filename ?? share.fileId).toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))).map(share => <li key={share.id}>
        <strong className="file-library-name">{share.filename ?? share.fileId}</strong>
        <span>{t(share.active ? "shareActive" : "shareInactive")}</span>
        <input aria-label={share.filename ?? share.fileId} readOnly value={new URL(share.url, location.origin).href} onFocus={event => event.target.select()} />
        <button disabled={busy || share.revoked} onClick={() => void run(async () => { await library.sharing!.change(share, "extend", expiry ? new Date(expiry).toISOString() : null); })}>{t("shareExtend")}</button>
        <button disabled={busy || share.revoked} onClick={() => void run(async () => { await library.sharing!.change(share, "revoke", null); })}>{t("shareRevoke")}</button>
        <button disabled={busy} onClick={() => void run(async () => { await library.sharing!.change(share, "reissue", expiry ? new Date(expiry).toISOString() : null); })}>{t("shareReissue")}</button>
        <button disabled={busy} onClick={() => { if (window.confirm(t("trashDeleteNotice"))) void run(() => library.sharing!.remove(share)); }}>{t("shareDelete")}</button>
      </li>)}</ul> : <ul className="file-library-list">{visible.map(file => <li key={file.id}>
        {picking && !trash ? <input type="checkbox" aria-label={file.filename} checked={selected.includes(file.id)} disabled={busy}
          onChange={event => setSelected(value => event.target.checked ? [...value, file.id] : value.filter(id => id !== file.id))} /> : null}
        <span className="file-library-name">{file.filename}</span><small>{(file.size / 1024).toFixed(1)} KiB</small>
        {renaming === file.id ? <form onSubmit={event => { event.preventDefault(); void run(async () => { await library.change(file.id, file.revision, { filename: name }); setRenaming(null); }); }}>
          <input aria-label={t("fileRename")} value={name} onChange={event => setName(event.target.value)} maxLength={1024} /><button disabled={busy}>{t("save")}</button>
        </form> : null}
        {!trash ? <>
          <button disabled={busy} onClick={() => { setRenaming(file.id); setName(file.filename); }}>{t("fileRename")}</button>
          {library.sharing ? <button disabled={busy} onClick={() => void run(async () => {
            await library.sharing!.create(file, expiry ? new Date(expiry).toISOString() : null); setDistributed(true); setSelected([]);
          })}>{t("shareFile")}</button> : null}
          <button disabled={busy} onClick={() => void run(async () => { await library.change(file.id, file.revision, { trashedAt: new Date().toISOString() }); setSelected(value => value.filter(id => id !== file.id)); })}>{t("moveToTrash")}</button>
        </> : <>
          <button disabled={busy || fileExpired(file)} onClick={() => void run(async () => { await library.change(file.id, file.revision, { trashedAt: null }); })}>{t("fileRestore")}</button>
          <button disabled={busy} onClick={() => { if (window.confirm(t("trashDeleteNotice"))) void run(() => library.remove(file.id, file.revision)); }}>{t("permanentlyDelete")}</button>
        </>}
        <button disabled={busy || fileExpired(file)} onClick={() => void run(async () => {
          const { blob } = await library.load(file.id), url = URL.createObjectURL(blob);
          const link = document.createElement("a"); link.href = url; link.download = file.filename; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        })}>{t("fileDownload")}</button>
      </li>)}</ul>}
      {distributed ? <ul className="file-library-list">{photos.filter(photo => (photo.filename ?? photo.id).toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))).map(photo => <li key={photo.id}>
        <strong className="file-library-name">{photo.filename || photo.id}</strong><span>{t(photo.published ? "shareActive" : "shareInactive")}</span>
        <input aria-label={photo.filename || photo.id} readOnly value={new URL(photo.url, location.origin).href} onFocus={event => event.target.select()} />
        <button disabled={busy || !photo.published} onClick={() => void run(() => library.sharing!.changePhoto(photo, "revoke"))}>{t("shareRevoke")}</button>
        <button disabled={busy} onClick={() => { if (window.confirm(t("trashDeleteNotice"))) void run(() => library.sharing!.changePhoto(photo, "delete")); }}>{t("shareDelete")}</button>
      </li>)}</ul> : null}
      {!loading && !(distributed ? shares.length + photos.length : visible.length) ? <p>{t(query ? "fileSearchEmpty" : "fileLibraryEmpty")}</p> : null}
      {library.sharing ? <><button disabled={busy} onClick={() => void run(async () => { const result = await library.sharing!.cleanup(); setCleanup(t("cleanupResult", result)); })}>{t("cleanupFiles")}</button><p role="status">{cleanup}</p></> : null}
      {picking && !distributed ? <footer><button disabled={busy || !selected.length || trash} onClick={() => void run(() => onInsert(selected))}>{t("fileInsert")}</button></footer> : null}
    </section>
  </div>;
}
