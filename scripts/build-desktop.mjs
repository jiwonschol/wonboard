import { build } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

await build({ configFile: false, logLevel: "warn", root: resolve("apps/desktop"), publicDir: resolve("public"), plugins: [react()],
  build: { outDir: "dist/renderer", emptyOutDir: true } });
for (const entry of ["main", "preload"]) {
  await build({ configFile: false, build: { ssr: `apps/desktop/src/${entry}.ts`, outDir: "apps/desktop/dist", emptyOutDir: false,
    rollupOptions: { external: [/^node:/, "electron"], output: { format: "cjs", entryFileNames: `${entry}.cjs` } } },
    ssr: { noExternal: ["@wonboard/document", "fflate"] } });
}
