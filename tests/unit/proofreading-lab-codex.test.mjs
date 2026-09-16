import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {plan} from '../../scripts/proofreading-lab/core.mjs';
import {createCodex,lunaRequest,parseCodexOutput,codexUsage,resolveRunner} from '../../scripts/proofreading-lab/codex.mjs';

// ---------------------------------------------------------------------------
// Cross-platform contract suite.
//
// Everything here is meaningful on Windows, macOS and Linux: it either calls a
// pure function, or spawns `node run.mjs` by absolute interpreter path and
// asserts on files and exit codes. Nothing in this file writes a `#!` script,
// chmods a mode bit, creates a symlink, or hardcodes a PATH separator, so
// `pnpm test` exercises the whole suite on win32 instead of failing to load it.
//
// Cases that genuinely need a POSIX kernel — spawning the shell-wrapper stub,
// the mode-bit rejection, the spaced-shebang demonstration and the PATH
// sentinel — live in `proofreading-lab-codex.posix.test.mjs`, which skips them
// on win32 with a reason that names what is not being exercised. The last test
// in this file enforces that the split stayed real.
//
// Windows verification scope is documented in scripts/proofreading-lab/README.md.
// ---------------------------------------------------------------------------

const events=(text='{"findings":[]}')=>[
 {type:'item.completed',item:{type:'agent_message',text}},
 {type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:30,output_tokens:20}},
];
test('Luna request preserves isolated prompt and converts strict JSON schema',()=>{
 const body=lunaRequest(plan([{id:'x',text:'정상이에요.',gold:'HIDDEN'}]).requests[0].body);
 assert.equal(body.schema.type,'object');assert.equal(body.schema.additionalProperties,false);
 assert.equal(body.schema.properties.findings.items.additionalProperties,false);
 assert(!JSON.stringify(body).includes('HIDDEN'));
});
test('Codex accepts completed JSON event stream and rejects missing usage, failed turns or tool use',()=>{
 const encode=x=>x.map(JSON.stringify).join('\n');
 assert.equal(parseCodexOutput(encode(events())).usage.input_tokens,100);
 for(const extra of [{type:'turn.failed'},{type:'item.completed',item:{type:'command_execution'}},{type:'turn.completed',usage:{}}])assert.throws(()=>parseCodexOutput(encode([...events(),extra])));
 assert.throws(()=>parseCodexOutput(encode(events().slice(0,1))));
 assert.throws(()=>parseCodexOutput(encode([...events(),{type:'item.completed',item:{type:'error',message:'Unexpected model error'}}])));
 assert.equal(parseCodexOutput(encode([...events(),{type:'item.completed',item:{type:'error',message:'Skill descriptions were shortened to fit the skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.'}}])).warnings.length,1);
 assert.throws(()=>codexUsage({input_tokens:1,cached_input_tokens:2,output_tokens:1}));
 assert.equal(codexUsage(events()[1].usage).estimatedUsd,null);
});
test('Codex rejects API login and strips provider keys before checking auth',async()=>{
 await assert.rejects(createCodex({env:{HOME:'/tmp',OPENAI_API_KEY:'SECRET',CODEX_API_KEY:'SECRET'},run:async(_cmd,_args,options)=>{
 assert(!('OPENAI_API_KEY' in options.env));assert(!('CODEX_API_KEY' in options.env));return {stdout:'Logged in using API key',stderr:''};
 }}));
});

// ---------------------------------------------------------------------------
// Injected-runner contract that does not depend on a POSIX kernel.
//
// `resolveRunner` is what makes the absolute-path guarantee hold: execvp only
// searches PATH for a name without a slash, so a validated absolute path cannot
// fall through to an installed, logged-in CLI. It only stats the path, so every
// case below is also a statement about preparation cost — no auth, no
// generation, no network. Windows cannot express the mode-bit case (chmod 0o600
// does not remove executability there); that one is in the POSIX suite.
// ---------------------------------------------------------------------------
test('Injected runner must be an absolute, existing path',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-resolve-'));
 assert.equal(resolveRunner(null),'codex');
 assert.equal(resolveRunner(undefined),'codex');
 assert.throws(()=>resolveRunner('codex'),/absolute path/);
 assert.throws(()=>resolveRunner('./codex'),/absolute path/);
 assert.throws(()=>resolveRunner(join('relative','codex')),/absolute path/);
 assert.throws(()=>resolveRunner(join(dir,'missing-codex')),/not executable/);
 assert.throws(()=>resolveRunner(42),/absolute path/);
 // The running interpreter is an existing, executable absolute path on every
 // platform, so the accepting branch is covered without a POSIX mode bit.
 assert.equal(resolveRunner(process.execPath),process.execPath);
});

