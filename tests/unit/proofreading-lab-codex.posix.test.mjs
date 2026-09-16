import test from 'node:test';
import assert from 'node:assert/strict';
import {chmodSync,existsSync,mkdtempSync,readFileSync,readdirSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {resolveRunner} from '../../scripts/proofreading-lab/codex.mjs';

// ---------------------------------------------------------------------------
// POSIX-only companion to proofreading-lab-codex.test.mjs.
//
// Every case here needs a POSIX kernel: an extensionless `#!/bin/sh` wrapper the
// kernel can exec, a mode bit that chmod can actually remove, a symlink, or a
// PATH lookup that resolves a bare name to a sentinel. Windows cannot express
// any of them, and `scripts/test-node-units.mjs` enumerates every `.test.mjs`,
// so leaving them in the shared file made `pnpm test` fail on win32 before a
// single runner assertion ran.
//
// They are split out rather than deleted, and skipped per case with a reason
// that names what Windows does not verify — the TAP output shows one SKIP line
// per case, never a silent pass. The pure contract coverage (prompt isolation,
// event-stream parsing, usage accounting, provider-key stripping, absolute-path
// resolution, and every dry-run validation case) stays in the shared file and
// does run on Windows.
//
// Nothing at module scope touches the filesystem, so loading this file on win32
// is safe; only the skipped bodies would have.
// ---------------------------------------------------------------------------
const posixSkip=process.platform==='win32'
 ? 'POSIX-only: #!/bin/sh stubs, chmod X_OK, symlinks and bare-name PATH lookup are not exercised on win32. Contract coverage runs in proofreading-lab-codex.test.mjs; see scripts/proofreading-lab/README.md for the Windows verification scope.'
 : false;

// Hermetic runner injection.
//
// These tests must never reach an installed, logged-in Codex CLI: a real run
// spends the owner's ChatGPT subscription and the answers are not fixtures.
// Two rules keep that true.
//
// 1. The stub is addressed by absolute path through `--codex-bin`, so the
//    kernel never searches PATH for it and a broken stub cannot be silently
//    replaced by whatever `codex` is installed.
// 2. The stub is a POSIX shell wrapper that quotes the interpreter path. The
//    previous `#!${process.execPath}` shebang breaks whenever Node lives under
//    a path containing a space (on macOS: ".../Application Support/..."), the
//    kernel reports "bad interpreter", and PATH lookup then reaches the real
//    CLI. A sentinel `codex` later on PATH proves the fallback never happens.
//
// The stub records every invocation; the parent test audits argv, cwd, env and
// stdin from that log instead of trusting an assertion buried inside the stub.
const shellQuote=value=>`'${String(value).replace(/'/g,`'\\''`)}'`;
// Environment keys codex.mjs is allowed to forward. Anything else must be absent.
const forwardedEnv=['HOME','PATH','USER','LOGNAME','TMPDIR','CODEX_HOME','SSL_CERT_FILE','SSL_CERT_DIR'];
// Not forwarded by codex.mjs: the POSIX wrapper and macOS add these below it.
const wrapperEnv=['PWD','SHLVL','__CF_USER_TEXT_ENCODING'];
const stubSource=(logPath,behavior,findings)=>`const fs=require('node:fs');
const LOG=${JSON.stringify(logPath)},BEHAVIOR=${JSON.stringify(behavior)};
const FINDINGS=${JSON.stringify(findings)};
const args=process.argv.slice(2);
const schemaArg=args.indexOf('--output-schema');
const record={argv:args,cwd:process.cwd(),envKeys:Object.keys(process.env).sort(),
 hasOpenAiApiKey:'OPENAI_API_KEY' in process.env,hasCodexApiKey:'CODEX_API_KEY' in process.env,
 hasGoogleServiceAccount:'GOOGLE_SERVICE_ACCOUNT_KEY_B64' in process.env,
 path:process.env.PATH??null,stdin:null,schema:null};
if(schemaArg>=0&&args[schemaArg+1])record.schema=JSON.parse(fs.readFileSync(args[schemaArg+1],'utf8'));
const log=()=>fs.appendFileSync(LOG,JSON.stringify(record)+'\\n');
// The login check is spawned without an input option, so stdin is never ended;
// answer it without reading. Generation always ends stdin with the prompt.
if(args[0]==='login'){record.kind='login';log();console.log('Logged in using ChatGPT');process.exit(0);}
record.kind='exec';
let data='',done=false;
const finish=()=>{if(done)return;done=true;record.stdin=data;log();
 if(BEHAVIOR==='turn-failed'){console.log(JSON.stringify({type:'turn.failed'}));process.exit(0);}
 const text=JSON.stringify({findings:FINDINGS});
 console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text}}));
 console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:30,output_tokens:20}}));
 process.exit(0);};
