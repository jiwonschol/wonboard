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
