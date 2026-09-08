import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/sites-e2e", workers: 1, fullyParallel: false, timeout: 45_000,
  outputDir: "/private/tmp/wonboard-sites-playwright-results", reporter: "list",
  use: { baseURL: "http://127.0.0.1:5174", locale: "en-US", screenshot: "only-on-failure" },
  webServer: { command: "pnpm exec vite --config vite.sites-test.config.ts --mode sites-test --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174", reuseExistingServer: false },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"],
    channel: process.env.WONBOARD_TEST_CHANNEL === "chrome" ? "chrome" : undefined } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } }],
});
