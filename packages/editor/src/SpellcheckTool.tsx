import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import type { Locale } from "@wonboard/document";
import { dictionaryKey, readPersonalDictionary } from "./spelling";
import { replaceSpelling, spellingSegments } from "./proofreading/document";
import type { Finding } from "./proofreading/engine.mjs";
import oktLicense from "../../../third_party/spelling/open-korean-text/LICENSE?raw";
import morphologyLicense from "../../../third_party/spelling/mecab-ko-dic/COPYING?raw";
import englishLicense from "../../../third_party/spelling/scowl/Copyright?raw";
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
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const applying = useRef(false);
  const skipped = useRef<{ from: number; to: number; original: string }[]>([]);
  const [results, setResults] = useState<Finding[]>([]);
  const [personal, setPersonal] = useState<string[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const current = results.slice(index).find(item => !ignored.includes(item.original) && !skipped.current.some(skip => skip.from === item.from && skip.to === item.to && skip.original === item.original));
  const skipButton = useRef<HTMLButtonElement>(null);
  const message = ko ? "검사 또는 사전 저장에 실패했습니다. 닫고 다시 시도하세요." : "Check or dictionary storage failed. Close and retry.";
  const check = (saved = personal) => {
    if (!worker.current) { setError(message); setBusy(false); return; }
    if (editor.view.composing) { setStale(true); return; }
    snapshot.current = editor.state.doc;
    setStale(false); setBusy(true); setIndex(0); setError("");
    worker.current.postMessage({ id: ++request.current, segments: spellingSegments(snapshot.current), personal: saved });
  };
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    skipped.current = []; setIgnored([]); setResults([]);
    let saved: string[];
    try { saved = readPersonalDictionary(); setPersonal(saved); }
    catch { setError(message); setBusy(false); return; }
    let active: Worker;
    try { active = new Worker(new URL("./proofreading/review.worker.ts", import.meta.url), { type: "module" }); }
    catch { setError(message); setBusy(false); return; }
    worker.current = active;
    active.onerror = () => { setError(message); setBusy(false); };
    active.onmessage = ({ data }) => {
      if (data.id !== request.current) return;
      setBusy(false);
      if (data.error) setError(message);
      else setResults(data.results);
    };
    const changed = () => {
      if (!applying.current && !editor.state.doc.eq(snapshot.current)) {
        request.current++; skipped.current = []; setIgnored([]); setStale(true); setBusy(false);
      }
    };
    editor.on("transaction", changed);
    check(saved);
    return () => { active.terminate(); worker.current = null; editor.off("transaction", changed); };
  }, [editor]);
  useEffect(() => { if (!busy && current) skipButton.current?.focus(); }, [busy, current]);
  const next = () => { if (current) { skipped.current.push(current); setIndex(results.indexOf(current) + 1); } };
  const replace = (text: string) => {
    if (!current || !editor.isEditable || editor.view.composing || !editor.state.doc.eq(snapshot.current)) { setStale(true); return; }
    try {
      const tr = replaceSpelling(closeHistory(editor.state.tr), current.from, current.to, current.original, text);
      skipped.current = skipped.current.filter(item => item.to <= current.from || item.from >= current.to).map(item => ({ ...item,
        from: tr.mapping.map(item.from, 1), to: tr.mapping.map(item.to, -1) }));
      applying.current = true;
      editor.view.dispatch(tr);
      editor.view.dispatch(closeHistory(editor.state.tr));
      check();
    } catch { setError(message); }
    finally { applying.current = false; }
  };
  const save = (value: string[]) => {
    try { localStorage.setItem(dictionaryKey, JSON.stringify(value)); setPersonal(value); check(value); }
    catch { setError(message); }
  };
  return <dialog ref={dialog} className="spelling-dialog" aria-label={ko ? "맞춤법 검사" : "Check spelling"} onCancel={close}
    onKeyDown={event => { if (event.key === "Enter" && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault(); }}>
    <h2>{ko ? "맞춤법 검사" : "Check spelling"}</h2>
    <p>{ko ? "추천을 선택하거나 직접 입력한 뒤 ‘바꾸기’를 누르세요. 선택한 표현만 본문에 적용합니다." : "Choose a suggestion or enter your own replacement, then press Change. Only that expression will change."}</p>
    <p className="spelling-coverage">{ko ? "한국어 철자·띄어쓰기 / 영어 철자 · 기기 안에서 처리" : "Korean spelling and spacing / English spelling · on this device"}<br />
      {ko ? "개발 중인 검사입니다. 한국어 철자 검출은 아직 제한적이며, 영어 문법과 문맥은 검사하지 않습니다." : "Experimental checker. Korean spelling coverage is limited; English grammar and context are not checked."}</p>
    {error && <p role="alert">{error}</p>}
    {stale && <p role="alert">{ko ? "본문이 변경되었거나 입력 중입니다. 다시 검사하세요." : "Document changed or input is composing. Check again."}</p>}
    {stale && !error && <button type="button" onClick={() => check()}>{ko ? "다시 검사" : "Check again"}</button>}
    {error ? null : busy ? <p role="status">{ko ? "검사 중…" : "Checking…"}</p> : current ? <section>
      <p>{current.type === "unknown" ? (ko ? "사전에 없는 표현" : "Unrecognized expression") : current.type === "spacing" ? (ko ? "띄어쓰기 제안" : "Spacing suggestion") : (ko ? "철자 제안" : "Spelling suggestion")}: <strong>{current.original}</strong></p>
      {current.ambiguous && <p>{ko ? "문맥에 따라 원문도 맞을 수 있습니다." : "The original may be correct in context."}</p>}
      {current.original.length > 64 && <p>{ko ? "공백 없이 64자를 넘는 구간은 현재 분석 범위를 초과합니다. 오류 판정이 아닙니다." : "An unbroken span over 64 characters exceeds the current analysis limit. This is not an error verdict."}</p>}
      <p className="spelling-context">{snapshot.current.textBetween(Math.max(0, current.from - 35), current.from, " ")}<mark>{current.original}</mark>{snapshot.current.textBetween(current.to, Math.min(snapshot.current.content.size, current.to + 35), " ")}</p>
      <SpellingReplacement key={`${current.from}:${current.original}`} word={current.original} suggestions={current.suggestions}
        ko={ko} disabled={stale || !!error || current.original.length > 200} replace={replace} />
      <div className="spelling-actions">
        <button ref={skipButton} type="button" onClick={next}>{ko ? "이번만 건너뛰기" : "Skip once"}</button>
        <button type="button" onClick={() => setIgnored(value => [...value, current.original])}>{ko ? "이번 검사에서 무시" : "Ignore this check"}</button>
      </div>
      {current.type === "unknown" && <DictionaryEntry key={`dictionary:${current.from}:${current.original}`} initial={current.base ?? current.original} ko={ko} disabled={stale} add={word => save([...new Set([...personal, word])])} />}
    </section> : <p role="status" className="spelling-complete">{ko ? "철자 검사를 마쳤습니다. 추가 제안이 없더라도 띄어쓰기와 문맥은 직접 확인해 주세요." : "Spelling review complete. Even with no further suggestions, please review spacing and context yourself."}</p>}
    <details><summary>{ko ? "사용자 사전" : "Personal dictionary"} ({personal.length})</summary>
      <p>{ko ? "이 기기에 저장됩니다. 기본 단어와 지원하는 조사 결합을 인식하며 주변 띄어쓰기는 계속 검사합니다." : "Saved on this device. Recognizes base words and supported Korean particles; surrounding spacing is still checked."}</p>
      {personal.map(word => <div key={word}>{word} <button type="button" onClick={() => save(personal.filter(item => item !== word))}>{ko ? "삭제" : "Remove"}</button></div>)}
    </details>
    <details><summary>{ko ? "사전 출처와 라이선스" : "Dictionary sources and licenses"}</summary>
      <p>Open Korean Text · MeCab Ko Dic (data only) · SCOWL/ESDB. Wonboard generated subsets; original notices retained.</p>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{oktLicense}{"\n"}{morphologyLicense}{"\n"}{englishLicense}</pre>
    </details>
    <button type="button" onClick={close}>{ko ? "닫기" : "Close"}</button>
  </dialog>;
}

