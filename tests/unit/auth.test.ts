import { describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createLocalAuth } from "../../apps/server/src/local-auth";

const account = { username: "test-writer", password: "test-only-password" };
const host = "127.0.0.1:5173";
function client(auth: ReturnType<typeof createLocalAuth>) {
  return async (
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) => {
    const req = Readable.from(
      body === undefined ? [] : [JSON.stringify(body)],
    ) as IncomingMessage;
    Object.assign(req, {
      method: body === undefined ? "GET" : "POST",
      url: `/api/auth/${path}`,
      headers: {
        host,
        origin: `http://${host}`,
        "content-type": "application/json",
        ...headers,
      },
      socket: { remoteAddress: "127.0.0.1" },
    });
    let status = 0;
    let result = "";
    const responseHeaders: Record<string, string> = {};
    const res = {
      setHeader(key: string, value: string) {
        responseHeaders[key.toLowerCase()] = value;
      },
      writeHead(code: number, values: Record<string, string>) {
        status = code;
        for (const [key, value] of Object.entries(values))
          this.setHeader(key, value);
      },
      end(value: string) {
        result = value;
      },
    };
    await auth(req, res as unknown as ServerResponse);
    return { status, body: JSON.parse(result), headers: responseHeaders };
  };
}
describe("single-user local authentication", () => {
  it("fails closed without configured credentials", async () => {
    const send = client(createLocalAuth({}));
    expect((await send("session")).body).toEqual({ authenticated: false });
    expect((await send("login", account)).status).toBe(503);
  });
  it("rejects a wrong user or password and forged cookies", async () => {
    const send = client(createLocalAuth(account));
    expect(
      (await send("login", { ...account, username: "someone-else" })).status,
    ).toBe(401);
    expect(
      (await send("login", { ...account, password: "wrong" })).status,
    ).toBe(401);
    expect(
      (await send("session", undefined, { cookie: "wonboard_session=forged" }))
        .body.authenticated,
    ).toBe(false);
  });
  it("issues an opaque HttpOnly session, restores it, and revokes it on logout", async () => {
    const send = client(createLocalAuth(account));
    const login = await send("login", account);
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"];
    expect(cookie).toMatch(
      /wonboard_session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=28800/,
    );
    expect(JSON.stringify(login)).not.toContain(account.password);
    const headers = { cookie: cookie.split(";")[0] };
    expect((await send("session", undefined, headers)).body.authenticated).toBe(
      true,
    );
    const logout = await send("logout", {}, headers);
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");
    expect((await send("session", undefined, headers)).body.authenticated).toBe(
      false,
    );
  });
  it("expires sessions and does not restore them after a server restart", async () => {
    let now = 1000;
    const send = client(
      createLocalAuth({ ...account, now: () => now, ttl: 1000 }),
    );
    const login = await send("login", account);
    const headers = { cookie: login.headers["set-cookie"].split(";")[0] };
    expect(
      (await client(createLocalAuth(account))("session", undefined, headers))
        .body.authenticated,
    ).toBe(false);
    now = 2000;
    expect((await send("session", undefined, headers)).body.authenticated).toBe(
      false,
    );
  });
  it("rejects cross-origin, missing-origin, form posts and DNS rebinding", async () => {
    const send = client(createLocalAuth(account));
    const invalidHeaders: Record<string, string>[] = [
      { origin: "https://attacker.test" },
      { origin: "" },
      { "content-type": "text/plain" },
      { host: "attacker.test" },
    ];
    for (const headers of invalidHeaders) {
      expect((await send("login", account, headers)).status).toBe(403);
      expect((await send("logout", {}, headers)).status).toBe(403);
    }
  });
  it("bounds the input and rate-limits failures, then permits retry", async () => {
    let now = 1000;
    const send = client(createLocalAuth({ ...account, now: () => now }));
    expect((await send("login", { password: "x".repeat(3000) })).status).toBe(
      413,
    );
    for (let n = 0; n < 9; n++)
      expect((await send("login", null)).status).toBe(400);
    expect((await send("login", account)).status).toBe(429);
    now += 60_000;
    expect((await send("login", account)).status).toBe(200);
  });
});
