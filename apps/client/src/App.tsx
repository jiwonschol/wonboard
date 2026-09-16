import { useEffect, useRef, useState } from "react";
import { WonboardEditor, Icon, captureAttachmentSelection, insertAttachmentContent, type EditorHandle } from "@wonboard/editor";
import { DocumentPreview } from "@wonboard/renderer";
import {
  exportBackup,
  exportRawBackup,
  importBackup,
  characterCount,
  attachmentNodes,
  referencedFileIds,
  validateDocument,
  type ContentNode,
  plainText,
  limits,
  DocumentError,
  type Locale,
  type Draft,
} from "@wonboard/document";
import { translator, en, type MessageKey } from "@wonboard/locales";
import { useDrafts } from "./useDrafts";
import {
  importImages,
  insertImagesWhenAccepted,
  verifyDecodedImage,
} from "./media";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { WritingLibrary } from "./WritingLibrary";
import { initialLocale } from "./locale";
import { PublicationPanel } from "./PublicationPanel";
import { sitesRequest, type StorageMode } from "./draftRepository";
import { publications } from "./publishing";
import { TrashDialog } from "./TrashDialog";
import { clearRecovery, recoveryMode } from "./recoveryCache";
import { openBrowserFileLibrary, type FileLibrary } from "./fileLibrary";
import { FileLibraryPanel } from "./FileLibraryPanel";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function App({
  onLogout,
  storageMode = "local",
}: {
  onLogout: () => Promise<boolean>;
  storageMode?: StorageMode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = translator(locale);
  const writer = useDrafts(locale, storageMode);
  const [publication, setPublication] = useState(false);
  const [editor, setEditor] = useState<EditorHandle | null>(null);
  const [fileLibrary, setFileLibrary] = useState<FileLibrary | null>(null);
  const [filePanel, setFilePanel] = useState<"manage" | "pick" | null>(null);
  const fileTarget = useRef<{ documentId: string; editor: EditorHandle; selection: ReturnType<typeof captureAttachmentSelection> } | null>(null);
  const fileTrigger = useRef<HTMLElement | null>(null);
  const [inspector, setInspector] = useState(true);
  const [insert, setInsert] = useState(false);
  const [overview, setOverview] = useState(false);
  const [options, setOptions] = useState(false);
  const [library, setLibrary] = useState(
    () => window.matchMedia("(min-width: 900px)").matches,
  );
  const [preview, setPreview] = useState(false);
  const [localBusy, setBusy] = useState(false);
  const busy = localBusy || writer.mutating;
  const [trashDialog, setTrashDialog] = useState<{ action: "move" | "remove" | "empty"; value?: Draft; count: number } | null>(null);
  const [trashUndo, setTrashUndo] = useState<Draft | null>(null);
  const [withdrawRetry, setWithdrawRetry] = useState<string | null>(null);
  const [trashFailures, setTrashFailures] = useState<number | null>(null);
  const importing = useRef(false);
  const [notice, setNotice] = useState("");
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [usage, setUsage] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlCache = useRef(new Map<string, { blob: Blob; url: string }>());
  const restoreInput = useRef<HTMLInputElement>(null);
  const draft = writer.draft;
  useEffect(() => {
    if (storageMode !== "local") return;
    let active = true, opened: FileLibrary | undefined;
    void openBrowserFileLibrary().then(value => {
      opened = value;
      if (active) setFileLibrary(value); else value.close();
    }, () => { if (active) setNotice("storageFailed"); });
    return () => { active = false; opened?.close(); fileTarget.current?.selection.close(); };
  }, [storageMode]);
  function openFiles(picking: boolean) {
    if (!fileLibrary || busy) return;
    fileTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fileTarget.current?.selection.close();
    const snapshot = writer.snapshot();
    fileTarget.current = picking && editor && snapshot
      ? { documentId: snapshot.document.documentId, editor, selection: captureAttachmentSelection(editor) } : null;
    setFilePanel(picking ? "pick" : "manage");
  }
  function closeFiles() {
    const target = fileTarget.current;
    if (target && writer.snapshot()?.document.documentId === target.documentId && !target.editor.isDestroyed) target.selection.restore();
    else { target?.selection.close(); fileTrigger.current?.focus(); }
    fileTarget.current = null;
    setFilePanel(null);
  }
  async function insertLibraryFiles(ids: string[]) {
    const target = fileTarget.current;
    if (!target || !fileLibrary || writer.readOnly) throw new Error("fileInsertChanged");
    const loaded = [];
    for (const id of ids) {
      const item = await fileLibrary.load(id);
      if (item.file.trashedAt) throw new Error("missingFile");
      loaded.push(item);
    }
    const snapshot = writer.snapshot();
    if (!snapshot || snapshot.document.documentId !== target.documentId || target.editor.isDestroyed) throw new Error("fileInsertChanged");
    const files = { ...snapshot.document.files }, media = { ...snapshot.document.media }, blobs = { ...snapshot.blobs };
    const content: ContentNode[] = [];
    for (const { file, blob } of loaded) {
      if (["image/png", "image/jpeg"].includes(file.mime)) {
        const [image] = await importImages([new File([blob], file.filename, { type: file.mime })], { count: Object.keys(media).length, bytes: Object.values(media).reduce((sum, value) => sum + value.size, 0) });
        media[file.id] = { ...image.media, id: file.id };
        content.push({ type: "media", attrs: { mediaId: file.id, width: Math.min(600, image.media.width), align: "left", alt: "", caption: "" } }, { type: "paragraph" });
      } else {
        files[file.id] = { id: file.id, originalName: file.originalName, mime: file.mime, size: file.size, sha256: file.sha256 };
        content.push({ type: "fileRef", attrs: { fileId: file.id, label: file.filename } }, { type: "text", text: " " });
      }
      blobs[file.id] = blob;
    }
    if (writer.snapshot()?.document.documentId !== target.documentId || target.editor.isDestroyed) throw new Error("fileInsertChanged");
    validateDocument({ ...snapshot.document, files, media });
    if (!target.selection.restore()) throw new Error("fileInsertChanged");
    const accepted = insertAttachmentContent(target.editor, content);
    if (!accepted) throw new Error("imageInsertFailed");
    const nextContent = target.editor.getJSON() as ContentNode;
    const inserted = new Set([...referencedFileIds(nextContent), ...attachmentNodes(nextContent).filter(node => node.type === "media").map(node => String(node.attrs?.mediaId))]);
    if (!ids.every(id => inserted.has(id))) throw new Error("imageInsertFailed");
    writer.update({ files, media, content: nextContent }, blobs);
    fileTarget.current = null; setFilePanel(null);
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem("wonboard-locale", locale);
    } catch {}
  }, [locale]);
  useEffect(() => {
    const blobs = draft?.blobs ?? {};
    let changed = false;
    for (const [id, entry] of urlCache.current) {
      if (blobs[id] !== entry.blob) {
        URL.revokeObjectURL(entry.url);
        urlCache.current.delete(id);
        changed = true;
      }
    }
    for (const [id, blob] of Object.entries(blobs)) {
      if (!urlCache.current.has(id)) {
        urlCache.current.set(id, { blob, url: URL.createObjectURL(blob) });
        changed = true;
      }
    }
    if (changed)
      setUrls(
        Object.fromEntries([...urlCache.current].map(([id, e]) => [id, e.url])),
      );
  }, [draft?.blobs]);
  useEffect(
    () => () => {
      for (const item of urlCache.current.values())
        URL.revokeObjectURL(item.url);
    },
    [],
  );
  const report = (error: unknown) =>
    setNotice(
      error instanceof Error && Object.hasOwn(en, error.message)
        ? error.message
        : "storageFailed",
    );
  async function backup() {
    const snapshot = writer.snapshot();
    if (!snapshot) return;
    setBusy(true);
    try {
      download(
        await exportBackup(snapshot),
        `wonboard-${snapshot.document.documentId}.zip`,
      );
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  // 읽기 전용은 두 가지 이유로 생긴다. 다른 탭이 먼저 써서 충돌한 사본은 검증을
  // 통과하므로 평소 ZIP 이 그대로 나오고, 다시 가져오기도 된다. 반면 미래 스키마나
  // 지원하지 않는 노드로 얼어붙은 초안은 exportBackup 이 얼어붙게 만든 그 검증에서
  // 다시 던져 파일이 아예 나올 수 없었다 — 사진이 든 초안에 온전한 회수 경로가 없었다.
  // 그래서 먼저 정식 백업을 시도하고, 검증이 막을 때만 검증 없는 원본 묶음으로 넘어간다.
  async function recoveryBackup() {
    const snapshot = writer.snapshot();
    if (!snapshot) return;
    setBusy(true);
    try {
      download(
        await exportBackup(snapshot),
        `wonboard-${snapshot.document.documentId}.zip`,
      );
    } catch {
      try {
        download(
          await exportRawBackup(snapshot),
          `wonboard-${snapshot.document.documentId}-original.zip`,
        );
      } catch (e) {
        report(e);
      }
    } finally {
      setBusy(false);
    }
  }
  async function restore(file: File) {
    setBusy(true);
    try {
      const restored = await importBackup(file);
      for (const media of Object.values(restored.document.media)) {
        const blob = restored.blobs[media.id];
        if (!blob) throw new DocumentError("corruptBackup");
        await verifyDecodedImage(blob, media);
      }
      if (await writer.restore(restored)) setNotice("imported");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function images(
    files: File[],
    position: number,
    instance: EditorHandle,
  ) {
    const snapshot = writer.snapshot();
    if (!snapshot || busy || importing.current) return;
    importing.current = true;
    setBusy(true);
    setNotice("busyImages");
    try {
      const retained = Object.keys(snapshot.document.media).length;
      const used = new Set(
        attachmentNodes(snapshot.document.content)
          .filter((node) => node.type === "media")
          .map((node) => node.attrs?.mediaId),
      ).size;
      if (retained + files.length > limits.images && used + files.length <= limits.images)
        throw new Error("imageHistoryLimit");
      const imported = await importImages(
        files,
        {
          count: retained,
          bytes: [...new Set(
            attachmentNodes(snapshot.document.content)
              .filter((node) => node.type === "media")
              .map((node) => String(node.attrs?.mediaId)),
          )].reduce(
            (sum, id) => sum + (snapshot.document.media[id]?.size ?? 0),
            0,
          ),
        },
      );
      const media = { ...snapshot.document.media };
      const blobs = { ...snapshot.blobs };
      for (const item of imported) {
        media[item.media.id] = item.media;
        blobs[item.media.id] = item.blob;
      }
      if (
        !insertImagesWhenAccepted(instance, position, imported, () =>
          writer.update({ media }, blobs),
        )
      )
        throw new Error("imageInsertFailed");
      setNotice("");
    } catch (e) {
      report(e);
    } finally {
      importing.current = false;
      setBusy(false);
    }
  }
  async function storageInfo() {
    if (storageMode === "desktop") return;
    try {
      setPersistent(await navigator.storage.persisted());
      const e = await navigator.storage.estimate();
      setUsage(
        `${((e.usage ?? 0) / 1024 / 1024).toFixed(1)} MiB / ${((e.quota ?? 0) / 1024 / 1024).toFixed(0)} MiB`,
      );
    } catch {
      setPersistent(false);
    }
  }
  function switchLocale(value: Locale) {
    setLocale(value);
  }
  const error = writer.error || notice;
  async function logout() {
    setBusy(true);
    try {
      if (writer.readOnly || (await writer.save())) {
        if (!(await onLogout())) setNotice("logoutFailed");
        else if (storageMode === "sites" && !writer.readOnly) await clearRecovery();
      } else setNotice("logoutSaveFailed");
    } finally {
      setBusy(false);
    }
  }
  const canTrash = Boolean(draft && !writer.readOnly && (draft.document.revision > 0 ||
    draft.document.title || plainText(draft.document.content) || Object.keys(draft.document.media).length));
  async function withdrawPhotos(id: string) {
    try {
      await sitesRequest(`/api/documents/${id}/publications`, { method: "DELETE" });
      setWithdrawRetry(null);
    } catch { setWithdrawRetry(id); }
  }
  async function executeTrash(action: "move" | "remove" | "empty", value?: Draft, withdraw = false) {
    setBusy(true); setTrashFailures(null);
    try {
      if (action === "move" && value) {
        const moved = await writer.moveToTrash(value);
        if (!moved) return;
        setTrashUndo(moved);
        if (withdraw) await withdrawPhotos(moved.document.documentId);
      } else if (action === "remove" && value) {
        if (!(await writer.permanentlyRemove(value, withdraw))) return;
        if (trashUndo?.document.documentId === value.document.documentId) setTrashUndo(null);
      } else if (action === "empty") {
        const failures = await writer.emptyTrash();
        if (failures === null) return;
        setTrashUndo(null);
        if (failures) setTrashFailures(failures);
      }
      setTrashDialog(null);
    } catch (e) { report(e); }
    finally { setBusy(false); }
  }
  async function requestTrash(action: "move" | "remove" | "empty", value?: Draft) {
    if (busy) return;
    setOptions(false); setBusy(true);
    try {
      const count = storageMode === "sites" && value
        ? (await publications(value.document.documentId)).filter(p => p.published).length : 0;
      if (action === "move" && count === 0) await executeTrash(action, value);
      else setTrashDialog({ action, value, count });
    } catch (e) { report(e); }
    finally { setBusy(false); }
  }
  if (!draft)
    return (
      <main className="startup" role="status">
        {error
          ? t(
              Object.hasOwn(en, error)
                ? (error as MessageKey)
                : "storageFailed",
            )
          : t("loading")}
      </main>
    );
  const content =
    typeof draft.document.title === "string" ? draft.document.title : "";
  const attached = writer.readOnly
    ? []
    : attachmentNodes(draft.document.content);
  const attachmentCount =
    new Set(
      attached.filter((n) => n.type === "media").map((n) => n.attrs?.mediaId),
    ).size + attached.filter((n) => n.type === "video").length + referencedFileIds(draft.document.content).length;
  return (
    <div className="app-shell" data-storage-mode={storageMode}>
      <a className="skip-link" href="#document-canvas">
        {t("skip")}
      </a>
      <div className="admin-bar">
        <button
          className="wordmark"
          aria-label={t("documents")}
          onClick={() => setLibrary(true)}
        >
          W
        </button>
        <button onClick={() => setLibrary(true)}>Wonboard</button>
        <button disabled={busy} onClick={() => void writer.create()}>
          <Icon name="plus" />
          {t("newDocument")}
        </button>
        <span className="admin-spacer" />
        <span className="local-mode">{t(storageMode === "desktop" ? "deviceStorage" : storageMode === "sites" ? "sitesStorage" : "noCloud")}</span>
        <select
          aria-label={t("language")}
          value={locale}
          onChange={(e) => switchLocale(e.target.value as Locale)}
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
        {storageMode !== "desktop" && <button disabled={busy} onClick={() => void logout()}>
          {t("logout")}
        </button>}
      </div>
      <header className="topbar">
        <div
          className="document-tools"
          role="toolbar"
          aria-label={t("overview")}
        >
          <button
            className="icon-button"
            aria-label={t("documents")}
            onClick={() => setLibrary(!library)}
          >
            <Icon name="back" />
          </button>
          <button
            className="icon-button primary"
            aria-label={t("insert")}
            aria-pressed={insert}
            disabled={writer.readOnly || busy}
            onClick={() => setInsert(!insert)}
          >
            <Icon name="plus" />
          </button>
          <button
            className="icon-button"
            aria-label={t("undo")}
            disabled={!editor?.can().undo() || busy || writer.readOnly}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Icon name="undo" />
          </button>
          <button
            className="icon-button"
            aria-label={t("redo")}
            disabled={!editor?.can().redo() || busy || writer.readOnly}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Icon name="redo" />
          </button>
          <button
            className="icon-button"
            aria-label={t("overview")}
            aria-pressed={overview}
            onClick={() => setOverview(!overview)}
          >
            <Icon name="overview" />
          </button>
        </div>
        <button className="document-name" onClick={() => setLibrary(true)}>
          {content || t("untitled")} · {t("post")}
        </button>
        <div className="save-tools">
          <button
            className="save-button"
            disabled={busy || writer.status === "saved" || writer.readOnly}
            onClick={() => void writer.save()}
          >
            {t("save")}
          </button>
          <button
            className="icon-button"
            aria-label={t("preview")}
            disabled={writer.readOnly}
            onClick={() => setPreview(true)}
          >
            <Icon name="preview" />
          </button>
          <button
            className={`icon-button ${inspector ? "selected" : ""}`}
            aria-label={t("settings")}
            aria-pressed={inspector}
            onClick={() => setInspector(!inspector)}
          >
            <Icon name="settings" />
          </button>
          <span title={storageMode !== "sites" ? t("publishLater") : undefined}>
            <button className="publish-button" disabled={storageMode !== "sites" || busy || writer.readOnly}
              onClick={() => setPublication(true)}>
              {t(storageMode === "sites" ? "prepareExport" : "publish")}
            </button>
          </span>
          <button
            className="icon-button"
            aria-label={t("options")}
            aria-expanded={options}
            onClick={() => {
              setOptions(!options);
              void storageInfo();
            }}
          >
            <Icon name="more" />
          </button>
        </div>
      </header>
      {error ? (
        <div
          className={`notice ${writer.error ? "error" : ""}`}
          role={writer.error ? "alert" : "status"}
        >
          {t(
            Object.hasOwn(en, error) ? (error as MessageKey) : "storageFailed",
          )}
          {!writer.error ? (
            <button aria-label={t("close")} onClick={() => setNotice("")}>
              <Icon name="close" />
            </button>
          ) : null}
        </div>
      ) : null}
      {writer.recovery.map(copy => {
        const mode = recoveryMode(copy, writer.list.find(d => d.document.documentId === copy.documentId));
        return <div className="notice recovery-notice" role="status" key={copy.token}>
          <span>{t(mode === "replace" ? "recoveryFound" : "recoveryOld")} {copy.draft.document.title || t("untitled")}</span>
          <button disabled={busy} onClick={async () => { setBusy(true); try { await writer.recoverCopy(copy); } finally { setBusy(false); } }}>{t(mode === "replace" ? "recoverEdits" : "recoverAsNew")}</button>
          <button disabled={busy} onClick={() => void writer.discardCopy(copy)}>{t("discardEdits")}</button>
        </div>;
      })}
      {trashUndo && <div className="notice" role="status">{t("trashMoved")}
        <button disabled={busy} onClick={async () => { if (await writer.restoreFromTrash(trashUndo)) setTrashUndo(null); }}>{t("trashUndo")}</button>
        <button aria-label={t("close")} onClick={() => setTrashUndo(null)}><Icon name="close" /></button></div>}
      {withdrawRetry && <div className="notice error" role="alert">{t("trashWithdrawFailed")}
        <button disabled={busy} onClick={async () => { setBusy(true); try { await withdrawPhotos(withdrawRetry); } finally { setBusy(false); } }}>{t("trashRetry")}</button></div>}
      {trashFailures !== null && <div className="notice error" role="alert">{t("trashPartialFailure", { count: trashFailures })}</div>}
      <div className="writing-workspace">
        {library ? (
          <WritingLibrary
            onFiles={fileLibrary ? () => openFiles(false) : undefined}
            storageMode={storageMode}
            draft={draft}
            list={writer.list}
            locale={locale}
            busy={busy}
            canTrash={canTrash}
            onTrash={value => void requestTrash("move", value)}
            onUntrash={async value => { if (await writer.restoreFromTrash(value)) setTrashUndo(null); }}
            onRemove={value => void requestTrash("remove", value)}
            onEmptyTrash={() => void requestTrash("empty")}
            onClose={() => setLibrary(false)}
            onCreate={() => void writer.create()}
            onRestore={() => restoreInput.current?.click()}
            onSelect={async (value) => {
              if (
                busy ||
                value.document.documentId ===
                  writer.snapshot()?.document.documentId
              )
                return;
              setBusy(true);
              try {
                if (await writer.activate(value)) {
                  if (window.matchMedia("(max-width: 899px)").matches)
                    setLibrary(false);
                }
              } finally {
                setBusy(false);
              }
            }}
          />
        ) : null}
        {writer.readOnly ? (
          <div className="unsupported">
            <p>{t("readOnly")}</p>
            <button
              onClick={() =>
                download(
                  new Blob([JSON.stringify(draft.document)], {
                    type: "application/json",
                  }),
                  "wonboard-original.json",
                )
              }
            >
              {t("exportOriginal")}
            </button>
            <button onClick={() => void recoveryBackup()}>{t("backup")}</button>
          </div>
        ) : (
          <WonboardEditor
            key={`${draft.document.documentId}:${writer.selectionVersion}`}
            content={draft.document.content}
            defaultFont={draft.document.defaultFont}
            title={content}
            locale={locale}
            documentLocale={draft.document.locale}
            mediaUrls={urls}
            media={draft.document.media}
            files={draft.document.files}
            readOnly={busy || writer.recovery.length > 0}
            inspectorOpen={inspector}
            insertOpen={insert}
            overviewOpen={overview}
            onTitleChange={(title) => writer.update({ title })}
            onChange={writer.content}
            onImages={images}
            onReady={setEditor}
            onCloseInspector={() => setInspector(false)}
            onCloseInsert={() => setInsert(false)}
            onComposition={writer.composition}
            attachmentCount={attachmentCount}
            attachments={
              <AttachmentsPanel
                onFiles={fileLibrary ? () => openFiles(true) : undefined}
                document={draft.document}
                locale={locale}
                urls={urls}
                editor={editor}
                busy={busy}
                onImages={images}
                onRename={(autoRenameAttachments) =>
                  writer.update({ autoRenameAttachments })
                }
                onStorage={() => {
                  setOptions(true);
                  void storageInfo();
                }}
                storageMode={storageMode}
              />
            }
          />
        )}
      </div>
      <footer className="statusbar">
        <span>
          <b>{t("post")}</b>
          <span className="breadcrumb">›</span>
          {t(
            editor?.isActive("media")
              ? "image"
              : editor?.isActive("heading")
                ? "heading"
                : "paragraph",
          )}
        </span>
        <span className="save-state" role="status">
          {t(
            writer.status === "saved" && storageMode === "desktop" ? "savedToDevice" : writer.status === "saved" && storageMode === "sites" ? "savedToSites" : writer.status === "error"
              ? "unsaved"
              : writer.status === "loading"
                ? "loading"
                : writer.status,
          )}
        </span>
      </footer>
      {options ? (
        <div className="options-menu" role="dialog" aria-label={t("options")}>
          <button disabled={busy || !canTrash} onClick={() => void requestTrash("move", draft)}>{t("moveToTrash")}</button>
          <button disabled={busy} onClick={() => void backup()}>
            {t("backup")}
          </button>
          <button disabled={busy} onClick={() => restoreInput.current?.click()}>
            {t("restore")}
          </button>
          <p>{t("restoreHint")}</p>
          <label>
            {t("documentLanguage")}
            <select
              value={draft.document.locale}
              disabled={busy || writer.recovery.length > 0}
              onChange={(e) =>
                writer.update({ locale: e.target.value as Locale })
              }
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </label>
          <hr />
          <h2>{t("storage")}</h2>
          <p>{t(storageMode === "desktop" ? "deviceStorageHint" : storageMode === "sites" ? "sitesStorageHint" : "localOnly")}</p>
          {storageMode === "local" && <>
          <p>{usage}</p>
          {persistent !== null ? (
            <p>{t(persistent ? "persistent" : "notPersistent")}</p>
          ) : null}
          <button
            onClick={async () => {
              try {
                setPersistent(await navigator.storage.persist());
              } catch {
                setPersistent(false);
              }
            }}
          >
            {t("requestPersistence")}
          </button>
          </>}
          <button onClick={() => setOptions(false)}>{t("close")}</button>
        </div>
      ) : null}
      {trashDialog && <TrashDialog locale={locale} action={trashDialog.action} count={trashDialog.count} working={busy}
        message={writer.error ? t(Object.hasOwn(en, writer.error) ? writer.error as MessageKey : "storageFailed") : ""}
        onConfirm={withdraw => executeTrash(trashDialog.action, trashDialog.value, withdraw)} onClose={() => setTrashDialog(null)} />}
      {filePanel && fileLibrary ? <FileLibraryPanel library={fileLibrary} locale={locale} picking={filePanel === "pick"} onInsert={insertLibraryFiles} onClose={closeFiles} /> : null}
      {publication && <PublicationPanel locale={locale} documentId={draft.document.documentId}
        save={writer.save} snapshot={writer.snapshot} onBusy={setBusy} onClose={() => setPublication(false)} />}
      {preview ? (
        <div
          className="preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t("preview")}
        >
          <header>
            <button onClick={() => setPreview(false)}>{t("back")}</button>
            <span>
              {t("characters", {
                count: characterCount(
                  plainText(draft.document.content),
                  draft.document.locale,
                ),
              })}
            </span>
          </header>
          <DocumentPreview document={draft.document} mediaUrls={urls} />
        </div>
      ) : null}
      <input
        ref={restoreInput}
        className="visually-hidden"
        type="file"
        accept=".zip,application/zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void restore(file);
        }}
      />
    </div>
  );
}