function SpellingReplacement({ word, suggestions, ko, disabled, replace }: {
  word: string; suggestions: string[]; ko: boolean; disabled: boolean; replace(text: string): void;
}) {
  const [text, setText] = useState(suggestions[0] ?? word);
  return <form className="spelling-replacement" onSubmit={event => {
    event.preventDefault();
  }}>
    <div className="spelling-suggestions" role="group" aria-label={ko ? "추천 표현" : "Suggestions"}>
      {suggestions.map(suggestion => <button type="button" key={suggestion} disabled={disabled}
        aria-pressed={text === suggestion} onClick={() => setText(suggestion)}>{suggestion}</button>)}
      {!suggestions.length && <p>{ko ? "사전에 없는 표현입니다. 직접 바꾸거나, 그대로 두거나, 사용자 사전에 추가할 수 있습니다." : "This expression is not in the dictionary. Enter a replacement, skip it, or add it to your dictionary."}</p>}
    </div>
    <label>{ko ? "바꿀 표현" : "Replace with"}
      <input value={text} maxLength={200} disabled={disabled} onChange={event => setText(event.target.value)} />
    </label>
    <button type="button" onClick={() => replace(text)} disabled={disabled || !text.trim() || text === word}>{ko ? "바꾸기" : "Change"}</button>
  </form>;
}

function DictionaryEntry({ initial, ko, disabled, add }: { initial: string; ko: boolean; disabled: boolean; add(word: string): void }) {
  const [word, setWord] = useState(initial);
  return <div className="spelling-replacement"><label>{ko ? "등록할 기본 단어" : "Base word to add"}<input maxLength={64} value={word} onChange={e => setWord(e.target.value)} /></label>
    <button type="button" disabled={disabled || !/^[\p{L}][\p{L}'’-]*$/u.test(word)} onClick={() => add(word)}>{ko ? "사용자 사전에 추가" : "Add to dictionary"}</button></div>;
}
