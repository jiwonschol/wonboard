import type { Locale } from "@wonboard/document";

export function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem("wonboard-locale");
    if (saved === "ko" || saved === "en") return saved;
  } catch {}
  return navigator.language.startsWith("ko") ? "ko" : "en";
}
