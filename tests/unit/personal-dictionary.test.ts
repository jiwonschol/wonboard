import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { dictionaryDatabase, dictionaryKey, readPersonalDictionary, subscribePersonalDictionary, updatePersonalDictionary, validPersonalWord } from "../../packages/editor/src/spelling";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("navigator", { locks: { request: async (_name: string, _options: unknown, action: () => string[]) => action() } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// 시험이 IndexedDB에 저장된 개인 사전 기록을 직접 읽거나 바꾼다. 없으면 undefined.
function stored(change?: (words: string[]) => string[]): Promise<string[] | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dictionaryDatabase, 1);
    open.onupgradeneeded = () => open.result.createObjectStore("dictionary");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction("dictionary", "readwrite"), store = tx.objectStore("dictionary");
      let words: string[] | undefined;
      const get = store.get("personal");
      get.onsuccess = () => {
        words = get.result?.words;
        if (change && get.result) { words = change(get.result.words); store.put({ ...get.result, words }, "personal"); }
      };
      tx.oncomplete = () => { db.close(); resolve(words); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

it("adds, lists, deduplicates typography and removes with the existing case policy", async () => {
  await updatePersonalDictionary("add", "ZqxBoard");
  await updatePersonalDictionary("add", "ZqxBoard");
  await updatePersonalDictionary("add", "zqxboard");
  await updatePersonalDictionary("add", "Zqx’name");
  await updatePersonalDictionary("add", "Zqx'name");
  expect(await readPersonalDictionary()).toEqual(["ZqxBoard", "zqxboard", "Zqx’name"]);
  await updatePersonalDictionary("remove", "Zqx'name");
  expect(await readPersonalDictionary()).toEqual(["ZqxBoard", "zqxboard"]);
});
it("reads the latest stored list before a mutation and broadcasts only a successful save", async () => {
  await updatePersonalDictionary("add", "질게");
  await stored(words => [...words, "외부창"]);
  const changed = vi.fn(); window.addEventListener(dictionaryKey, changed);
  expect(await updatePersonalDictionary("add", "ㅋㅋ")).toEqual(["질게", "외부창", "ㅋㅋ"]);
  expect(changed).toHaveBeenCalledTimes(1);
  const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => { throw new Error("quota"); });
  await expect(updatePersonalDictionary("remove", "질게")).rejects.toThrow("quota");
  put.mockRestore();
  expect(await readPersonalDictionary()).toEqual(["질게", "외부창", "ㅋㅋ"]);
  expect(changed).toHaveBeenCalledTimes(1);
});
it("does not reset malformed storage or accept phrases that hide neighboring errors", async () => {
  for (const word of ["", "질게 답변", "a".repeat(65), "https://private.test"]) expect(validPersonalWord(word)).toBe(false);
  for (const word of ["질게", "ㅋㅋ", "ㅠ_ㅠ", "ZqxBoard"]) expect(validPersonalWord(word)).toBe(true);
  values.set(dictionaryKey, "{broken");
  await expect(updatePersonalDictionary("add", "질게")).rejects.toThrow();
  await expect(readPersonalDictionary()).rejects.toThrow();
  expect(values.get(dictionaryKey)).toBe("{broken");
  expect(await stored()).toBeUndefined();
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
  expect(await readPersonalDictionary()).toEqual(["질게"]);
});

it("moves the localStorage dictionary once with the same count and content, and keeps the old copy", async () => {
  const legacy = ["질게", "ZqxBoard", "zqxboard", "Zqx’name", "ㅠ_ㅠ", "외부창", "Ångström"];
  const raw = JSON.stringify(legacy);
  values.set(dictionaryKey, raw);
  expect(await stored()).toBeUndefined();
  const moved = await readPersonalDictionary();
  expect(moved).toEqual(legacy);
  expect(await stored()).toHaveLength(legacy.length);
  expect(await stored()).toEqual(legacy);
  expect(values.get(dictionaryKey)).toBe(raw);
  // 옮긴 뒤에는 예전 자료를 다시 읽지 않는다. 지운 낱말이 되살아나지 않는다.
  values.set(dictionaryKey, JSON.stringify([...legacy, "뒤늦은낱말"]));
  expect(await updatePersonalDictionary("remove", "질게")).toEqual(legacy.slice(1));
  expect(await readPersonalDictionary()).toEqual(legacy.slice(1));
  expect(values.get(dictionaryKey)).toBe(JSON.stringify([...legacy, "뒤늦은낱말"]));
});

it("keeps the old dictionary and writes nothing when the move fails", async () => {
  const raw = JSON.stringify(["질게", "외부창"]);
  values.set(dictionaryKey, raw);
  const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
  await expect(readPersonalDictionary()).rejects.toThrow("full");
  await expect(updatePersonalDictionary("add", "ㅋㅋ")).rejects.toThrow("full");
  put.mockRestore();
  expect(values.get(dictionaryKey)).toBe(raw);
  expect(await stored()).toBeUndefined();
  // 실패 뒤 다시 시도하면 처음부터 옮긴다.
  expect(await updatePersonalDictionary("add", "ㅋㅋ")).toEqual(["질게", "외부창", "ㅋㅋ"]);
  expect(values.get(dictionaryKey)).toBe(raw);
});

it("aborts the move when the copied list does not read back the same", async () => {
  const raw = JSON.stringify(["질게", "외부창"]);
  values.set(dictionaryKey, raw);
  const original = IDBObjectStore.prototype.put;
  const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function(this: IDBObjectStore, value: { words: string[] }, key?: IDBValidKey) {
    return original.call(this, { ...value, words: value.words.slice(1) }, key);
  });
  await expect(readPersonalDictionary()).rejects.toThrow("migration mismatch");
  put.mockRestore();
  expect(await stored()).toBeUndefined();
  expect(values.get(dictionaryKey)).toBe(raw);
});

it("starts empty without a legacy dictionary and notifies other tabs after a save", async () => {
  expect(await readPersonalDictionary()).toEqual([]);
  expect(await stored()).toEqual([]);
  expect(values.has(dictionaryKey)).toBe(false);
  const sameTab = vi.fn();
  const unsubscribe = subscribePersonalDictionary(sameTab);
  const other = new BroadcastChannel(dictionaryKey);
  const otherTab = new Promise(resolve => { other.onmessage = resolve; });
  await updatePersonalDictionary("add", "질게");
  await otherTab;
  other.close();
  // 같은 탭은 window 이벤트로 한 번만 알린다(자기 BroadcastChannel 알림은 무시).
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(sameTab).toHaveBeenCalledTimes(1);
  unsubscribe();
});
