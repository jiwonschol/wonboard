import type { Node } from "@tiptap/pm/model";

export type SpellingWord = { word: string; from: number; to: number };
export const dictionaryKey = "wonboard.spelling.personal.v1";
export function readPersonalDictionary(): string[] {
  const value: unknown = JSON.parse(localStorage.getItem(dictionaryKey) ?? "[]");
  if (!Array.isArray(value) || value.some(word => typeof word !== "string")) throw new Error("Invalid dictionary");
  return value;
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
    // Safari(WebKit)는 다른 탭이 방금 쓴 값을 약 1ms 늦게 보여 준다. 잠금을 넘겨받자마자
    // 읽으면 낡은 목록 위에 덮어써 앞 탭의 변경이 사라진다. 전달될 시간을 두고 읽는다.
    // 잠금을 얻은 뒤에는 대화상자가 닫혀도 끝까지 저장한다(닫기는 줄 선 저장만 취소한다).
    await new Promise(resolve => setTimeout(resolve, 20));
    const saved = readPersonalDictionary();
    const key = personalWordKey(word);
    const next = operation === "remove" ? saved.filter(item => personalWordKey(item) !== key)
      : saved.some(item => personalWordKey(item) === key) ? saved : [...saved, word.normalize("NFC")];
    localStorage.setItem(dictionaryKey, JSON.stringify(next));
    window.dispatchEvent(new Event(dictionaryKey));
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
