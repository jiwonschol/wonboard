import { test as base, expect } from "@playwright/test";
import { loadEnv } from "vite";

const config = loadEnv("development", process.cwd(), "WONBOARD_LOGIN_");
export const account = {
  username: config.WONBOARD_LOGIN_ID,
  password: config.WONBOARD_LOGIN_PASSWORD,
};
export const authHeaders = { Origin: "http://127.0.0.1:5173" };
export const test = base.extend<{ signedIn: void }>({
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
});
export { expect };
