import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';
const context=text=>check(text).filter(f=>f.reason.startsWith('Context review:'));
test('following obligation predicate narrows the ambiguous how spelling',()=>{
  for(const text of ['어떻해 해야 하나요?','😀 어떻해 해야만 하죠?']){
    const finding=context(text)[0];
    assert.ok(finding,text);
    assert.deepEqual(finding.suggestions,['어떻게']);
    assert.equal(text.slice(finding.from,finding.to),'어떻해');
    assert.deepEqual(check(text,['어떻해']).filter(f=>f.original==='어떻해'),[]);
  }
  for(const text of ['어떻해','어떻해\n해야 하나요?','"어떻해" 해야 하나요?','어떻해, 해야 하나요?']){
    assert.deepEqual(context(text),[]);
    assert.deepEqual(check(text).find(f=>f.original==='어떻해')?.suggestions,['어떻게','어떡해']);
  }
  assert.deepEqual(check('어떡해!'),[]);
});
test('confusion words offer explicit context review with stable offsets',()=>{
  for(const [text,source,target] of [
    ['계획을 금새 바꿨어요.','금새','금세'],['눈이 금새 녹았어요.','금새','금세'],
    ['이 옷은 문안한 색이에요.','문안한','무난한'],['문안한 선택을 했어요.','문안한','무난한'],
    ['빨리 낳으세요. 감기가 심하네요.','낳으세요','나으세요'],['상처가 낳으면 가요.','낳으면','나으면'],
    ['😀 감기가 낳았어요.','낳았어요','나았어요']]){
    const f=context(text)[0];assert.ok(f,text);assert.equal(f.original,source);assert.equal(text.slice(f.from,f.to),source);
    assert.deepEqual(f.suggestions,[target]);assert.equal(f.ambiguous,true);assert.deepEqual(contextWithPersonal(text,source),[]);
  }
});
function contextWithPersonal(text,word){return check(text,[word]).filter(f=>f.reason.startsWith('Context review:'));}
test('price, greetings, childbirth, quotations and disconnected paragraphs remain untouched',()=>{
  for(const text of ['`감기`를 검색했어요. 낳았어요.','감기라는 제목의 작품을 낳았다.','어른께 문안한 결과가 좋았어요.'])assert.deepEqual(context(text),[],text);
  for(const text of ['금새를 알아보세요.','금새 모르고 싸다고 하네요.','물건값 금새 바꿨어요.','어른께 문안한 사람이 왔어요.','건강한 아기를 낳으세요.','감기 걸렸지만 아기를 낳았어요.','"금새" 바꿨어요.','감기가 심해요.\n낳으세요.','금새','문안한','낳으세요'])assert.deepEqual(context(text),[],text);
});

test('present-time confusion is reviewable without rewriting a quoted or personal name',()=>{
  for(const text of ['현제 직장에서 근무합니다.','현제는 사용 중입니다.','😀 현제의 상태를 알려 주세요.']){
    const f=context(text)[0];assert.ok(f,text);assert.equal(f.ambiguous,true);assert.ok(f.suggestions[0].startsWith('현재'));
    assert.equal(text.slice(f.from,f.to),f.original);
    assert.deepEqual(contextWithPersonal(text,'현제'),[]);
  }
  for(const text of ['현제','현제(賢弟)에게 보낸 편지.','"현제" 직장이라는 표현.','동생 현제는 근무 중입니다.','현제\n직장에서 근무합니다.','현재 직장에서 근무합니다.'])assert.deepEqual(context(text),[],text);
});
