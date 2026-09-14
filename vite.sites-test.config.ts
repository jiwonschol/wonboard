import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sitesTestPlugin } from "./tests/helpers/sites-vite.ts";

export default defineConfig({
  plugins: [sitesTestPlugin(), react()],
  ssr: { noExternal: ["@wonboard/document"] },
});
