import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dictionaryKey, readPersonalDictionary, updatePersonalDictionary, validPersonalWord } from "../../packages/editor/src/spelling";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { locks: { request: async (_name: string, _options: unknown, action: () => string[]) => action() } });
});
afterEach(() => vi.unstubAllGlobals());

it("adds, lists, deduplicates typography and removes with the existing case policy", async () => {
  await updatePersonalDictionary("add", "ZqxBoard");
  await updatePersonalDictionary("add", "ZqxBoard");
  await updatePersonalDictionary("add", "zqxboard");
  await updatePersonalDictionary("add", "Zqx’name");
  await updatePersonalDictionary("add", "Zqx'name");
  expect(readPersonalDictionary()).toEqual(["ZqxBoard", "zqxboard", "Zqx’name"]);
  await updatePersonalDictionary("remove", "Zqx'name");
  expect(readPersonalDictionary()).toEqual(["ZqxBoard", "zqxboard"]);
});
it("reads the latest stored list before a mutation and broadcasts only a successful save", async () => {
  await updatePersonalDictionary("add", "질게");
  values.set(dictionaryKey, '["질게","외부창"]');
  const changed = vi.fn(); window.addEventListener(dictionaryKey, changed);
  expect(await updatePersonalDictionary("add", "ㅋㅋ")).toEqual(["질게", "외부창", "ㅋㅋ"]);
  expect(changed).toHaveBeenCalledTimes(1);
  vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });
  await expect(updatePersonalDictionary("remove", "질게")).rejects.toThrow("quota");
  expect(readPersonalDictionary()).toEqual(["질게", "외부창", "ㅋㅋ"]);
  expect(changed).toHaveBeenCalledTimes(1);
});
it("does not reset malformed storage or accept phrases that hide neighboring errors", async () => {
  for (const word of ["", "질게 답변", "a".repeat(65), "https://private.test"]) expect(validPersonalWord(word)).toBe(false);
  for (const word of ["질게", "ㅋㅋ", "ㅠ_ㅠ", "ZqxBoard"]) expect(validPersonalWord(word)).toBe(true);
  values.set(dictionaryKey, "{broken");
  await expect(updatePersonalDictionary("add", "질게")).rejects.toThrow();
  expect(values.get(dictionaryKey)).toBe("{broken");
});

it("stores and removes a bounded emoticon without allowing arbitrary identifier fragments", async () => {
  expect(await updatePersonalDictionary("add", "ㅠ_ㅠ")).toEqual(["ㅠ_ㅠ"]);
  expect(await updatePersonalDictionary("add", "ㅠ_ㅠ")).toEqual(["ㅠ_ㅠ"]);
  expect(await updatePersonalDictionary("remove", "ㅠ_ㅠ")).toEqual([]);
  for (const word of ["_ㅠ", "ㅠ_", "a_b", "ㅠ__ㅠ"]) expect(validPersonalWord(word)).toBe(false);
});

it("leaves storage unchanged when coordination is unavailable", async () => {
  values.set(dictionaryKey, '["질게"]');
  vi.stubGlobal("navigator", {});
  await expect(updatePersonalDictionary("add", "외부창")).rejects.toThrow("coordination unavailable");
  expect(readPersonalDictionary()).toEqual(["질게"]);
});
