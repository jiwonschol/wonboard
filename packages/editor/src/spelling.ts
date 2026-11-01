import type { Node } from "@tiptap/pm/model";

export type SpellingWord = { word: string; from: number; to: number };
// 예전(베타까지) 개인 사전은 localStorage의 이 키에 있었다. 지금은 잠금·변경 알림의
// 이름으로도 쓴다. 예전 값은 옮긴 뒤에도 지우거나 고치지 않는다(#46).
export const dictionaryKey = "wonboard.spelling.personal.v1";
// 개인 사전은 IndexedDB 한 레코드에 둔다. 읽기와 쓰기를 한 readwrite 트랜잭션 안에서
// 하므로, 브라우저가 탭 사이에서도 트랜잭션을 차례로 실행해 늘 최신 목록 위에 쓴다.
// localStorage는 Safari(WebKit)에서 다른 탭이 방금 쓴 값을 약 1ms 늦게 보여 줘(#39의
// 측정: 잠금 직후 읽기 300회 중 21회가 낡음) 잠금만으로는 앞 탭의 변경을 지킬 수 없었다.
// 데스크톱판도 같은 렌더러 출처(wonboard://app)의 IndexedDB를 쓴다.
export const dictionaryDatabase = "wonboard-spelling-v1";
const store = "personal", recordKey = "words";
type StoredDictionary = { words: string[]; migratedFrom?: "localStorage" };

function wordList(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(word => typeof word !== "string")) throw new Error("Invalid dictionary");
  return value;
}
function readLegacyDictionary(): string[] {
  return wordList(JSON.parse(localStorage.getItem(dictionaryKey) ?? "[]"));
}
function openDictionary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dictionaryDatabase, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(store);
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Dictionary storage unavailable"));
    request.onblocked = () => reject(new Error("Dictionary storage blocked"));
  });
}
const sameWords = (a: string[], b: string[]) => a.length === b.length && a.every((word, i) => word === b[i]);

// 한 readwrite 트랜잭션에서 읽고(필요하면 예전 자료를 옮기고) 바꾼 뒤 다시 읽어 확인한다.
// 트랜잭션 콜백 밖의 await는 트랜잭션을 끝내 버리므로 콜백 안에서만 이어 간다.
// 확인이 어긋나거나 쓰기가 실패하면 트랜잭션을 되돌려 아무것도 남기지 않는다.
// 예전 localStorage 자료는 읽기만 한다. 읽을 수 없는 예전 자료는 덮어쓰지 않고 실패한다.
async function withDictionary(change?: (saved: string[]) => string[]): Promise<string[]> {
  const database = await openDictionary();
  try {
    return await new Promise((resolve, reject) => {
      let result: string[] | undefined, failure: unknown;
      const transaction = database.transaction(store, "readwrite");
      const objects = transaction.objectStore(store);
      const fail = (error: unknown) => { failure ??= error; try { transaction.abort(); } catch { /* Already finished. */ } };
      const read = objects.get(recordKey);
      read.onsuccess = () => {
        try {
          const record = read.result as StoredDictionary | undefined;
          const migrating = record === undefined;
          const saved = migrating ? readLegacyDictionary() : wordList(record.words);
          const next = change ? change(saved) : saved;
          if (!migrating && next === saved) { result = saved; return; }
          const stored: StoredDictionary = migrating ? { words: next, migratedFrom: "localStorage" } : { ...record, words: next };
          objects.put(stored, recordKey).onsuccess = () => {
            const check = objects.get(recordKey);
            check.onsuccess = () => {
              try {
                const written = wordList((check.result as StoredDictionary | undefined)?.words);
                if (!sameWords(written, next)) throw new Error("Dictionary verification failed");
                result = written;
              } catch (error) { fail(error); }
            };
          };
        } catch (error) { fail(error); }
      };
      transaction.oncomplete = () => result ? resolve(result) : reject(failure ?? new Error("Dictionary storage failed"));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("Dictionary storage failed"));
    });
  } finally { database.close(); }
}

// 처음 읽을 때 예전 localStorage 자료를 한 번 옮긴다. 옮긴 뒤에는 IndexedDB만 읽는다.
export async function readPersonalDictionary(): Promise<string[]> {
  return withDictionary();
}
function announceChange() {
  window.dispatchEvent(new Event(dictionaryKey));
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(dictionaryKey);
  channel.postMessage("changed");
  channel.close();
}

// Personal spelling is case-sensitive, as in the checker. Typography-only
// apostrophe variants share an entry; never lowercase nicknames or acronyms.
export const personalWordKey = (word: string) => word.normalize("NFC").replaceAll("’", "'");
export function validPersonalWord(word: string): boolean {
  return word.length <= 64 && (/^[\p{L}][\p{L}'’-]*$/u.test(word) || /^[ㄱ-ㅎㅏ-ㅣ]+(?:_[ㄱ-ㅎㅏ-ㅣ]+)+$/u.test(word));
}
export async function updatePersonalDictionary(operation: "add" | "remove", word: string, signal?: AbortSignal): Promise<string[]> {
  if (operation === "add" && !validPersonalWord(word)) throw new Error("Invalid dictionary word");
  // The read and write share one origin-wide lock, including other tabs.
  // Without coordination, a read-modify-write could discard another entry.
  if (!navigator.locks) throw new Error("Dictionary storage coordination unavailable");
  return navigator.locks.request(dictionaryKey, { signal }, async () => {
    // 잠금은 저장을 차례로 세우고 대화상자를 닫으면 줄 선 저장을 취소하는 데 쓴다.
    // 최신 목록 위에 쓰는 것은 IndexedDB 트랜잭션이 보장한다.
    // 잠금을 얻은 뒤에는 대화상자가 닫혀도 끝까지 저장한다(닫기는 줄 선 저장만 취소한다).
    const key = personalWordKey(word);
    const words = await withDictionary(saved => operation === "remove"
      ? (saved.some(item => personalWordKey(item) === key) ? saved.filter(item => personalWordKey(item) !== key) : saved)
      : saved.some(item => personalWordKey(item) === key) ? saved : [...saved, word.normalize("NFC")]);
    // 바뀐 것이 없어도 알린다. 열린 검사 창은 이 알림을 받아 다시 검사한다.
    announceChange();
    return words;
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
