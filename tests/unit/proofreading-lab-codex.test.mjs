import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,chmodSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {plan} from '../../scripts/proofreading-lab/core.mjs';
import {createCodex,lunaRequest,parseCodexOutput,codexUsage} from '../../scripts/proofreading-lab/codex.mjs';
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
test('Luna CLI completes three isolated subprocess calls, escapes report and enforces call limit',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wonboard-luna-test-')),bin=join(dir,'codex'),input=join(dir,'input.json');
 writeFileSync(input,JSON.stringify([{id:'x',text:'<script> 됬어요.'}]));
 writeFileSync(bin,`#!${process.execPath}
const assert=require('node:assert/strict'),fs=require('node:fs');
const args=process.argv.slice(2);
if(args[0]==='login'){console.log('Logged in using ChatGPT');process.exit(0);}
assert(args.includes('--ignore-user-config'));assert(args.includes('--ephemeral'));assert(args.includes('forced_login_method="chatgpt"'));assert(args.includes('features.shell_tool=false'));assert(args.includes('gpt-5.6-luna'));
assert(!process.env.OPENAI_API_KEY);assert(!process.env.CODEX_API_KEY);assert(process.cwd().includes('wonboard-luna-'));
const schema=JSON.parse(fs.readFileSync(args[args.indexOf('--output-schema')+1]));assert.equal(schema.additionalProperties,false);
let data='';process.stdin.on('data',c=>data+=c);process.stdin.on('end',()=>{assert.equal(JSON.parse(data).source,'<script> 됬어요.');
for(const event of ${JSON.stringify(events(JSON.stringify({findings:[{original:'됬어요',occurrence:0,action:'correct',replacement:'됐어요',reason:'fixture'}]})))})console.log(JSON.stringify(event));});
`);chmodSync(bin,0o700);
 const run=resolve('scripts/proofreading-lab/run.mjs'),out=join(dir,'out');
 const env={...process.env,PATH:dir+':'+process.env.PATH,OPENAI_API_KEY:'SECRET',CODEX_API_KEY:'SECRET'};
 const denied=spawnSync(process.execPath,[run,'--input',input,'--out',out,'--max-calls','2','--live'],{env,encoding:'utf8'});
 assert.equal(denied.status,1);assert(!existsSync(out));
 const result=spawnSync(process.execPath,[run,'--input',input,'--out',out,'--live','--max-calls','3'],{env,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const comparison=JSON.parse(readFileSync(join(out,'comparison.json'))),manifest=JSON.parse(readFileSync(join(out,'manifest.json')));
 assert.equal(comparison.completed,3);assert.equal(comparison.estimatedUsd,null);assert.equal(manifest.model,'gpt-5.6-luna');assert.equal(manifest.billing,'chatgpt-subscription');
 assert.equal(comparison.comparisons[0].adjudication,'pending');assert(!readFileSync(join(out,'comparison.html'),'utf8').includes('<script>'));
 writeFileSync(bin,`#!${process.execPath}
if(process.argv[2]==='login'){console.log('Logged in using ChatGPT');}else{console.log(JSON.stringify({type:'turn.failed'}));}
`);
 const failedOut=join(dir,'failed');
 const failed=spawnSync(process.execPath,[run,'--input',input,'--out',failedOut,'--live'],{env,encoding:'utf8'});
 assert.equal(failed.status,1);assert(existsSync(join(failedOut,'0000-diagnostic.json')));assert(!existsSync(join(failedOut,'0001-started.json')));
 assert.equal(JSON.parse(readFileSync(join(failedOut,'comparison.json'))).completed,0);
 const repeated=spawnSync(process.execPath,[run,'--input',input,'--out',out,'--live'],{env,encoding:'utf8'});assert.equal(repeated.status,1);
});
