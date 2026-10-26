import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import fontkit, { type Font } from "@pdf-lib/fontkit";
import decompress from "woff2-encoder/decompress";

type VariableFont = Font & { getVariation(axes: Record<string, number>): Font };

// Noto Serif KR의 '겹'은 마지막 TrueType 플래그가 반복된다. 반복 횟수를 빼면 PDF의
// 텍스트는 남아도 윤곽 좌표가 수만 단위로 틀어져 뷰어에서 글자가 사라진다.
it("keeps Korean variable-font outlines when embedding a glyph subset", async () => {
  const bytes = await decompress(readFileSync(new URL("../../packages/editor/node_modules/@fontsource-variable/noto-serif-kr/files/noto-serif-kr-109-wght-normal.woff2", import.meta.url)));
  for (const weight of [400, 500, 700]) {
    const source = (fontkit.create(bytes) as VariableFont).getVariation({ wght: weight });
    const glyph = source.glyphForCodePoint("겹".codePointAt(0)!);
    const subset = source.createSubset(), id = subset.includeGlyph(glyph);
    const chunks: Uint8Array[] = [];
    await new Promise<void>(resolve => subset.encodeStream().on("data", chunk => chunks.push(chunk)).on("end", () => resolve()));
    const embedded = fontkit.create(new Uint8Array(Buffer.concat(chunks)));
    expect(embedded.getGlyph(id).bbox).toEqual(glyph.bbox);
  }
});
