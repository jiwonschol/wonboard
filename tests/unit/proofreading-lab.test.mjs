import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {plan,validateFindings,usageCost,compare,personas} from '../../scripts/proofreading-lab/core.mjs';
import {assertionFor,createVertex} from '../../scripts/proofreading-lab/vertex.mjs';

test('lab sends three isolated personas with source only, never gold or personal metadata',()=>{
  const p=plan([{id:'a',text:'질게에 글을 썼어요.',gold:'SECRET-GOLD',personal:['SECRET-DICTIONARY']}]);
  assert.equal(p.requests.length,3);assert(p.reservedUsd>0);
  for(const r of p.requests){assert(!JSON.stringify(r.body).includes('SECRET-'));assert.equal(r.body.generationConfig.responseMimeType,'application/json');}
  assert.throws(()=>plan([{id:'a',text:'a'},{id:'a',text:'b'}]));
});
test('lab anchors repeated Korean spans after emoji and rejects invented coordinates/actions',()=>{
  const text='🙂됬어요. 또 됬어요.';
  const f={original:'됬어요',occurrence:1,action:'correct',replacement:'됐어요',reason:'활용'};
  assert.equal(validateFindings(text,{findings:[f]})[0].from,text.lastIndexOf('됬어요'));
  assert.throws(()=>validateFindings(text,{findings:[{...f,occurrence:2}]}));
  assert.throws(()=>validateFindings(text,{findings:[{...f,action:'review'}]}));
});
test('lab records disagreements and never converts unanimous model output into gold',()=>{
  const records=personas.map(p=>({id:'a',persona:p.id,findings:[{from:0,to:2,original:'질게',action:'review',replacement:'',reason:'약어'}]}));
  assert.equal(compare(records)[0].allPersonasAgree,true);assert.equal(compare(records)[0].adjudication,'pending');
  records[0].findings[0].action='protect';assert.equal(compare(records)[0].allPersonasAgree,false);
});
test('cost includes thought tokens and refuses missing usage',()=>{
  assert.equal(usageCost({promptTokenCount:1000000,candidatesTokenCount:100000,thoughtsTokenCount:100000}).estimatedUsd,.55);
  assert.throws(()=>usageCost({promptTokenCount:1}));
});
test('Vertex service account assertion pins audience and signs with RSA; adapter caches token and disables redirects',async()=>{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const credentials={type:'service_account',client_email:'lab@test.iam.gserviceaccount.com',private_key:privateKey.export({format:'pem',type:'pkcs8'})};
  const token=assertionFor(credentials,100);const parts=token.split('.');
  const claims=JSON.parse(Buffer.from(parts[1],'base64url'));assert.equal(claims.aud,'https://oauth2.googleapis.com/token');assert.equal(claims.exp,3700);
  assert(verify('RSA-SHA256',Buffer.from(parts.slice(0,2).join('.')),publicKey,Buffer.from(parts[2],'base64url')));
  const calls=[];const client=createVertex({GCP_PROJECT_ID:'test-project',GOOGLE_SERVICE_ACCOUNT_KEY_B64:Buffer.from(JSON.stringify(credentials)).toString('base64')},async(url,options)=>{
    calls.push({url,options});assert.equal(options.redirect,'error');
    return {ok:true,json:async()=>url.includes('oauth2')?{access_token:'test-only-token',expires_in:3600}:{candidates:[]}};
  });
  await client('gemini-3.1-flash-lite',{});await client('gemini-3.1-flash-lite',{});assert.equal(calls.length,3);
  assert(calls[1].url.startsWith('https://aiplatform.googleapis.com/'));assert.equal(calls[1].options.headers.Authorization,'Bearer test-only-token');
});

import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('CLI refuses insufficient budget before any call and completes a fully mocked three-persona run',()=>{
  const dir=mkdtempSync(join(tmpdir(),'wonboard-lab-test-'));
  const input=join(dir,'input.json');writeFileSync(input,JSON.stringify([{id:'fixture',text:'<script>alert(1)</script> 됬어요.'}]));
  const run=resolve('scripts/proofreading-lab/run.mjs');
  const denied=spawnSync(process.execPath,[run,'--provider','gemini','--input',input,'--out',join(dir,'denied'),'--live','--budget-usd','0.000001'],{encoding:'utf8'});
  assert.equal(denied.status,1);
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const credentials={type:'service_account',client_email:'lab@test.iam.gserviceaccount.com',private_key:privateKey.export({format:'pem',type:'pkcs8'})};
  const preload=join(dir,'mock.mjs');
  writeFileSync(preload,`globalThis.fetch=async (url)=>({ok:true,json:async()=>url==='https://oauth2.googleapis.com/token'?{access_token:'mock-token',expires_in:3600}:{modelVersion:'mock-only',usageMetadata:{promptTokenCount:100,candidatesTokenCount:20},candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({findings:[{original:'됬어요',occurrence:0,action:'correct',replacement:'됐어요',reason:'fixture-only'}]})}]}}]}});`);
  const out=join(dir,'result');
  const result=spawnSync(process.execPath,['--import',preload,run,'--provider','gemini','--input',input,'--out',out,'--live','--budget-usd','1'],{encoding:'utf8',env:{...process.env,GCP_PROJECT_ID:'test-project',GOOGLE_SERVICE_ACCOUNT_KEY_B64:Buffer.from(JSON.stringify(credentials)).toString('base64')}});
  assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(readFileSync(join(out,'comparison.json')));assert.equal(report.completed,3);assert.equal(report.comparisons[0].adjudication,'pending');
  const html=readFileSync(join(out,'comparison.html'),'utf8');assert(!html.includes('<script>alert'));assert(html.includes('&lt;script&gt;'));
  assert(!readFileSync(join(out,'manifest.json'),'utf8').includes('PRIVATE KEY'));
  // One invalid model span must not discard later untouched requests or become a correction.
  writeFileSync(preload,`let n=0;globalThis.fetch=async(url)=>({ok:true,json:async()=>url.includes('oauth2')?{access_token:'mock-token',expires_in:3600}:{usageMetadata:{promptTokenCount:100,candidatesTokenCount:20},candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({findings:[{original:++n===1?'absent':'됬어요',occurrence:0,action:'correct',replacement:'됐어요',reason:'fixture'}]})}]}}]}});`);
  const partial=join(dir,'partial');
  const continued=spawnSync(process.execPath,['--import',preload,run,'--provider','gemini','--input',input,'--out',partial,'--start-request','1','--max-calls','2','--live','--budget-usd','1'],{encoding:'utf8',env:{...process.env,GCP_PROJECT_ID:'test-project',GOOGLE_SERVICE_ACCOUNT_KEY_B64:Buffer.from(JSON.stringify(credentials)).toString('base64')}});
  assert.equal(continued.status,1);
  const quarantined=JSON.parse(readFileSync(join(partial,'comparison.json')));
  assert.deepEqual(quarantined.results.map(r=>[r.persona,r.status]),[['preservation','invalid'],['community','ok']]);
  assert.equal(quarantined.results[0].findings,undefined);
  assert.equal(quarantined.completed,1);
  assert.equal(JSON.parse(readFileSync(join(partial,'manifest.json'))).startRequest,1);

});
