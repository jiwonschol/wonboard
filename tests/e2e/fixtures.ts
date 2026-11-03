import { test as base, expect, type Page, type Request } from "@playwright/test";
import { loadEnv } from "vite";

const config = loadEnv("development", process.cwd(), "WONBOARD_LOGIN_");
export const account = {
  username: config.WONBOARD_LOGIN_ID,
  password: config.WONBOARD_LOGIN_PASSWORD,
};
export const authHeaders = { Origin: "http://127.0.0.1:5173" };
// 페이지마다 아직 끝나지 않은 글꼴 요청(#74). reloadAfterFonts가 이것이 비기를 기다린다.
const pendingFonts = new WeakMap<Page, Set<Request>>();
const isFontRequest = (request: Request) => request.resourceType() === "font" || /\.(woff2?|ttf|otf)(\?|$)/i.test(request.url());

// Firefox는 글꼴을 내려받는 중에 페이지를 떠나면 요청이 NS_BINDING_ABORTED(0x804B0002 =
// 2152398850)로 끊기고 「downloadable font: download failed … status=2152398850」을 콘솔 오류로
// 남긴다(#74). 앱 결함이 아니므로 이 문구만 집계에서 뺀다. 글꼴 다운로드 문구와 status 코드,
// 글꼴 파일 주소를 함께 맞춘다. 다른 status(404 등)나 다른 콘솔 오류는 그대로 남는다.
const firefoxFontAbort = /^\[JavaScript Error: "downloadable font: download failed \(font-family: [^)]*\): status=2152398850 source: \S+\.(woff2?|ttf|otf)"\]/;
export const isAbortedFontDownload = (text: string) => firefoxFontAbort.test(text);

// 페이지의 잡히지 않은 예외와 콘솔 오류를 모은다. 글꼴 다운로드 중단만 뺀다.
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && !isAbortedFontDownload(message.text())) errors.push(message.text()); });
  return errors;
}

// 글꼴 요청이 다 끝난 뒤 다시 읽는다(#74). 내려받는 중에 다시 읽으면 Firefox는 위 콘솔 오류를,
// WebKit은 page.reload 자체의 「Connection reset by peer」를 낸다. document.fonts.ready는 아직
// 요청이 시작되지 않은 글꼴을 기다려 주지 않으므로, 실제로 오간 글꼴 요청이 비었는지를 다음
// 프레임에서 한 번 더 확인한다.
export async function reloadAfterFonts(page: Page) {
  const pending = pendingFonts.get(page);
  if (!pending) throw new Error("font requests are not tracked for this page");
  const settled = async () => {
    await page.evaluate(() => document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    return pending.size;
  };
  await expect.poll(async () => (await settled()) + (await settled()), { timeout: 15000, message: "font requests did not settle before reload" }).toBe(0);
  await page.reload();
}

export const test = base.extend<{ signedIn: void; diagnostics: void; fontRequests: void }>({
  signedIn: [
    async ({ context }, use) => {
      const response = await context.request.post("/api/auth/login", {
        data: account,
        headers: authHeaders,
      });
      expect(response.status()).toBe(200);
      await use();
    },
    { auto: true },
  ],
  // 드물게만 나는 실패(#60)의 원인을 다음 실행에서 바로 잡도록, 시험이 실패하면
  // 그동안 페이지·Worker에서 난 콘솔 오류, 잡히지 않은 예외, 실패한 요청, 요청별 소요 시간을 출력하고
  // 첨부한다. list 리포터는 콘솔 오류를 남기지 않고 스크린샷은 다음 실행이 지운다.
  diagnostics: [
    async ({ context }, use, testInfo) => {
      const lines: string[] = [];
      const start = Date.now();
      const log = (kind: string, text: string) => lines.push(`+${Date.now() - start}ms ${kind} ${text}`);
      context.on("page", page => {
        page.on("console", message => { if (message.type() === "error" || message.type() === "warning") log(`console.${message.type()}`, message.text()); });
        page.on("pageerror", error => log("pageerror", error.stack ?? error.message));
        page.on("worker", worker => {
          log("worker.start", worker.url());
          worker.on("console", message => { if (message.type() === "error" || message.type() === "warning") log(`worker.console.${message.type()}`, message.text()); });
          worker.on("close", () => log("worker.close", worker.url()));
        });
      });
      context.on("requestfailed", request => log("requestfailed", `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`));
      context.on("response", response => { if (response.status() >= 400) log(`response.${response.status()}`, `${response.request().method()} ${response.url()}`); });
      // 실패가 아니라 느려서 안 끝난 경우를 trace 없이 가르도록 요청마다 소요 시간을 남긴다.
      // timing()의 responseEnd는 요청 시작부터 응답 본문을 다 받기까지의 ms다.
      context.on("requestfinished", request => {
        const { responseStart, responseEnd } = request.timing();
        log("requestfinished", `${request.method()} ${request.url()} ttfb=${Math.round(responseStart)}ms total=${Math.round(responseEnd)}ms`);
      });
      await use();
      if (testInfo.status === testInfo.expectedStatus || !lines.length) return;
      const text = lines.join("\n");
      await testInfo.attach("browser-diagnostics", { body: text, contentType: "text/plain" });
      console.log(`[browser-diagnostics] ${testInfo.titlePath.join(" › ")}\n${text}`);
    },
    { auto: true },
  ],
  fontRequests: [
    async ({ context }, use) => {
      context.on("page", page => {
        const pending = new Set<Request>();
        pendingFonts.set(page, pending);
        page.on("request", request => { if (isFontRequest(request)) pending.add(request); });
        page.on("requestfinished", request => pending.delete(request));
        page.on("requestfailed", request => pending.delete(request));
      });
      await use();
    },
    { auto: true },
  ],
});
export { expect };
