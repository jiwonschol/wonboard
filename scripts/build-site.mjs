// 소개 페이지와 개인정보 안내(site/)를 site/dist로 만든다. 설치 문장은 docs/install/install-prompt.txt 한 곳에만
// 있고, 여기서 페이지에 넣는다. 설치 문장과 설치 안내가 가리키는 명령·파일·환경 값·화면 문구가
// 저장소에 실제로 있는지도 함께 검사해, 어긋나면 빌드를 실패시킨다.
// 설치 문장이 가져오는 코드의 태그는 package.json의 version 한 곳에서 정한다(v + version). 새 릴리스 때
// version만 바꾸고 `pnpm build:site --write-tag`를 돌리면 설치 문장의 태그와 작업공간 manifest의 버전이 따라온다.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const manifest = JSON.parse(read("package.json"));
const tag = `v${manifest.version}`;
// 태그 모양(v1.2.3, v0.1.0-beta.1). 뒤따르는 `.zip`은 포함하지 않는다.
const tagPattern = /\bv\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.\d+)*)?/g;
const promptPath = "docs/install/install-prompt.txt";
// apps/desktop처럼 manifest로 직접 패키징되는 것이 있어 작업공간 manifest도 같은 버전을 쓴다.
const workspaceManifests = ["apps", "packages"]
  .flatMap(dir => readdirSync(new URL(`${dir}/`, root)).map(name => `${dir}/${name}/package.json`))
  .filter(path => existsSync(new URL(path, root)) && JSON.parse(read(path)).version !== undefined);
if (process.argv.includes("--write-tag")) {
  writeFileSync(new URL(promptPath, root), read(promptPath).replace(tagPattern, tag));
  for (const path of workspaceManifests)
    writeFileSync(new URL(path, root), read(path).replace(/"version": "[^"]*"/, () => `"version": "${manifest.version}"`));
}
const prompt = read(promptPath).trim();
const guide = read("docs/install/README.md");
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

// “…”로 적은 것은 원보드 화면에 실제로 나오는 문구여야 한다.
const privacy = read("site/privacy.html");
for (const [name, text] of [["설치 문장", prompt], ["설치 안내", guide], ["개인정보 안내", privacy]])
  for (const [, phrase] of text.matchAll(/“([^”]+)”/g))
    if (!korean.includes(phrase)) problems.push(`${name}의 화면 문구 “${phrase}”가 packages/locales에 없습니다.`);

const page = read("site/index.html");
const slot = "<!--INSTALL_PROMPT-->";
if (page.split(slot).length !== 2) problems.push("site/index.html에 설치 문장 자리가 정확히 하나 있어야 합니다.");
const tagSlot = "<!--TAG-->";
if (!page.includes(tagSlot)) problems.push("site/index.html에 설치 문장이 가져오는 태그 자리가 있어야 합니다.");

// 설치 문장은 package.json 버전의 태그를 가져오고, ZIP 주소도 같은 태그를 가리킨다. 안내와 소개 페이지는
// 태그를 직접 적지 않고 설치 문장과 위 자리를 따른다. main 브랜치 ZIP은 설치한 날마다 코드가 달라지므로 쓰지 않는다.
const repository = "https://github.com/jiwonschol/wonboard";
if (!prompt.includes(`저장소: ${repository} (태그 ${tag})`))
  problems.push(`설치 문장의 저장소 줄이 package.json 버전의 태그(${tag})를 가리키지 않습니다. 새 릴리스라면 pnpm build:site --write-tag로 맞추세요.`);
if (!prompt.includes(`${repository}/archive/refs/tags/${tag}.zip`))
  problems.push(`설치 문장의 ZIP 주소가 ${tag} 태그를 가리키지 않습니다.`);
for (const [name, text] of [["설치 문장", prompt], ["설치 안내", guide], ["소개 페이지", page]]) {
  for (const found of new Set(Array.from(text.matchAll(tagPattern), match => match[0])))
    if (found !== tag) problems.push(`${name}의 태그 ${found}가 package.json 버전의 태그(${tag})와 다릅니다. pnpm build:site --write-tag로 설치 문장을 맞추세요.`);
  if (text.includes("/archive/refs/heads/")) problems.push(`${name}에 브랜치 ZIP 주소가 있습니다. 설치 문장의 태그 ZIP을 쓰세요.`);
}
for (const path of workspaceManifests) {
  const { version } = JSON.parse(read(path));
  if (version !== manifest.version) problems.push(`${path}의 버전 ${version}이 package.json(${manifest.version})과 다릅니다. pnpm build:site --write-tag로 맞추세요.`);
}
// Pages 배포(pages 워크플로)에서는 태그가 원격에 이미 있어야 한다. 없으면 여기서 실패해 배포를 멈추고,
// 이미 있는 태그를 가리키는 지난 페이지를 그대로 둔다. 태그를 만든 뒤 pages 워크플로를 다시 실행한다.
if (process.env.GITHUB_WORKFLOW === "pages") {
  try { execFileSync("git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`], { stdio: "ignore" }); }
  catch { problems.push(`원격 저장소에 ${tag} 태그가 없습니다. 태그를 만든 뒤 pages 워크플로를 다시 실행하세요.`); }
}
// 앱 화면의 개인정보 안내 링크가 이 페이지를 가리키고, 페이지의 버전은 package.json에서 채운다.
const versionSlot = "<!--VERSION-->";
if (!privacy.includes(versionSlot)) problems.push("site/privacy.html에 버전 자리가 있어야 합니다.");
if (!read("apps/client/src/AboutLinks.tsx").includes("/wonboard/privacy.html")) problems.push("앱 화면의 개인정보 안내 링크가 privacy.html을 가리키지 않습니다.");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const escaped = prompt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const out = new URL("site/dist/", root);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of ["style.css", "install.js"]) cpSync(new URL(`site/${name}`, root), new URL(name, out));
writeFileSync(new URL("index.html", out), page.replaceAll(tagSlot, tag).replace(slot, () => escaped));
writeFileSync(new URL("privacy.html", out), privacy.replaceAll(versionSlot, manifest.version));
console.log(`소개 페이지를 ${fileURLToPath(out)}에 만들었습니다. 설치 문장 ${prompt.length}자, 태그 ${tag}.`);
