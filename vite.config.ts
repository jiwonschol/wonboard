import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { localAuthPlugin } from "./apps/server/src/vite-auth.ts";

export default defineConfig(({ mode }) => ({
  plugins: [localAuthPlugin(), react()],
  optimizeDeps: { include: ["@wonboard/editor > hunspell-asm"] },
  server: { watch: { usePolling: true, interval: 500 } },
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
