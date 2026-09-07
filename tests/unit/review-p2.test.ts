import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { getSchema } from "../../packages/editor/node_modules/@tiptap/core/dist/index.js";
import StarterKit from "../../packages/editor/node_modules/@tiptap/starter-kit/dist/index.js";
import { zipSync } from "../../packages/document/node_modules/fflate";
import {
  exportBackup,
  exportRawBackup,
  importBackup,
  limits,
  sha256,
  newDraft,
  type Draft,
} from "@wonboard/document";
import {
  allowsTextChange,
  DocumentLimits,
  Formatting,
  hasValidDocumentStructure,
  hasValidMarkAttributes,
  hasValidOrderedListStarts,
} from "../../packages/editor/src/index";
import { capAttributeText } from "../../packages/editor/src/Inspector";
import { MediaNode } from "../../packages/editor/src/MediaNode";
import { VideoNode } from "../../packages/editor/src/VideoNode";
import { DocumentPreview } from "../../packages/renderer/src/index";
import { createLocalAuth } from "../../apps/server/src/local-auth";
import {
  openStorage,
  loadDrafts,
  newestDraftFirst,
} from "../../apps/client/src/storage";
import { saveUntilCurrent } from "../../apps/client/src/useDrafts";
import { WritingLibrary } from "../../apps/client/src/WritingLibrary";

const doc = (size: number, text: string) => ({
  content: { size },
  textContent: text,
});

describe("본문 길이 상한은 편집기 경계에서 걸린다", () => {
  it("한도를 넘기는 변경은 막고, 넘어선 문서를 줄이는 변경은 허용한다", () => {
    const under = doc(10, "a".repeat(10));
    const over = doc(limits.text + 5000, "a".repeat(limits.text + 1));
    const worse = doc(limits.text + 6000, "a".repeat(limits.text + 2));
    const better = doc(limits.text + 4000, "a".repeat(limits.text));

    expect(allowsTextChange(under, under)).toBe(true);
    expect(allowsTextChange(over, under)).toBe(false);
    // 이미 넘어선 문서(백업 복원 등)에서 지우는 방향까지 막으면 회복이 불가능해진다.
    expect(allowsTextChange(better, over)).toBe(true);
    expect(allowsTextChange(worse, over)).toBe(false);
  });
  it("본문이 한도 안이면 텍스트를 훑지 않는다", () => {
    let read = 0;
    const cheap = {
      content: { size: 100 },
      get textContent() {
        read++;
        return "a".repeat(100);
      },
    };
    expect(allowsTextChange(cheap, cheap)).toBe(true);
    expect(read).toBe(0);
  });
});

