import { test, expect } from "@playwright/test";
import { account, authHeaders } from "./fixtures";

test("login rejects wrong credentials; reload and logout preserve writing", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveCount(0);
  await page.getByLabel("User ID", { exact: true }).fill(account.username);
  await page.getByLabel("Password", { exact: true }).fill("deliberately-wrong");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Check your user ID and password.",
  );
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Add title" })
    .fill("로그인 후에도 보존");
  await page
    .getByRole("textbox", { name: "Document body" })
    .fill("소중한 글 remains here");
  // Immediate logout exercises save-before-logout, before the autosave delay.
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Document body" }),
  ).toHaveCount(0);
  expect(
    (await (await context.request.get("/api/auth/session")).json())
      .authenticated,
  ).toBe(false);
  await page.reload();
  await page.getByLabel("User ID", { exact: true }).fill(account.username);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue(
    "로그인 후에도 보존",
  );
  await expect(page.getByRole("textbox", { name: "Document body" })).toHaveText(
    "소중한 글 remains here",
  );
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue(
    "로그인 후에도 보존",
  );
  const cookie = (await context.cookies()).find(
    (c) => c.name === "wonboard_session",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "wonboard_session",
  );
});

test("Korean mobile login fits and a missing server fails closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem("wonboard-locale", "ko"));
  await page.route("**/api/auth/**", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "로그인", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("로컬 서버");
  await page.getByLabel("아이디", { exact: true }).fill(account.username);
  await page.getByLabel("비밀번호", { exact: true }).fill("not-a-secret");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "제목 추가" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("server revocation locks the editor on focus without discarding the draft", async ({
  page,
  context,
}) => {
  await context.request.post("/api/auth/login", {
    data: account,
    headers: authHeaders,
  });
  await page.goto("/");
  await page.getByRole("textbox", { name: "Add title" }).fill("보존할 문서");
  await context.request.post("/api/auth/logout", {
    data: {},
    headers: authHeaders,
  });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeVisible();
  await page.getByLabel("User ID", { exact: true }).fill(account.username);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Add title" })).toHaveValue(
    "보존할 문서",
  );
});