process.stdin.on('data',chunk=>data+=chunk);
process.stdin.on('end',finish);
process.stdin.on('error',()=>{});
setTimeout(finish,5000);
`;
function writeStub(dir,{nodePath=process.execPath,behavior='ok',findings=[],logName='calls.jsonl',mode=0o700}={}){
 const logPath=join(dir,logName),body=join(dir,'codex-stub.js');
 writeFileSync(body,stubSource(logPath,behavior,findings));
 const bin=join(dir,'codex');
 writeFileSync(bin,`#!/bin/sh\nexec ${shellQuote(nodePath)} ${shellQuote(body)} "$@"\n`);
 chmodSync(bin,mode);
 return {bin,logPath,body};
}
// If PATH were ever consulted, this answers instead of an installed CLI and leaves proof.
function writeSentinel(dir){
 const logPath=join(dir,'sentinel-calls.jsonl'),bin=join(dir,'codex');
 writeFileSync(bin,`#!/bin/sh\nprintf '%s\\n' "$*" >> ${shellQuote(logPath)}\nexit 99\n`);
 chmodSync(bin,0o700);
 return {bin,logPath};
}
const readCalls=logPath=>existsSync(logPath)?readFileSync(logPath,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
const readLines=logPath=>existsSync(logPath)?readFileSync(logPath,'utf8').split('\n').filter(Boolean):[];
// Deliberately excludes every directory that could contain a real logged-in `codex`.
const hermeticPath=(...dirs)=>[...dirs,'/usr/bin','/bin'].join(':');
// The injected stub's own directory is NOT on PATH. Only the sentinel is reachable by name, so
// reverting either call site from `command` back to the literal 'codex' resolves to the sentinel
// and fails the test instead of quietly running the same stub. A pre-flight `X_OK` check already
// covers the missing/non-executable paths, so those cases cannot catch that mutation.
const labEnv=(...dirs)=>({...process.env,PATH:hermeticPath(...dirs),OPENAI_API_KEY:'SECRET',CODEX_API_KEY:'SECRET',GOOGLE_SERVICE_ACCOUNT_KEY_B64:'SECRET'});
const SOURCE='<script> 됬어요.';
const FINDINGS=[{original:'됬어요',occurrence:0,action:'correct',replacement:'됐어요',reason:'fixture'}];
const writeInput=dir=>{const input=join(dir,'input.json');writeFileSync(input,JSON.stringify([{id:'x',text:SOURCE}]));return input;};
const lab=(input,out,args,env)=>spawnSync(process.execPath,[resolve('scripts/proofreading-lab/run.mjs'),'--input',input,'--out',out,...args],{env,encoding:'utf8'});
// A dry run returns before any per-request or comparison artifact is written.
const PREPARATION_ONLY=['baseline.json','input.json','manifest.json','requests.json'];

test('Injected runner accepts an executable stub and rejects a mode-stripped one',{skip:posixSkip},()=>{
 // The mode-bit half of the resolveRunner contract. chmod does not remove
 // executability on Windows, so this case is POSIX-only by construction; the
 // absolute-path and missing-file halves run on every platform in the shared file.
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-resolve-'));
 const notExecutable=writeStub(dir,{mode:0o600});
 assert.throws(()=>resolveRunner(notExecutable.bin),/not executable/);
 const stub=writeStub(mkdtempSync(join(tmpdir(),'wonboard-luna-resolve-')));
 assert.equal(resolveRunner(stub.bin),stub.bin);
});

test('Luna CLI uses the injected stub for auth and generation, audited by the parent',{skip:posixSkip},()=>{
 // Interpreter path with a space: the case that broke the bare-shebang stub.
 const spacedDir=mkdtempSync(join(tmpdir(),'wonboard luna spaced-'));
 const spacedNode=join(spacedDir,'node');
 symlinkSync(process.execPath,spacedNode);
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-')),sentinelDir=mkdtempSync(join(tmpdir(),'wonboard-sentinel-'));
 const stub=writeStub(dir,{nodePath:spacedNode,findings:FINDINGS}),sentinel=writeSentinel(sentinelDir);
 const input=writeInput(dir),env=labEnv(sentinelDir);
 assert.match(spacedNode,/ /,'this case must exercise an interpreter path containing a space');

 // Call limit is enforced before any runner is created: zero invocations.
 const denied=lab(input,join(dir,'denied'),['--live','--max-calls','2','--codex-bin',stub.bin],env);
 assert.equal(denied.status,1);assert(!existsSync(join(dir,'denied')));
 assert.deepEqual(readCalls(stub.logPath),[]);assert.deepEqual(readLines(sentinel.logPath),[]);

 const out=join(dir,'out');
 const result=lab(input,out,['--live','--max-calls','3','--codex-bin',stub.bin],env);
 assert.equal(result.status,0,result.stderr);
 const comparison=JSON.parse(readFileSync(join(out,'comparison.json'),'utf8'));
 const manifest=JSON.parse(readFileSync(join(out,'manifest.json'),'utf8'));
 assert.equal(comparison.completed,3);assert.equal(comparison.estimatedUsd,null);
 assert.equal(manifest.model,'gpt-5.6-luna');assert.equal(manifest.billing,'chatgpt-subscription');
 assert.equal(manifest.execution.runner,'injected-absolute-path');
 assert.equal(comparison.comparisons[0].adjudication,'pending');
 assert.ok(!readFileSync(join(out,'comparison.html'),'utf8').includes('<script>'));

 // The fixture's usage proves the stub answered; a real CLI reports thousands of
 // input tokens and a thread.started event.
 for(const index of ['0000','0001','0002']){
  const response=JSON.parse(readFileSync(join(out,`${index}-response.json`),'utf8'));
  assert.equal(response.usage.input_tokens,100);
  assert.equal(response.usage.output_tokens,20);
  assert.ok(!response.events.some(event=>event.type==='thread.started'));
 }

 // Parent-side audit of everything the stub actually received.
 const calls=readCalls(stub.logPath);
 assert.equal(calls.length,4,'1 login check + 3 generation calls');
 assert.deepEqual(readLines(sentinel.logPath),[],'PATH must never be consulted');
 const [login,...execs]=calls;
 assert.equal(login.kind,'login');assert.deepEqual(login.argv,['login','status']);
 assert.equal(execs.length,3);
 for(const call of execs){
  assert.equal(call.kind,'exec');
  assert.equal(call.argv[0],'exec');
  for(const flag of ['--ignore-user-config','--ephemeral','--skip-git-repo-check','--json','--output-schema'])
   assert.ok(call.argv.includes(flag),`missing ${flag}`);
  assert.deepEqual(call.argv.slice(call.argv.indexOf('--sandbox'),call.argv.indexOf('--sandbox')+2),['--sandbox','read-only']);
  assert.deepEqual(call.argv.slice(call.argv.indexOf('--model'),call.argv.indexOf('--model')+2),['--model','gpt-5.6-luna']);
  assert.equal(call.argv.at(-1),'-','the source text travels on stdin, never in argv');
  assert.ok(!call.argv.some(arg=>arg.includes('됬어요')),'no source text in argv');
  const config=call.argv.filter((arg,i)=>call.argv[i-1]==='-c');
  for(const required of ['forced_login_method="chatgpt"','model_reasoning_effort="medium"','approval_policy="never"',
   'web_search="disabled"','features.shell_tool=false','features.multi_agent=false','features.remote_plugin=false',
   'features.apps=false','project_doc_max_bytes=0','history.persistence="none"'])
   assert.ok(config.includes(required),`missing -c ${required}`);
  assert.ok(config.some(entry=>entry.startsWith('model_instructions_file=')));
  assert.equal(call.hasOpenAiApiKey,false);assert.equal(call.hasCodexApiKey,false);
  assert.equal(call.hasGoogleServiceAccount,false);
  assert.deepEqual(call.envKeys.filter(key=>![...forwardedEnv,...wrapperEnv].includes(key)),[],
   'no key outside the documented allow-list is forwarded');
  assert.deepEqual(call.envKeys.filter(key=>/SECRET|KEY|TOKEN|CREDENTIAL|PASSWORD/.test(key)),[],
   'no credential-bearing variable reaches the runner');
  assert.ok(call.envKeys.includes('PATH')&&call.envKeys.includes('HOME'));
  assert.equal(JSON.parse(call.stdin).source,SOURCE);
  assert.equal(call.schema.additionalProperties,false);
  assert.equal(call.schema.properties.findings.items.additionalProperties,false);
  assert.match(call.cwd,/wonboard-luna-/,'each call gets its own isolated directory');
  assert.equal(call.path,hermeticPath(sentinelDir));
 }
 assert.equal(new Set(execs.map(call=>call.cwd)).size,3,'no directory is reused across calls');

 // An existing output directory is never replayed or overwritten. The exclusive-directory guard
 // runs after the local login check, so a refused rerun reaches auth but makes no model call.
 const repeated=lab(input,out,['--live','--codex-bin',stub.bin],env);
 assert.equal(repeated.status,1);
 const afterRerun=readCalls(stub.logPath);
 assert.equal(afterRerun.filter(call=>call.kind==='exec').length,3,'a refused rerun makes no generation call');
 assert.equal(afterRerun.length,5,'only the local login check runs before the guard refuses');
 assert.deepEqual(readLines(sentinel.logPath),[]);
});

test('A dry run validates the injected stub and makes no auth or generation call',{skip:posixSkip},()=>{
 // The reported zero counts in the shared suite are a claim; the stub's own call
 // log is the evidence. Preparation resolves and accepts the injected runner,
 // writes the manifest that names it, and never executes it.
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-dry-')),sentinelDir=mkdtempSync(join(tmpdir(),'wonboard-sentinel-'));
 const stub=writeStub(dir,{findings:FINDINGS}),sentinel=writeSentinel(sentinelDir);
 const out=join(dir,'prepared');
 const result=lab(writeInput(dir),out,['--max-calls','3','--codex-bin',stub.bin],labEnv(sentinelDir));
 assert.equal(result.status,0,result.stderr);
 const summary=JSON.parse(result.stdout);
 assert.equal(summary.mode,'dry-run');
 assert.equal(summary.networkCalls,0);assert.equal(summary.authCalls,0);assert.equal(summary.generationCalls,0);
 assert.deepEqual(readCalls(stub.logPath),[],'a dry run performs no login check and no generation call');
 assert.deepEqual(readLines(sentinel.logPath),[],'PATH is never consulted during preparation');
 assert.equal(JSON.parse(readFileSync(join(out,'manifest.json'),'utf8')).execution.runner,'injected-absolute-path');
 assert.deepEqual(readdirSync(out).sort(),PREPARATION_ONLY);

 // The same dry run must reject a runner the live run would reject, and leave no
 // output directory behind: preparation success may not claim a broken injection.
 const stripped=mkdtempSync(join(tmpdir(),'wonboard-luna-dry-'));
 const denied=writeStub(stripped,{mode:0o600}),deniedOut=join(stripped,'out');
 const refused=lab(writeInput(stripped),deniedOut,['--max-calls','3','--codex-bin',denied.bin],labEnv(sentinelDir));
 assert.equal(refused.status,1);
 assert.match(refused.stderr,/Lab stopped/);
 assert.ok(!existsSync(deniedOut));
 assert.deepEqual(readCalls(denied.logPath),[]);
 assert.deepEqual(readLines(sentinel.logPath),[]);
});

test('A non-executable injected stub fails instead of falling through to PATH',{skip:posixSkip},()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-')),sentinelDir=mkdtempSync(join(tmpdir(),'wonboard-sentinel-'));
 const stub=writeStub(dir,{findings:FINDINGS,mode:0o600}),sentinel=writeSentinel(sentinelDir);
 const out=join(dir,'out');
 const result=lab(writeInput(dir),out,['--live','--max-calls','3','--codex-bin',stub.bin],labEnv(sentinelDir));
 assert.equal(result.status,1);
 assert.match(result.stderr,/Lab stopped/);
 assert.ok(!existsSync(out),'no output directory is created when the runner cannot execute');
 assert.deepEqual(readCalls(stub.logPath),[]);
 assert.deepEqual(readLines(sentinel.logPath),[],'the later PATH entry must not be used');
});