describe("문서 전환은 마지막 편집까지 저장한다", () => {
  it("저장 중 들어온 변경을 한 번 더 저장한 뒤 전환한다", async () => {
    let change = 1;
    let saved = 0;
    let calls = 0;
    const save = async () => {
      const sequence = change;
      calls++;
      if (calls === 1) change++;
      saved = sequence;
      return true;
    };
    await expect(
      saveUntilCurrent(save, () => saved === change),
    ).resolves.toBe(true);
    expect(calls).toBe(2);
    expect(saved).toBe(change);
  });
  it("문서 전환과 사진 소유권이 최신 상태를 읽는 경로에 배선돼 있다", () => {
    const drafts = readFileSync("apps/client/src/useDrafts.ts", "utf8");
    const app = readFileSync("apps/client/src/App.tsx", "utf8");
    const editor = readFileSync("packages/editor/src/index.tsx", "utf8");
    expect(drafts).toMatch(/await saveUntilCurrent\(\s*save,/u);
    expect(app).toMatch(/media=\{draft\.document\.media\}/u);
    expect(editor).toMatch(/Object\.hasOwn\(latest\.current\.media, mediaId\)/u);
  });
});

describe("붙여넣은 번호 목록도 문서 계약을 지킨다", () => {
  const document = (starts: unknown[]) => ({
    content: { size: 1 },
    textContent: "a",
    childCount: 0,
    child: () => { throw new Error("no child"); },
    descendants(visit: (node: { type: { name: string }; attrs: Record<string, unknown> }) => boolean | void) {
      for (const start of starts)
        if (visit({ type: { name: "orderedList" }, attrs: { start } }) === false)
          break;
    },
  });
  it("0·음수·상한 밖 시작값은 편집기에 들어오기 전에 거부한다", () => {
    expect(hasValidOrderedListStarts(document([1, 100000]))).toBe(true);
    for (const start of [0, -1, 100001, 1.5, "1"])
      expect(hasValidOrderedListStarts(document([start]))).toBe(false);
  });
  it("transaction filter가 붙여넣기 결과에도 목록 시작값을 검사한다", () => {
    const plugins = (
      DocumentLimits.config.addProseMirrorPlugins as () => {
        spec: {
          filterTransaction?: (
            transaction: { docChanged: boolean; doc: ReturnType<typeof document> },
            state: { doc: ReturnType<typeof document> },
          ) => boolean;
        };
      }[]
    )();
    const filter = plugins[0]!.spec.filterTransaction!;
    expect(
      filter(
        { docChanged: true, doc: document([0]) },
        { doc: document([1]) },
      ),
    ).toBe(false);
  });
  it("현재 StarterKit schema는 번호 목록 type을 JSON 왕복에서 보존한다", () => {
    const schema = getSchema([StarterKit]);
    const value = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 1, type: "A" },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "alpha" }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(schema.nodeFromJSON(value).toJSON()).toEqual(value);
  });
});

describe("편집기 구조도 문서 계약을 넘지 않는다", () => {
  type TestNode = { childCount: number; child(index: number): TestNode };
  const leaf: TestNode = {
    childCount: 0,
    child: () => { throw new Error("no child"); },
  };
  const nested = (deepest: number) => {
    let node: TestNode = leaf;
    for (let depth = 0; depth < deepest; depth++) {
      const child = node;
      node = { childCount: 1, child: () => child };
    }
    return node;
  };
  it("깊이 40과 노드 100000에 닿는 변경을 거부한다", () => {
    expect(hasValidDocumentStructure(nested(39))).toBe(true);
    expect(hasValidDocumentStructure(nested(40))).toBe(false);
    expect(
      hasValidDocumentStructure({ childCount: 99_998, child: () => leaf }),
    ).toBe(true);
    expect(
      hasValidDocumentStructure({ childCount: 99_999, child: () => leaf }),
    ).toBe(false);
  });
  it("transaction filter가 구조 한계를 넘은 붙여넣기를 거부한다", () => {
    type FilterDoc = ReturnType<typeof nested> & {
      content: { size: number };
      textContent: string;
      descendants(
        visit: (node: {
          type: { name: string };
          attrs: Record<string, unknown>;
        }) => boolean | void,
      ): void;
    };
    const plugins = (
      DocumentLimits.config.addProseMirrorPlugins as () => {
        spec: {
          filterTransaction?: (
            transaction: { docChanged: boolean; doc: FilterDoc },
            state: { doc: FilterDoc },
          ) => boolean;
        };
      }[]
    )();
    const measurable = (node: ReturnType<typeof nested>): FilterDoc => ({
      ...node,
      content: { size: 1 },
      textContent: "a",
      descendants: () => undefined,
    });
    const filter = plugins[0]!.spec.filterTransaction!;
    expect(
      filter(
        { docChanged: true, doc: measurable(nested(40)) },
        { doc: measurable(nested(1)) },
      ),
    ).toBe(false);
  });
});

