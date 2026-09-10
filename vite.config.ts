import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { localAuthPlugin } from "./apps/server/src/vite-auth.ts";

export default defineConfig(({ mode }) => ({
  plugins: [localAuthPlugin(), react()],
  server: {
    watch: { usePolling: true, interval: 500, ignored: ["**/local-corpora/**"] },
    fs: { deny: [".env", ".env.*", "*.{crt,pem,key,p12,pfx,cer,der}", ".npmrc", ".yarnrc.yml", "**/.git/**", "**/local-corpora/**"] },
  },
  build: {
    outDir: mode.startsWith("sites") ? "dist/client" : "dist",
    rollupOptions: {
      input: {
        client: resolve("index.html"),
        ...(!mode.startsWith("sites") ? { embedded: resolve("examples/embedded-editor/index.html") } : {}),
      },
    },
  },
}));
