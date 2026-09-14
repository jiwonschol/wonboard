import { packager } from "@electron/packager";
import { readFileSync } from "node:fs";

const { devDependencies } = JSON.parse(readFileSync("package.json", "utf8"));
await packager({ dir: "apps/desktop", name: "Wonboard", executableName: "Wonboard", appBundleId: "com.onsoonlabs.wonboard",
  electronVersion: devDependencies.electron.replace(/^[~^]/, ""), out: "dist/desktop", overwrite: true,
  download: { cacheRoot: process.env.electron_config_cache },
  ignore: [/^\/src(?:\/|$)/, /^\/index\.html$/],
  ...(process.platform === "darwin" ? { darwinDarkModeSupport: true } : {}),
});
