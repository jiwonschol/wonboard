import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';
const context=text=>check(text).filter(f=>f.reason.startsWith('Context review:'));
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
