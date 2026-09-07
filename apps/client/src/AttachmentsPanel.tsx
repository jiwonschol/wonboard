import { useRef, useState } from "react";
import type { EditorHandle } from "@wonboard/editor";
import {
  attachmentFilename,
  attachmentNodes,
  isVideo,
  parseVideoUrl,
  type Video,
  type WriterDocument,
} from "@wonboard/document";
import { translator } from "@wonboard/locales";
import type { Locale } from "@wonboard/document";

function VideoOptions({
  video,
  locale,
  change,
}: {
  video: Video;
  locale: Locale;
  change(patch: Partial<Video>): void;
}) {
  const t = translator(locale);
  return (
    <div className="video-options">
      <span>{t("startAt")}</span>
      <div className="video-time">
        <label>
          {t("minutes")}
          <input
            type="number"
            min="0"
            max="10080"
            value={Math.floor(video.startSeconds / 60)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (
                Number.isSafeInteger(n) &&
                n >= 0 &&
                n * 60 + (video.startSeconds % 60) <= 604800
              )
                change({ startSeconds: n * 60 + (video.startSeconds % 60) });
            }}
          />
        </label>
        <label>
          {t("seconds")}
          <input
            type="number"
            min="0"
            max="59"
            value={video.startSeconds % 60}
            onChange={(e) => {
              const n = Number(e.target.value);
              const total = Math.floor(video.startSeconds / 60) * 60 + n;
              if (
                Number.isSafeInteger(n) &&
                n >= 0 &&
                n < 60 &&
                total <= 604800
              )
                change({ startSeconds: total });
            }}
          />
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={video.autoplay}
          onChange={(e) => change({ autoplay: e.target.checked })}
        />
        {t("autoplay")}
      </label>
    </div>
  );
}
export function AttachmentsPanel({
  document,
  locale,
  urls,
  editor,
  busy,
  onImages,
  onRename,
  onStorage,
}: {
  document: WriterDocument;
  locale: Locale;
  urls: Record<string, string>;
  editor: EditorHandle | null;
  busy: boolean;
  onImages(
    files: File[],
    position: number,
    editor: EditorHandle,
  ): Promise<void>;
  onRename(value: boolean): void;
  onStorage(): void;
}) {
  const t = translator(locale),
    input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState<Video | null>(null);
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const used = new Set(
    attachmentNodes(document.content)
      .filter((n) => n.type === "media")
      .map((n) => String(n.attrs?.mediaId)),
  );
  const videos: { video: Video; pos: number }[] = [];
  editor?.state.doc.descendants((node, pos) => {
    if (node.type.name === "video" && isVideo(node.attrs))
      videos.push({ video: node.attrs, pos });
  });
  const media = Object.values(document.media);
  function files(files: File[]) {
    if (editor && files.length && !busy)
      void onImages(files, editor.state.selection.from, editor);
  }
  return (
    <div className="attachments-panel">
      <fieldset disabled={busy || !editor}>
        <section>
          <h2>
            {t("imageCount", { count: used.size })}{" "}
            <span className="muted">
              · {t("videoCount", { count: videos.length })}
            </span>
          </h2>
          <div
            className={`attachment-drop ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              files(Array.from(e.dataTransfer.files));
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8" cy="9" r="1.5" />
              <path d="m3 17 5-5 4 4 4-6 5 7" />
            </svg>
            <strong>{t("dropImages")}</strong>
            <button type="button" onClick={() => input.current?.click()}>
              {t("chooseImages")}
            </button>
            <small>{t("imageFormats")}</small>
          </div>
          <input
            hidden
            ref={input}
            type="file"
            multiple
            accept="image/png,image/jpeg"
            aria-label={t("chooseImages")}
            onChange={(e) => {
              files(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <label className="check-row rename-choice">
            <input
              type="checkbox"
              checked={document.autoRenameAttachments !== false}
              onChange={(e) => onRename(e.target.checked)}
            />
            {t("autoRename")}
          </label>
          <p className="help">{t("renameHint")}</p>
        </section>
        <section>
          <label>
            {t("videoUrl")}
            <input
              type="url"
              placeholder="https://youtu.be/…"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setPending(parseVideoUrl(e.target.value));
                setError(false);
              }}
            />
          </label>
          {pending ? (
            <>
              <p className="detected-provider">
                {pending.provider === "youtube" ? "YouTube" : "Vimeo"} ·{" "}
                {pending.videoId}
              </p>
              <VideoOptions
                video={pending}
                locale={locale}
                change={(patch) => setPending({ ...pending, ...patch })}
              />
            </>
          ) : null}
          {error ? <p role="alert">{t("invalidVideo")}</p> : null}
          <button
            className="insert-video"
            type="button"
            onClick={() => {
              if (!pending || !editor) {
                setError(true);
                return;
              }
              editor
                .chain()
                .insertContentAt(editor.state.selection.from, [
                  { type: "video", attrs: pending },
                  { type: "paragraph" },
                ])
                .run();
              setUrl("");
              setPending(null);
              setError(false);
            }}
          >
            {t("addVideo")}
          </button>
          <p className="help">{t("autoplayHint")}</p>
          <p className="help">{t("videoPreviewHint")}</p>
        </section>
        {media.length || videos.length ? (
          <section className="attachment-list">
            <h2>{t("attachments")}</h2>
            {media.map((m) => (
              <div className="attachment-row" key={m.id}>
                <button
                  className="attachment-thumbnail"
                  disabled={!used.has(m.id)}
                  aria-label={`${t("image")} · ${attachmentFilename(document, m.id)}`}
                  onClick={() => {
                    editor?.state.doc.descendants((node, pos) => {
                      if (
                        node.type.name === "media" &&
                        node.attrs.mediaId === m.id
                      ) {
                        editor
                          .chain()
                          .focus()
                          .setNodeSelection(pos)
                          .scrollIntoView()
                          .run();
                        return false;
                      }
                    });
                  }}
                >
                  <img src={urls[m.id]} alt="" />
                </button>
                <div>
                  <strong
                    className="attachment-filename"
                    title={t("uploadName")}
                  >
                    {attachmentFilename(document, m.id)}
                  </strong>
                  <span title={t("originalName")}>{m.originalName}</span>
                  <small>
                    {(m.size / 1024).toFixed(0)} KB · {m.width} × {m.height}
                  </small>
                  {!used.has(m.id) ? <small>{t("retainedImage")}</small> : null}
                </div>
              </div>
            ))}
            {videos.map(({ video, pos }, i) => (
              <details
                className="video-attachment"
                key={`${pos}-${video.videoId}`}
              >
                <summary>
                  {video.provider === "youtube" ? "YouTube" : "Vimeo"} ·{" "}
                  {video.videoId}
                </summary>
                <VideoOptions
                  video={video}
                  locale={locale}
                  change={(patch) => {
                    if (!editor) return;
                    const node = editor.state.doc.nodeAt(pos);
                    if (node?.type.name === "video")
                      editor.view.dispatch(
                        editor.state.tr.setNodeMarkup(pos, undefined, {
                          ...node.attrs,
                          ...patch,
                        }),
                      );
                  }}
                />
              </details>
            ))}
          </section>
        ) : null}
      </fieldset>
      <section className="storage-connection">
        <h2>{t("storageConnection")}</h2>
        <strong>{t("thisBrowser")}</strong>
        <p className="help">{t("storageConnectionHint")}</p>
        <button onClick={onStorage}>{t("storageDetails")}</button>
      </section>
    </div>
  );
}
