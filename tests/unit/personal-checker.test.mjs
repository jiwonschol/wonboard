import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('nickname registration leaves its independent honorific gap actionable',()=>{
  for(const word of ['모험러님','모험러님께서','모험러님에게','모험러님입니다']){
    const suffix=word.slice(3),findings=check(word);
    assert.equal(findings.find(f=>f.type==='unknown')?.original,'모험러',word);
    assert.ok(findings.some(f=>f.from===3&&f.suggestions.includes(' '+suffix)),word);
    assert.equal(check(word,['모험러']).filter(f=>f.type==='unknown').length,0,word);
    assert.ok(check(word,['모험러']).some(f=>f.suggestions.includes(' '+suffix)),word);
    assert.deepEqual(check('모험러 '+suffix,['모험러']),[],word);
  }
  assert.deepEqual(check('모험러님께서',['모험러님']),[]);
  for(const word of ['선생님','주인님','스님','부모님'])assert.deepEqual(check(word),[],word);
  for(const word of ['당대표님','추지사님','김교수님','신임회장님'])assert.ok(!check(word).some(f=>f.suggestions.some(s=>s.startsWith(' 님'))),word);
  const findings=check('모험러님께서 두번 됬어요',['모험러']);
  assert.ok(findings.some(f=>f.suggestions.includes('두 번')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('an action abbreviation offers its base and validates each ending after registration',()=>{
  for(const word of ['업글','업글을','업글에서','업글한','업글하고','업글했어요']){
    const review=check(word).find(f=>f.reviewKind==='community');
    assert.equal(review?.original,'업글',word);
    assert.equal(review?.base,'업글',word);
    assert.deepEqual(review.suggestions,[]);
    assert.deepEqual(check(word,['업글']),[],word);
  }
  const registered=check('업글한 두번 됬어요',['업글']);
  assert.ok(registered.some(f=>f.suggestions.includes('두 번')));
  assert.ok(registered.some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('업글됬어요',['업글']).length>0);
  for(const word of ['업글한빛','업글하다가닉','내일하다'])assert.equal(check(word,['내일']).some(f=>f.reviewKind==='community'),false,word);
  assert.ok(check('업글한').some(f=>f.reviewKind==='community'));
});

test('repeated word analysis keeps offsets and is discarded when the personal dictionary changes',()=>{
  const text='연결되는줄 연결되는줄';
  assert.deepEqual(check(text).filter(f=>f.type==='spacing').map(f=>[f.from,f.to,f.suggestions[0]]),[[0,5,'연결되는 줄'],[6,11,'연결되는 줄']]);
  assert.deepEqual(check(text,['연결되는줄']),[]);
  assert.equal(check(text).filter(f=>f.type==='spacing').length,2);
  const contexts=check('죽을 질게 끓였다. 질게 질문입니다.');
  assert.equal(contexts.filter(f=>f.original==='질게').length,1);
  assert.equal(contexts.find(f=>f.original==='질게').from,11);
});

test('personal particles suppress only their expression and never neighboring spacing or typos',()=>{
  for(const tail of ['','은','에서','에게','로도','들께'])assert.deepEqual(check('아즈휼'+tail,['아즈휼']),[]);
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
  assert.deepEqual(check('질게에서',['질게']),[]);
  const findings=check('질게에서답변하시는걸 됬어요',['질게']);
  assert.ok(findings.some(f=>f.suggestions.includes('질게에서 답변하시는 걸')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
  assert.deepEqual(check('죽을 질게 끓였다.'),[]);
  assert.ok(check('질게 질문입니다.').some(f=>f.original==='질게'&&f.type==='unknown'&&f.ambiguous));
  assert.equal(check('질게 질문입니다.',['질게']).some(f=>f.original==='질게'),false);
  assert.ok(check('ㅋㅋ').some(f=>f.type==='unknown'));
  assert.deepEqual(check('ㅋㅋ',['ㅋㅋ']),[]);
});
test('personal English casing stays exact while apostrophes are symmetric',()=>{
  for(const source of ["Zqx’name","Zqx'name"])for(const entry of ["Zqx’name","Zqx'name"])assert.deepEqual(check(source,[entry]),[]);
  assert.deepEqual(check('ZqxBoard',['ZqxBoard']),[]);
  assert.ok(check('zqxboard',['ZqxBoard']).length);
  assert.ok(check('ZQX').some(f=>f.type==='unknown'&&!f.suggestions.length));
});
test('passive suffix hosts preserve normal words and keep external boundaries visible',()=>{
  for(const text of ['삭제당하고','강등당했었네요','삭제당해서','거절당했습니다','견제당하는'])assert.deepEqual(check(text),[],text);
  assert.ok(check('학교당하고').length);
  assert.ok(check('삭제당하고학교에갔어요').some(f=>f.suggestions.includes('삭제당하고 학교에 갔어요')));
});
