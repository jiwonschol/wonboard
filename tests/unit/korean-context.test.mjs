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

test('demonstrative 이 stays separate before an unfamiliar nominal with a particle',()=>{
  for(const text of ['(후난성 사람) 이 체임점은 유명하다.','`메뉴` 이 크라비온을 골랐다.']){
    assert.equal(check(text).some(f=>f.original===' 이'&&f.applicable),false,text);
  }
  assert.ok(check('(후난성 사람) 이 말했다.').some(f=>f.original===' 이'&&f.suggestions[0]==='이'));
});

test('adnominal colloquial 뎁니다 stays reviewable without becoming reported speech',()=>{
  for(const text of ['포장만 하는뎁니다','친구들이 오는뎁니다']){
    const word=text.split(' ').at(-1),f=check(text).find(f=>f.original===word);
    assert.equal(f?.applicable,false,text);assert.deepEqual(f?.suggestions,[],text);
    assert.equal(check(text,[word]).some(f=>f.original===word),false,text);
  }
  assert.ok(check('감사합니디').some(f=>f.suggestions.includes('감사합니다')));
});

test('local product cues protect names while ordinary food phrases still get boundaries',()=>{
  for(const [text,word] of [
    ['맛있는라면으로 끓였고 다음에는 신라면으로 끓였다.','맛있는라면으로'],
    ['삼양 맛있는라면을 샀다.','맛있는라면을'],
    ['(해장용 갈아만든 배 포함)','갈아만든'],
    ['갈아만든 배 238ml 한 캔','갈아만든'],
  ])assert.equal(check(text).some(f=>f.original===word&&f.applicable),false,text);
  for(const [text,target] of [
    ['신라면보다 맛있는라면을 먹었다.','맛있는 라면을'],
    ['맛있는라면으로 끓였다.\n신라면으로 바꿨다.','맛있는 라면으로'],
    ['배를 갈아만든 음료다.','갈아 만든'],
    ['해장용으로 갈아만든 배추즙이다.','갈아 만든'],
  ])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('surname and office title boundaries preserve the whole title and particle',()=>{
  for(const [source,target] of [['정과장','정 과장'],['박차장만','박 차장만'],['김과장님은','김 과장님은']]){
    assert.ok(check(source).some(f=>f.suggestions[0]===target),source);
    assert.equal(check(source,[source]).some(f=>f.applicable),false,source);
  }
  for(const text of ['이사장은 말했다.','부사장이 왔다.','정 과장님은 출근했다.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('the interjection 웬걸 is repaired before speculative internal word boundaries',()=>{
  for(const [source,target] of [['왠걸','웬걸'],['이거왠걸','이거 웬걸']]){
    assert.deepEqual(check(source).find(f=>f.applicable)?.suggestions,[target],source);
    assert.equal(check(source,[source]).some(f=>f.applicable),false,source);
  }
  assert.equal(check('이거 웬걸').some(f=>f.applicable),false);
});
