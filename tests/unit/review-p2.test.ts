import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { renderToStaticMarkup } from "react-dom/server";
import {
  exportBackup,
  exportRawBackup,
  limits,
  newDraft,
  type Draft,
} from "@wonboard/document";
import { allowsTextChange } from "../../packages/editor/src/index";
import { capAttributeText } from "../../packages/editor/src/Inspector";
import { MediaNode } from "../../packages/editor/src/MediaNode";
import { VideoNode } from "../../packages/editor/src/VideoNode";
import { DocumentPreview } from "../../packages/renderer/src/index";
import { createLocalAuth } from "../../apps/server/src/local-auth";
import { openStorage, loadDrafts } from "../../apps/client/src/storage";

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

describe("설명·사진 설명도 문서 한도를 넘지 않는다", () => {
  it("검증기와 같은 상한으로 자른다", () => {
    const long = "가".repeat(limits.attributeText + 500);
    expect(capAttributeText(long).length).toBe(limits.attributeText);
    expect(capAttributeText("짧은 설명")).toBe("짧은 설명");
  });
});

describe("편집기가 자기 표식을 되읽는다", () => {
  type Rule = { tag: string; getAttrs: (element: unknown) => unknown };
  const rules = (node: { config: { parseHTML?: unknown } }) =>
    ((node.config.parseHTML as (() => Rule[]) | undefined)?.() ?? []) as Rule[];
  const element = (
    attributes: Record<string, string>,
    caption?: string,
  ) => ({
    getAttribute: (name: string) => attributes[name] ?? null,
    querySelector: () => (caption === undefined ? null : { textContent: caption }),
  });

  it("사진 표식을 속성까지 되살리고 남의 표식은 거부한다", () => {
    const [rule] = rules(MediaNode);
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
