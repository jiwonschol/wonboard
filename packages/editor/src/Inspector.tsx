import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import type { Locale, FontId } from "@wonboard/document";
import { translator, type MessageKey } from "@wonboard/locales";
import { Icon } from "./icons";
import { WritingToolbar } from "./WritingToolbar";

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
                  onChange={(e) =>
                    editor.commands.updateAttributes("media", {
                      alt: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                {t("caption")}
                <input
                  value={attrs.caption}
                  onChange={(e) =>
                    editor.commands.updateAttributes("media", {
                      caption: e.target.value,
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