test('A missing injected runner path fails instead of falling through to PATH',{skip:posixSkip},()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-')),sentinelDir=mkdtempSync(join(tmpdir(),'wonboard-sentinel-'));
 const sentinel=writeSentinel(sentinelDir),out=join(dir,'out');
 const result=lab(writeInput(dir),out,['--live','--max-calls','3','--codex-bin',join(dir,'does-not-exist')],labEnv(sentinelDir));
 assert.equal(result.status,1);
 assert.match(result.stderr,/Lab stopped/);
 assert.ok(!existsSync(out));
 assert.deepEqual(readLines(sentinel.logPath),[]);
});

test('A failed turn stops the run with a diagnostic and no further calls',{skip:posixSkip},()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-')),sentinelDir=mkdtempSync(join(tmpdir(),'wonboard-sentinel-'));
 const stub=writeStub(dir,{behavior:'turn-failed'}),sentinel=writeSentinel(sentinelDir);
 const failedOut=join(dir,'failed');
 const failed=lab(writeInput(dir),failedOut,['--live','--codex-bin',stub.bin],labEnv(sentinelDir));
 assert.equal(failed.status,1,failed.stderr);
 assert.ok(existsSync(join(failedOut,'0000-diagnostic.json')));
 assert.ok(!existsSync(join(failedOut,'0001-started.json')),'a transport failure stops the run');
 assert.equal(JSON.parse(readFileSync(join(failedOut,'comparison.json'),'utf8')).completed,0);
 const diagnostic=JSON.parse(readFileSync(join(failedOut,'0000-diagnostic.json'),'utf8'));
 assert.equal(diagnostic.reason,'Invalid or incomplete event stream');
 assert.match(diagnostic.stdout,/"type":"turn\.failed"/);
 const calls=readCalls(stub.logPath);
 assert.equal(calls.filter(call=>call.kind==='exec').length,1,'exactly one generation call was attempted');
 assert.deepEqual(readLines(sentinel.logPath),[]);
});

