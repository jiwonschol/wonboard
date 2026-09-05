import { useEffect, useRef, useState, type FormEvent } from "react";
import { translator, type MessageKey } from "@wonboard/locales";
import type { Locale } from "@wonboard/document";
import App from "./App";
import { initialLocale } from "./locale";

type Session = { authenticated: true; username: string; expiresAt: number };
type AuthResponse = Session | { authenticated: false };
async function authRequest(path: string, body?: object): Promise<AuthResponse> {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "loginInvalid"
        : response.status === 429
          ? "loginRateLimited"
          : "loginUnavailable",
    );
  const value = await response.json();
  if (value.authenticated === false) return value;
  if (
    value.authenticated !== true ||
    typeof value.username !== "string" ||
    !Number.isFinite(value.expiresAt)
  )
    throw new Error("loginUnavailable");
  return value;
}

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [opened, setOpened] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MessageKey | "">("");
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const requestVersion = useRef(0);
  const changingSession = useRef(false);
  const t = translator(locale);
  const applySession = (value: AuthResponse) => {
    if (value.authenticated) {
      setSession(value);
      setOpened(true);
    } else {
      setSession(null);
      setLocale(initialLocale());
    }
  };
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (changingSession.current) return;
      const version = ++requestVersion.current;
      try {
        const value = await authRequest("session");
        if (active && version === requestVersion.current) applySession(value);
      } catch {
        if (active && version === requestVersion.current)
          setError("loginUnavailable");
      } finally {
        if (active) setChecking(false);
      }
    };
    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(onFocus, 60_000);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        ++requestVersion.current;
        setSession(null);
        setLocale(initialLocale());
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const version = ++requestVersion.current;
    changingSession.current = true;
    setPending(true);
    setError("");
    try {
      const value = await authRequest("login", {
        username: data.get("username"),
        password: data.get("password"),
      });
      if (version === requestVersion.current) applySession(value);
      form.reset();
    } catch (e) {
      const key = e instanceof Error ? e.message : "";
      setError(
        key === "loginInvalid" || key === "loginRateLimited"
          ? key
          : "loginUnavailable",
      );
    } finally {
      changingSession.current = false;
      setPending(false);
    }
  }
  async function logout() {
    changingSession.current = true;
    ++requestVersion.current;
    try {
      await authRequest("logout", {});
      ++requestVersion.current;
      setSession(null);
      setError("");
      setLocale(initialLocale());
      return true;
    } catch {
      return false;
    } finally {
      changingSession.current = false;
    }
  }
  return (
    <>
      {/* Keep the mounted draft when a session expires; never discard in-memory edits. */}
      {opened && (
        <div hidden={!session} inert={!session}>
          <App onLogout={logout} />
        </div>
      )}
      {!session && (
        <main className="auth-page">
          <section className="auth-card" aria-labelledby="login-title">
            <div className="auth-wordmark" aria-hidden="true">
              W
            </div>
            <h1 id="login-title">Wonboard</h1>
            <p>{t("loginIntro")}</p>
            {checking ? (
              <p role="status">{t("loginChecking")}</p>
            ) : (
              <form onSubmit={(e) => void login(e)}>
                <label htmlFor="login-id">{t("loginId")}</label>
                <input
                  id="login-id"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={100}
                  autoFocus
                />
                <label htmlFor="login-password">{t("loginPassword")}</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={256}
                />
                {error && (
                  <p className="auth-error" role="alert">
                    {t(error)}
                  </p>
                )}
                <button type="submit" disabled={pending}>
                  {t(pending ? "loginChecking" : "loginSubmit")}
                </button>
              </form>
            )}
            <p className="auth-note">{t("loginLocalHint")}</p>
            <select
              aria-label={t("language")}
              value={locale}
              onChange={(e) => {
                const value = e.target.value as Locale;
                setLocale(value);
                document.documentElement.lang = value;
                try {
                  localStorage.setItem("wonboard-locale", value);
                } catch {}
              }}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </section>
        </main>
      )}
    </>
  );
}
