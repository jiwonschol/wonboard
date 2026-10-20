import { useEffect, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { limits, documentStyleNames, documentTextStyle, writingFonts, type DocumentStyles, type DocumentStyleName, type Locale, type FontId } from "@wonboard/document";

// alt·caption 은 validateDocument 가 limits.attributeText 로 거른다. 그 한도를 넘긴 값이
// 문서에 들어가면 이후 모든 자동 저장과 백업이 실패하고, 사용자는 어느 칸을 줄여야
// 하는지 모른 채 저장할 수 없는 초안을 안는다. 화면에서 잘라 그 상태를 만들지 않는다.
export const capAttributeText = (value: string) =>
  value.slice(0, limits.attributeText);
import { translator, type MessageKey } from "@wonboard/locales";
import { Icon } from "./icons";
import { WritingToolbar } from "./WritingToolbar";

function StyleNumber({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange(value: number): void }) {
  const [text, setText] = useState(String(Number(value.toFixed(2))));
  useEffect(() => setText(String(Number(value.toFixed(2)))), [value]);
  const apply = () => { const next = Number(text); if (text !== "" && Number.isFinite(next) && next >= min && next <= max) onChange(next); else setText(String(Number(value.toFixed(2)))); };
  return <input aria-label={label} type="number" min={min} max={max} step={step} value={text} onChange={e => setText(e.target.value)} onBlur={apply} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} />;
}

