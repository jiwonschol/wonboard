import { useEffect, useRef, useState, type ReactNode } from "react";
import { Extension, type Editor as EditorType } from "@tiptap/core";
import { AllSelection, Plugin } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  blockStyle,
  isComposingKey,
  safeLink,
  limits,
  documentStyleVariables,
  type DocumentStyles,
  type FontId,
  markAttrsFitDocument,
  nodeAttrsFitDocument,
  type ContentNode,
  type Locale,
  type Media,
} from "@wonboard/document";
import { translator, type MessageKey } from "@wonboard/locales";
import { MediaContext, MediaNode } from "./MediaNode";
import { FileNode } from "./FileNode";
export { captureAttachmentSelection, insertAttachmentContent } from "./attachmentSelection";
import { Inspector } from "./Inspector";
import { Icon } from "./icons";
import { VideoNode } from "./VideoNode";
import { TextStyle } from "./TextStyle";
import { WritingToolbar } from "./WritingToolbar";
import { WritingHistory } from "./history";
import { bodyStyleAttributes, setBodyStyle } from "./bodyStyle";
import { WritingDocument, DocumentTitle, DocumentBody, editingDocument, documentBodyContent, editingTitle, bodyStart } from "./editorDocument";
export { documentBodyContent, bodyStart } from "./editorDocument";
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
  styles?: DocumentStyles;
  onStylesChange?(styles: DocumentStyles): void;
  title: string;
  locale: Locale;
  documentLocale: Locale;
  mediaUrls: Record<string, string>;
  media: Readonly<Record<string, Media>>;
  files?: Readonly<Record<string, unknown>>;
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
type TraversableDoc = MeasurableDoc & {
  descendants(
    visit: (node: {
      type: { name: string };
      attrs: Record<string, unknown>;
      marks?: readonly {
        type: { name: string };
        attrs: Record<string, unknown>;
      }[];
    }) => boolean | void,
  ): void;
};
type StructuralNode = {
  childCount: number;
  child(index: number): StructuralNode;
};
export const hasValidDocumentStructure = (root: StructuralNode) => {
  let count = 0;
  const visit = (node: StructuralNode, depth: number): boolean => {
    count++;
    if (depth >= 40 || count >= 100_000) return false;
    for (let index = 0; index < node.childCount; index++)
      if (!visit(node.child(index), depth + 1)) return false;
    return true;
  };
  return visit(root, 0);
};
export const hasValidOrderedListStarts = (doc: TraversableDoc) => {
  let valid = true;
  doc.descendants((node) => {
    if (
      node.type.name === "orderedList" &&
      (!Number.isSafeInteger(node.attrs.start) ||
        Number(node.attrs.start) < 1 ||
        Number(node.attrs.start) > 100000)
    ) {
      valid = false;
      return false;
    }
  });
  return valid;
};
export const hasValidMarkAttributes = (doc: TraversableDoc) => {
  let valid = true;
  doc.descendants((node) => {
    if (
      node.marks?.some(
        (mark) => !markAttrsFitDocument(mark.type.name, mark.attrs),
      )
    ) {
      valid = false;
      return false;
    }
  });
  return valid;
};
export const hasValidNodeAttributes = (doc: TraversableDoc) => {
  let valid = true;
  doc.descendants((node) => {
    if (!["documentTitle", "documentBody"].includes(node.type.name) && !nodeAttrsFitDocument(node.type.name, node.attrs)) {
      valid = false;
      return false;
    }
  });
  return valid;
};
export const DocumentLimits = Extension.create({
  name: "wonboardTextLimit",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (transaction, state) =>
          !transaction.docChanged ||
          ((transaction.doc.firstChild?.type.name !== "documentTitle" ||
            transaction.doc.firstChild.textBetween(0, transaction.doc.firstChild.content.size, "", "\n").length <= limits.title) &&
            allowsTextChange(transaction.doc.firstChild?.type.name === "documentTitle" ? transaction.doc.lastChild! : transaction.doc, state.doc.firstChild?.type.name === "documentTitle" ? state.doc.lastChild! : state.doc) &&
            hasValidOrderedListStarts(transaction.doc) &&
            hasValidNodeAttributes(transaction.doc) &&
            hasValidMarkAttributes(transaction.doc) &&
            hasValidDocumentStructure(transaction.doc.firstChild?.type.name === "documentTitle" ? transaction.doc.lastChild! : transaction.doc)),
      }),
    ];
  },
});
const SelectionHistory = Extension.create({
  name: "wonboardSelectionHistory",
  addProseMirrorPlugins() {
    return [new Plugin({ filterTransaction(transaction, state) {
      if (transaction.docChanged && state.selection instanceof AllSelection) closeHistory(transaction);
      return true;
    } })];
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
  const isInsert = props.insertOpen || slash;
  const insertGrid = useRef<HTMLDivElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(false);
  const [composing, setComposing] = useState(false);
  const [toolPanel, setToolPanel] = useState<"post" | "block" | "attachments" | null>(null);
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

  const editor: EditorType | null = useEditor({
    extensions: [
      WritingDocument,
      DocumentTitle.configure({ locale: () => latest.current.locale }),
      DocumentBody.configure({ locale: () => latest.current.locale }),
      StarterKit.configure({
        document: false,
        undoRedo: false,
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
          Object.hasOwn(latest.current.media, mediaId),
      }),
      VideoNode,
      FileNode.configure({ ownsFile: (id: string) => Object.hasOwn(latest.current.files ?? {}, id) }),
      Formatting,
      TextStyle,
      DocumentLimits,
      SelectionHistory,
      WritingHistory,
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => translator(latest.current.locale)(node.type.name === "documentTitle" ? "addTitle" : "placeholder"),
      }),
    ],
    content: editingDocument(props.title, props.content),
    editable: !props.readOnly,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onCreate: ({ editor }) => {
      latest.current.onReady?.(editor);
    },
    onUpdate: ({ editor }) => {
      if (editingTitle(editor) !== latest.current.title) latest.current.onTitleChange(editingTitle(editor));
      latest.current.onChange(documentBodyContent(editor.getJSON() as ContentNode));
    },
    onTransaction: () => setTick((n) => n + 1),
    editorProps: {
      handleScrollToSelection: view => {
        const canvas = view.dom.closest<HTMLElement>(".wb-canvas");
        if (!canvas) return false;
        const toolbar = canvas.querySelector<HTMLElement>(":scope > .writing-toolbar");
        const bounds = canvas.getBoundingClientRect();
        const top = Math.max(bounds.top, toolbar?.getBoundingClientRect().bottom ?? bounds.top) + 12;
        const bottom = bounds.bottom - 12;
        const caret = view.coordsAtPos(view.state.selection.head);
        if (caret.top < top) canvas.scrollTop += caret.top - top;
        else if (caret.bottom > bottom) canvas.scrollTop += caret.bottom - bottom;
        return true;
      },
      attributes: {
        role: "group",
        "aria-label": t("body"),
        "aria-multiline": "true",
        spellcheck: "true",
        lang: props.documentLocale,
      },
      handleKeyDown: (view, event) => {
        if (isComposingKey(event)) return false;
        const { empty, $from } = view.state.selection;
        if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && $from.parent.type.name === "documentTitle") {
          editor!.chain().focus().setTextSelection(bodyStart(editor!)).run();
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey &&
          empty && $from.parent.type.name === "heading" && $from.parentOffset === $from.parent.content.size) {
          return editor!.chain().splitBlock({ keepMarks: false }).resetAttributes("paragraph", bodyStyleAttributes).run();
        }
        if (
          event.key === "/" &&
          view.state.selection.$from.parent.type.name !== "documentTitle" &&
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
        void latest.current.onImages(files, Math.max(bodyStart(editor!), view.state.selection.from), editor!);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        if (latest.current.readOnly) return true;
        const position =
          view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
          view.state.selection.from;
        void latest.current.onImages(files, Math.max(bodyStart(editor!), position), editor!);
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
            role: "group",
            "aria-label": t("body"),
            "aria-multiline": "true",
            spellcheck: "true",
            lang: props.documentLocale,
          },
        },
      });
  }, [editor, props.locale, props.documentLocale]);
  useEffect(() => {
    editor?.view.dom.querySelector("[data-wb-title]")?.setAttribute("aria-label", t("addTitle"));
    editor?.view.dom.querySelector("[data-wb-body]")?.setAttribute("aria-label", t("body"));
  }, [editor, props.locale]);
  useEffect(() => {
    if (isInsert && editor?.isEditable) insertGrid.current?.querySelector("button")?.focus();
  }, [isInsert, editor]);
  if (!editor) return <div className="editor-loading">{t("loading")}</div>;
  function closeInsert() {
    setSlash(false);
    props.onCloseInsert?.();
    editor?.commands.focus();
  }
  function insert(type: (typeof insertTypes)[number]) {
    if (!editor) return;
    setSlash(false);
    props.onCloseInsert?.();
    if (type === "image") {
      fileInput.current?.click();
      return;
    }
    if (editor.isActive("documentTitle")) editor.commands.setTextSelection(bodyStart(editor));
    const chain = editor.chain().focus();
    if (type === "paragraph") setBodyStyle(editor);
    if (type === "heading") chain.toggleHeading({ level: 2 }).run();
    if (type === "bulletList") chain.toggleBulletList().run();
    if (type === "orderedList") chain.toggleOrderedList().run();
    if (type === "blockquote") chain.toggleBlockquote().run();
    if (type === "codeBlock") chain.toggleCodeBlock().run();
    if (type === "horizontalRule") chain.setHorizontalRule().run();
  }
  const blocks: { pos: number; type: string; text: string; size: number }[] =
    [];
  editor.state.doc.lastChild!.forEach((node, offset) =>
    blocks.push({
      pos: offset + bodyStart(editor) - 1,
      type: node.type.name,
      text: node.textContent,
      size: node.nodeSize,
    }),
  );
  function moveBlock(index: number, direction: number) {
    const target = blocks[index + direction];
    if (!target || !editor) return;
    const current = blocks[index];
    const json = editor.state.doc.lastChild!.child(index).toJSON();
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
          <WritingToolbar styles={props.styles} editor={editor} defaultFont={props.defaultFont} locale={props.locale} composing={composing} onLink={openLink} actions={
            <div className="writing-actions">
              <button type="button" aria-label={t("documentStyles")} disabled={!editor.isEditable || composing}
                aria-expanded={toolPanel === "post"} onMouseDown={e => e.preventDefault()}
                onClick={() => setToolPanel(toolPanel === "post" ? null : "post")}>{t("documentStyles")}</button>
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
          <div className="document-page" style={documentStyleVariables(props.styles, props.defaultFont)}>
            <EditorContent editor={editor} />
            {!props.title && editor.state.doc.lastChild!.textContent === "" && editor.isEditable ? (
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
            styles={props.styles}
            onStylesChange={props.onStylesChange}
            locale={props.locale}
            attachments={props.attachments}
            attachmentCount={props.attachmentCount}
            composing={composing}
            onLink={openLink}
            onClose={() => props.onCloseInspector?.()}
          />
        ) : null}
        {toolPanel ? (
          <div ref={panelRef} tabIndex={-1} className="writing-panel" role="dialog" aria-label={t(toolPanel === "attachments" ? "attachments" : toolPanel === "post" ? "documentStyles" : "selectionSettings")}
            onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setToolPanel(null); editor.commands.focus(); } }}>
            <Inspector key={toolPanel} editor={editor} defaultFont={props.defaultFont} styles={props.styles} onStylesChange={props.onStylesChange} locale={props.locale} initialTab={toolPanel}
              composing={composing} attachments={props.attachments} attachmentCount={props.attachmentCount}
              onLink={openLink}
              onClose={() => { setToolPanel(null); editor.commands.focus(); }} />
          </div>
        ) : null}
        {isInsert && editor.isEditable ? (
          <div className="inserter" role="dialog" aria-label={t("insert")}
            onKeyDown={e => {
              if (isComposingKey(e.nativeEvent)) return;
              if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeInsert(); }
            }}>
            <div className="popover-title">
              {t("insert")}
              <button
                className="icon-button"
                aria-label={t("close")}
                onClick={closeInsert}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="insert-grid" ref={insertGrid} onKeyDown={e => {
              if (isComposingKey(e.nativeEvent) || e.altKey || e.ctrlKey || e.metaKey) return;
              const buttons = Array.from(e.currentTarget.querySelectorAll("button"));
              const current = buttons.indexOf(e.target as HTMLButtonElement);
              if (current < 0) return;
              let next = current;
              if (e.key === "ArrowRight") next++;
              else if (e.key === "ArrowLeft") next--;
              else if (e.key === "ArrowDown") next += 3;
              else if (e.key === "ArrowUp") next -= 3;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = buttons.length - 1;
              else return;
              e.preventDefault();
              buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus();
            }}>
              {insertTypes.map((type) => (
                <button key={type} onClick={() => insert(type)}>
                  <Icon name={type} />
                  {t(type === "paragraph" ? "bodyBlock" : type)}
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
              void props.onImages(files, Math.max(bodyStart(editor), editor.state.selection.from), editor);
          }}
        />
      </div>
    </MediaContext.Provider>
  );
}
