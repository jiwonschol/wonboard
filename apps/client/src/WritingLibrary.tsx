import { useState } from "react";
import { Icon } from "@wonboard/editor";
import {
  matchesQuery,
  plainText,
  type Draft,
  type Locale,
} from "@wonboard/document";
import { translator } from "@wonboard/locales";
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
  storageMode = "local",
}: {
  draft: Draft;
  list: Draft[];
  locale: Locale;
  busy: boolean;
  storageMode?: "local" | "sites" | "desktop";
  onSelect(draft: Draft): Promise<void>;
  onCreate(): void;
  onClose(): void;
  onRestore(): void;
}) {
  const t = translator(locale);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState(false);
  const documents = [
    draft,
    ...list.filter((d) => d.document.documentId !== draft.document.documentId),
  ]
    .sort(newestDraftFirst)
    .filter(
      (d) =>
        matchesQuery(d.document.title, query, locale) &&
        (!recent ||
          Date.now() - Date.parse(d.document.updatedAt) < 7 * 86400000),
    );
  return (
    <aside className="writing-library" aria-label={t("documents")}>
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
          <button
            key={d.document.documentId}
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
        ))}
        {!documents.length ? <p>{t("noDocuments")}</p> : null}
      </nav>
      <footer>
        <p>{t(storageMode === "desktop" ? "deviceStorage" : storageMode === "sites" ? "sitesStorage" : "thisBrowser")}</p>
        <button disabled={busy} onClick={onRestore}>
          {t("restore")}
        </button>
      </footer>
    </aside>
  );
}
