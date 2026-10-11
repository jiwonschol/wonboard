import { test as base, expect } from "@playwright/test";
import { loadEnv } from "vite";

const config = loadEnv("development", process.cwd(), "WONBOARD_LOGIN_");
export const account = {
  username: config.WONBOARD_LOGIN_ID,
  password: config.WONBOARD_LOGIN_PASSWORD,
};
export const authHeaders = { Origin: "http://127.0.0.1:5173" };
export const test = base.extend<{ signedIn: void; diagnostics: void }>({
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
});
export { expect };
