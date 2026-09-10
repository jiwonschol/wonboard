import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import type { Locale } from "@wonboard/document";
import { dictionaryKey, readPersonalDictionary, spellingWords } from "./spelling";
import "./spelling.css";

export function SpellcheckTool({ editor, locale, disabled }: { editor: Editor; locale: Locale; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const label = locale === "ko" ? "맞춤법 검사" : "Check spelling";
  return <><button type="button" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => setOpen(true)}>{label}</button>
    {open && createPortal(<SpellingReview editor={editor} locale={locale} close={() => { setOpen(false); editor.commands.focus(); }} />, document.body)}</>;
}

function SpellingReview({ editor, locale, close }: { editor: Editor; locale: Locale; close(): void }) {
  const ko = locale === "ko";
  const dialog = useRef<HTMLDialogElement>(null);
  const snapshot = useRef<Node>(editor.state.doc);
  const [words] = useState(() => spellingWords(editor.state.doc));
  const [results, setResults] = useState<Record<string, string[]>>({});
  const [personal, setPersonal] = useState<string[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const current = words.slice(index).find(item => Object.hasOwn(results, item.word) && !personal.includes(item.word) && !ignored.includes(item.word));
  const message = ko ? "검사 또는 사전 저장에 실패했습니다. 닫고 다시 시도하세요." : "Check or dictionary storage failed. Close and retry.";
  useEffect(() => {
    dialog.current?.showModal();
    let saved: string[];
    try { saved = readPersonalDictionary(); setPersonal(saved); }
    catch { setError(message); setBusy(false); return; }
    const worker = new Worker(new URL("./spelling.worker.ts", import.meta.url), { type: "module" });
    const fail = () => { setError(message); setBusy(false); worker.terminate(); };
    worker.onerror = event => { console.error("Spelling worker failed", event.message); fail(); };
    worker.onmessage = ({ data }) => {
      if (data.error) { console.error("Spelling engine", data.error); fail(); }
      else if (data.done) { setBusy(false); worker.terminate(); }
      else setResults(previous => ({ ...previous, [data.word]: data.suggestions }));
    };
    worker.postMessage(words.filter(item => !saved.includes(item.word)).map(item => item.word));
    return () => worker.terminate();
  }, []);
  const next = () => { if (current) setIndex(words.indexOf(current) + 1); };
  const replace = (text: string) => {
    if (!current || !editor.isEditable || editor.view.composing || !editor.state.doc.eq(snapshot.current)) { setStale(true); return; }
    const from = current.from + offset, to = current.to + offset;
    const marks = editor.state.doc.nodeAt(from)?.marks ?? [];
    editor.view.dispatch(closeHistory(editor.state.tr).replaceWith(from, to, editor.schema.text(text, marks)));
    editor.view.dispatch(closeHistory(editor.state.tr));
    snapshot.current = editor.state.doc;
    setOffset(value => value + text.length - current.word.length);
    next();
  };
  const save = (value: string[]) => {
    try { localStorage.setItem(dictionaryKey, JSON.stringify(value)); setPersonal(value); }
    catch { setError(message); }
  };
  return <dialog ref={dialog} className="spelling-dialog" aria-label={ko ? "맞춤법 검사" : "Check spelling"} onCancel={close}>
    <h2>{ko ? "맞춤법 검사" : "Check spelling"}</h2>
    <p>{ko ? "추천을 선택하거나 직접 입력한 뒤 ‘바꾸기’를 누르세요. 선택한 표현만 본문에 적용합니다." : "Choose a suggestion or enter your own replacement, then press Change. Only that expression will change."}</p>
    <p className="spelling-coverage">{ko ? "한국어 철자 검사 · 기기 안에서 처리" : "Korean spelling · checked on this device"}<br />
      {ko ? "문맥과 문장 단위 띄어쓰기는 검사하지 않습니다." : "Context and sentence-level spacing are not checked."}</p>
    {error && <p role="alert">{error}</p>}
    {stale && <p role="alert">{ko ? "본문이 변경되었습니다. 닫고 다시 검사하세요." : "Document changed. Close and check again."}</p>}
    {error ? null : busy ? <p role="status">{ko ? "검사 중…" : "Checking…"}</p> : current ? <section>
      <p>{ko ? "확인할 표현" : "Review word"}: <strong>{current.word}</strong></p>
      <p className="spelling-context">{snapshot.current.textBetween(Math.max(0, current.from + offset - 35), current.from + offset, " ")}<mark>{current.word}</mark>{snapshot.current.textBetween(current.to + offset, Math.min(snapshot.current.content.size, current.to + offset + 35), " ")}</p>
      <SpellingReplacement key={current.from} word={current.word} suggestions={results[current.word]}
        ko={ko} disabled={stale || !!error} replace={replace} />
      <div className="spelling-actions">
        <button type="button" onClick={next}>{ko ? "이번만 건너뛰기" : "Skip once"}</button>
        <button type="button" onClick={() => setIgnored(value => [...value, current.word])}>{ko ? "이번 검사에서 무시" : "Ignore this check"}</button>
        <button type="button" onClick={() => save([...personal, current.word])}>{ko ? "사용자 사전에 추가" : "Add to dictionary"}</button>
      </div>
    </section> : <p role="status" className="spelling-complete">{ko ? "철자 검사를 마쳤습니다. 추가 제안이 없더라도 띄어쓰기와 문맥은 직접 확인해 주세요." : "Spelling review complete. Even with no further suggestions, please review spacing and context yourself."}</p>}
    <details><summary>{ko ? "사용자 사전" : "Personal dictionary"} ({personal.length})</summary>
      <p>{ko ? "이 브라우저에 저장됩니다. 등록한 표현만 제외하며 조사가 붙은 표현은 별도로 등록하세요." : "Saved in this browser. Exact words only; add inflected forms separately."}</p>
      {personal.map(word => <div key={word}>{word} <button type="button" onClick={() => save(personal.filter(item => item !== word))}>{ko ? "삭제" : "Remove"}</button></div>)}
    </details>
    <p><a href="/spelling/ko/LICENSE.md" target="_blank" rel="noreferrer">{ko ? "한국어 사전 라이선스" : "Korean dictionary license"}</a></p>
    <button type="button" onClick={close}>{ko ? "닫기" : "Close"}</button>
  </dialog>;
}

function SpellingReplacement({ word, suggestions, ko, disabled, replace }: {
  word: string; suggestions: string[]; ko: boolean; disabled: boolean; replace(text: string): void;
}) {
  const [text, setText] = useState(suggestions[0] ?? word);
  return <form className="spelling-replacement" onSubmit={event => {
    event.preventDefault();
    if (!disabled && text.trim() && text !== word) replace(text);
  }}>
    <div className="spelling-suggestions" role="group" aria-label={ko ? "추천 표현" : "Suggestions"}>
      {suggestions.map(suggestion => <button type="button" key={suggestion} disabled={disabled}
        aria-pressed={text === suggestion} onClick={() => setText(suggestion)}>{suggestion}</button>)}
      {!suggestions.length && <p>{ko ? "사전에 없는 표현입니다. 직접 바꾸거나, 그대로 두거나, 사용자 사전에 추가할 수 있습니다." : "This expression is not in the dictionary. Enter a replacement, skip it, or add it to your dictionary."}</p>}
    </div>
    <label>{ko ? "바꿀 표현" : "Replace with"}
      <input value={text} maxLength={200} disabled={disabled} onChange={event => setText(event.target.value)} />
    </label>
    <button type="submit" disabled={disabled || !text.trim() || text === word}>{ko ? "바꾸기" : "Change"}</button>
  </form>;
}
