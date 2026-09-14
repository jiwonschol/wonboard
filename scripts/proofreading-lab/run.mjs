import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {model,pricing,personas,hash,plan,validateFindings,usageCost,compare} from './core.mjs';
import {createVertex} from './vertex.mjs';
import {createCodex,lunaModel,lunaRequest,codexUsage} from './codex.mjs';
import {createChecker} from '../../packages/editor/src/proofreading/engine.mjs';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function main(){
  const {values}=parseArgs({options:{input:{type:'string'},out:{type:'string'},live:{type:'boolean',default:false},'budget-usd':{type:'string'},provider:{type:'string',default:'luna'},'max-calls':{type:'string',default:'48'},'start-request':{type:'string',default:'0'}}});
  if(!values.input||!values.out)throw Error('Usage: node scripts/proofreading-lab/run.mjs --input private-input.json --out NEW-PRIVATE-DIRECTORY [--provider luna|gemini --live --max-calls 48] (Gemini requires --budget-usd)');
  const inputBytes=readFileSync(values.input),work=plan(JSON.parse(inputBytes));
  const startRequest=Number(values['start-request']);
  if(!Number.isInteger(startRequest)||startRequest<0||startRequest>=work.requests.length)throw Error('Invalid request start');
  work.requests=work.requests.slice(startRequest);
  if(!['luna','gemini'].includes(values.provider))throw Error('Invalid provider');
  const luna=values.provider==='luna', selectedModel=luna?lunaModel:model, maxCalls=Number(values['max-calls']);
  if(!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>300||work.requests.length>maxCalls)throw Error('Call limit exceeded');
  if(luna)for(const request of work.requests)request.body=lunaRequest(request.body);
  const out=resolve(values.out),budget=Number(values['budget-usd']??0);
  if(values.live&&!luna&&(!Number.isFinite(budget)||budget<=0||budget>5||work.reservedUsd>budget))throw Error('Live run requires a sufficient positive budget, at most USD 5');
  const generate=values.live?(luna?await createCodex():createVertex(process.env)):null;
  mkdirSync(out,{mode:0o700}); // Exclusive new run; never overwrite or silently replay a pending call.
  const save=(name,data)=>writeFileSync(join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
  const data=JSON.parse(readFileSync(new URL('../../third_party/spelling/generated/lexicon.json',import.meta.url)));
  data.morphology=JSON.parse(readFileSync(new URL('../../third_party/spelling/generated/morphology.json',import.meta.url)));
  const check=createChecker(data);
  const baseline=work.rows.map(row=>({id:row.id,findings:check(row.text,[])}));
  save('input.json',work.rows);save('baseline.json',baseline);
  save('manifest.json',{created:new Date().toISOString(),live:values.live,provider:values.provider,model:selectedModel,pricing:luna?null:pricing,billing:luna?'chatgpt-subscription':'vertex-api',startRequest,maxCalls,budgetUsd:luna?null:budget,reservedUsd:luna?null:work.reservedUsd,execution:luna?{reasoningEffort:'medium',timeoutMs:180000,tools:'disabled',auth:'existing ChatGPT login',outputTokenCap:null}:null,inputSha256:hash(inputBytes),personas,
    checkerHashes:Object.fromEntries(['engine.mjs','korean-morphology.mjs','korean-context.mjs','korean-orthography.mjs','community-vocabulary.mjs'].map(f=>[f,hash(readFileSync(new URL(`../../packages/editor/src/proofreading/${f}`,import.meta.url)))])),
    dataHashes:{lexicon:hash(JSON.stringify(data.ko)),morphology:hash(JSON.stringify(data.morphology))},
    runnerHashes:Object.fromEntries(['core.mjs','run.mjs',luna?'codex.mjs':'vertex.mjs'].map(f=>[f,hash(readFileSync(new URL(f,import.meta.url)))])),
    requests:work.requests.map(r=>({id:r.id,persona:r.persona,bodySha256:hash(JSON.stringify(r.body))})),
    limitation:'Same-model personas are correlated opinions, not independent gold. No automatic corrections, majority adjudication or accuracy certification. Empty personal dictionary baseline.'});
  save('requests.json',work.requests);
  if(!values.live){console.log(JSON.stringify({mode:'dry-run',calls:work.requests.length,model:selectedModel,reservedUsd:luna?null:work.reservedUsd,out,networkCalls:0}));return;}
  const results=[];let total=0;
  for(let i=0;i<work.requests.length;i++){
    const r=work.requests[i],name=String(i).padStart(4,'0');
    save(`${name}-started.json`,{id:r.id,persona:r.persona,started:new Date().toISOString()});
    let record={id:r.id,persona:r.persona,status:'failed'};
    try{
      const start=Date.now(),response=await generate(selectedModel,r.body);
      save(`${name}-response.json`,response);
      const usage=luna?codexUsage(response.usage):usageCost(response.usageMetadata);if(!luna)total+=usage.estimatedUsd;
      record={...record,usage,elapsedMs:Date.now()-start,modelVersion:response.modelVersion,modelVersionSource:response.modelVersionSource};
      const candidate=response.candidates?.[0];
      if(!luna&&candidate?.finishReason!=='STOP')throw Error('Incomplete or blocked response');
      const text=luna?response.text:(candidate.content?.parts??[]).filter(p=>!p.thought).map(p=>p.text??'').join('');
      const source=work.rows.find(x=>x.id===r.id).text;
      try{
        record.findings=validateFindings(source,JSON.parse(text));record.status='ok';
      }catch(error){
        // Invalid model anchors are quarantined, never repaired or retried.
        // Continue untouched requests; transport/auth/accounting errors still stop.
        record.status='invalid';record.error=error.message;
      }
      if(!luna&&total>budget)throw Error('Observed budget exceeded; stopped');
    }catch(error){
      // Account for possible charged requests, keep raw response if received, stop without retry.
      if(luna&&error.diagnostic)save(`${name}-diagnostic.json`,error.diagnostic);
      record.status='failed';record.error='Request, accounting, schema or budget failure; inspect private response if present. No automatic retry.';
      save(`${name}-result.json`,record);results.push(record);break;
    }
    save(`${name}-result.json`,record);results.push(record);
  }
  const comparisons=compare(results);
  save('comparison.json',{results,comparisons,completed:results.filter(r=>r.status==='ok').length,planned:work.requests.length,estimatedUsd:luna?null:total,adjudication:'pending'});
  const cards=work.rows.map(row=>`<section><h2>${escape(row.id)}</h2><pre>${escape(row.text)}</pre><h3>현재 검사기</h3><pre>${escape(JSON.stringify(baseline.find(r=>r.id===row.id).findings,null,2))}</pre>${personas.map(p=>{const r=results.find(r=>r.id===row.id&&r.persona===p.id);return `<h3>${escape(p.name)} · ${escape(r?.status??'not-run')}</h3><pre>${escape(JSON.stringify(r?.findings??[],null,2))}</pre>`;}).join('')}</section>`).join('');
  writeFileSync(join(out,'comparison.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>원보드 검증 대조</title><style>body{max-width:1000px;margin:40px auto;padding:0 20px;font:16px/1.7 system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f4f4;padding:16px}section{border-top:1px solid #ccc;margin-top:36px}</style><h1>원보드 · ${escape(selectedModel)} 페르소나 대조</h1><p>판정 대기. 같은 모델의 합의는 정답이 아닙니다. 성공 ${results.filter(r=>r.status==='ok').length}/${work.requests.length} · ${luna?'ChatGPT 구독 사용량 소비 · 별도 API 비용으로 환산하지 않음':`추정 USD ${total.toFixed(6)} (누락된 사용량의 비용은 미확정)`}</p>${cards}`,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({out,completed:results.filter(r=>r.status==='ok').length,planned:work.requests.length,estimatedUsd:luna?null:total}));
  if(results.length!==work.requests.length||results.some(r=>r.status!=='ok'))process.exitCode=1;
}
main().catch(error=>{console.error(error.message?.startsWith('Usage:')?error.message:'Lab stopped: configuration, input or filesystem failure. No automatic retry.');process.exitCode=1;});