// ---------------------------------------------------------------------------
// Dry runs.
//
// Preparation used to create the runner only under `--live`, so a dry run
// accepted `./relative-codex`, a missing file or a non-executable file and still
// wrote a manifest claiming `injected-absolute-path`. The live run matching that
// preparation would then reject the same configuration. These cases pin the
// validation to the dry path and pin the call counts to zero.
//
// The environment keeps a minimal PATH on purpose. A dry run spawns nothing, so
// were run.mjs ever to look a runner up by name here the lookup would fail with
// ENOENT and the test would fail loudly, instead of reaching an installed CLI
// and spending the owner's ChatGPT subscription.
// ---------------------------------------------------------------------------
const hermeticEnv=()=>({...process.env,
 PATH:(process.platform==='win32'?join(process.env.SystemRoot??'C:\\Windows','System32'):'/usr/bin'),
 OPENAI_API_KEY:'SECRET',CODEX_API_KEY:'SECRET',GOOGLE_SERVICE_ACCOUNT_KEY_B64:'SECRET'});
const SOURCE='<script> 됬어요.';
const writeInput=dir=>{const input=join(dir,'input.json');writeFileSync(input,JSON.stringify([{id:'x',text:SOURCE}]));return input;};
const lab=(input,out,args,env)=>spawnSync(process.execPath,[resolve('scripts/proofreading-lab/run.mjs'),'--input',input,'--out',out,...args],{env,encoding:'utf8'});
// A dry run returns before any per-request or comparison artifact is written.
const PREPARATION_ONLY=['baseline.json','input.json','manifest.json','requests.json'];

test('Dry run rejects an injected runner the matching live run would reject',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-lab-dry-')),env=hermeticEnv(),input=writeInput(dir);
 for(const [label,bad] of [['bare-name','codex'],['relative','./codex'],['missing-absolute',join(dir,'does-not-exist')]]){
  const out=join(dir,`rejected-${label}`);
  const result=lab(input,out,['--max-calls','3','--codex-bin',bad],env);
  assert.equal(result.status,1,`${label}: a dry run must reject ${bad}`);
  assert.match(result.stderr,/Lab stopped/);
  assert.ok(!existsSync(out),`${label}: no output directory is created for a rejected runner`);
 }
});

test('Dry run validates and records an injected absolute runner without invoking it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-lab-dry-')),out=join(dir,'prepared');
 const result=lab(writeInput(dir),out,['--max-calls','3','--codex-bin',process.execPath],hermeticEnv());
 assert.equal(result.status,0,result.stderr);
 const summary=JSON.parse(result.stdout);
 assert.equal(summary.mode,'dry-run');
 assert.equal(summary.networkCalls,0);
 assert.equal(summary.authCalls,0,'preparation performs no login check');
 assert.equal(summary.generationCalls,0,'preparation performs no generation call');
 assert.equal(summary.runner,'injected-absolute-path');
 const manifest=JSON.parse(readFileSync(join(out,'manifest.json'),'utf8'));
 assert.equal(manifest.live,false);
 assert.equal(manifest.execution.runner,'injected-absolute-path');
 assert.deepEqual(readdirSync(out).sort(),PREPARATION_ONLY,
  'a dry run writes preparation only — no started, response, result or comparison artifact');
});

test('Dry run without injection records the installed CLI and does not require it to exist',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-lab-dry-')),out=join(dir,'default');
 // No Codex CLI is installed on a clean Windows or CI machine. Preparation must
 // still succeed, because resolving the default runner is a name, not a lookup.
 const result=lab(writeInput(dir),out,['--max-calls','3'],hermeticEnv());
 assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(result.stdout).runner,'installed CLI on PATH');
 assert.equal(JSON.parse(readFileSync(join(out,'manifest.json'),'utf8')).execution.runner,'installed CLI on PATH');
 assert.deepEqual(readdirSync(out).sort(),PREPARATION_ONLY);
});

test('Dry run rejects --codex-bin for the gemini provider before validating it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-lab-dry-')),out=join(dir,'gemini');
 const result=lab(writeInput(dir),out,['--provider','gemini','--budget-usd','1','--max-calls','3','--codex-bin',process.execPath],hermeticEnv());
 assert.equal(result.status,1);
 assert.match(result.stderr,/Lab stopped/);
 assert.ok(!existsSync(out));
});

test('The Windows-runnable contract suite stays free of POSIX-only constructs',()=>{
 // The forbidden literals are assembled from parts, so this file never contains
 // the string it forbids and the guard cannot trip on itself.
 const source=readFileSync(fileURLToPath(import.meta.url),'utf8');
 for(const token of [['/','bin','sh'].join(''),['symlink','Sync'].join(''),['chmod','Sync'].join('')])
  assert.ok(!source.includes(token),
   `${token} is POSIX-only and belongs in proofreading-lab-codex.posix.test.mjs`);
 assert.match(source,/delimiter/,'PATH must be assembled with the node:path delimiter, never a hardcoded separator');
 // The companion suite must exist and must skip on win32 with a stated reason,
 // so the separation cannot decay into a silent whole-file skip.
 const posix=readFileSync(resolve('tests/unit/proofreading-lab-codex.posix.test.mjs'),'utf8');
 assert.match(posix,/process\.platform==='win32'/);
 assert.match(posix,/skip:[A-Za-z]+/,'win32 cases must be skipped with an explicit reason string');
 assert.match(posix,/not exercised/,'the skip reason must name what Windows does not verify');
});