describe("붙여넣은 mark 속성도 문서 계약을 지킨다", () => {
  const marked = (attrs: Record<string, unknown>) => ({
    content: { size: 1 },
    textContent: "x",
    childCount: 0,
    child: () => { throw new Error("no child"); },
    descendants: (
      visit: (node: {
        type: { name: string };
        attrs: Record<string, unknown>;
        marks: { type: { name: string }; attrs: Record<string, unknown> }[];
      }) => boolean | void,
    ) =>
      visit({
        type: { name: "text" },
        attrs: {},
        marks: [{ type: { name: "link" }, attrs }],
      }),
  });
  it("현재 link 속성은 받고 긴 속성과 미래 속성은 거부한다", () => {
    expect(hasValidMarkAttributes(marked({ href: "https://example.com" }))).toBe(true);
    expect(
      hasValidMarkAttributes(
        marked({ href: "https://example.com", rel: "x".repeat(limits.attributeText + 1) }),
      ),
    ).toBe(false);
    expect(
      hasValidMarkAttributes(marked({ href: "https://example.com", future: "keep" })),
    ).toBe(false);
  });
  it("transaction filter가 잘못된 mark 속성을 거부한다", () => {
    const plugins = (
      DocumentLimits.config.addProseMirrorPlugins as () => {
        spec: {
          filterTransaction?: (
            transaction: { docChanged: boolean; doc: ReturnType<typeof marked> },
            state: { doc: ReturnType<typeof marked> },
          ) => boolean;
        };
      }[]
    )();
    expect(
      plugins[0]!.spec.filterTransaction!(
        {
          docChanged: true,
          doc: marked({
            href: "https://example.com",
            rel: "x".repeat(limits.attributeText + 1),
          }),
        },
        { doc: marked({ href: "https://example.com" }) },
      ),
    ).toBe(false);
  });
});

describe("설명·사진 설명도 문서 한도를 넘지 않는다", () => {
  it("검증기와 같은 상한으로 자른다", () => {
    const long = "가".repeat(limits.attributeText + 500);
    expect(capAttributeText(long).length).toBe(limits.attributeText);
    expect(capAttributeText("짧은 설명")).toBe("짧은 설명");
  });
});

