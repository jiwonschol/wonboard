import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('numeric units retain their number while separating duration and comparison words',()=>{
  for(const [source,expected]of [['10년넘게','10년 넘게'],['1년동안','1년 동안'],['25억이상','25억 이상'],['3개월동안은','3개월 동안은'],['1.5시간이하','1.5시간 이하'],['1,000원이상','1,000원 이상']]){
    const f=check(source).find(f=>f.type==='spacing');assert.ok(f,source);
    assert.equal(source.slice(0,f.from)+f.suggestions[0]+source.slice(f.to),expected);
  }
  for(const source of ['10년','10년 넘게','1년동안나라','A10년동안','10년동안_v2','`10년동안`','https://example.com/10년동안'])assert.equal(check(source).filter(f=>f.type==='spacing').length,0,source);
  assert.equal(check('1년동안',['1년동안']).length,0);
  const source='😀 10년넘게',f=check(source).find(f=>f.type==='spacing');
  assert.equal(f.from,3);assert.equal(source.slice(f.from,f.to),'10년넘게');
});
