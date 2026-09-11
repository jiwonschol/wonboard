import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileCases,evaluate,edits} from '../../scripts/eval-spelling.mjs';
import {readFile} from 'node:fs/promises';

test('fixed corpus has 200 examples and proportional holdout counts',async()=>{
  const cases=compileCases(JSON.parse(await readFile(new URL('../fixtures/spelling/cases.json',import.meta.url),'utf8')));
  assert.equal(cases.length,200);
  assert.deepEqual(['ko','en','mixed'].map(l=>cases.filter(c=>c.language===l&&c.split==='holdout').length),[40,20,10]);
  assert.equal(new Set(cases.map(c=>c.text)).size,200);
});
test('missing detections remain in the denominator',async()=>{
  const [c]=compileCases({groups:[{language:'ko',type:'spacing',holdout:1,rows:[['[우리집앞]','우리 집 앞']]}]});
  const r=await evaluate([c],async()=>[]);
  assert.equal(r.totals['all/ko/spacing'].events,2);
  assert.equal(r.totals['all/ko/spacing'].detected,0);
});
test('unknown notices do not masquerade as detected errors',async()=>{
  const [c]=compileCases({groups:[{language:'en',type:'spelling',holdout:1,rows:[['[recieve]','receive']]}]});
  const r=await evaluate([c],async()=>[{from:0,to:7,original:'recieve',type:'unknown',suggestions:[]}]);
  assert.equal(r.totals['all/en/spelling'].detected,0);
  assert.equal(r.totals['all/en/spelling'].unknown,1);
});
test('equivalent wider range correction counts; extra edits do not',async()=>{
  const [c]=compileCases({groups:[{language:'ko',type:'spacing',holdout:1,rows:[['[글을쓴다].','글을 쓴다']]}]});
  const result=async suggestion=>evaluate([c],async()=>[{from:0,to:5,original:'글을쓴다.',type:'spacing',suggestions:[suggestion]}]);
  assert.equal((await result('글을 쓴다.')).totals['all/ko/spacing'].top3,1);
  assert.equal((await result('글을 쓴다!')).totals['all/ko/spacing'].top3,0);
});
test('normal texts and UTF-16 offsets are measured',async()=>{
  assert.deepEqual(edits('😀ab','😀a b'),[{from:3,to:3,text:' '}]);
  const [c]=compileCases({groups:[{language:'en',type:'normal',holdout:1,rows:[['color']]}]});
  const r=await evaluate([c],async()=>[{from:0,to:5,original:'color',type:'spelling',suggestions:['colour']}]);
  assert.equal(r.totals['all/en/normal'].falseCases,1);
});

test('combined errors accept complete or separate repairs without counting unknown notices',async()=>{
  const [c]=compileCases({groups:[{language:'ko',type:'combined',holdout:1,rows:[['[못보고잇네요]','못 보고 있네요']]}]});
  const finding=(from,to,type,suggestions)=>({from,to,original:c.text.slice(from,to),type,suggestions});
  for(const findings of [
    [finding(0,c.text.length,'spelling',['못 보고 있네요'])],
    [finding(0,3,'spacing',['못 보고 ']),finding(3,6,'spelling',['있네요'])]
  ]){
    const t=(await evaluate([c],async()=>findings)).totals['all/ko/combined'];
    assert.ok(t.events>1);assert.equal(t.top1,t.events);assert.equal(t.exact,1);assert.equal(t.falseCases,0);
  }
  const partial=(await evaluate([c],async()=>[finding(3,6,'spelling',['있네요'])])).totals['all/ko/combined'];
  assert.ok(partial.top1<partial.events);assert.equal(partial.exact,0);
  const unknown=(await evaluate([c],async()=>[finding(0,6,'unknown',[])])).totals['all/ko/combined'];
  assert.equal(unknown.detected,0);assert.equal(unknown.top3,0);
});

test('protected names permit an unknown notice but count a different name as a false suggestion',async()=>{
  const [c]=compileCases({groups:[{language:'ko',type:'protected',holdout:1,rows:[['😀 실바나스']]}]});
  const finding=(type,suggestions)=>({from:3,to:7,original:'실바나스',type,suggestions});
  const notice=(await evaluate([c],async()=>[finding('unknown',[])])).totals['all/ko/protected'];
  assert.equal(notice.exact,1);assert.equal(notice.falseCases,0);assert.equal(notice.unknown,1);
  const wrong=(await evaluate([c],async()=>[finding('spelling',['실바누스'])])).totals['all/ko/protected'];
  assert.equal(wrong.exact,0);assert.equal(wrong.falseCases,1);
});

test('combined recall cannot merge mutually exclusive partial suggestions',async()=>{
  const [c]=compileCases({groups:[{language:'ko',type:'combined',holdout:1,rows:[['[잇]',' 있']]}]});
  for(const findings of [
    [{from:0,to:1,original:'잇',type:'spelling',suggestions:[' 잇','있']}],
    [{from:0,to:1,original:'잇',type:'spacing',suggestions:[' 잇']},{from:0,to:1,original:'잇',type:'spelling',suggestions:['있']}]
  ]){
    const t=(await evaluate([c],async()=>findings)).totals['all/ko/combined'];
    assert.equal(t.top3,0);assert.equal(t.exact,0);
  }
});

test('optional spacing accepts unchanged text without inflating required recall',async()=>{
  const [c]=compileCases({groups:[{language:'ko',type:'optional',holdout:0,rows:[['[보내드리고]','보내 드리고']]}]});
  for(const suggestions of [[],['보내 드리고']]){
    const r=await evaluate([c],async()=>suggestions.length?[{from:0,to:5,original:c.text,type:'spacing',suggestions}]:[]);
    const t=r.totals['all/ko/optional'];
    assert.equal(t.events,0);assert.equal(t.exact,1);assert.equal(t.falseCases,0);
    assert.deepEqual(r.failures,[]);
  }
  const r=await evaluate([c],async()=>[{from:0,to:5,original:c.text,type:'spelling',suggestions:['보내다리고']}]);
  assert.equal(r.totals['all/ko/optional'].falseCases,1);
});

test('accepted-answer order cannot turn optional spacing into a required event',async()=>{
  const results=[];
  for(const allowed of [['가 보구 싶당','가보구 싶당'],['가보구 싶당','가 보구 싶당']]){
    const cases=compileCases({groups:[{language:'ko',type:'spacing',holdout:1,rows:[['[가보구싶당]',...allowed]]}]});
    const report=await evaluate(cases,async()=>[{from:3,to:5,original:'싶당',type:'spacing',suggestions:[' 싶당']}]);
    results.push(report.totals['all/ko/spacing']);
  }
  assert.deepEqual(results[0],results[1]);
  assert.equal(results[0].events,1);
  assert.equal(results[0].detected,1);
  assert.equal(results[0].top1,1);
  assert.equal(results[0].exact,1);
});
