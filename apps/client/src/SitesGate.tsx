import { useEffect, useRef, useState } from "react";
import { translator, type MessageKey } from "@wonboard/locales";
import type { Locale } from "@wonboard/document";
import App from "./App";
import { initialLocale } from "./locale";
import { sitesRequest } from "./draftRepository";
import { AboutLinks, installGuideUrl } from "./AboutLinks";

type Session = { mode: "sites"; authenticated: boolean; owner: boolean;
  configured: boolean; username: string; setupRequired: boolean };
const signInKey = "wonboard-sites-signin";

export default function SitesGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [opened, setOpened] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [connectionId, setConnectionId] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const [error, setError] = useState<MessageKey | "">("");
  // 로그인하러 나갔다 돌아왔는데도 서버가 계정을 모르면 식별값이 전달되지 않은 것이다.
  const [returned] = useState(() => {
    try { return sessionStorage.getItem(signInKey) !== null; } catch { return false; }
  });
  const version = useRef(0);
  const currentLocale = useRef(locale);
  currentLocale.current = locale;
  const t = translator(locale);
  async function readSession(): Promise<Session> {
    const value = await (await sitesRequest("/api/sites/session")).json();
    if (value.mode !== "sites" || typeof value.authenticated !== "boolean" || typeof value.owner !== "boolean" ||
        typeof value.configured !== "boolean" || typeof value.setupRequired !== "boolean")
      throw new Error();
    return value;
  }
  async function check() {
    const current = ++version.current;
    setConnectionId("");
    setConnectionError(false);
    try {
      let value = await readSession();
      // 주인이 없는 새 Site에 처음 로그인한 계정을 주인으로 기록한다. 누가 기록됐는지는 서버가 정한다.
      if (!value.configured && value.authenticated) {
        await sitesRequest("/api/sites/claim", { method: "POST",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: currentLocale.current }) });
        value = await readSession();
      }
      if (current !== version.current) return;
      setSession(value);
      setError("");
      if (value.owner && !value.setupRequired) setOpened(true);
    } catch { if (current === version.current) setError("sitesUnavailable"); }
  }
  async function showConnection() {
    const current = version.current;
    setPending(true);
    setConnectionError(false);
    try {
      const value = await (await sitesRequest("/api/sites/identity")).json();
      if (typeof value.userId !== "string" || !value.userId) throw new Error();
      if (current === version.current) setConnectionId(value.userId);
    } catch { if (current === version.current) setConnectionError(true); }
    finally { setPending(false); }
  }
  useEffect(() => {
    try { sessionStorage.removeItem(signInKey); } catch {}
    void check();
    const focus = () => void check();
    window.addEventListener("focus", focus);
    const timer = setInterval(focus, 60_000);
    return () => { ++version.current; clearInterval(timer); window.removeEventListener("focus", focus); };
  }, []);
  async function setup() {
    if (!accepted) return;
    setPending(true);
    try {
      await sitesRequest("/api/sites/setup", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: true, locale }) });
      await check();
    } catch { setError("sitesUnavailable"); }
    finally { setPending(false); }
  }
  const ready = Boolean(session?.owner && !session.setupRequired);
  return <>
    {opened && <div hidden={!ready} inert={!ready}>
      <App storageMode="sites" onLogout={async () => {
        window.location.assign("/signout-with-chatgpt?return_to=%2F"); return true;
      }} />
    </div>}
    {!ready && <main className="auth-page"><section className="auth-card sites-onboarding" aria-labelledby="sites-title">
      <div className="auth-wordmark" aria-hidden="true">W</div>
      <h1 id="sites-title">Wonboard</h1>
      <select aria-label={t("language")} value={locale} onChange={e => {
        const next = e.target.value as Locale;
        setLocale(next); document.documentElement.lang = next;
        try { localStorage.setItem("wonboard-locale", next); } catch {}
      }}><option value="ko">한국어</option><option value="en">English</option></select>
      {error && <p role="alert">{t(error)}</p>}
      {!session ? <><p role="status">{t("loginChecking")}</p>{error && <button onClick={() => void check()}>{t("retry")}</button>}</>
        : !session.authenticated ? <>
          {returned && <p role="alert">{t("sitesConnectionFailed")}</p>}
          <p>{t(session.configured ? "sitesLoginIntro" : "sitesFirstOwner")}</p>
          {!session.configured && <p><a href={installGuideUrl} target="_blank" rel="noopener noreferrer">{t("installGuide")}</a></p>}
          <a className="sites-signin" href="/signin-with-chatgpt?return_to=%2F" target="_top" onClick={() => {
            try { sessionStorage.setItem(signInKey, "1"); } catch {}
          }}>{t("sitesSignIn")}</a>
        </>
        : !session.owner ? <>
          <p>{t("sitesOwnerOnly")}</p>
          <p><a href="/signout-with-chatgpt?return_to=%2F" target="_top">{t("logout")}</a></p>
          <details><summary>{t("sitesConnectionDetails")}</summary>
            <p>{t("sitesConnectionHelp")}</p>
            <p><a href={installGuideUrl} target="_blank" rel="noopener noreferrer">{t("installGuide")}</a></p>
            <button disabled={pending} onClick={() => void showConnection()}>{t("sitesReadConnection")}</button>
            {connectionId && <p><code className="sites-connection-id" aria-label={t("sitesConnectionId")}>{connectionId}</code></p>}
            {connectionError && <p role="alert">{t("sitesConnectionFailed")}</p>}
          </details>
        </>
        : <>
          <p>{t("sitesWelcome", { name: session.username })}</p>
          <ol className="sites-notices"><li>{t("sitesPrivateNotice")}</li><li>{t("sitesPublicNotice")}</li><li>{t("sitesRetentionNotice")}</li><li>{t("sitesRightsNotice")}</li></ol>
          <details><summary>{t("sitesDetails")}</summary><p>{t("sitesDataNotice")}</p>
            <p>{t("sitesStopNotice")}</p>
            <p><a href="https://learn.chatgpt.com/docs/sites?surface=app#take-down-or-delete-a-site" target="_blank" rel="noopener noreferrer">{t("sitesDeleteGuide")}</a></p>
            <p><a href="https://openai.com/policies/chatgpt-sites-terms/" target="_blank" rel="noopener noreferrer">{t("sitesPlatformTerms")}</a></p>
          </details>
          <label className="sites-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />{t("sitesAccept")}</label>
          <button disabled={!accepted || pending} onClick={() => void setup()}>{t(pending ? "saving" : "sitesStart")}</button>
        </>}
      <AboutLinks locale={locale} />
    </section></main>}
  </>;
}
