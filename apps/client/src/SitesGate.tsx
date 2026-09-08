import { useEffect, useRef, useState } from "react";
import { translator, type MessageKey } from "@wonboard/locales";
import type { Locale } from "@wonboard/document";
import App from "./App";
import { initialLocale } from "./locale";
import { sitesRequest } from "./draftRepository";

type Session = { mode: "sites"; authenticated: boolean; owner: boolean;
  configured: boolean; username: string; setupRequired: boolean };

export default function SitesGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [opened, setOpened] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connectionId, setConnectionId] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const [error, setError] = useState<MessageKey | "">("");
  const version = useRef(0);
  const t = translator(locale);
  async function check() {
    const current = ++version.current;
    setChecking(true);
    setConnectionId("");
    setConnectionError(false);
    try {
      const value = await (await sitesRequest("/api/sites/session")).json();
      if (value.mode !== "sites" || typeof value.authenticated !== "boolean" || typeof value.owner !== "boolean" ||
          typeof value.configured !== "boolean" || typeof value.setupRequired !== "boolean")
        throw new Error();
      if (current !== version.current) return;
      setSession(value);
      setError("");
      if (value.owner && !value.setupRequired) setOpened(true);
    } catch { if (current === version.current) setError("sitesUnavailable"); }
    finally { if (current === version.current) setChecking(false); }
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
        : !session.configured ? <>
          <p role="status">{t("sitesNotConfigured")}</p>
          <p>{t("sitesSetupHelp")}</p>
          <button disabled={checking || pending} onClick={() => void check()}>
            {t(checking ? "sitesCheckingSetup" : "sitesCheckSetup")}
          </button>
          {!session.authenticated
            ? <a className="sites-signin" href="/signin-with-chatgpt?return_to=%2F" target="_top">{t("sitesSignIn")}</a>
            : <details><summary>{t("sitesConnectionDetails")}</summary>
              <p>{t("sitesConnectionHelp")}</p>
              <button disabled={pending || checking} onClick={() => void showConnection()}>{t("sitesReadConnection")}</button>
              {connectionId && <p><code className="sites-connection-id" aria-label={t("sitesConnectionId")}>{connectionId}</code></p>}
              {connectionError && <p role="alert">{t("sitesConnectionFailed")}</p>}
            </details>}
        </>
        : !session.authenticated ? <><p>{t("sitesLoginIntro")}</p><a className="sites-signin" href="/signin-with-chatgpt?return_to=%2F" target="_top">{t("sitesSignIn")}</a></>
        : !session.owner ? <><p>{t("sitesOwnerOnly")}</p><a href="/signout-with-chatgpt?return_to=%2F" target="_top">{t("logout")}</a></>
        : <>
          <p>{t("sitesWelcome", { name: session.username })}</p>
          <ol className="sites-notices"><li>{t("sitesPrivateNotice")}</li><li>{t("sitesPublicNotice")}</li><li>{t("sitesRetentionNotice")}</li><li>{t("sitesRightsNotice")}</li></ol>
          <details><summary>{t("sitesDetails")}</summary><p>{t("sitesDataNotice")}</p>
            <p><a href="https://openai.com/policies/chatgpt-sites-terms/" target="_blank" rel="noopener noreferrer">{t("sitesPlatformTerms")}</a></p>
          </details>
          <label className="sites-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />{t("sitesAccept")}</label>
          <button disabled={!accepted || pending} onClick={() => void setup()}>{t(pending ? "saving" : "sitesStart")}</button>
        </>}
    </section></main>}
  </>;
}
