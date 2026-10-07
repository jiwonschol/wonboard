import type { Locale } from "@wonboard/document";
import { translator } from "@wonboard/locales";
import { version } from "../../../package.json";

export const appVersion = version;
const privacyUrl = "https://jiwonschol.github.io/wonboard/privacy.html";
const issuesUrl = "https://github.com/jiwonschol/wonboard/issues";
export const installGuideUrl = "https://github.com/jiwonschol/wonboard/blob/main/docs/install/README.md";

/** 베타 표시와 버전, 개인정보 안내, 문의 창구. 편집 화면의 더 보기와 로그인·설치 화면이 함께 쓴다. */
export function AboutLinks({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return <div className="about-links">
    <p>{t("betaVersion", { version })}</p>
    <p>{t("aboutBeta")}</p>
    <p><a href={locale === "en" ? `${privacyUrl}#english` : privacyUrl} target="_blank" rel="noopener noreferrer">{t("privacyGuide")}</a></p>
    <p><a href={issuesUrl} target="_blank" rel="noopener noreferrer">{t("contact")}</a></p>
  </div>;
}
