import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {accessSync,constants} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {isAbsolute,join} from 'node:path';

export const lunaModel='gpt-5.6-luna';
const execute=promisify(execFile);
const config=['forced_login_method="chatgpt"','model_reasoning_effort="medium"','approval_policy="never"',
  'web_search="disabled"','features.shell_tool=false','features.multi_agent=false','features.remote_plugin=false',
  'features.apps=false','project_doc_max_bytes=0','history.persistence="none"'];
export function lunaRequest(body){
  const lower=node=>Array.isArray(node)?node.map(lower):node&&typeof node==='object'?Object.fromEntries([
    ...Object.entries(node).map(([k,v])=>[k,k==='type'?v.toLowerCase():lower(v)]),
    ...(node.type==='OBJECT'?[['additionalProperties',false]]:[]),
  ]):node;
  return {instructions:body.systemInstruction.parts.map(p=>p.text).join('\n'),prompt:body.contents[0].parts[0].text,schema:lower(body.generationConfig.responseSchema)};
}
export function codexUsage(usage){
  if(!usage||['input_tokens','cached_input_tokens','output_tokens'].some(k=>!Number.isInteger(usage[k])||usage[k]<0)||usage.cached_input_tokens>usage.input_tokens)throw Error('Missing Codex usage');
  return {input:usage.input_tokens,cachedInput:usage.cached_input_tokens,output:usage.output_tokens,billing:'chatgpt-subscription',estimatedUsd:null};
}
export function parseCodexOutput(stdout){
  const events=stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
  if(events.some(e=>e.type==='error'||e.type==='turn.failed'))throw Error('Codex turn failed');
  const items=events.filter(e=>e.type==='item.completed').map(e=>e.item);
  const contextWarning='Skill descriptions were shortened to fit the skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.';
  const warnings=items.filter(i=>i?.type==='error'&&i.message===contextWarning);
  const outputItems=items.filter(i=>!warnings.includes(i));
  if(outputItems.some(i=>!['agent_message','reasoning'].includes(i?.type)))throw Error('Unexpected tool use');
  const messages=items.filter(i=>i.type==='agent_message');
  const completed=events.filter(e=>e.type==='turn.completed');
  if(messages.length!==1||completed.length!==1||typeof messages[0].text!=='string')throw Error('Incomplete Codex response');
  codexUsage(completed[0].usage);
  return {text:messages[0].text,warnings,usage:completed[0].usage,events,modelVersion:null,requestedModel:lunaModel,modelVersionSource:'requested CLI model; event stream does not attest model version'};
}
// Resolve the CLI to invoke. An explicitly injected runner is addressed by absolute path for
// both the login check and generation: execvp only searches PATH for names without a slash, so an
// absolute path cannot silently fall through to a real logged-in CLI when the stub is missing,
// not executable, or has an unusable interpreter. Absent an injection the installed CLI is found
// on PATH, which is the only supported path for real subscription runs.
export function resolveRunner(binary){
  if(binary===null||binary===undefined)return 'codex';
  if(typeof binary!=='string'||!isAbsolute(binary))throw Error('Injected runner must be an absolute path');
  try{accessSync(binary,constants.X_OK);}
  catch(error){throw Error(`Injected runner is not executable: ${binary} (${error.code})`);}
  return binary;
}
export async function createCodex({env=process.env,run=execute,binary=null}={}){
  const command=resolveRunner(binary);
  // Keep login in the official CLI. Do not read/copy tokens or inherit API/provider secrets.
  const cleanEnv=Object.fromEntries(['HOME','PATH','USER','LOGNAME','TMPDIR','CODEX_HOME','SSL_CERT_FILE','SSL_CERT_DIR'].filter(k=>env[k]).map(k=>[k,env[k]]));
  const status=await run(command,['login','status'],{env:cleanEnv,timeout:10000,maxBuffer:64000});
  if(!/Logged in using ChatGPT/.test(status.stdout+'\n'+status.stderr))throw Error('ChatGPT login required');
  return async(model,body)=>{
    if(model!==lunaModel)throw Error('Unexpected model');
    const dir=await mkdtemp(join(tmpdir(),'wonboard-luna-'));
    try{
      const schemaFile=join(dir,'schema.json'),instructionsFile=join(dir,'instructions.md');
      await writeFile(schemaFile,JSON.stringify(body.schema),{mode:0o600});
      await writeFile(instructionsFile,body.instructions+'\n도구를 호출하지 말고 주어진 원문만 판정하여 최종 JSON 하나를 반환하라.',{mode:0o600});
      // Prompt passed on stdin; no source or credentials in command-line arguments.
      const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--model',model,'--json','--output-schema',schemaFile,
        ...[...config,`model_instructions_file=${JSON.stringify(instructionsFile)}`].flatMap(c=>['-c',c]),'-'];
      const result=await new Promise((resolve,reject)=>{
        const child=execFile(command,args,{cwd:dir,env:cleanEnv,timeout:180000,killSignal:'SIGKILL',maxBuffer:2*1024*1024},(error,stdout,stderr)=>{if(error){const failure=Error('Codex invocation failed; no automatic retry');failure.diagnostic={command,exitCode:error.code,signal:error.signal,stdout,stderr};reject(failure);}else resolve(stdout);});
        child.stdin.on('error',()=>{});child.stdin.end(body.prompt);
      });
      try{return parseCodexOutput(result);}catch(error){error.diagnostic={stdout:result,stderr:'',reason:'Invalid or incomplete event stream'};throw error;}
    }finally{await rm(dir,{recursive:true,force:true});}
  };
}
