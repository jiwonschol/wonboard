import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('action noun suffix join is reviewable and preserves independently modified noun phrases',()=>{
  for(const [source,expected]of [['검색 했다가','검색했다가'],['확인 해요','확인해요'],['공부 합니다','공부합니다'],['수거 해서','수거해서']]){
    const f=check(source).find(f=>f.suggestions.includes(expected));assert.ok(f,source);assert.equal(f.ambiguous,true);
  }
  for(const source of ['밥 해요','검색을 했다가','한글 공부 하다','좋은 생각 하다','검색\n했다가','`검색` 했다가'])assert.equal(check(source).filter(f=>f.type==='spacing').length,0,source);
  assert.equal(check('검색 했다가',['검색 했다가']).filter(f=>f.type==='spacing').length,0);
});

test('the numeral 하나 does not become a 하다 suffix',()=>{
  for(const source of ['상처 하나 없었어요.','질문 하나 드립니다.','조사 하나만 바꿨어요.','😀 부탁 하나 있어요.']){
    assert.equal(check(source).some(f=>f.reason.startsWith('Action noun plus')),false,source);
  }
  assert.ok(check('공부 하나요?').some(f=>f.suggestions.includes('공부하나요')));
});

test('attested 추천드리다 inflections are not split into noun and main verb',()=>{
  for(const source of ['추천드립니다','추천드려요','추천드린','추천드렸어요','추천드리면','추천드릴까요']){
    assert.deepEqual(check(source),[],source);
  }
  for(const source of ['불편 드립니다','선물 드립니다','추천을 드립니다']){
    assert.deepEqual(check(source),[],source);
  }
  assert.ok(check('불편드립니다').some(f=>f.suggestions.includes('불편 드립니다')));
});
