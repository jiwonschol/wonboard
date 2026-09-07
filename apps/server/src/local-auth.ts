import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const COOKIE = "wonboard_session";
const TTL = 8 * 60 * 60 * 1000;
type Options = {
  username?: string;
  password?: string;
  now?: () => number;
  ttl?: number;
};

/** Local test authentication only. No document storage or production deployment. */
export function createLocalAuth({
  username,
  password,
  now = Date.now,
  ttl = TTL,
}: Options) {
  const salt = randomBytes(32);
  const expected = password ? scryptSync(password, salt, 32) : null;
  const sessions = new Map<string, number>();
  let attempts = 0;
  let windowEnd = 0;
  const reply = (res: ServerResponse, code: number, body: object) => {
    res.writeHead(code, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  return async (req: IncomingMessage, res: ServerResponse) => {
    const path = req.url?.split("?")[0];
    const host = req.headers.host ?? "";
    // A loopback-only test server must not accept DNS-rebinding or proxy traffic.
    if (
      !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host) ||
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress ?? "",
      )
    ) {
      return reply(res, 403, { error: "forbidden" });
    }
    for (const [token, expiry] of sessions)
      if (expiry <= now()) sessions.delete(token);
    const token =
      req.headers.cookie
        ?.split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith(`${COOKIE}=`))
        ?.slice(COOKIE.length + 1) ?? "";
    const expiresAt = sessions.get(token);
    if (path === "/api/auth/session" && req.method === "GET") {
      return reply(
        res,
        200,
        expiresAt
          ? { authenticated: true, username, expiresAt }
          : { authenticated: false },
      );
    }
    if (
      req.method !== "POST" ||
      !["/api/auth/login", "/api/auth/logout"].includes(path ?? "")
    ) {
      return reply(res, 404, { error: "notFound" });
    }
    // Strict Origin + JSON checks protect state-changing requests; no CORS is enabled.
    if (
      req.headers.origin !== `http://${host}` ||
      req.headers["content-type"]?.split(";")[0] !== "application/json"
    ) {
      return reply(res, 403, { error: "forbidden" });
    }
    const cookie = (value: string, seconds: number) =>
      res.setHeader(
        "Set-Cookie",
        `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}`,
      );
    if (path === "/api/auth/logout") {
      sessions.delete(token);
      cookie("", 0);
      return reply(res, 200, { authenticated: false });
    }
    if (!username || !expected)
      return reply(res, 503, { error: "unavailable" });
    if (now() >= windowEnd) {
      attempts = 0;
      windowEnd = now() + 60_000;
    }
    if (attempts >= 10) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((windowEnd - now()) / 1000)),
      );
      return reply(res, 429, { error: "rateLimited" });
    }
    attempts++;
    let body: { username?: unknown; password?: unknown };
    try {
      // 청크 경계가 다바이트 UTF-8 문자를 가르면 청크마다 따로 디코딩한 문자열에
      // 대체 문자가 박힌다. 비ASCII 자격증명이 네트워크 분할에 따라 간헐적으로 틀리게
      // 읽히던 자리라, 바이트를 다 모은 뒤 한 번에 디코딩한다.
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.byteLength;
        if (size > 2048) return reply(res, 413, { error: "invalid" });
        chunks.push(buffer);
      }
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        !body ||
        typeof body.username !== "string" ||
        typeof body.password !== "string"
      )
        throw new Error();
    } catch {
      return reply(res, 400, { error: "invalid" });
    }
    const candidate = await new Promise<Buffer>((resolve, reject) =>
      scrypt(body.password as string, salt, 32, (error, key) =>
        error ? reject(error) : resolve(key),
      ),
    );
    if (!timingSafeEqual(candidate, expected) || body.username !== username)
      return reply(res, 401, { error: "invalidCredentials" });
    attempts = Math.max(0, attempts - 1);
    sessions.delete(token);
    // Bound memory even if a local client repeatedly requests new sessions.
    if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!);
    const fresh = randomBytes(32).toString("hex");
    const expiry = now() + ttl;
    sessions.set(fresh, expiry);
    cookie(fresh, Math.floor(ttl / 1000));
    return reply(res, 200, {
      authenticated: true,
      username,
      expiresAt: expiry,
    });
  };
}
