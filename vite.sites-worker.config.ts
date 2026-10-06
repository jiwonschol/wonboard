import { defineConfig } from "vite";
import { sites } from "@openai/sites-vite-plugin";

// Package hosting metadata and committed Drizzle migrations after the client build.
export default defineConfig({
  plugins: [sites()],
  resolve: { alias: { "react-dom/server": "react-dom/server.edge" } },
  build: {
    ssr: "apps/server/src/sites/worker.ts", outDir: "dist/server", emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "index.js" } },
  },
  ssr: { noExternal: true },
});
