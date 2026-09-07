import { useEffect, useRef, useState } from "react";
import { WonboardEditor, Icon, type EditorHandle } from "@wonboard/editor";
import { DocumentPreview } from "@wonboard/renderer";
import {
  exportBackup,
  exportRawBackup,
  importBackup,
  characterCount,
  attachmentNodes,
  plainText,
  limits,
  type Locale,
} from "@wonboard/document";
import { translator, en, type MessageKey } from "@wonboard/locales";
import { useDrafts } from "./useDrafts";
import { importImages } from "./media";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { WritingLibrary } from "./WritingLibrary";
import { initialLocale } from "./locale";

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
}: {
  onLogout: () => Promise<boolean>;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = translator(locale);
  const writer = useDrafts(locale);
  const [editor, setEditor] = useState<EditorHandle | null>(null);
  const [inspector, setInspector] = useState(true);
  const [insert, setInsert] = useState(false);
  const [overview, setOverview] = useState(false);
  const [options, setOptions] = useState(false);
  const [library, setLibrary] = useState(
    () => window.matchMedia("(min-width: 900px)").matches,
  );
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const importing = useRef(false);
  const [notice, setNotice] = useState("");
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [usage, setUsage] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlCache = useRef(new Map<string, { blob: Blob; url: string }>());
  const restoreInput = useRef<HTMLInputElement>(null);
  const draft = writer.draft;
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
        const bitmap = await createImageBitmap(restored.blobs[media.id]);
        const valid =
          bitmap.width === media.width && bitmap.height === media.height;
        bitmap.close();
        if (!valid) throw new Error("corruptBackup");
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
        retained,
      );
      const media = { ...snapshot.document.media };
      const blobs = { ...snapshot.blobs };
      for (const item of imported) {
        media[item.media.id] = item.media;
        blobs[item.media.id] = item.blob;
      }
      writer.update({ media }, blobs);
      instance
        .chain()
        .insertContentAt(
          position,
          imported.flatMap((item) => [
            {
              type: "media",
              attrs: {
                mediaId: item.media.id,
                width: Math.max(40, Math.min(600, item.media.width)),
                align: "left",
                alt: "",
                caption: "",
              },
            },
            { type: "paragraph" },
          ]),
        )
        .run();
      setNotice("");
    } catch (e) {
      report(e);
    } finally {
      importing.current = false;
      setBusy(false);
    }
  }
  async function storageInfo() {
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
      } else setNotice("logoutSaveFailed");
    } finally {
      setBusy(false);
    }
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
    ).size + attached.filter((n) => n.type === "video").length;
  return (
    <div className="app-shell">
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
        <span className="local-mode">{t("noCloud")}</span>
        <select
          aria-label={t("language")}
          value={locale}
          onChange={(e) => switchLocale(e.target.value as Locale)}
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
        <button disabled={busy} onClick={() => void logout()}>
          {t("logout")}
        </button>
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
          <span title={t("publishLater")}>
            <button className="publish-button" disabled>
              {t("publish")}
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
      <div className="writing-workspace">
        {library ? (
          <WritingLibrary
            draft={draft}
            list={writer.list}
            locale={locale}
            busy={busy}
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
            key={draft.document.documentId}
            content={draft.document.content}
            title={content}
            locale={locale}
            documentLocale={draft.document.locale}
            mediaUrls={urls}
            media={draft.document.media}
            readOnly={busy}
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
            writer.status === "error"
              ? "unsaved"
              : writer.status === "loading"
                ? "loading"
                : writer.status,
          )}
        </span>
      </footer>
      {options ? (
        <div className="options-menu" role="dialog" aria-label={t("options")}>
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
          <p>{t("localOnly")}</p>
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
          <button onClick={() => setOptions(false)}>{t("close")}</button>
        </div>
      ) : null}
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
