import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Icon } from "@wonboard/editor";
import {
  matchesQuery,
  plainText,
  type Draft,
  type Locale,
} from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { trashDaysRemaining, trashExpired } from "./trash";
import { newestDraftFirst } from "./storage";

function excerpt(draft: Draft): string {
  try {
    return plainText(draft.document.content).slice(0, 160);
  } catch {
    // Future-format documents stay selectable so their raw bytes can be
    // recovered. Their unknown content shape must not take down the library.
    return "";
  }
}

export function WritingLibrary({
  draft,
  list,
  locale,
  busy,
  onSelect,
  onCreate,
  onClose,
  onRestore,
  onFiles, trashFilter, onTrashFilter, fileTrash,
  onTrash, onUntrash, onRemove, onEmptyTrash, canTrash,
  storageMode = "local",
  clockNow = Date.now,
}: {
  draft: Draft;
  list: Draft[];
  locale: Locale;
  busy: boolean;
  storageMode?: "local" | "sites" | "desktop";
  clockNow?(): number;
  onSelect(draft: Draft): Promise<void>;
  onCreate(): void;
  onClose(): void;
  onRestore(): void;
  onFiles?(): void;
  trashFilter: "documents" | "files" | null;
  onTrashFilter(value: "documents" | "files" | null): void;
  fileTrash?: ReactNode;
  onTrash(draft: Draft): void;
  onUntrash(draft: Draft): void;
  onRemove(draft: Draft): void;
  onEmptyTrash(): void;
  canTrash: boolean;
}) {
  const t = translator(locale);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState(false);
  const showTrash = trashFilter !== null;
  const setShowTrash = (value: boolean) => onTrashFilter(value ? "documents" : null);
  const [now, setNow] = useState(clockNow);
  useEffect(() => {
    setNow(clockNow());
    const timer = setInterval(() => setNow(clockNow()), 1000);
    return () => clearInterval(timer);
  }, [clockNow]);
  const trashed = list.filter(d => d.document.trashedAt !== undefined && !trashExpired(d.document, now));
  const documents = [
    draft,
    ...list.filter((d) => d.document.documentId !== draft.document.documentId),
  ]
    .sort(newestDraftFirst)
    .filter(
      (d) =>
        d.document.trashedAt === undefined && matchesQuery(d.document.title, query, locale) &&
        (!recent ||
          Date.now() - Date.parse(d.document.updatedAt) < 7 * 86400000),
    );
  return (
    <aside className="writing-library" aria-label={t("documents")}>
      {showTrash ? <>
        <header><button onClick={() => setShowTrash(false)}>{t("trashBack")}</button><h2>{t("trash")}</h2>
          <button className="icon-button" aria-label={t("closeLibrary")} onClick={onClose}><Icon name="close" /></button></header>
        <p className="trash-policy">{t("trashPolicy")}</p>
        <div className="file-library-tools" aria-label={t("trash")}>
          <button disabled={busy} aria-pressed={trashFilter === "documents"} onClick={() => onTrashFilter("documents")}>{t("myWriting")}</button>
          {fileTrash ? <button disabled={busy} aria-pressed={trashFilter === "files"} onClick={() => onTrashFilter("files")}>{t("filesActive")}</button> : null}
        </div>
        {trashFilter === "files" ? fileTrash : <><nav className="document-list" aria-label={t("trash")}>
          {trashed.map(d => <section className="trash-row" key={d.document.documentId}>
            <strong>{d.document.title || t("untitled")}</strong>
            <span className="document-excerpt">{excerpt(d)}</span>
            <span>{!Number.isFinite(now) ? t("loading") : trashDaysRemaining(d.document, now) <= 1 ? t("trashTomorrow") : t("trashDays", { count: trashDaysRemaining(d.document, now) })}</span>
            <div><button disabled={busy || !Number.isFinite(now)} onClick={() => onUntrash(d)}>{t("restoreFromTrash")}</button>
              <button disabled={busy} onClick={() => onRemove(d)}>{t("permanentlyDelete")}</button></div>
          </section>)}
          {!trashed.length && <p>{t("trashEmpty")}</p>}
        </nav>
        <footer><button disabled={busy || !trashed.length} onClick={onEmptyTrash}>{t("emptyTrash")}</button></footer></>}
      </> : <>
      <header>
        <h2>{t("myWriting")}</h2>
        <button
          className="icon-button"
          aria-label={t("newDocument")}
          disabled={busy}
          onClick={onCreate}
        >
          <Icon name="plus" />
        </button>
        <button
          className="icon-button"
          aria-label={t("closeLibrary")}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="writing-filters">
        <button aria-pressed={!recent} onClick={() => setRecent(false)}>
          {t("allDocuments")}
        </button>
        <button aria-pressed={recent} onClick={() => setRecent(true)}>
          {t("recentDocuments")}
        </button>
      </div>
      <input
        className="writing-search"
        type="search"
        aria-label={t("search")}
        placeholder={t("search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <nav className="document-list" aria-label={t("myWriting")}>
        {documents.map((d) => (
          <Fragment key={d.document.documentId}><button
            aria-current={
              draft.document.documentId === d.document.documentId
                ? "page"
                : undefined
            }
            disabled={busy}
            onClick={() => void onSelect(d)}
          >
            <time dateTime={d.document.updatedAt}>
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(d.document.updatedAt))}
            </time>
            <strong>{d.document.title || t("untitled")}</strong>
            <span className="document-excerpt">
              {excerpt(d) || t("emptyExcerpt")}
            </span>
          </button>
          {d.document.documentId === draft.document.documentId && <div className="document-row-actions">
            <button className="icon-button" aria-label={t("moveToTrash")} disabled={busy || !canTrash} onClick={() => onTrash(d)}><Icon name="trash" /></button>
          </div>}
          </Fragment>
        ))}
        {!documents.length ? <p>{t("noDocuments")}</p> : null}
      </nav>
      <footer>
        {onFiles ? <button disabled={busy} onClick={onFiles}>{t("fileLibrary")}</button> : null}
        <p>{t(storageMode === "desktop" ? "deviceStorage" : storageMode === "sites" ? "sitesStorage" : "thisBrowser")}</p>
        <button onClick={() => setShowTrash(true)}>{t("trash")} {trashed.length}</button>
        <button disabled={busy} onClick={onRestore}>
          {t("restore")}
        </button>
      </footer>
      </>}
    </aside>
  );
}