describe("편집기가 자기 표식을 되읽는다", () => {
  type Rule = { tag: string; getAttrs: (element: unknown) => unknown };
  const rules = (
    node: { config: { parseHTML?: unknown } },
    options: Record<string, unknown> = { ownsMedia: () => false },
  ) =>
    ((node.config.parseHTML as (() => Rule[]) | undefined)?.call({
      options,
    }) ?? []) as Rule[];
  const element = (
    attributes: Record<string, string>,
    caption?: string,
  ) => ({
    getAttribute: (name: string) => attributes[name] ?? null,
    querySelector: () => (caption === undefined ? null : { textContent: caption }),
  });

  it("사진 표식을 속성까지 되살리고 남의 표식은 거부한다", () => {
    const [rule] = rules(MediaNode, { ownsMedia: () => true });
    expect(rule.tag).toBe("figure[data-wonboard-media]");
    expect(
      rule.getAttrs(
        element(
          {
            "data-wonboard-media": "photo-1",
            "data-wonboard-width": "820",
            "data-wonboard-align": "center",
            "data-wonboard-alt": "설명",
          },
          "사진 설명",
        ),
      ),
    ).toEqual({
      mediaId: "photo-1",
      width: 820,
      align: "center",
      alt: "설명",
      caption: "사진 설명",
    });
    // id 판정은 validateDocument 와 같아야 한다 — 갈리면 붙여넣은 순간 저장이 막힌다.
    expect(rule.getAttrs(element({ "data-wonboard-media": "__proto__" }))).toBe(
      false,
    );
    expect(rule.getAttrs(element({ "data-wonboard-media": "has space" }))).toBe(
      false,
    );
    // 범위 밖 값은 기본값으로 접는다. 되살린 노드가 검증을 통과해야 한다.
    expect(
      rule.getAttrs(
        element({
          "data-wonboard-media": "photo-1",
          "data-wonboard-width": "999999",
          "data-wonboard-align": "diagonal",
        }),
      ),
    ).toMatchObject({ width: 600, align: "left" });
  });
  it("이 초안이 들고 있지 않은 사진은 되살리지 않는다", () => {
    // 다른 초안에서 복사한 사진은 id 모양만 맞고 원본도 메타도 없다. 그대로 받으면
    // 깨진 노드가 생겨 이후 저장·백업이 missingMedia 로 실패한다.
    const owned = element({ "data-wonboard-media": "photo-1" }, "");
    expect(
      rules(MediaNode, { ownsMedia: (id: string) => id === "photo-1" })[0]!
        .getAttrs(owned),
    ).toMatchObject({ mediaId: "photo-1" });
    expect(
      rules(MediaNode, { ownsMedia: (id: string) => id === "other" })[0]!
        .getAttrs(owned),
    ).toBe(false);
    // 배선이 빠지면 닫는 쪽으로 넘어진다.
    expect(
      rules(MediaNode, {
        ownsMedia: MediaNode.options.ownsMedia,
      })[0]!.getAttrs(owned),
    ).toBe(false);
  });
  it("영상 표식은 isVideo 를 통과한 값만 되살린다", () => {
    const [rule] = rules(VideoNode);
    expect(rule.tag).toBe("div[data-wonboard-video]");
    expect(
      rule.getAttrs(
        element({
          "data-wonboard-video": "abcdefghijk",
          "data-wonboard-provider": "youtube",
          "data-wonboard-start": "90",
          "data-wonboard-autoplay": "false",
        }),
      ),
    ).toEqual({
      provider: "youtube",
      videoId: "abcdefghijk",
      privacyHash: "",
      startSeconds: 90,
      autoplay: false,
    });
    expect(
      rule.getAttrs(
        element({
          "data-wonboard-video": "not-a-youtube-id",
          "data-wonboard-provider": "youtube",
          "data-wonboard-start": "0",
        }),
      ),
    ).toBe(false);
  });
});

describe("미리보기가 번호 매김 방식을 지킨다", () => {
  const preview = (type: unknown) =>
    renderToStaticMarkup(
      DocumentPreview({
        document: {
          ...newDraft().document,
          content: {
            type: "doc",
            content: [
              {
                type: "orderedList",
                attrs: { start: 1, type },
                content: [
                  {
                    type: "listItem",
                    content: [
                      { type: "paragraph", content: [{ type: "text", text: "가" }] },
                    ],
                  },
                ],
              },
            ],
          },
        },
        mediaUrls: {},
      }),
    );
  it("HTML 이 아는 다섯 값만 넘기고 나머지는 빼낸다", () => {
    for (const value of ["A", "a", "I", "i", "1"])
      expect(preview(value)).toContain(`type="${value}"`);
    for (const value of ["x", "", null, 7])
      expect(preview(value)).not.toContain("type=");
  });
});

