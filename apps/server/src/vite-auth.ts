import { loadEnv, type Plugin, type ViteDevServer } from "vite";
import { createLocalAuth } from "./local-auth.ts";

export function localAuthPlugin(): Plugin {
  let settings: Record<string, string> = {};
  const install = (server: Pick<ViteDevServer, "middlewares">) => {
    const auth = createLocalAuth({
      username: settings.WONBOARD_LOGIN_ID,
      password: settings.WONBOARD_LOGIN_PASSWORD,
    });
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith("/api/")) return next();
      void auth(req, res).catch(() => {
        if (!res.headersSent)
          res.writeHead(500, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          });
        res.end('{"error":"unavailable"}');
      });
    });
  };
  return {
    name: "wonboard-local-auth",
    configResolved(config) {
      settings = loadEnv(config.mode, config.envDir, "WONBOARD_LOGIN_");
    },
    configureServer: install,
    configurePreviewServer: install,
  };
}
