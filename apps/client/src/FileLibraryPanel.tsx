import { useEffect, useRef, useState } from "react";
import { translator, en, type MessageKey } from "@wonboard/locales";
import type { Locale } from "@wonboard/document";
import { fileExpired, type FileLibrary, type LibraryFile } from "./fileLibrary";

export function FileLibraryPanel({ library, locale, picking, onInsert, onClose }: {
  library: FileLibrary; locale: Locale; picking: boolean;
  onInsert(ids: string[]): Promise<void>; onClose(): void;
}) {
  const t = translator(locale), input = useRef<HTMLInputElement>(null), panel = useRef<HTMLElement>(null);
  const [files, setFiles] = useState<LibraryFile[]>([]), [query, setQuery] = useState("");
  const [trash, setTrash] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [selected, setSelected] = useState<string[]>([]);
  const [failed, setFailed] = useState<File[]>([]), [renaming, setRenaming] = useState<string | null>(null), [name, setName] = useState("");
  const refresh = async () => setFiles(await library.list());
  const report = (error: unknown) => setError(error instanceof Error && Object.hasOwn(en, error.message) ? error.message : "storageFailed");
  useEffect(() => {
    let active = true;
    panel.current?.focus();
    library.list().then(value => { if (active) setFiles(value); }, error => { if (active) report(error); })
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
        <button disabled={busy} aria-pressed={!trash} onClick={() => { setTrash(false); setSelected([]); }}>{t("filesActive")}</button>
        <button disabled={busy} aria-pressed={trash} onClick={() => { setTrash(true); setSelected([]); }}>{t("trash")}</button>
        <button disabled={busy} onClick={() => input.current?.click()}>{t("fileUpload")}</button>
        <input ref={input} hidden type="file" multiple onChange={event => { const incoming = [...(event.currentTarget.files ?? [])]; event.currentTarget.value = ""; void upload(incoming); }} />
      </div>
      <input type="search" aria-label={t("search")} placeholder={t("search")} value={query} onChange={event => setQuery(event.target.value)} />
      {error ? <p role="alert">{t(error as MessageKey)} <button disabled={busy} onClick={() => void run(refresh)}>{t("trashRetry")}</button></p> : null}
      {failed.length ? <div role="status">{failed.map(file => file.name).join(", ")} <button disabled={busy} onClick={() => void upload(failed)}>{t("fileRetry")}</button></div> : null}
      {loading ? <p role="status">{t("loading")}</p> : <ul className="file-library-list">{visible.map(file => <li key={file.id}>
        {picking && !trash ? <input type="checkbox" aria-label={file.filename} checked={selected.includes(file.id)} disabled={busy}
          onChange={event => setSelected(value => event.target.checked ? [...value, file.id] : value.filter(id => id !== file.id))} /> : null}
        <span className="file-library-name">{file.filename}</span><small>{(file.size / 1024).toFixed(1)} KiB</small>
        {renaming === file.id ? <form onSubmit={event => { event.preventDefault(); void run(async () => { await library.change(file.id, file.revision, { filename: name }); setRenaming(null); }); }}>
          <input aria-label={t("fileRename")} value={name} onChange={event => setName(event.target.value)} maxLength={1024} /><button disabled={busy}>{t("save")}</button>
        </form> : null}
        {!trash ? <>
          <button disabled={busy} onClick={() => { setRenaming(file.id); setName(file.filename); }}>{t("fileRename")}</button>
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
      {!loading && !visible.length ? <p>{t(query ? "fileSearchEmpty" : "fileLibraryEmpty")}</p> : null}
      {picking ? <footer><button disabled={busy || !selected.length || trash} onClick={() => void run(() => onInsert(selected))}>{t("fileInsert")}</button></footer> : null}
    </section>
  </div>;
}
