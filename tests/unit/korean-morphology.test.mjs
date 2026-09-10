import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('unknown noun remains intact while surrounding spacing is suggested',()=>{
  const source='질게에서답변하시는걸';
  for(const personal of [[],['질게'],[]])assert.ok(check(source,personal).some(f=>f.suggestions.includes('질게에서 답변하시는 걸')));
  const findings=check('질게에서 답변하시는 걸');
  assert.ok(findings.some(f=>f.type==='unknown'&&f.base==='질게'));
  assert.equal(check('질게에서 답변하시는 걸',['질게']).length,0);
});
test('particle forms and abbreviated names are not split to dictionary fragments',()=>{
  for(const word of ['질게에','질게에서','질게는']){
    assert.equal(check(word).filter(f=>f.suggestions.length).length,0);
    assert.equal(check(word,['질게']).length,0);
  }
});
test('ten noun substitutions use the same morphology, without sentence lookup',()=>{
  for(const word of ['자게','겜게','불펜','모공','핫게','정게','유게','길챗','공팟','레이드팟'])assert.ok(check(word+'에서답변하시는걸').some(f=>f.suggestions.includes(word+'에서 답변하시는 걸')),word);
});
test('contractions and honorific/adnominal forms are recognized',()=>{
  for(const word of ['저장했습니다','질문했어요','조언할','답변하시는','갔어요','그렸어요'])assert.equal(check(word).filter(f=>f.suggestions.length).length,0,word);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
});
test('spelling uses decomposed Hangul without changing source offsets',()=>{
  const source='😀 맞춥법을';const f=check(source).find(f=>f.type==='spelling');
  assert.equal(source.slice(f.from,f.to),'맞춥법을');
  assert.ok(f.suggestions.includes('맞춤법을'));
});
test('ending versus dependent noun ambiguity is exposed',()=>{
  assert.equal(check('하시는걸')[0].ambiguous,true);
});
