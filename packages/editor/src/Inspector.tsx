import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { limits, textBoxColors, textBoxDefaults, type Locale, type FontId } from "@wonboard/document";

// alt·caption 은 validateDocument 가 limits.attributeText 로 거른다. 그 한도를 넘긴 값이
// 문서에 들어가면 이후 모든 자동 저장과 백업이 실패하고, 사용자는 어느 칸을 줄여야
// 하는지 모른 채 저장할 수 없는 초안을 안는다. 화면에서 잘라 그 상태를 만들지 않는다.
export const capAttributeText = (value: string) =>
  value.slice(0, limits.attributeText);
import { translator, type MessageKey } from "@wonboard/locales";
import { Icon } from "./icons";
import { WritingToolbar } from "./WritingToolbar";
import { applyVariant, currentVariant, hasTextSelection, unwrapTextBox, variants } from "./blockActions";

export function Inspector({
  editor,
  defaultFont,
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
  locale: Locale;
  onClose(): void;
  attachments?: ReactNode;
  attachmentCount?: number;
  initialTab?: "block" | "attachments";
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
  // 글자를 드래그해 골랐으면 스타일과 배경색은 그 글자에만 적용한다. 커서만 있으면 문단에 적용한다.
  const selected = hasTextSelection(editor);
  const box = editor.isActive("textBox") ? editor.getAttributes("textBox") : null;
  const changeBox = (key: string, value: unknown) =>
    editor.chain().updateAttributes("textBox", { [key]: value }).run();
  const change = (key: string, value: unknown) =>
    editor
      .chain()
      .updateAttributes(type, { [key]: value })
      .run();
  const [tab, setTab] = useState<"post" | "block" | "attachments">(initialTab);
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
              // 드래그한 글자에 적용한 스타일·배경은 글자 서식에 있으므로 그쪽을 지운다.
              if (selected && key !== "typography")
                editor.chain().focus().setMark("textStyle", key === "styles" ? { variant: null } : { highlight: null }).run();
              else editor.chain().focus().resetAttributes(type, attributes).run();
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
          <h2>{t("post")}</h2>
          <p>{t("localOnly")}</p>
          <p>{t("publishLater")}</p>
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
          {box && !image ? (
            <section className="text-box-controls">
              <h2>{t("textBox")}</h2>
              <div className="swatches" role="group" aria-label={t("textBoxColor")}>
                {textBoxColors.map((value) => (
                  <button
                    key={value}
                    className={box.backgroundColor === value ? "active" : ""}
                    aria-label={value}
                    aria-pressed={box.backgroundColor === value}
                    style={{ background: value }}
                    onClick={() => changeBox("backgroundColor", value)}
                  />
                ))}
                <label className="swatch-custom" title={t("customColor")}>
                  <input
                    type="color"
                    aria-label={t("customColor")}
                    value={box.backgroundColor ?? textBoxDefaults.backgroundColor}
                    onChange={(e) => changeBox("backgroundColor", e.target.value)}
                  />
                </label>
              </div>
              <label>
                {t("borderWidth")}
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={box.borderWidth ?? textBoxDefaults.borderWidth}
                  onChange={(e) => changeBox("borderWidth", Number(e.target.value))}
                />
              </label>
              <label>
                {t("border")} · {t("color")}
                <input
                  type="color"
                  value={box.borderColor ?? textBoxDefaults.borderColor}
                  onChange={(e) => changeBox("borderColor", e.target.value)}
                />
              </label>
              <label>
                {t("padding")}
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={box.padding ?? textBoxDefaults.padding}
                  onChange={(e) => changeBox("padding", Number(e.target.value))}
                />
              </label>
              <button onClick={() => unwrapTextBox(editor)}>{t("removeTextBox")}</button>
            </section>
          ) : null}
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
                <p className="style-scope">
                  {t(selected ? "styleScopeSelection" : "styleScopeBlock")}
                </p>
                <div className="style-grid">
                  {variants.map((v) => (
                    <button
                      key={v}
                      className={currentVariant(editor) === v ? "active" : ""}
                      aria-pressed={currentVariant(editor) === v}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyVariant(editor, v)}
                    >
                      {t(v)}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h2>{t("inspectorWritingTools")}</h2>
                <WritingToolbar editor={editor} defaultFont={defaultFont} locale={locale} composing={composing} onLink={onLink} expanded />
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
                    style={{
                      background:
                        (selected
                          ? editor.getAttributes("textStyle").highlight
                          : attrs.backgroundColor) ?? undefined,
                    }}
                  />
                  {t("color")}
                </button>
                {color === "backgroundColor" ? (
                  <input
                    type="color"
                    aria-label={t("background")}
                    value={
                      (selected
                        ? editor.getAttributes("textStyle").highlight
                        : attrs.backgroundColor) ?? "#ffffff"
                    }
                    onChange={(e) =>
                      selected
                        ? editor
                            .chain()
                            .setMark("textStyle", { highlight: e.target.value })
                            .run()
                        : change("backgroundColor", e.target.value)
                    }
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
