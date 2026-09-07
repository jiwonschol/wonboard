import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { localAuthPlugin } from "./apps/server/src/vite-auth.ts";

export default defineConfig({
  plugins: [localAuthPlugin(), react()],
  server: { watch: { usePolling: true, interval: 500 } },
  build: {
    rollupOptions: {
      input: {
        client: resolve("index.html"),
        embedded: resolve("examples/embedded-editor/index.html"),
      },
    },
  },
});
