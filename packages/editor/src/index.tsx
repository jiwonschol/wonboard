import { useEffect, useRef, useState, type ReactNode } from "react";
import { Extension, type Editor as EditorType } from "@tiptap/core";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
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
  markAttrsFitDocument,
  nodeAttrsFitDocument,
  type ContentNode,
  type Locale,
  type Media,
} from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { MediaContext, MediaNode } from "./MediaNode";
import { FileNode } from "./FileNode";
export { captureAttachmentSelection, insertAttachmentContent } from "./attachmentSelection";
import { Inspector } from "./Inspector";
import { Icon } from "./icons";
import { VideoNode } from "./VideoNode";
import { TextStyle } from "./TextStyle";
import { WritingToolbar } from "./WritingToolbar";
import { TextBox, tableExtensions } from "./blocks";
import { insertBlock, insertTypes, matchesInsertType, moveBlock, topLevelIndex, type InsertType } from "./blockActions";
import { SelectionMenu } from "./SelectionMenu";
import { EditMenu, type DesktopEditing, type EditMenuTarget } from "./EditMenu";
import { BlockHandle } from "./BlockHandle";
import { Outline } from "./Outline";
import { Find } from "./find";
import { FindBar } from "./FindBar";
import { looksLikeMarkdown, markdownToHtml } from "./markdown";
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
export type { DesktopEditing };
export { Icon };
export interface WonboardEditorProps {
  content: ContentNode;
  defaultFont?: FontId;
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
  desktopEditing?: DesktopEditing;
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
    if (!nodeAttrsFitDocument(node.type.name, node.attrs)) {
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
          (allowsTextChange(transaction.doc, state.doc) &&
            hasValidOrderedListStarts(transaction.doc) &&
            hasValidNodeAttributes(transaction.doc) &&
            hasValidMarkAttributes(transaction.doc) &&
            hasValidDocumentStructure(transaction.doc)),
      }),
    ];
  },
});
/** `/` 바로 뒤부터 커서까지의 글자. 조합 중인 한글도 문서에 들어 있으므로 문서에서 읽는다. */
function slashQuery(doc: ProseMirrorNode, slashFrom: number, cursor: number) {
  if (cursor <= slashFrom || cursor > doc.content.size) return null;
  const $slash = doc.resolve(slashFrom), $cursor = doc.resolve(cursor);
  if ($slash.start() !== $cursor.start()) return null;
  const text = doc.textBetween(slashFrom, cursor);
  return text.startsWith("/") && !/\s/u.test(text) ? text.slice(1) : null;
}
function wordAt(doc: ProseMirrorNode, pos: number) {
  const $pos = doc.resolve(pos);
  if (!$pos.parent.isTextblock) return undefined;
  const text = $pos.parent.textBetween(0, $pos.parent.content.size, undefined, "\ufffc");
  const letter = /[\p{L}\p{N}'’]/u;
  let start = $pos.parentOffset, end = $pos.parentOffset;
  while (start > 0 && letter.test(text[start - 1])) start--;
  while (end < text.length && letter.test(text[end])) end++;
  return start === end ? undefined : { text: text.slice(start, end), from: $pos.start() + start, to: $pos.start() + end };
}

export function WonboardEditor(props: WonboardEditorProps) {
  const latest = useRef(props);
  latest.current = props;
  const t = translator(props.locale);
  const [tick, setTick] = useState(0);
  const [slash, setSlash] = useState<number | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [menuTarget, setMenuTarget] = useState<EditMenuTarget | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  // handleKeyDown 은 편집기를 만들 때 한 번 묶이므로 최신 `/` 메뉴 상태를 ref 로 읽는다.
  const slashMenu = useRef<{ items: InsertType[]; index: number; choose(type: InsertType): void } | null>(null);
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
  useEffect(() => {
    // 편집 영역 안이나, 아무것도 선택되지 않은 화면에서 Ctrl/⌘+F 를 누르면 본문 찾기를 연다.
    const open = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "f") return;
      const area = page.current?.closest(".wb-editing-area");
      const focused = document.activeElement;
      if (!area || (focused && focused !== document.body && !area.contains(focused))) return;
      event.preventDefault();
      setFindOpen(true);
      area.querySelector<HTMLInputElement>(".find-bar input")?.focus();
    };
    document.addEventListener("keydown", open);
    return () => document.removeEventListener("keydown", open);
  }, []);
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
          Object.hasOwn(latest.current.media, mediaId),
      }),
      VideoNode,
      FileNode.configure({ ownsFile: (id: string) => Object.hasOwn(latest.current.files ?? {}, id) }),
      Formatting,
      TextStyle,
      TextBox,
      ...tableExtensions,
      Find,
      DocumentLimits,
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
        const menu = slashMenu.current;
        if (menu && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
          if (event.key === "Enter") {
            if (!menu.items.length) return false;
            menu.choose(menu.items[menu.index]);
          } else
            setSlashIndex((menu.index + (event.key === "ArrowDown" ? 1 : menu.items.length - 1)) % Math.max(menu.items.length, 1));
          return true;
        }
        if (event.altKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown") && editor) {
          moveBlock(editor, topLevelIndex(editor), event.key === "ArrowUp" ? -1 : 1);
          return true;
        }
        if (event.key === "Escape") {
          setSlash(null);
          setLinkOpen(false);
        }
        return false;
      },
      handleTextInput: (view, from, to, text) => {
        // `/` 는 본문에 그대로 입력하고, 그 뒤에 치는 글자로 메뉴를 거른다. keydown 에서
        // 열면 `/` 가 들어가기 전 화면이 한 번 그려져 메뉴가 곧바로 닫힌다.
        const { $from } = view.state.selection;
        if (text === "/" && from === to && $from.parent.isTextblock && $from.parent.textContent === "") {
          setSlash(from);
          setSlashIndex(0);
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
        contextmenu: (view, event) => {
          // Shift+우클릭은 브라우저(데스크톱은 운영체제) 기본 메뉴를 그대로 연다.
          if (event.shiftKey || latest.current.readOnly) return false;
          event.preventDefault();
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          const { from, to } = view.state.selection;
          if (pos !== undefined && (pos < from || pos > to))
            view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos))));
          const desktop = latest.current.desktopEditing;
          const word = desktop && pos !== undefined ? wordAt(view.state.doc, pos) : undefined;
          setMenuTarget({ x: event.clientX, y: event.clientY, word: word && desktop?.isMisspelled(word.text) ? word : undefined });
          return true;
        },
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) {
          // 서식 있는 HTML은 그대로 붙이고, 마크다운으로 쓴 글자만 서식으로 바꾼다.
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (event.clipboardData?.types.includes("text/html") || view.state.selection.$from.parent.type.spec.code || !looksLikeMarkdown(text))
            return false;
          return view.pasteHTML(markdownToHtml(text));
        }
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
  const slashText =
    editor && slash !== null
      ? slashQuery(editor.state.doc, slash, editor.state.selection.from)
      : null;
  // `/` 를 지웠거나 커서가 그 줄을 떠나면 메뉴를 닫는다.
  useEffect(() => {
    if (slash !== null && slashText === null) setSlash(null);
  }, [slash, slashText]);
  if (!editor) return <div className="editor-loading">{t("loading")}</div>;
  const insertItems = insertTypes.filter((type) => matchesInsertType(type, slashText ?? ""));
  const isInsert = props.insertOpen || plusOpen || slash !== null;
  function insert(type: InsertType) {
    if (!editor) return;
    // `/글상자` 처럼 친 글자는 지우고, 비어 있는 그 문단을 고른 블록으로 바꾼다.
    if (slash !== null && slashText !== null)
      editor.chain().deleteRange({ from: slash, to: editor.state.selection.from }).run();
    setSlash(null);
    setPlusOpen(false);
    props.onCloseInsert?.();
    if (type === "image") {
      fileInput.current?.click();
      return;
    }
    insertBlock(editor, type);
  }
  const activeInsert = Math.min(slashIndex, Math.max(insertItems.length - 1, 0));
  slashMenu.current = slash !== null ? { items: insertItems, index: activeInsert, choose: insert } : null;
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
        {props.overviewOpen ? <Outline editor={editor} locale={props.locale} /> : null}
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
          {findOpen ? <FindBar editor={editor} locale={props.locale} onClose={() => setFindOpen(false)} /> : null}
          <div ref={page} className="document-page" style={{ fontFamily: fontFamily(props.defaultFont) }}>
            <BlockHandle editor={editor} locale={props.locale} page={page} />
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
            <SelectionMenu editor={editor} locale={props.locale} composing={composing} onLink={openLink} />
            {editor.isEmpty && editor.isEditable ? (
              <button
                className="inline-insert"
                aria-label={t("insert")}
                onClick={() => setPlusOpen(!plusOpen)}
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
                  setSlash(null);
                  setPlusOpen(false);
                  props.onCloseInsert?.();
                }}
              >
                <Icon name="close" />
              </button>
            </div>
            {slashText ? <p className="insert-query">/{slashText}</p> : null}
            <div className="insert-grid" role="listbox" aria-label={t("insert")}>
              {insertItems.map((type, index) => (
                <button
                  key={type}
                  role="option"
                  aria-selected={slash !== null && index === activeInsert}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(type)}
                >
                  <Icon name={type} />
                  {t(type)}
                </button>
              ))}
            </div>
            {insertItems.length ? null : <p>{t("slashNoResults")}</p>}
          </div>
        ) : null}
        {menuTarget ? (
          <EditMenu
            editor={editor}
            locale={props.locale}
            target={menuTarget}
            desktop={props.desktopEditing}
            onClose={() => setMenuTarget(null)}
          />
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
