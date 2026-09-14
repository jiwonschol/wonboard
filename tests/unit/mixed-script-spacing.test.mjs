import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('jamo name review remains separate from its particle gap before and after registration',()=>{
  const source='ㅁㅈㅌㄹㅇ 를 됬어요';
  assert.ok(check(source).some(f=>f.type==='unknown'&&f.original==='ㅁㅈㅌㄹㅇ'));
  for(const personal of [[],['ㅁㅈㅌㄹㅇ']]){
    const findings=check(source,personal);
    assert.ok(findings.some(f=>f.original===' 를'&&f.suggestions.includes('를')));
    assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
  }
  assert.deepEqual(check('ㅁㅈㅌㄹㅇ를',['ㅁㅈㅌㄹㅇ']),[]);
  for(const text of ['ㄱ 를','이야기ㅋㅋ 를','`ㅁㅈㅌㄹㅇ 를`','ㅁㅈㅌㄹㅇ\n를'])assert.ok(!check(text).some(f=>f.suggestions.includes('를')),text);
});

test('percentage boundaries preserve particles copulas ranges and neighboring errors',()=>{
  for(const [source,target]of [['46%감소','46% 감소'],['0.95%감량','0.95% 감량'],['10~20%상승','10~20% 상승'],['46%감소했습니다','46% 감소했습니다']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['50%가','50%로','50%입니다','50%인','50%일','50%가량','50%가량을','90%짜리','90%짜리로','50%쯤은','50%대에서','50%여','id50%감소','50%감소abc','50%아즈휼','`50%감소`','https://example.com/50%감소'])assert.ok(!check(source).some(f=>f.suggestions.some(s=>/% /.test(s))),source);
  const result=check('46%감소 됬어요',['감소']);
  assert.ok(result.some(f=>f.suggestions.includes('46% 감소')));
  assert.ok(result.some(f=>f.suggestions.includes('됐어요')));
});

test('contracted past copula attaches only after a vowel-final Korean host',()=>{
  for(const [source,target]of [['극소수 였습니다','극소수였습니다'],['나무 였어요','나무였어요'],['바나나 였지만','바나나였지만']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['학생 였어요','나무\n였어요','나무 였숲','`나무 였어요`'])assert.equal(check(source).some(f=>f.suggestions.includes(source.replace(/\s+/g,''))),false,source);
  assert.equal(check('바구니를 머리에 였어요').some(f=>f.suggestions.includes('머리에였어요')),false);
  const findings=check('나무 였어요 됬어요',['나무']);
  assert.ok(findings.some(f=>f.suggestions.includes('나무였어요')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('quantity suffix gap repairs preserve the unit and unrelated findings',()=>{
  for(const source of ['100GB 짜리','90GB \u00a0짜리는','22mm 짜리','2만 원 짜리입니다','2.5kg 짜리도']){
    const finding=check(source).find(f=>f.reason.startsWith('Attach quantity suffix'));
    assert.ok(finding,source);
    assert.match(finding.original,/^[ \u00a0]+짜리/);
    const target=source.slice(0,finding.from)+finding.suggestions[0]+source.slice(finding.to);
    assert.equal(check(target).some(f=>f.applicable&&f.language==='ko'),false,target);
  }
  for(const source of ['id100GB 짜리','item_22mm 짜리','`100GB 짜리`','https://example.com/100GB 짜리','100GB\n짜리','100GB 짜리숲'])assert.equal(check(source).some(f=>f.reason.startsWith('Attach quantity suffix')),false,source);
  const findings=check('100GB 짜리 됬어요',['짜리']);
  assert.ok(findings.some(f=>f.reason.startsWith('Attach quantity suffix')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('written numeric scales remain separate from units with validated copula endings',()=>{
  for(const [source,target]of [['8천원이었던','8천 원이었던'],['400만원이거든요','400만 원이거든요'],['2만명이지만','2만 명이지만'],['3억달러입니다','3억 달러입니다']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['8000원이었던','400만원이거든요abc','id400만원','`400만원이거든요`','https://example.com/400만원이거든요','400만원숲'])assert.equal(check(source).some(f=>f.language==='ko'&&f.applicable),false,source);
  const findings=check('400만원이거든요 됬어요',['원']);
  assert.ok(findings.some(f=>f.suggestions.includes('400만 원이거든요')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('numeric counting units retain the numeral while repairing a validated past copula',()=>{
  for(const [source,target]of [['30주년이였고','30주년이었고'],['3개월이였어요','3개월이었어요'],['1,000원이였습니다','1,000원이었습니다'],['2명이였지만','2명이었지만']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['item30주년이였고','item_30주년이였고','`30주년이였고`','https://example.com/30주년이였고','30주년이었고','30주년이였다abc'])assert.equal(check(source).some(f=>f.language==='ko'&&f.applicable),false,source);
  assert.equal(check('30주년이였고',['주년이였고']).some(f=>f.applicable),false);
  assert.ok(check('30주년이였고 됬어요',['주년']).some(f=>f.suggestions.includes('30주년이었고')));
  assert.ok(check('30주년이였고 됬어요',['주년']).some(f=>f.suggestions.includes('됐어요')));
});

test('an excluded inline mark licenses only the following leading particle gap',()=>{
  const source=' 에서 됬어요',findings=check(source,[],{afterProtected:true});
  assert.ok(findings.some(f=>f.from===0&&f.to===3&&f.original===' 에서'&&f.suggestions[0]==='에서'));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
  for(const [s,boundary]of [[' 에서',{}],['\n 에서',{afterProtected:true}],[' 봐요 에서',{afterProtected:true}]]){
    assert.equal(check(s,[],boundary).some(f=>f.from===0&&f.type==='spacing'),false,s);
  }
});

test('attested particle chains attach after nominal and inflected hosts without changing neighboring words',()=>{
  for(const [source,target]of [['학교 에서만','학교에서만'],['방문하면서 부터가','방문하면서부터가'],['조금 이나마','조금이나마'],['종료 라는','종료라는'],['문제다 라고','문제다라고']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['학교 가 봐요','큰 부터','집 밖에 있어요'])assert.equal(check(source).some(f=>f.applicable),false,source);
  const findings=check('학교 에서만 됬어요',['학교']);
  assert.ok(findings.some(f=>f.suggestions.includes('학교에서만')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('Latin-script name notice and particle spacing are separate edits',()=>{
  for(const particle of ['에','를','에서','은']){
    const source='Imgur '+particle,findings=check(source),spacing=findings.find(f=>f.type==='spacing');
    assert.ok(spacing);
    assert.equal(source.slice(0,spacing.from)+spacing.suggestions[0]+source.slice(spacing.to),'Imgur'+particle);
    assert.ok(findings.some(f=>f.original==='Imgur'&&f.to<=spacing.from));
    assert.ok(check(source,['Imgur']).some(f=>f.type==='spacing'));
  }
  for(const source of ['Imgur\n에','https://example.com에','`Imgur`에','image.png에'])assert.equal(check(source).filter(f=>f.type==='spacing').length,0,source);
});

test('quoted and protected spans keep their content while a following particle gap is repaired',()=>{
  for(const host of ['https://example.com/path/','`user_id`','image.png','"단어"','“단어”','항목(설명)']){
    const source=host+' 에서 됬어요',findings=check(source),gap=findings.find(f=>f.type==='spacing');
    assert.equal(gap?.from,host.length,source);
    assert.equal(gap?.original,' 에서',source);
    assert.deepEqual(gap?.suggestions,['에서'],source);
    assert.equal(source.slice(0,gap.from)+gap.suggestions[0]+source.slice(gap.to),host+'에서 됬어요');
    assert.ok(findings.some(f=>f.suggestions.includes('됐어요')),source);
    for(let i=1;i<findings.length;i++)assert.ok(findings[i-1].to<=findings[i].from,source);
  }
  for(const source of ['" 에 대해','"단어" 가는 길','"단어"\n라는 표현','`x = "a 라는"`'])assert.equal(check(source).some(f=>f.applicable),false,source);
});