test('A bare process.execPath shebang is not runnable when the path contains a space',{skip:posixSkip},()=>{
 // Documents why the stub is a shell wrapper. Without this the isolation above
 // degrades silently into a real subscription call.
 const spacedDir=mkdtempSync(join(tmpdir(),'wonboard luna spaced-'));
 const spacedNode=join(spacedDir,'node');
 symlinkSync(process.execPath,spacedNode);
 const bin=join(spacedDir,'codex');
 writeFileSync(bin,`#!${spacedNode}\nconsole.log('ran');\n`);
 chmodSync(bin,0o700);
 const direct=spawnSync(bin,[],{encoding:'utf8'});
 assert.ok(direct.status!==0||direct.error,'a bare shebang with a spaced interpreter path must not run');
 assert.match(`${direct.error?.message??''}\n${direct.stderr??''}`,/ENOENT|bad interpreter|No such file or directory/);
 const wrapped=spawnSync('/bin/sh',['-c',`exec ${shellQuote(spacedNode)} -e 'console.log("ran")'`],{encoding:'utf8'});
 assert.equal(wrapped.status,0,wrapped.stderr);
 assert.equal(wrapped.stdout.trim(),'ran');
});

test('Positive control: a bare-name lookup reaches the sentinel and fails loudly',{skip:posixSkip},()=>{
 // Proves the harness above has teeth. Without `--codex-bin` the runner is resolved by name,
 // so PATH decides. Only the sentinel is on PATH here; it records the call and exits 99.
 // Reverting either call site in codex.mjs from `command` to the literal 'codex' makes the
 // success and turn-failed tests take this path and fail, instead of re-running the same stub.
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-')),sentinelDir=mkdtempSync(join(tmpdir(),'wonboard-sentinel-'));
 const stub=writeStub(dir,{findings:FINDINGS}),sentinel=writeSentinel(sentinelDir);
 const out=join(dir,'out');
 const result=lab(writeInput(dir),out,['--live','--max-calls','3'],labEnv(sentinelDir));
 assert.equal(result.status,1);
 assert.match(result.stderr,/Lab stopped/);
 const sentinelCalls=readLines(sentinel.logPath);
 assert.ok(sentinelCalls.length>0,'the sentinel must observe a bare-name lookup');
 assert.match(sentinelCalls[0],/^login status$/);
 assert.deepEqual(readCalls(stub.logPath),[],'the injected stub is never reached without --codex-bin');
 assert.ok(!existsSync(out));
});
