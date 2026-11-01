import type { Node } from "@tiptap/pm/model";

export type SpellingWord = { word: string; from: number; to: number };
// 예전(v1) 저장 위치인 localStorage 열쇠. 탭 사이 잠금·알림 이름으로도 계속 쓴다.
// 개인 사전은 이제 IndexedDB에 둔다. localStorage는 WebKit에서 다른 탭이 방금 쓴 값을
// 약 1ms 늦게 보여 줘 잠금만으로는 읽기-수정-쓰기가 앞 탭의 변경을 덮을 수 있었다(#39, #46).
// IndexedDB의 readwrite 트랜잭션은 출처 전체에서 차례로 실행되고 앞서 커밋된 내용을 본다.
export const dictionaryKey = "wonboard.spelling.personal.v1";
export const dictionaryDatabase = "wonboard-spelling-personal";
const dictionaryStore = "dictionary";
const dictionaryRecord = "personal";
type DictionaryRecord = { words: string[]; migratedFrom: string; migratedAt: string };

function parseWords(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(word => typeof word !== "string")) throw new Error("Invalid dictionary");
  return value;
}
// 예전 자료는 읽기만 한다. 옮긴 뒤에도 지우거나 고쳐 쓰지 않는다(#46 금지선).
function legacyWords(): string[] {
  return parseWords(JSON.parse(localStorage.getItem(dictionaryKey) ?? "[]"));
}
const sameWords = (a: unknown, b: string[]) => Array.isArray(a) && a.length === b.length && a.every((word, i) => word === b[i]);

function openDictionary(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Dictionary storage unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dictionaryDatabase, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(dictionaryStore);
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error ?? new Error("Dictionary storage unavailable"));
  });
}

// 한 트랜잭션 안에서 사전을 읽고(처음이면 예전 자료를 옮기고) 필요하면 고친다.
// 옮기기는 복사한 뒤 같은 트랜잭션에서 다시 읽어 낱말 수와 내용이 같은지 확인하고,
// 다르거나 실패하면 트랜잭션을 취소해 아무것도 남기지 않는다. 예전 자료는 그대로 둔다.
async function dictionaryTransaction(change?: (words: string[]) => string[]): Promise<string[]> {
  const db = await openDictionary();
  try {
    return await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(dictionaryStore, "readwrite");
      const store = tx.objectStore(dictionaryStore);
      let result: string[] | undefined;
      let failure: unknown;
      const fail = (error: unknown) => { failure ??= error; try { tx.abort(); } catch { /* already finished */ } };
      tx.oncomplete = () => result ? resolve(result) : reject(new Error("Dictionary storage failed"));
      tx.onabort = tx.onerror = () => reject(failure ?? tx.error ?? new Error("Dictionary storage failed"));
      const finish = (record: DictionaryRecord) => {
        const words = parseWords(record.words);
        const next = change ? change(words) : words;
        if (next !== words) store.put({ ...record, words: next } satisfies DictionaryRecord, dictionaryRecord);
        result = next;
      };
      const saved = store.get(dictionaryRecord);
      saved.onsuccess = () => {
        try {
          if (saved.result !== undefined) return finish(saved.result as DictionaryRecord);
          const legacy = legacyWords();
          const record: DictionaryRecord = { words: [...legacy], migratedFrom: `localStorage:${dictionaryKey}`, migratedAt: new Date().toISOString() };
          store.put(record, dictionaryRecord);
          const copied = store.get(dictionaryRecord);
          copied.onsuccess = () => {
            try {
              if (!sameWords((copied.result as DictionaryRecord | undefined)?.words, legacy)) throw new Error("Dictionary migration mismatch");
              finish(copied.result as DictionaryRecord);
            } catch (error) { fail(error); }
          };
        } catch (error) { fail(error); }
      };
    });
  } finally { db.close(); }
}

export function readPersonalDictionary(): Promise<string[]> {
  return dictionaryTransaction();
}

let channel: BroadcastChannel | undefined;
// 같은 탭의 다른 BroadcastChannel 객체도 메시지를 받으므로, 자기 탭이 보낸 알림은 window 이벤트로만 처리한다.
const thisTab = Math.random().toString(36).slice(2) + Date.now().toString(36);
// 같은 탭에는 window 이벤트로, 다른 탭에는 BroadcastChannel로 저장을 알린다.
// 받는 쪽은 IndexedDB에서 다시 읽는다(커밋 뒤에 보내므로 새 값을 본다).
export function subscribePersonalDictionary(changed: () => void): () => void {
  const listener = new BroadcastChannel(dictionaryKey);
  listener.onmessage = event => { if (event.data?.tab !== thisTab) changed(); };
  window.addEventListener(dictionaryKey, changed);
  return () => { listener.close(); window.removeEventListener(dictionaryKey, changed); };
}

// Personal spelling is case-sensitive, as in the checker. Typography-only
// apostrophe variants share an entry; never lowercase nicknames or acronyms.
export const personalWordKey = (word: string) => word.normalize("NFC").replaceAll("’", "'");
export function validPersonalWord(word: string): boolean {
  return word.length <= 64 && (/^[\p{L}][\p{L}'’-]*$/u.test(word) || /^[ㄱ-ㅎㅏ-ㅣ]+(?:_[ㄱ-ㅎㅏ-ㅣ]+)+$/u.test(word));
}
export async function updatePersonalDictionary(operation: "add" | "remove", word: string, signal?: AbortSignal): Promise<string[]> {
  if (operation === "add" && !validPersonalWord(word)) throw new Error("Invalid dictionary word");
  // 저장은 IndexedDB 트랜잭션 하나로 읽고 쓰므로 탭 사이에서도 앞 변경을 덮지 않는다.
  // 출처 전체 잠금은 저장을 줄 세워, 대화상자를 닫으면 아직 줄 선 저장을 취소하는 데 쓴다.
  // 잠금을 얻은 뒤에는 대화상자가 닫혀도 끝까지 저장한다(닫기는 줄 선 저장만 취소한다).
  if (!navigator.locks) throw new Error("Dictionary storage coordination unavailable");
  return navigator.locks.request(dictionaryKey, { signal }, async () => {
    const key = personalWordKey(word);
    const next = await dictionaryTransaction(saved => operation === "remove"
      ? saved.some(item => personalWordKey(item) === key) ? saved.filter(item => personalWordKey(item) !== key) : saved
      : saved.some(item => personalWordKey(item) === key) ? saved : [...saved, word.normalize("NFC")]);
    window.dispatchEvent(new Event(dictionaryKey));
    try { (channel ??= new BroadcastChannel(dictionaryKey)).postMessage({ tab: thisTab }); } catch { /* other tabs refresh on next open */ }
    return next;
  });
}

export function spellingWords(doc: Node): SpellingWord[] {
  const words: SpellingWord[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock") return false;
    if (!node.isText || node.marks.some(mark => ["code", "link"].includes(mark.type.name))) return;
    for (const match of node.text!.matchAll(/[가-힣]+/gu)) {
      // Do not mistake a fragment split by formatting for a complete word.
      const from = pos + match.index, to = from + match[0].length;
      const before = doc.textBetween(Math.max(0, from - 1), from, " ");
      const after = doc.textBetween(to, Math.min(doc.content.size, to + 1), " ");
      if (/[\p{L}\p{N}]$/u.test(before) || /^[\p{L}\p{N}]/u.test(after)) continue;
      words.push({ word: match[0], from: pos + match.index, to: pos + match.index + match[0].length });
    }
  });
  return words;
}
