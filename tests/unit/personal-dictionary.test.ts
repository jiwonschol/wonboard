import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dictionaryDatabase, dictionaryKey, readPersonalDictionary, updatePersonalDictionary, validPersonalWord } from "../../packages/editor/src/spelling";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { locks: { request: async (_name: string, _options: unknown, action: () => string[]) => action() } });
});
afterEach(() => vi.unstubAllGlobals());

// 시험이 저장소를 직접 들여다볼 때 쓴다. 앱 코드와 별개로 IndexedDB를 연다.
function stored(): Promise<{ words: string[]; migratedFrom?: string } | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dictionaryDatabase);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      if (!database.objectStoreNames.contains("personal")) { database.close(); resolve(undefined); return; }
      const read = database.transaction("personal").objectStore("personal").get("words");
      read.onsuccess = () => { database.close(); resolve(read.result); };
      read.onerror = () => { database.close(); reject(read.error); };
    };
  });
}
function writeStored(words: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dictionaryDatabase, 1);
    open.onupgradeneeded = () => open.result.createObjectStore("personal");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const transaction = open.result.transaction("personal", "readwrite");
      transaction.objectStore("personal").put({ words }, "words");
      transaction.oncomplete = () => { open.result.close(); resolve(); };
      transaction.onerror = () => { open.result.close(); reject(transaction.error); };
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
  // 새 낱말은 IndexedDB에만 쓴다. 예전 localStorage 키에는 아무것도 쓰지 않는다.
  expect(values.has(dictionaryKey)).toBe(false);
});
it("reads the latest stored list before a mutation and broadcasts only a successful save", async () => {
  await updatePersonalDictionary("add", "질게");
  await writeStored(["질게", "외부창"]);
  const changed = vi.fn(); window.addEventListener(dictionaryKey, changed);
  expect(await updatePersonalDictionary("add", "ㅋㅋ")).toEqual(["질게", "외부창", "ㅋㅋ"]);
  expect(changed).toHaveBeenCalledTimes(1);
  const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
  await expect(updatePersonalDictionary("remove", "질게")).rejects.toThrow("full");
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
  values.set(dictionaryKey, '["질게", 3]');
  await expect(readPersonalDictionary()).rejects.toThrow("Invalid dictionary");
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
  expect(values.get(dictionaryKey)).toBe('["질게"]');
});

it("moves a dictionary saved the old way once, with the same count and content, and keeps the old copy", async () => {
  // 대소문자·곡선 아포스트로피·자모 이모티콘·조합형이 아닌 낱말까지, 예전 방식이 받아 준 모양을 섞는다.
  const legacy = ["질게", "ZqxBoard", "zqxboard", "Zqx’name", "ㅠ_ㅠ", "모험러", "갈축", "타건", "아즈휼"];
  for (let i = 0; i < 300; i++) legacy.push(`낱말${String.fromCharCode(0xac00 + i)}`);
  const raw = JSON.stringify(legacy);
  values.set(dictionaryKey, raw);
  const migrated = await readPersonalDictionary();
  expect(migrated.length).toBe(legacy.length);
  expect(migrated).toEqual(legacy);
  expect(await stored()).toEqual({ words: legacy, migratedFrom: "localStorage" });
  expect(values.get(dictionaryKey)).toBe(raw);
  // 옮긴 뒤에는 새 저장소만 읽는다. 예전 자료가 바뀌어도 다시 옮기지 않는다.
  values.set(dictionaryKey, '["예전탭"]');
  expect(await readPersonalDictionary()).toEqual(legacy);
  expect(await updatePersonalDictionary("add", "새낱말")).toEqual([...legacy, "새낱말"]);
  expect((await stored())?.migratedFrom).toBe("localStorage");
  expect(values.get(dictionaryKey)).toBe('["예전탭"]');
});

it("migrates as part of the first save without losing either the old words or the new one", async () => {
  values.set(dictionaryKey, '["질게","외부창"]');
  expect(await updatePersonalDictionary("add", "ㅋㅋ")).toEqual(["질게", "외부창", "ㅋㅋ"]);
  expect(await stored()).toEqual({ words: ["질게", "외부창", "ㅋㅋ"], migratedFrom: "localStorage" });
  expect(values.get(dictionaryKey)).toBe('["질게","외부창"]');
});

it("a failed migration leaves the old dictionary in place and is retried next time", async () => {
  values.set(dictionaryKey, '["질게","외부창"]');
  const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
  await expect(readPersonalDictionary()).rejects.toThrow("full");
  put.mockRestore();
  expect(values.get(dictionaryKey)).toBe('["질게","외부창"]');
  expect(await stored()).toBeUndefined();
  vi.stubGlobal("indexedDB", { open: () => { throw new Error("unavailable"); } });
  await expect(readPersonalDictionary()).rejects.toThrow("unavailable");
  expect(values.get(dictionaryKey)).toBe('["질게","외부창"]');
});

it("concurrent saves from separate connections keep every word", async () => {
  values.set(dictionaryKey, '["질게"]');
  // 잠금 없이(서로 다른 탭이 잠금을 우회한 경우와 같이) 동시에 저장해도 트랜잭션이 차례로 실행된다.
  const words = Array.from({ length: 20 }, (_, i) => `동시${String.fromCharCode(0xac00 + i)}`);
  await Promise.all(words.map(word => updatePersonalDictionary("add", word)));
  expect((await readPersonalDictionary()).sort()).toEqual(["질게", ...words].sort());
});