export function Inspector({
  editor,
  defaultFont,
  styles,
  onStylesChange,
  locale,
  onClose,
  attachments,
  attachmentCount = 0,
  initialTab = "block",
  composing = false,
  onLink,
}: {
  editor: Editor;
  defaultFont?: FontId;
  styles?: DocumentStyles;
  onStylesChange?(styles: DocumentStyles): void;
  locale: Locale;
  onClose(): void;
  attachments?: ReactNode;
  attachmentCount?: number;
  initialTab?: "post" | "block" | "attachments";
  composing?: boolean;
  onLink(): void;
}) {
  const t = translator(locale);
  const image = editor.isActive("media");
  const type = image
    ? "media"
    : editor.isActive("heading")
      ? "heading"
      : "paragraph";
  const attrs = editor.getAttributes(type);
  const change = (key: string, value: unknown) =>
    editor
      .chain()
      .updateAttributes(type, { [key]: value })
      .run();
  const [tab, setTab] = useState<"post" | "block" | "attachments">(initialTab);
  const [styleName, setStyleName] = useState<DocumentStyleName>("paragraph");
  const style = documentTextStyle(styles, styleName, defaultFont);
  const updateStyle = (patch: Partial<typeof style>) => onStylesChange?.({ ...styles, [styleName]: { ...styles?.[styleName], ...patch } });
  const [color, setColor] = useState<string | null>(null);
  const [gradient, setGradient] = useState(false);
  const [sectionOptions, setSectionOptions] = useState<string | null>(null);
  function heading(key: "styles" | "typography" | "background") {
    const attributes =
      key === "styles"
        ? ["variant"]
        : key === "typography"
          ? ["fontSize", "textColor"]
          : ["backgroundColor", "gradient"];
    return (
      <>
        <h2 className="section-heading">
          {t(key)}
          <button
            className="section-options"
            aria-label={`${t(key)} · ${t("options")}`}
            aria-expanded={sectionOptions === key}
            onClick={() =>
              setSectionOptions(sectionOptions === key ? null : key)
            }
          >
            <Icon name="more" />
          </button>
        </h2>
        {sectionOptions === key ? (
          <button
            className="reset-section"
            onClick={() => {
              editor.chain().focus().resetAttributes(type, attributes).run();
              setSectionOptions(null);
            }}
          >
            {t("resetStyle")}
          </button>
        ) : null}
      </>
    );
  }
  return (
    <aside className="wb-inspector" aria-label={t("settings")}>
      <div className="inspector-tabs">
        <div role="tablist">
          {(
            [
              "post",
              "block",
              ...(attachments ? ["attachments" as const] : []),
            ] as const
          ).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
            >
              {key === "attachments"
                ? t("attachmentCount", { count: attachmentCount })
                : t(key)}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label={t("closeSettings")}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {tab === "attachments" ? (
        attachments
      ) : tab === "post" ? (
        <section>
          <h2>{t("documentStyles")}</h2>
          <p>{t("documentStylesHint")}</p>
          <fieldset className="document-style-controls" disabled={!editor.isEditable || composing}>
            <label>{t("styleName")}<select aria-label={t("styleName")} value={styleName} onChange={e => setStyleName(e.target.value as DocumentStyleName)}>
              {documentStyleNames.map(name => <option key={name} value={name}>{name === "title" ? t("addTitle") : name === "paragraph" ? t("bodyStyle") : name === "blockquote" ? t("blockquote") : `${t("heading")} ${name.slice(1)}`}</option>)}
            </select></label>
            <label>{t("writingFont")}<select aria-label={t("styleFont")} value={style.fontFamily ?? "sans"} onChange={e => updateStyle({ fontFamily: e.target.value as FontId })}>
              {writingFonts.map(font => <option key={font.id} value={font.id}>{font.name}</option>)}
            </select></label>
            <label>{t("writingSize")}<StyleNumber key={`${styleName}-size`} label={t("styleSize")} min={12} max={96} value={style.fontSize} onChange={fontSize => updateStyle({ fontSize })} /></label>
            <label>{t("lineHeight")}<StyleNumber key={`${styleName}-spacing`} label={t("lineHeight")} min={1} max={3} step={0.1} value={style.lineHeight} onChange={lineHeight => updateStyle({ lineHeight })} /></label>
            <label>{t("writingColor")}<input aria-label={t("styleColor")} type="color" value={style.color} onChange={e => updateStyle({ color: e.target.value })} /></label>
            <button onClick={() => { const next = { ...styles }; delete next[styleName]; onStylesChange?.(next); }}>{t("resetDocumentStyle")}</button>
          </fieldset>
        </section>
      ) : editor.isActive("video") ? (
        <section>
          <h2>{t("video")}</h2>
          <p>{t("videoSettingsHint")}</p>
          <button onClick={() => setTab("attachments")}>
            {t("attachments")}
          </button>
        </section>
      ) : (
        <fieldset disabled={!editor.isEditable || composing}>
          <section className="block-summary">
            <h2>
              <Icon name={image ? "image" : type} />
              {t(image ? "image" : (type as MessageKey))}
            </h2>
            {!image ? <p>{t("paragraphHelp")}</p> : null}
          </section>
          {image ? (
            <section className="image-controls">
              <label>
                {t("width")}
                <input
                  type="number"
                  min="40"
                  max="8000"
                  value={attrs.width}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 40 && v <= 8000) change("width", v);
                  }}
                />
              </label>
              <label>
                {t("align")}
                <select
                  value={attrs.align}
                  onChange={(e) => change("align", e.target.value)}
                >
                  {(["left", "center", "right"] as const).map((k) => (
                    <option key={k} value={k}>
                      {t(k)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("alt")}
                <input
                  value={attrs.alt}
                  maxLength={limits.attributeText}
                  onChange={(e) =>
                    editor.commands.updateAttributes("media", {
                      alt: capAttributeText(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                {t("caption")}
                <input
                  value={attrs.caption}
                  maxLength={limits.attributeText}
                  onChange={(e) =>
                    editor.commands.updateAttributes("media", {
                      caption: capAttributeText(e.target.value),
                    })
                  }
                />
              </label>
            </section>
          ) : (
            <>
              <section>
                {heading("styles")}
                <div className="style-grid">
                  {(
                    ["default", "display", "subtitle", "annotation"] as const
                  ).map((v) => (
                    <button
                      key={v}
                      className={
                        (attrs.variant ?? "default") === v ? "active" : ""
                      }
                      onClick={() => change("variant", v)}
                    >
                      {t(v)}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h2>{t("inspectorWritingTools")}</h2>
                <WritingToolbar styles={styles} editor={editor} defaultFont={defaultFont} locale={locale} composing={composing} onLink={onLink} expanded />
              </section>
              <section>
                {heading("background")}
                <button
                  className="property-button"
                  onClick={() =>
                    setColor(
                      color === "backgroundColor" ? null : "backgroundColor",
                    )
                  }
                >
                  <span
                    className="color-swatch"
                    style={{ background: attrs.backgroundColor ?? undefined }}
                  />
                  {t("color")}
                </button>
                {color === "backgroundColor" ? (
                  <input
                    type="color"
                    aria-label={t("background")}
                    value={attrs.backgroundColor ?? "#ffffff"}
                    onChange={(e) => change("backgroundColor", e.target.value)}
                  />
                ) : null}
                <button
                  className="property-button joined"
                  onClick={() => setGradient(!gradient)}
                >
                  <span className="color-swatch" />
                  {t("gradient")}
                </button>
                {gradient ? (
                  <div className="choices">
                    {(["none", "light", "blue"] as const).map((v) => (
                      <button key={v} onClick={() => change("gradient", v)}>
                        {t(v)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
              <details>
                <summary>
                  {t("dimensions")}
                  <Icon name="plus" />
                </summary>
                <label>
                  {t("padding")}
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={attrs.padding ?? 0}
                    onChange={(e) => change("padding", Number(e.target.value))}
                  />
                </label>
              </details>
              <details>
                <summary>
                  {t("border")}
                  <Icon name="plus" />
                </summary>
                <label>
                  {t("borderWidth")}
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={attrs.borderWidth ?? 0}
                    onChange={(e) =>
                      change("borderWidth", Number(e.target.value))
                    }
                  />
                </label>
              </details>
              <details>
                <summary>
                  {t("elements")}
                  <Icon name="plus" />
                </summary>
                <label>
                  {t("align")}
                  <select
                    value={attrs.textAlign ?? "left"}
                    onChange={(e) => change("textAlign", e.target.value)}
                  >
                    {(["left", "center", "right"] as const).map((v) => (
                      <option key={v} value={v}>
                        {t(v)}
                      </option>
                    ))}
                  </select>
                </label>
              </details>
              <details>
                <summary>{t("advanced")}</summary>
                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .resetAttributes(type, [
                        "textAlign",
                        "variant",
                        "fontSize",
                        "textColor",
                        "backgroundColor",
                        "gradient",
                        "padding",
                        "borderWidth",
                      ])
                      .run()
                  }
                >
                  {t("resetStyle")}
                </button>
              </details>
            </>
          )}
        </fieldset>
      )}
    </aside>
  );
}
