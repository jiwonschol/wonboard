import { useEffect, useRef, useState, type ReactNode } from "react";
import { Extension, type Editor as EditorType } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  blockStyle,
  isComposingKey,
  safeLink,
  limits,
  fontFamily,
  type FontId,
  type ContentNode,
  type Locale,
} from "@wonboard/document";
import { translator, type MessageKey } from "@wonboard/locales";
import { MediaContext, MediaNode } from "./MediaNode";
import { Inspector } from "./Inspector";
import { Icon } from "./icons";
import { VideoNode } from "./VideoNode";
import { TextStyle } from "./TextStyle";
import { WritingToolbar } from "./WritingToolbar";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@fontsource-variable/noto-serif-kr";
import "@fontsource/gowun-dodum";
import "@fontsource/nanum-gothic-coding/400.css";
import "@fontsource/nanum-gothic-coding/700.css";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource/nanum-myeongjo/400.css";
import "@fontsource/nanum-myeongjo/700.css";
import "@fontsource/gowun-batang/400.css";
import "@fontsource/gowun-batang/700.css";
import "@fontsource-variable/manrope";
import "@fontsource/nanum-gothic/400.css";
import "@fontsource/nanum-gothic/700.css";

export type EditorHandle = EditorType;
export { Icon };
export interface WonboardEditorProps {
  content: ContentNode;
  defaultFont?: FontId;
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
const Formatting = Extension.create({
  name: "wonboardFormatting",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: Object.fromEntries(
          [
            "textAlign",
            "variant",
            "fontSize",
            "textColor",
            "backgroundColor",
            "gradient",
            "padding",
            "borderWidth",
          ].map((key) => [
            key,
            {
              default: null,
              renderHTML: (attrs: Record<string, unknown>) =>
                key === "textAlign"
                  ? {
                      style: Object.entries(blockStyle(attrs))
                        .filter(([, v]) => v !== undefined)
                        .map(
                          ([k, v]) =>
                            `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`,
                        )
                        .join(";"),
                    }
                  : {},
            },
          ]),
        ),
      },
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
  const [composing, setComposing] = useState(false);
  const [toolPanel, setToolPanel] = useState<"block" | "attachments" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!toolPanel) return;
    const panel = panelRef.current;
    const toolbar = panel?.closest(".wb-editing-area")?.querySelector<HTMLElement>(".wb-canvas > .writing-toolbar");
    panel?.focus();
    const resize = new ResizeObserver(() => {
      if (panel && toolbar) {
        panel.style.top = `${toolbar.offsetHeight + 8}px`;
        panel.style.maxHeight = `calc(100% - ${toolbar.offsetHeight + 20}px)`;
      }
    });
    if (toolbar) resize.observe(toolbar);
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel?.contains(event.target) && !toolbar?.contains(event.target)) setToolPanel(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => { resize.disconnect(); document.removeEventListener("pointerdown", dismiss); };
  }, [toolPanel]);
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
      MediaNode,
      VideoNode,
      Formatting,
      TextStyle,
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
          setComposing(true);
          latest.current.onComposition?.(true);
          return false;
        },
        compositionend: () => {
          setTimeout(() => { setComposing(false); latest.current.onComposition?.(false); }, 0);
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
  function openLink() {
    setToolPanel(null);
    setLink(String(editor!.getAttributes("link").href ?? ""));
    setLinkError(false);
    setLinkOpen(true);
  }
  return (
    <MediaContext.Provider
      value={{ urls: props.mediaUrls, locale: props.locale }}
    >
      <div className="wb-editing-area" data-tick={tick} onKeyDown={e => {
        if (e.altKey && e.key === "F10") {
          e.preventDefault();
          e.currentTarget.querySelector<HTMLElement>(".wb-canvas > .writing-toolbar select")?.focus();
        }
        if (e.key === "Escape" && toolPanel) { setToolPanel(null); editor.commands.focus(); }
      }}>
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
          <WritingToolbar editor={editor} defaultFont={props.defaultFont} locale={props.locale} composing={composing} onLink={openLink} actions={
            <div className="writing-actions">
              <button type="button" disabled={!editor.isEditable || composing} aria-label={t("image")} title={t("image")}
                onMouseDown={e => e.preventDefault()} onClick={() => fileInput.current?.click()}><Icon name="image" /></button>
              {props.attachments ? <button type="button" aria-label={t("attachments")} title={t("attachments")}
                aria-expanded={toolPanel === "attachments"} onMouseDown={e => e.preventDefault()}
                onClick={() => setToolPanel(toolPanel === "attachments" ? null : "attachments")}><Icon name="attachments" /><span>{props.attachmentCount ?? 0}</span></button> : null}
              <button type="button" aria-label={t("selectionSettings")} title={t("selectionSettings")}
                aria-expanded={toolPanel === "block"} onMouseDown={e => e.preventDefault()}
                onClick={() => setToolPanel(toolPanel === "block" ? null : "block")}><Icon name="sliders" /></button>
            </div>
          } />
          <div className="document-page" style={{ fontFamily: fontFamily(props.defaultFont) }}>
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
            defaultFont={props.defaultFont}
            locale={props.locale}
            attachments={props.attachments}
            attachmentCount={props.attachmentCount}
            composing={composing}
            onLink={openLink}
            onClose={() => props.onCloseInspector?.()}
          />
        ) : null}
        {toolPanel ? (
          <div ref={panelRef} tabIndex={-1} className="writing-panel" role="dialog" aria-label={t(toolPanel === "attachments" ? "attachments" : "selectionSettings")}
            onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setToolPanel(null); editor.commands.focus(); } }}>
            <Inspector key={toolPanel} editor={editor} defaultFont={props.defaultFont} locale={props.locale} initialTab={toolPanel}
              composing={composing} attachments={props.attachments} attachmentCount={props.attachmentCount}
              onLink={openLink}
              onClose={() => { setToolPanel(null); editor.commands.focus(); }} />
          </div>
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
