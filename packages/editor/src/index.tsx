import { useEffect, useRef, useState, type ReactNode } from "react";
import { Extension, type Editor as EditorType } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  blockStyle,
  isComposingKey,
  safeLink,
  limits,
  type ContentNode,
  type Locale,
} from "@wonboard/document";
import { translator, type MessageKey } from "@wonboard/locales";
import { MediaContext, MediaNode } from "./MediaNode";
import { Inspector } from "./Inspector";
import { Icon } from "./icons";
import { VideoNode } from "./VideoNode";
import "@fontsource-variable/manrope";

export type EditorHandle = EditorType;
export { Icon };
export interface WonboardEditorProps {
  content: ContentNode;
  title: string;
  locale: Locale;
  documentLocale: Locale;
  mediaUrls: Record<string, string>;
  readOnly?: boolean;
  inspectorOpen?: boolean;
  insertOpen?: boolean;
  overviewOpen?: boolean;
  attachments?: ReactNode;
  attachmentCount?: number;
  onTitleChange(title: string): void;
  onChange(content: ContentNode): void;
  onImages(files: File[], position: number, editor: EditorType): Promise<void>;
  onReady?(editor: EditorType): void;
  onCloseInspector?(): void;
  onCloseInsert?(): void;
  onComposition?(active: boolean): void;
}
const dashed = (key: string) =>
  key.replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`);
const hexColor = /^#[\da-f]{6}$/iu;
const oneOf = (values: readonly string[]) => (raw: string) =>
  values.includes(raw) ? raw : null;
const inRange = (min: number, max: number) => (raw: string) => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
};
// 붙여넣기로 되살릴 때 통과시킬 값은 validateDocument 가 통과시키는 값과 같아야 한다.
// 넓으면 붙여넣은 순간 저장이 막히고, 좁으면 사용자가 방금 준 서식이 조용히 사라진다.
const blockAttributes: Record<string, (raw: string) => unknown> = {
  textAlign: oneOf(["left", "center", "right"]),
  variant: oneOf(["default", "display", "subtitle", "annotation"]),
  fontSize: inRange(12, 96),
  textColor: (raw) => (hexColor.test(raw) ? raw : null),
  backgroundColor: (raw) => (hexColor.test(raw) ? raw : null),
  gradient: oneOf(["none", "light", "blue"]),
  padding: inRange(0, 80),
  borderWidth: inRange(0, 8),
};
export const Formatting = Extension.create({
  name: "wonboardFormatting",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: Object.fromEntries(
          Object.entries(blockAttributes).map(([key, coerce]) => [
            key,
            {
              default: null,
              // 서식은 인라인 style 로만 직렬화돼서, 문단을 복사해 붙이면 클립보드
              // 파서가 되읽을 것이 없어 정렬·글자 크기·색·그러데이션·여백·테두리가
              // 조용히 기본값으로 돌아갔다. 값마다 되읽을 수 있는 표식을 함께 단다.
              parseHTML: (element: HTMLElement) => {
                const raw = element.getAttribute(`data-wb-${dashed(key)}`);
                return raw === null ? null : coerce(raw);
              },
              renderHTML: (attrs: Record<string, unknown>) => {
                const value = attrs[key];
                const marker =
                  value === null || value === undefined
                    ? {}
                    : { [`data-wb-${dashed(key)}`]: String(value) };
                if (key !== "textAlign") return marker;
                return {
                  ...marker,
                  style: Object.entries(blockStyle(attrs))
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => `${dashed(k)}:${v}`)
                    .join(";"),
                };
              },
            },
          ]),
        ),
      },
    ];
  },
});
// 본문이 `limits.text` 를 넘은 채로 편집기에 남으면 이후 자동 저장과 ZIP 백업이 모두
// validateDocument 에서 실패한다 — 사용자는 무엇을 지워야 하는지 모른 채 저장할 수 없는
// 초안을 안게 된다. 넘기는 변경 자체를 편집기에서 막아 문서와 초안이 갈리지 않게 한다.
// 이미 넘어선 문서(예: 백업 복원)에서도 줄이는 방향은 계속 허용한다.
type MeasurableDoc = { content: { size: number }; textContent: string };
// content.size 는 텍스트 길이의 상한이라, 상한이 한도 안이면 본문을 훑지 않는다.
// 2,000,000자 문서에서 타이핑마다 전체를 세지 않게 하는 값싼 관문이다.
const textOf = (doc: MeasurableDoc) =>
  doc.content.size <= limits.text ? 0 : doc.textContent.length;
export const allowsTextChange = (next: MeasurableDoc, previous: MeasurableDoc) =>
  textOf(next) <= limits.text || textOf(next) <= textOf(previous);
const TextLimit = Extension.create({
  name: "wonboardTextLimit",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (transaction, state) =>
          !transaction.docChanged ||
          allowsTextChange(transaction.doc, state.doc),
      }),
    ];
  },
});
const insertTypes = [
  "paragraph",
  "heading",
  "image",
  "bulletList",
  "orderedList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
] as const;

export function WonboardEditor(props: WonboardEditorProps) {
  const latest = useRef(props);
  latest.current = props;
  const t = translator(props.locale);
  const [tick, setTick] = useState(0);
  const [slash, setSlash] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const title = useRef<HTMLTextAreaElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          isAllowedUri: (url) => safeLink(url),
        },
      }),
      MediaNode.configure({
        // 붙여넣기가 되살릴 수 있는 사진은 이 초안이 원본을 들고 있는 것뿐이다.
        ownsMedia: (mediaId: string) =>
          Object.hasOwn(latest.current.mediaUrls ?? {}, mediaId),
      }),
      VideoNode,
      Formatting,
      TextLimit,
      Placeholder.configure({
        placeholder: () => translator(latest.current.locale)("placeholder"),
      }),
    ],
    content: props.content,
    editable: !props.readOnly,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onCreate: ({ editor }) => {
      latest.current.onReady?.(editor);
    },
    onUpdate: ({ editor }) => {
      latest.current.onChange(editor.getJSON() as ContentNode);
    },
    onTransaction: () => setTick((n) => n + 1),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": t("body"),
        "aria-multiline": "true",
        spellcheck: "true",
        lang: props.documentLocale,
      },
      handleKeyDown: (view, event) => {
        if (isComposingKey(event)) return false;
        if (
          event.key === "/" &&
          view.state.selection.$from.parent.textContent === ""
        ) {
          setSlash(true);
          return true;
        }
        if (event.key === "Escape") {
          setSlash(false);
          setLinkOpen(false);
        }
        return false;
      },
      handleDOMEvents: {
        compositionstart: () => {
          latest.current.onComposition?.(true);
          return false;
        },
        compositionend: () => {
          setTimeout(() => latest.current.onComposition?.(false), 0);
          return false;
        },
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        if (latest.current.readOnly) return true;
        void latest.current.onImages(files, view.state.selection.from, editor!);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        if (latest.current.readOnly) return true;
        const position =
          view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
          view.state.selection.from;
        void latest.current.onImages(files, position, editor!);
        return true;
      },
    },
  });
  useEffect(() => {
    if (editor && editor.isEditable === Boolean(props.readOnly))
      editor.setEditable(!props.readOnly, false);
  }, [editor, props.readOnly]);
  useEffect(() => {
    if (editor)
      editor.setOptions({
        editorProps: {
          attributes: {
            role: "textbox",
            "aria-label": t("body"),
            "aria-multiline": "true",
            spellcheck: "true",
            lang: props.documentLocale,
          },
        },
      });
  }, [editor, props.locale, props.documentLocale]);
  useEffect(() => {
    const el = title.current;
    if (el) {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [props.title]);
  if (!editor) return <div className="editor-loading">{t("loading")}</div>;
  const isInsert = props.insertOpen || slash;
  function insert(type: (typeof insertTypes)[number]) {
    if (!editor) return;
    setSlash(false);
    props.onCloseInsert?.();
    if (type === "image") {
      fileInput.current?.click();
      return;
    }
    const chain = editor.chain().focus();
    if (type === "paragraph") chain.setParagraph().run();
    if (type === "heading") chain.toggleHeading({ level: 2 }).run();
    if (type === "bulletList") chain.toggleBulletList().run();
    if (type === "orderedList") chain.toggleOrderedList().run();
    if (type === "blockquote") chain.toggleBlockquote().run();
    if (type === "codeBlock") chain.toggleCodeBlock().run();
    if (type === "horizontalRule") chain.setHorizontalRule().run();
  }
  const blocks: { pos: number; type: string; text: string; size: number }[] =
    [];
  editor.state.doc.forEach((node, offset) =>
    blocks.push({
      pos: offset,
      type: node.type.name,
      text: node.textContent,
      size: node.nodeSize,
    }),
  );
  function moveBlock(index: number, direction: number) {
    const target = blocks[index + direction];
    if (!target || !editor) return;
    const current = blocks[index];
    const json = editor.state.doc.child(index).toJSON();
    const transaction = editor.state.tr.delete(
      current.pos,
      current.pos + current.size,
    );
    const destination =
      direction < 0 ? target.pos : target.pos + target.size - current.size;
    transaction.insert(destination, editor.schema.nodeFromJSON(json));
    editor.view.dispatch(transaction);
  }
  return (
    <MediaContext.Provider
      value={{ urls: props.mediaUrls, locale: props.locale }}
    >
      <div className="wb-editing-area" data-tick={tick}>
        {props.overviewOpen ? (
          <nav className="outline" aria-label={t("overview")}>
            <h2>{t("overview")}</h2>
            {blocks.map((b, i) => (
              <div key={`${i}-${b.type}`}>
                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .setTextSelection(
                        Math.min(b.pos + 1, editor.state.doc.content.size),
                      )
                      .run()
                  }
                >
                  {b.text.slice(0, 40) ||
                    t(b.type === "media" ? "image" : (b.type as MessageKey))}
                </button>
                <button
                  disabled={!editor.isEditable || i === 0}
                  aria-label={t("moveUp")}
                  onClick={() => moveBlock(i, -1)}
                >
                  ↑
                </button>
                <button
                  disabled={!editor.isEditable || i === blocks.length - 1}
                  aria-label={t("moveDown")}
                  onClick={() => moveBlock(i, 1)}
                >
                  ↓
                </button>
              </div>
            ))}
          </nav>
        ) : null}
        <main className="wb-canvas" id="document-canvas">
          <div className="document-page">
            <textarea
              ref={title}
              className="document-title"
              rows={1}
              maxLength={limits.title}
              aria-label={t("addTitle")}
              placeholder={t("addTitle")}
              defaultValue={props.title}
              readOnly={props.readOnly}
              lang={props.documentLocale}
              spellCheck
              onChange={(e) => props.onTitleChange(e.target.value)}
              onCompositionStart={() => props.onComposition?.(true)}
              onCompositionEnd={() => props.onComposition?.(false)}
            />
            {!editor.state.selection.empty &&
            !editor.isActive("media") &&
            !editor.isActive("video") &&
            editor.isEditable ? (
              <div
                className="text-toolbar"
                role="toolbar"
                aria-label={t("typography")}
              >
                {(["bold", "italic", "underline", "strike"] as const).map(
                  (mark, i) => (
                    <button
                      key={mark}
                      aria-label={t(mark)}
                      aria-pressed={editor.isActive(mark)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        editor.chain().focus().toggleMark(mark).run()
                      }
                    >
                      <span className={`mark-${mark}`}>
                        {["B", "I", "U", "S"][i]}
                      </span>
                    </button>
                  ),
                )}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setLink(String(editor.getAttributes("link").href ?? ""));
                    setLinkOpen(true);
                  }}
                >
                  {t("link")}
                </button>
              </div>
            ) : null}
            <EditorContent editor={editor} />
            {editor.isEmpty && editor.isEditable ? (
              <button
                className="inline-insert"
                aria-label={t("insert")}
                onClick={() => setSlash(!slash)}
              >
                <Icon name="plus" />
              </button>
            ) : null}
          </div>
        </main>
        {props.inspectorOpen ? (
          <Inspector
            editor={editor}
            locale={props.locale}
            attachments={props.attachments}
            attachmentCount={props.attachmentCount}
            onClose={() => props.onCloseInspector?.()}
          />
        ) : null}
        {isInsert && editor.isEditable ? (
          <div className="inserter" role="dialog" aria-label={t("insert")}>
            <div className="popover-title">
              {t("insert")}
              <button
                className="icon-button"
                aria-label={t("close")}
                onClick={() => {
                  setSlash(false);
                  props.onCloseInsert?.();
                }}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="insert-grid">
              {insertTypes.map((type) => (
                <button key={type} onClick={() => insert(type)}>
                  <Icon name={type} />
                  {t(type)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {linkOpen ? (
          <div className="link-popover" role="dialog" aria-label={t("link")}>
            <label>
              {t("linkUrl")}
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                type="url"
                autoFocus
              />
            </label>
            {linkError ? <p role="alert">{t("invalidLink")}</p> : null}
            <button
              onClick={() => {
                if (!safeLink(link)) {
                  setLinkError(true);
                  return;
                }
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: link })
                  .run();
                setLinkOpen(false);
                setLinkError(false);
              }}
            >
              {t("apply")}
            </button>
            <button
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              {t("removeLink")}
            </button>
            <button onClick={() => setLinkOpen(false)}>{t("close")}</button>
          </div>
        ) : null}
        <input
          className="visually-hidden"
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg"
          multiple
          aria-label={t("insertImage")}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length)
              void props.onImages(files, editor.state.selection.from, editor);
          }}
        />
      </div>
    </MediaContext.Provider>
  );
}
