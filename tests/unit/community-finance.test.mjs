import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('unknown name and following 측 have independent review and dictionary boundaries',()=>{
  const source='아즈휼측에서 됬어요';
  const findings=check(source);
  assert.ok(findings.some(f=>f.type==='unknown'&&f.original==='아즈휼'&&f.from===0&&f.to===3));
  const gap=findings.find(f=>f.type==='spacing');
  assert.deepEqual([gap.from,gap.to,gap.suggestions,gap.ambiguous],[3,6,[' 측에서'],true]);
  for(const words of [['아즈휼'],['측']]){
    const registered=check(source,words);
    assert.ok(registered.some(f=>f.suggestions.includes(' 측에서')));
    assert.ok(registered.some(f=>f.suggestions.includes('됐어요')));
    if(words[0]==='아즈휼')assert.ok(!registered.some(f=>f.type==='unknown'));
  }
  assert.ok(!check('아즈휼측에서',['아즈휼측']).some(f=>f.applicable));
  assert.deepEqual(check('아즈휼 측에서',['아즈휼']),[]);
  for(const text of ['북측에서','동남측','관측','삼각측량','아즈휼측근','`아즈휼측`','https://example.com/아즈휼측'])
    assert.ok(!check(text).some(f=>f.suggestions.some(s=>s.startsWith(' 측'))),text);
});

test('established computing abbreviations preserve casing without hiding adjacent typos',()=>{
  for(const word of ['CPU','cpu','Cpu','GPU','gpu','gPu'])assert.deepEqual(check(word),[],word);
  const findings=check('gpu cpu teh 됬어요');
  assert.ok(findings.some(f=>f.suggestions.includes('the')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('qzx').some(f=>f.type==='unknown'||f.applicable));
  assert.ok(check('ahk').some(f=>f.suggestions.includes('AHK')));
});

test('community finance feedback has actionable boundaries and preserves recognized words',()=>{
  for(const [source,candidate] of [['오랫만입니다','오랜만입니다'],['6월말에','6월 말에'],['12월초부터','12월 초부터'],['미국금리인상을','미국 금리 인상을'],['일본금리인하는','일본 금리 인하는'],['거래가 안되고','안 되고']]){
    assert(check(source).some(f=>f.suggestions.includes(candidate)),source);
  }
  for(const text of ['시장일 뿐이에요.','사람일 수도','비트코인은','물가지수가','거래가 안 되고','6월 말에','A6월말에','13월말에','6월말_v2','`6월말에`','https://example.com/6월말에'])assert.deepEqual(check(text),[],text);
  assert(check('거래가 안되고')[0].ambiguous);
  assert(!check('그 사람이 안되고 불쌍하다').some(f=>f.suggestions.includes('안 되고')));
  assert.deepEqual(check('6월말에',['6월말에']),[]);
  assert(check('ㅋㅋ').some(f=>f.type==='unknown'));
  assert.deepEqual(check('ㅋㅋ',['ㅋㅋ']),[]);
});
