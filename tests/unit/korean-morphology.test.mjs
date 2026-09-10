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
test('finite endings, plural nouns and permitted auxiliary spelling stay intact',()=>{
  for(const text of ['시작합니다','기다릴게요','남았어요','아이들이','문을 열어주세요.','알려주려고','알려주면','읽어보려고','오리보스는','어둠땅은'])assert.equal(check(text).filter(f=>f.suggestions.length).length,0,text);
});
test('separated particles keep exact offsets and never bridge a newline',()=>{
  const f=check('😀 도서관 에서').find(f=>f.type==='spacing');
  assert.equal(f.original,'도서관 에서');assert.equal(f.from,3);assert.deepEqual(f.suggestions,['도서관에서']);
  assert.equal(check('도서관\n에서').filter(f=>f.type==='spacing').length,0);
});
test('bounded orthography rules preserve names and ordinary endings',()=>{
  for(const [text,expected] of [['설겆이를','설거지를'],['됬지만','됐지만'],['산뜻히','산뜻이']])assert.ok(check(text).some(f=>f.suggestions.includes(expected)));
  for(const text of ['되면','되고','몇일이라는닉네임'])assert.equal(check(text).filter(f=>f.type==='spelling').length,0);
  assert.equal(check('산뜻히',['산뜻히']).filter(f=>f.suggestions.length).length,0);
});
test('English alternatives and case-preserving names survive extraction',()=>{
  for(const text of ['The road was quiet.','We travelled yesterday.','Wonboard supports writing.'])assert.equal(check(text).filter(f=>f.suggestions.length).length,0,text);
  assert.ok(check('Recieve').some(f=>f.suggestions.includes('Receive')));
  for(const [word,target] of [['writting','writing'],['buton','button'],['conection','connection']])assert.equal(check(word)[0].suggestions[0],target);
});
test('pathological unbroken text reports an explicit analysis limitation',()=>{
  const f=check('가'.repeat(10000));assert.equal(f.length,1);assert.match(f[0].reason,/64/);assert.equal(f[0].applicable,false);
});

test('verified spelling is checked independently of permissive morphology',()=>{
  for(const [source,target] of [['웬지','왠지'],['왠만했지만','웬만했지만'],['역활에게','역할에게'],['뵈요','봬요'],['꼼꼼이','꼼꼼히'],['되물림되는','대물림되는']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['웬일','뵈면','되고','역활이라는별명','왠만이라는별명'])assert.equal(check(source).filter(f=>f.type==='spelling').length,0,source);
  assert.deepEqual(check('어떻해')[0].suggestions,['어떻게','어떡해']);
  assert.equal(check('어떻해')[0].ambiguous,true);
});

test('contracted demonstratives are preserved rather than expanded or respelled',()=>{
  for(const word of ['이걸로','그걸로도','저걸로만','요걸로','새걸로','뭘로는'])assert.equal(check(word).filter(f=>f.suggestions.length).length,0,word);
  for(const word of ['충분하잖아요','괜찮잖아','말했잖아요'])assert.equal(check(word).filter(f=>f.suggestions.length).length,0,word);
});

test('predicate boundaries do not use free-standing fragments as pre-endings',()=>{
  for(const [source,target] of [['질문이있으면','질문이 있으면'],['문서를저장하고','문서를 저장하고'],['비가오면','비가 오면'],['할일이','할 일이'],['누구나할','누구나 할']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['말해요','말했어요','질문이 있으면 말해요.'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
});

test('the original user sentence yields all three reviewable spacing ranges',()=>{
  const findings=check('평소에 질게에서답변하시는걸 뵌걸로보면 제가 조언할 수준은 아닌것 같지만');
  assert.deepEqual(findings.map(f=>f.suggestions[0]),['질게에서 답변하시는 걸','뵌 걸로 보면','아닌 것']);
});

test('extended common nouns recognize ordinary words without splitting community names',()=>{
  assert.equal(check('댓글로').length,0);
  for(const word of ['오리보스는','실바나스','질게에서'])assert.equal(check(word).filter(f=>f.suggestions.length).length,0,word);
});
