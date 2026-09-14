import type { Plugin } from "vite";
import { createSitesTestRuntime } from "./sites-runtime.ts";
import type { SitesEnv } from "../../apps/server/src/sites/types.ts";

/** Loopback-only test double. Imported by Vite exclusively in sites-test mode. */
export function sitesTestPlugin(): Plugin {
  let runtime = createSitesTestRuntime();
  return { name: "wonboard-sites-test-only", configureServer(server) {
    server.httpServer?.once("close", () => runtime.close());
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split("?")[0] ?? "";
      if (!path.startsWith("/api/") && !path.startsWith("/media/") && path !== "/__sites-test/reset") return next();
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host ?? "") ||
          !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")) {
        res.writeHead(403); res.end(); return;
      }
      if (path === "/__sites-test/reset" && req.method === "POST") {
        runtime.close(); runtime = createSitesTestRuntime(); res.writeHead(204); res.end(); return;
      }
      void (async () => {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 21 * 1024 * 1024) { res.writeHead(413); res.end(); return; }
          chunks.push(chunk);
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers))
          if (typeof value === "string" && !key.startsWith("oai-")) headers.set(key, value);
        if (typeof req.headers["x-wonboard-test-user"] === "string") {
          headers.set("oai-authenticated-user-id", req.headers["x-wonboard-test-user"]);
          headers.set("oai-authenticated-user-full-name", "Test Author");
        }
        const module = await server.ssrLoadModule("/apps/server/src/sites/worker.ts") as {
          handleSitesRequest(request: Request, env: SitesEnv): Promise<Response>;
        };
        const response = await module.handleSitesRequest(new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method, headers,
          body: chunks.length ? new Blob([Buffer.concat(chunks)]) : undefined,
        }), runtime.env);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
      })().catch(() => { res.writeHead(500); res.end(); });
    });
  } };
}