describe("깨진 레코드 하나가 서재 전체를 막지 않는다", () => {
  it("파싱 가능한 옛 날짜 표기도 실제 시각으로 정렬한다", () => {
    const older = newDraft();
    older.document.updatedAt = "2026-12-31T00:00:00.000Z";
    const newer = newDraft();
    newer.document.updatedAt = "12/31/2099";
    expect([older, newer].sort(newestDraftFirst)[0]).toBe(newer);
    older.document.title = "iso-older";
    newer.document.title = "legacy-newer";
    const markup = renderToStaticMarkup(
      createElement(WritingLibrary, {
        draft: older,
        list: [newer],
        locale: "en",
        busy: false,
        onSelect: async () => undefined,
        onCreate: () => undefined,
        onClose: () => undefined,
        onRestore: () => undefined,
      }),
    );
    expect(markup.indexOf("legacy-newer")).toBeLessThan(
      markup.indexOf("iso-older"),
    );
  });
  it("정렬을 깨뜨리는 메타까지 걸러 낸다", async () => {
    // blobs 는 멀쩡한데 updatedAt 이 없으면 변환은 통과하고 목록 정렬이 던진다.
    // 초기화가 빈 초안으로 물러나며 멀쩡한 문서까지 전부 가려지던 자리다.
    const db = await openStorage(crypto.randomUUID());
    const good = newDraft();
    good.document.title = "정렬되는 초안";
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("drafts", "readwrite");
      const store = transaction.objectStore("drafts");
      store.put({ document: good.document, blobs: {} });
      const broken = { ...newDraft().document, title: "날짜 없는 초안" } as Record<
        string,
        unknown
      >;
      delete broken.updatedAt;
      store.put({ document: broken, blobs: {} });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    const drafts = await loadDrafts(db);
    expect(drafts.map((d) => d.document.title)).toEqual(["정렬되는 초안"]);
    expect(() =>
      [...drafts].sort((a, b) =>
        b.document.updatedAt.localeCompare(a.document.updatedAt),
      ),
    ).not.toThrow();
    db.close();
  });
  it("문자열 모양만 맞는 날짜와 제목도 목록에 올리지 않는다", async () => {
    const db = await openStorage(crypto.randomUUID());
    const good = newDraft();
    good.document.title = "살아 있는 초안";
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("drafts", "readwrite");
      const store = transaction.objectStore("drafts");
      store.put({ document: good.document, blobs: {} });
      store.put({
        document: { ...newDraft().document, documentId: "bad-date", updatedAt: "not-a-date" },
        blobs: {},
      });
      store.put({
        document: { ...newDraft().document, documentId: "bad-title", title: null },
        blobs: {},
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    expect((await loadDrafts(db)).map((d) => d.document.title)).toEqual([
      "살아 있는 초안",
    ]);
    db.close();
  });
  it("읽을 수 없는 항목만 건너뛰고 나머지 문서를 연다", async () => {
    const db = await openStorage(crypto.randomUUID());
    const good = newDraft();
    good.document.title = "살아 있는 초안";
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("drafts", "readwrite");
      const store = transaction.objectStore("drafts");
      store.put({ document: good.document, blobs: {} });
      // blobs 가 없는 레코드. 예전에는 이 하나가 loadDrafts 전체를 실패시켜
      // 멀쩡한 문서까지 사라진 것처럼 보였다.
      store.put({
        document: { ...newDraft().document, title: "깨진 초안" },
        blobs: null,
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    const drafts = await loadDrafts(db);
    expect(drafts.map((d) => d.document.title)).toEqual(["살아 있는 초안"]);
    db.close();
  });
});

describe("읽기 전용 초안에도 회수 경로가 있다", () => {
  const frozen = (): Draft => {
    const draft = newDraft();
    return {
      document: { ...draft.document, schemaVersion: 2 } as unknown as Draft["document"],
      blobs: { photo: new Blob([new Uint8Array([1, 2, 3])]) },
    };
  };
  it("검증이 막는 초안도 사진을 포함한 묶음으로 내려받을 수 있다", async () => {
    await expect(exportBackup(frozen())).rejects.toThrow();
    const archive = await exportRawBackup(frozen());
    expect(archive.type).toBe("application/zip");
    // level 0 으로 담으므로 이름과 원본 바이트가 압축 없이 그대로 들어간다.
    const bytes = new Uint8Array(await archive.arrayBuffer());
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text).toContain("document.json");
    expect(text).toContain("media/photo");
    expect(text).toContain('"schemaVersion":2');
    expect(bytes).toContain(1);
    expect(text).toContain(String.fromCharCode(1, 2, 3));
  });
});

describe("자격증명은 청크 경계에서 깨지지 않는다", () => {
  it("다바이트 문자가 갈려 도착해도 로그인에 성공한다", async () => {
    const account = { username: "작성자", password: "비밀번호-테스트" };
    const auth = createLocalAuth(account);
    const payload = Buffer.from(JSON.stringify(account), "utf8");
    // 한글 한 글자의 UTF-8 3바이트 한가운데를 가른다.
    const split = 14;
    expect(payload.subarray(0, split).toString("utf8")).toContain("�");
    const req = Readable.from([
      payload.subarray(0, split),
      payload.subarray(split),
    ]) as IncomingMessage;
    Object.assign(req, {
      method: "POST",
      url: "/api/auth/login",
      headers: {
        host: "127.0.0.1:5173",
        origin: "http://127.0.0.1:5173",
        "content-type": "application/json",
      },
      socket: { remoteAddress: "127.0.0.1" },
    });
    let status = 0;
    const res = {
      setHeader: () => {},
      writeHead: (code: number) => {
        status = code;
      },
      end: () => {},
    } as unknown as ServerResponse;
    await auth(req, res);
    expect(status).toBe(200);
  });
});

describe("문단 서식이 붙여넣기에서 살아남는다", () => {
  type Attribute = {
    parseHTML: (element: unknown) => unknown;
    renderHTML: (attrs: Record<string, unknown>) => Record<string, string>;
  };
  const attributes = (
    Formatting.config.addGlobalAttributes as () => {
      attributes: Record<string, Attribute>;
    }[]
  )()[0]!.attributes;
  const read = (name: string, raw: string | null) =>
    attributes[name]!.parseHTML({
      getAttribute: (asked: string) =>
        asked === `data-wb-${name.replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`)}`
          ? raw
          : null,
    });

  const roundTrip: [string, unknown, string][] = [
    ["textAlign", "center", "center"],
    ["variant", "display", "display"],
    ["fontSize", 42, "42"],
    ["textColor", "#a1b2c3", "#a1b2c3"],
    ["backgroundColor", "#000000", "#000000"],
    ["gradient", "blue", "blue"],
    ["padding", 24, "24"],
    ["borderWidth", 3, "3"],
  ];
  it("여덟 축이 표식으로 나갔다가 같은 값으로 돌아온다", () => {
    for (const [name, value, serialized] of roundTrip) {
      const rendered = attributes[name]!.renderHTML({ [name]: value });
      const key = `data-wb-${name.replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`)}`;
      expect(rendered[key]).toBe(serialized);
      expect(read(name, serialized)).toBe(value);
    }
  });
  it("값이 없으면 표식도 달지 않는다", () => {
    for (const [name] of roundTrip) {
      expect(attributes[name]!.renderHTML({ [name]: null })).not.toHaveProperty(
        `data-wb-${name.replace(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`)}`,
      );
      expect(read(name, null)).toBeNull();
    }
  });
  it("검증기가 거부할 값은 되읽지 않는다", () => {
    // 넓으면 붙여넣은 순간 저장이 막힌다 — 통과 폭이 validateDocument 와 같아야 한다.
    expect(read("textAlign", "diagonal")).toBeNull();
    expect(read("variant", "headline")).toBeNull();
    expect(read("fontSize", "8")).toBeNull();
    expect(read("fontSize", "200")).toBeNull();
    expect(read("textColor", "red")).toBeNull();
    expect(read("gradient", "sunset")).toBeNull();
    expect(read("padding", "999")).toBeNull();
    expect(read("borderWidth", "40")).toBeNull();
  });
  it("정렬은 표식과 인라인 style 을 함께 낸다", () => {
    const rendered = attributes.textAlign!.renderHTML({ textAlign: "right" });
    expect(rendered["data-wb-text-align"]).toBe("right");
    expect(rendered.style).toContain("right");
  });
});

describe("사진 한 장의 상한을 문서에 적용하지 않는다", () => {
  it("document.json 이 20 MiB 를 넘어도 묶음을 다시 가져온다", async () => {
    // Codex 반례 그대로 — 같은 사진 노드를 여러 번 쓰고 각 노드에 허용된 10,000자
    // 설명을 달면 문서만으로 imageBytes 를 넘긴다. 전체 묶음은 archiveBytes 안이다.
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const draft = newDraft();
    draft.document.media.photo = {
      id: "photo",
      originalName: "photo.png",
      mime: "image/png",
      width: 1,
      height: 1,
      size: bytes.byteLength,
      sha256: await sha256(bytes.buffer as ArrayBuffer),
    };
    draft.blobs.photo = new Blob([bytes], { type: "image/png" });
    const filler = "a".repeat(limits.attributeText);
    draft.document.content = {
      type: "doc",
      content: Array.from({ length: 1100 }, () => ({
        type: "media",
        attrs: { mediaId: "photo", alt: filler, caption: filler },
      })),
    };
    const archive = await exportBackup(draft);
    expect(archive.size).toBeGreaterThan(limits.imageBytes);
    expect(archive.size).toBeLessThan(limits.archiveBytes);
    const restored = await importBackup(archive);
    expect(restored.document.documentId).toBe(draft.document.documentId);
  });
});

describe("백업 사진은 디코더보다 먼저 PNG 구조를 검사한다", () => {
  const chunk = (type: string, data: Uint8Array) => {
    const bytes = new Uint8Array(data.byteLength + 12);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, data.byteLength);
    bytes.set(new TextEncoder().encode(type), 4);
    bytes.set(data, 8);
    return bytes;
  };
  const png = (...chunks: Uint8Array[]) => {
    const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const bytes = new Uint8Array(
      signature.byteLength + chunks.reduce((sum, value) => sum + value.byteLength, 0),
    );
    bytes.set(signature);
    let offset = signature.byteLength;
    for (const value of chunks) {
      bytes.set(value, offset);
      offset += value.byteLength;
    }
    return bytes;
  };
  const archive = async (bytes: Uint8Array) => {
    const draft = newDraft();
    draft.document.media.photo = {
      id: "photo",
      originalName: "photo.png",
      mime: "image/png",
      width: 1,
      height: 1,
      size: bytes.byteLength,
      sha256: await sha256(bytes.buffer as ArrayBuffer),
    };
    draft.document.content.content!.push({
      type: "media",
      attrs: { mediaId: "photo" },
    });
    return new Blob([
      zipSync({
        "document.json": new TextEncoder().encode(JSON.stringify(draft.document)),
        "media/photo": bytes,
      }) as Uint8Array<ArrayBuffer>,
    ]);
  };
  it("APNG와 실제 IHDR이 상한을 넘는 PNG를 백업 단계에서 거부한다", async () => {
    const ihdr = new Uint8Array(13);
    new DataView(ihdr.buffer).setUint32(0, 1);
    new DataView(ihdr.buffer).setUint32(4, 1);
    const animated = png(chunk("IHDR", ihdr), chunk("acTL", new Uint8Array(8)));
    await expect(importBackup(await archive(animated))).rejects.toThrow(
      "invalidImage",
    );

    new DataView(ihdr.buffer).setUint32(0, limits.pixels);
    new DataView(ihdr.buffer).setUint32(4, 2);
    const oversized = png(chunk("IHDR", ihdr));
    await expect(importBackup(await archive(oversized))).rejects.toThrow(
      "imageLimit",
    );
  });
});

describe("Playwright 산출물 경로는 어디서나 만들 수 있어야 한다", () => {
  it("macOS 전용 절대 경로를 박지 않는다", () => {
    const config = readFileSync("playwright.config.ts", "utf8");
    // /private 이 없는 리눅스에서는 루트 아래 경로를 못 만들어 시험이 시작도 못 한다.
    expect(config).not.toMatch(/outputDir:\s*"\/(private|tmp)/u);
    expect(config).toMatch(/outputDir:\s*"\.\//u);
  });
});
