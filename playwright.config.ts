import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  // macOS 전용 절대 경로를 쓰면 /private 이 없는 리눅스에서 만들지 못해 시험이
  // 시작도 못 하고 권한 오류로 죽는다. 저장소 안의 상대 경로로 둔다(gitignore).
  outputDir: "./test-results",
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "en-US",
    viewport: { width: 948, height: 815 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"],
      channel: process.env.WONBOARD_TEST_CHANNEL === "chrome" ? "chrome" : undefined } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
