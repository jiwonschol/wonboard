// 소개 페이지(site/)를 site/dist로 만든다. 설치 문장은 docs/install/install-prompt.txt 한 곳에만
// 있고, 여기서 페이지에 넣는다. 설치 문장과 설치 안내가 가리키는 명령·파일·환경 값·화면 문구가
// 저장소에 실제로 있는지도 함께 검사해, 어긋나면 빌드를 실패시킨다.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const prompt = read("docs/install/install-prompt.txt").trim();
const guide = read("docs/install/README.md");
const manifest = JSON.parse(read("package.json"));
const serverTypes = read("apps/server/src/sites/types.ts");
const worker = read("apps/server/src/sites/worker.ts");
const viteConfig = read("vite.config.ts") + read("vite.sites-worker.config.ts");
const hosting = JSON.parse(read(".openai/hosting.json"));
const assets = JSON.parse(read("wrangler.json")).assets;
const workerBuild = read("vite.sites-worker.config.ts");
const drizzleConfig = read("drizzle.config.ts");
const journal = JSON.parse(read("drizzle/meta/_journal.json"));
const korean = read("packages/locales/src/index.ts");
const problems = [];

// 설치 문장에서 `…`로 적은 것은 모두 아래 목록에 근거가 있어야 한다.
const grounded = {
  "pnpm install --frozen-lockfile": manifest.packageManager.startsWith("pnpm@"),
  "pnpm build:sites": Boolean(manifest.scripts["build:sites"]),
  "dist/client": viteConfig.includes('"dist/client"'),
  "dist/server/index.js": viteConfig.includes('outDir: "dist/server"') && viteConfig.includes('entryFileNames: "index.js"'),
  "apps/server/src/sites/worker.ts": viteConfig.includes('ssr: "apps/server/src/sites/worker.ts"') && worker.includes("export default { fetch:"),
  "apps/server/src/sites/schema.sql": existsSync(new URL("apps/server/src/sites/schema.sql", root)),
  "apps/server/src/sites/migrations": existsSync(new URL("apps/server/src/sites/migrations", root)),
  "apps": true, "packages": true,
  "DB": /\bDB: Database;/.test(serverTypes),
  "MEDIA": /\bMEDIA: ObjectStore;/.test(serverTypes),
  "ASSETS": /\bASSETS\?:/.test(serverTypes) && assets.binding === "ASSETS" && assets.directory === "dist/client",
  "WONBOARD_OWNER_ID": serverTypes.includes("WONBOARD_OWNER_ID?: string") && worker.includes("env.WONBOARD_OWNER_ID"),
  ".openai/hosting.json": hosting.d1 === "DB" && hosting.r2 === "MEDIA",
  "vite.sites-worker.config.ts": workerBuild.includes("sites()"),
  "@openai/sites-vite-plugin": Boolean(manifest.devDependencies["@openai/sites-vite-plugin"]) && workerBuild.includes('from "@openai/sites-vite-plugin"'),
  "wrangler.json": assets.binding === "ASSETS" && assets.directory === "dist/client",
  "drizzle": drizzleConfig.includes('out: "./drizzle"') && journal.entries.length > 0 && journal.entries.every(entry => existsSync(new URL(`drizzle/${entry.tag}.sql`, root))),
  "dist/.openai/hosting.json": workerBuild.includes("sites()"),
  "dist/.openai/drizzle": workerBuild.includes("sites()") && drizzleConfig.includes('out: "./drizzle"'),
};
for (const [, token] of prompt.matchAll(/`([^`]+)`/g))
  if (!grounded[token]) problems.push(`설치 문장의 \`${token}\`가 저장소에서 확인되지 않습니다.`);
const [, pnpmVersion] = manifest.packageManager.split("@");
if (!prompt.includes(`pnpm ${pnpmVersion}`)) problems.push(`설치 문장의 pnpm 버전이 package.json(${pnpmVersion})과 다릅니다.`);
const nodeVersion = manifest.engines.node.replace(/^>=/, "").replace(/\.0$/, "");
if (!prompt.includes(`Node.js ${nodeVersion} 이상`)) problems.push(`설치 문장의 Node.js 버전이 package.json(${nodeVersion})과 다릅니다.`);

// “…”로 적은 것은 원보드 화면에 실제로 나오는 한국어 문구여야 한다.
for (const [name, text] of [["설치 문장", prompt], ["설치 안내", guide]])
  for (const [, phrase] of text.matchAll(/“([^”]+)”/g))
    if (!korean.includes(phrase)) problems.push(`${name}의 화면 문구 “${phrase}”가 packages/locales에 없습니다.`);

const page = read("site/index.html");
const slot = "<!--INSTALL_PROMPT-->";
if (page.split(slot).length !== 2) problems.push("site/index.html에 설치 문장 자리가 정확히 하나 있어야 합니다.");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const escaped = prompt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const out = new URL("site/dist/", root);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of ["style.css", "install.js"]) cpSync(new URL(`site/${name}`, root), new URL(name, out));
writeFileSync(new URL("index.html", out), page.replace(slot, () => escaped));
console.log(`소개 페이지를 ${fileURLToPath(out)}에 만들었습니다. 설치 문장 ${prompt.length}자.`);
