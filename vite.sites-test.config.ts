import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sitesTestPlugin } from "./tests/helpers/sites-vite.ts";

export default defineConfig({
  plugins: [sitesTestPlugin(), react()],
  // Keep the first lazy export from triggering a development dependency reload.
  optimizeDeps: { include: ["react-dom/server"] },
  ssr: { noExternal: ["@wonboard/document"] },
});
