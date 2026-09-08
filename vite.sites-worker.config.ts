import { defineConfig } from "vite";

// Existing Vite toolchain can validate the portable Worker without adding dependencies.
// Final Sites registration, plugin integration and deployment remain separate gates.
export default defineConfig({
  build: {
    ssr: "apps/server/src/sites/worker.ts", outDir: "dist/server", emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "index.js" } },
  },
  ssr: { noExternal: true },
});
