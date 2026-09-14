import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('short unfamiliar expressions and finite fragments are reviewed without invented spaces',()=>{
  for(const word of ['멘탈','벤더','슬러갈로','오마주인가','모르겠다입니다']){
    assert.ok(!check(word).some(f=>f.applicable),word);
    assert.ok(check(word).some(f=>f.type==='unknown'),word);
  }
  for(const word of ['주제잖아','굴릴지에'])assert.deepEqual(check(word),[],word);
  assert.ok(check('할말').some(f=>f.suggestions.includes('할 말')));
  assert.ok(check('큰시설').some(f=>f.suggestions.includes('큰 시설')));
});

test('nominal inflections and complete copulas are not repartitioned into fragments',()=>{
  for(const source of ['한가함이란','생생함을','이국적이거나','권위주의적이거나','그럴듯한','부모님께서도'])assert.deepEqual(check(source),[],source);
  for(const [source,target]of [['할거라','할 거라'],['한것','한 것'],['한가할때','한가할 때']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('geographic names do not become internal spacing fragments before an uncertain suffix',()=>{
  const findings=check('이탈리아됩니다 됬어요');
  assert.ok(findings.some(f=>f.type==='unknown'));
  assert.ok(!findings.some(f=>f.original==='이탈리아됩니다'&&f.applicable));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('geographic copular modifiers retain the dependent noun boundary',()=>{
  for(const [source,target]of [['후지산인게','후지산인 게'],['도쿄인거죠','도쿄인 거죠'],['이탈리아일뿐','이탈리아일 뿐']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['후지산인 게','도쿄인 거죠','이탈리아일 뿐','도쿄인','도쿄일'])assert.equal(check(source).length,0,source);
  assert.ok(!check('후지산인게',['후지산인게']).some(f=>f.applicable));
  assert.ok(check('후지산인게 됬어요',['후지산']).some(f=>f.suggestions.includes('후지산인 게')));
  assert.ok(check('후지산인게 됬어요',['후지산']).some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('모험러인게 됬어요',['모험러']).some(f=>f.suggestions.includes('모험러인 게')));
});

test('approximation suffix retains nominal tails without accepting arbitrary predicates',()=>{
  for(const source of ['사이쯤','중간쯤에','이맘때쯤은','끝쯤입니다'])assert.equal(check(source).length,0,source);
  for(const source of ['사이 쯤','중간 쯤에','이맘때 쯤은'])assert.ok(check(source).some(f=>f.type==='spacing'&&f.suggestions.includes(source.slice(source.indexOf(' ')+1))),source);
  for(const source of ['먹고 쯤','모험러 쯤','중간 쯤닉네임','`중간 쯤`'])assert.ok(!check(source).some(f=>f.type==='spacing'),source);
  const findings=check('중간 쯤에 됬어요',['중간']);
  assert.ok(findings.some(f=>f.suggestions.includes('쯤에')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('licensed geographic names recognize whole nominals without approving shorthand or derived verbs',()=>{
  for(const source of ['도쿄','도쿄에서','이탈리아는','실리콘밸리입니다','후지산에도'])assert.equal(check(source).length,0,source);
  for(const source of ['도쿄합니다','셀던','유루캠','질게에서'])assert.ok(check(source).some(f=>f.type==='unknown'),source);
  assert.ok(check('이탈리아됩니다').length,'A place name must not license an arbitrary derived predicate');
  const findings=check('도쿄에서 두번 됬어요');
  assert.ok(findings.some(f=>f.suggestions.includes('두 번')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('numeric unit boundaries preserve the full following nominal copula',()=>{
  for(const [source,target]of [['3칸정도면','3칸 정도면'],['3일전입니다','3일 전입니다'],['5분동안이었다','5분 동안이었다'],['2개이상입니다','2개 이상입니다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['3칸 정도면','3일 전입니다','3칸정도닉네임','3일전선','x3칸정도면','`3칸정도면`'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('3칸정도면',['3칸정도면']).some(f=>f.applicable));
  assert.ok(check('3칸정도면 됬어요',['정도']).some(f=>f.suggestions.includes('3칸 정도면')));
  assert.ok(check('3칸정도면 됬어요',['3칸정도면']).some(f=>f.suggestions.includes('됐어요')));
});

test('calendar dates retain redundant day and month nouns with their boundaries',()=>{
  for(const [source,target]of [['9월달','9월 달'],['4일날','4일 날'],['12월달에는','12월 달에는'],['31일날입니다','31일 날입니다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['9월 달','4일 날','매달','그날','9월달빛','4일날개','x9월달','`9월달`'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('9월달',['9월달']).some(f=>f.applicable));
  assert.ok(check('9월달 됬어요',['달']).some(f=>f.suggestions.includes('9월 달')));
  assert.ok(check('9월달 됬어요',['9월달']).some(f=>f.suggestions.includes('됐어요')));
});

test('comparative particle reviews combine prior boundaries while preserving independent boda',()=>{
  for(const [source,target]of [['산 보다 더 높게','산보다'],['이녀석 보다 소폭 넓거나','이 녀석보다'],['제품 보단 작다','제품보단']])assert.ok(check(source).some(f=>f.suggestions.includes(target)&&f.ambiguous),source);
  for(const source of ['보다 더 좋은','영화를 보다','영화를 보다 더 좋은','먹고 보다','산보다 더 높게','이 녀석보다 작다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('모험러 보다 더 크다 됬어요',['모험러']).some(f=>f.suggestions.includes('모험러보다')));
  assert.ok(check('모험러 보다 더 크다 됬어요',['모험러']).some(f=>f.suggestions.includes('됐어요')));
});

test('gajida vowel endings and repeated softness keep genuine abbreviated forms intact',()=>{
  for(const [source,target]of [['갖았네요','가졌네요'],['갖아서','가져서'],['갖었다','가졌다'],['푹신축신한','푹신푹신한'],['푹신축신해요','푹신푹신해요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['갖고','갖는','갖은','갖가지','가졌네요','푹신푹신한','푹신푹신해요','그제서야'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.equal(check('갖았네요',['갖았네요']).length,0);
  assert.ok(!check('푹신축신한',['푹신축신']).some(f=>f.applicable));
  assert.ok(check('갖았네요 됬어요',['갖다']).some(f=>f.suggestions.includes('가졌네요')));
  assert.ok(check('갖았네요 됬어요',['갖았네요']).some(f=>f.suggestions.includes('됐어요')));
});

test('attested delivery and compatibility derivations retain their dependent boundaries',()=>{
  for(const source of ['배송됩니다','배송됐어요','호환될','호환되는','호환되면'])assert.equal(check(source).length,0,source);
  for(const [source,target]of [['호환될것','호환될 것'],['배송 됩니다','배송됩니다'],['호환 되면','호환되면']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['책상됩니다','무궁화됩니다'])assert.ok(check(source).some(f=>f.type==='unknown'),source);
  assert.ok(check('호환될것 됬어요',['호환']).some(f=>f.suggestions.includes('호환될 것')));
  assert.ok(check('호환될것 됬어요',['호환될것']).some(f=>f.suggestions.includes('됐어요')));
});

test('attested compound digeut alternations recognize adnominals without accepting regularized forms',()=>{
  for(const source of ['깨달은','깨달으면','깨달으세요','깨달았다','깨닫는','알아들은','알아들으면','일컬은'])assert.ok(!check(source).length,source);
  assert.ok(check('깨달은게').some(f=>f.suggestions.includes('깨달은 게')));
  for(const source of ['깨닫은','깨닫으면','깨닫아','깨달는'])assert.ok(check(source).length,source);
  assert.ok(!check('깨달은게',['깨달은게']).length);
  assert.ok(check('깨달은게 됬어요',['깨달은게']).some(f=>f.suggestions.includes('됐어요')));
});

test('nominal e and mada particles attach without consuming adnominal phrases',()=>{
  for(const [source,target]of [['블로그 에','블로그에'],['학교 에','학교에'],['제품들 마다','제품들마다'],['집집 마다','집집마다'],['날 마다','날마다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['블로그에','제품들마다','먹는 에','하는 마다','에','마다'])assert.ok(!check(source).some(f=>f.applicable),source);
  const personal=check('모험러 마다 됬어요',['모험러']);
  assert.ok(personal.some(f=>f.suggestions.includes('모험러마다')));
  assert.ok(personal.some(f=>f.suggestions.includes('됐어요')));
});

test('copula connectives attach after bare nominals while preserving the carry verb',()=>{
  for(const [source,target]of [['느낌 이고','느낌이고'],['학생 인데요','학생인데요'],['1mm 인데','인데'],['2kg 이고요','이고요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['짐을 이고','바구니를 이고요','짐을 인데','학생인데요','느낌이고'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('느낌 이고 됬어요',['느낌']).some(f=>f.suggestions.includes('됐어요')));
});

test('a reviewed community nominal keeps a separate copula gap repair',()=>{
  const findings=check('비추 입니다. 됬어요.');
  assert.ok(findings.some(f=>f.type==='unknown'&&f.original==='비추'));
  assert.ok(findings.some(f=>f.original===' 입니다'&&f.suggestions.includes('입니다')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('비추 입니다',['비추']).some(f=>f.suggestions.includes('비추입니다')));
  for(const source of ['비추입니다','빛을 비추는','그림자를 비추고'])assert.ok(!check(source).some(f=>f.applicable),source);
});

test('demonstrative noun boundaries preserve lexical and short joined expressions',()=>{
  for(const [source,target]of [['이말이네요','이 말이네요'],['그앞에서','그 앞에서'],['이기능도','이 기능도'],['이녀석과','이 녀석과']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['이곳','그때','이말','그앞','이 말이네요','그 앞에서','이기능닉네임'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('이기능도',['이기능']).some(f=>f.applicable));
  const adjacent=check('이기능도 됬어요',['기능']);
  assert.ok(adjacent.some(f=>f.suggestions.includes('이 기능도')));
  assert.ok(adjacent.some(f=>f.suggestions.includes('됐어요')));
});

test('attested whole-range determiners preserve particles and lexical jeon compounds',()=>{
  for(const [source,target]of [['전세계에','전 세계에'],['전세계적으로','전 세계적으로'],['전국민에게','전 국민에게'],['전매장에서','전 매장에서'],['전단계에','전 단계에'],['전주기는','전 주기는']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['전 세계에','전국에','전세금','전교생','전자동','전수진','전세계닉네임'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('전세계에',['전세계']).some(f=>f.applicable));
  assert.ok(check('전세계에 됬어요',['세계']).some(f=>f.suggestions.includes('전 세계에')));
  assert.ok(check('전세계에 됬어요',['전세계']).some(f=>f.suggestions.includes('됐어요')));
});

test('validated stem spelling composes with the following eo-jida gap',()=>{
  for(const [source,target]of [['맟추어','맞추어'],['맟췄어요','맞췄어요'],['맟추어 지네요','맞추어지네요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.equal(check('맟추어 지네요').filter(f=>f.applicable).length,1);
  for(const source of ['맞추어지네요','맞춰지네요','맡아 주세요','맟추어닉네임'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('맟추어',['맟추다']).some(f=>f.applicable));
  assert.ok(check('맟추어 지네요 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('validated drida derivation preserves independently modified noun phrases',()=>{
  for(const [source,target]of [['추천 드립니다','추천드립니다'],['감사 드립니다','감사드립니다'],['문의 드렸어요','문의드렸어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['추천드립니다','깊은 감사 드립니다','새로운 추천 드립니다','용돈 드립니다','선물 드립니다','추천을 드립니다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('추천 드립니다',['추천']).some(f=>f.suggestions.includes('추천드립니다')));
  assert.ok(check('추천 드립니다 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('nominal suffixes retain their particles and do not swallow independent adverbs',()=>{
  for(const [source,target]of [['기초 적인','기초적인'],['경제 적으로','경제적으로'],['역사 적이라고','역사적이라고']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['사이즈별로','지역별로는','기초적인'])assert.equal(check(source).length,0,source);
  for(const source of ['사이즈 별로 크지 않다','강한 적','수요가 적어서','제가 적지','인원이 적어요','수요 적은 곳','제가 적는 글','기초 적절한 설명','기초 적'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('기초 적인',['기초']).some(f=>f.suggestions.includes('기초적인')));
  assert.ok(check('사이즈별로 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('attested ha adjectives repair internal gaps without merging independent phrases',()=>{
  for(const [source,target]of [['안전 하다는','안전하다는'],['멀쩡 했는데','멀쩡했는데'],['비교적 멀쩡 했는데','멀쩡했는데'],['건강 하세요','건강하세요'],['순수 하네요','순수하네요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['안전하다는','멀쩡했는데','계속 했다','제가 했다','건강을 위해 했다','책상 했다','무궁화 했다','공부 안 했다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('안전 하다는',['안전']).some(f=>f.suggestions.includes('안전하다는')));
  assert.ok(check('멀쩡 했는데 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('stacked emphatic particles attach while standalone adverb ma-jeo stays separate',()=>{
  for(const [source,target]of [['냉탕 조차도','냉탕조차도'],['그 마저도','그마저도'],['이것 조차도','이것조차도']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['냉탕조차도','그마저도','숙제를 마저 했다','책을 마저 읽었다','철도 조차 작업'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('냉탕 조차도',['냉탕']).some(f=>f.suggestions.includes('냉탕조차도')));
  assert.ok(check('냉탕 조차도 됬어요',['냉탕']).some(f=>f.suggestions.includes('됐어요')));
});

test('honorific gaps require a matching complete stem and preserve independent nouns',()=>{
  for(const [source,target]of [['느끼 실','느끼실'],['느끼 시나요','느끼시나요'],['먹 으시면','먹으시면'],['좋 으시네요','좋으시네요'],['공부하 시면','공부하시면']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['느끼실','먹으시면','가는 시각','먹을 시','느끼 실타래','시를 읽었다','새 신','새 신을 신었다','나 시인','우리 시인','그리 시인','지우 시인'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('느끼 실',['느끼']).some(f=>f.applicable));
  assert.ok(check('느끼 실 됬어요',['느끼']).some(f=>f.suggestions.includes('됐어요')));
});

test('person counts and multiples preserve particles and lexical homographs',()=>{
  for(const [source,target]of [['한사람만을','한 사람만을'],['두사람이','두 사람이'],['세사람에게','세 사람에게'],['두배','두 배'],['네배로','네 배로'],['몇배나','몇 배나']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['한 사람만을','두 배','한배','한배를','세배를','세배로','한사람닉네임'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('두사람이',['두사람']).some(f=>f.applicable));
  assert.ok(check('두사람이',['사람']).some(f=>f.suggestions.includes('두 사람이')));
  assert.ok(check('두사람이 됬어요',['두사람']).some(f=>f.suggestions.includes('됐어요')));
});

test('adjective adnominals retain noun boundaries despite shorter overlapping noun prefixes',()=>{
  for(const [source,target]of [['큰문제','큰 문제'],['큰문제는','큰 문제는'],['큰문제입니다','큰 문제입니다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['큰 문제','큰문','큰아버지는','올해','올해에는','큰집에서','큰아버지께','작은아버지께','작은따옴표','높은음자리표','낮은음자리표','굳은살','젊은이','어린아이','늙은이'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('올해초').some(f=>f.suggestions.includes('올 해초')));
  assert.ok(!check('큰문제는',['큰문제']).some(f=>f.applicable));
  assert.ok(check('큰문제는 됬어요',['큰문제']).some(f=>f.suggestions.includes('됐어요')));
});

test('attested nominal compounds retain particles across repaired gaps',()=>{
  for(const [source,target]of [['안경 다리','안경다리'],['안경 다리를','안경다리를'],['안경 다리입니다','안경다리입니다'],['아무 것도','아무것도'],['아무 것이나','아무것이나']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['안경다리를','아무것도','아무 말','아무 사람','안경 다리미','아무\n것도','`안경 다리`'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('안경 다리를',['안경']).some(f=>f.suggestions.includes('안경다리를')));
  assert.ok(check('아무 것도 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('jjajeung nada has a validated word boundary without splitting lexical nada compounds',()=>{
  for(const [source,target]of [['짜증나게','짜증 나게'],['짜증났다','짜증 났다'],['짜증나네요','짜증 나네요'],['짜증나는','짜증 나는']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['짜증 나게','짜증 났다','짜증이 나다','신나다','빛나다','겁나다','혼나다','짜증나닉네임'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('짜증나게',['짜증나게']).some(f=>f.applicable));
  assert.ok(check('짜증나게',['짜증']).some(f=>f.suggestions.includes('짜증 나게')));
  assert.ok(check('짜증나게 됬어요',['짜증나게']).some(f=>f.suggestions.includes('됐어요')));
});

test('jjaeryeoboda vowel repair requires a complete predicate and preserves personal usage',()=>{
  for(const [source,target]of [['쨰려보고','째려보고'],['쨰려봤어요','째려봤어요'],['쨰려보는','째려보는']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['째려보고','째려봤어요','째려보는','쨰려보닉네임'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('쨰려보고',['쨰려보고']).some(f=>f.applicable));
  assert.ok(!check('쨰려보고',['쨰려보다']).some(f=>f.applicable));
  assert.ok(check('쨰려보고 됬어요',['쨰려보고']).some(f=>f.suggestions.includes('됐어요')));
});

test('unknown nominal daero review identifies the registerable base',()=>{
  for(const base of ['아즈휼','스펙']){
    const finding=check(base+'대로').find(f=>f.type==='unknown');
    assert.equal(finding?.base,base);assert.equal(finding?.original,base);
    assert.ok(!check(base+'대로',[base]).some(f=>f.type==='unknown'));
    assert.ok(check(base+'대로 됬어요',[base]).some(f=>f.suggestions.includes('됐어요')));
  }
  assert.ok(!check('말한 대로').some(f=>f.applicable));
});

test('shared computing nominals recognize particles without arbitrary hada stems',()=>{
  for(const word of ['대시보드','플러그인','웹사이트']){
    for(const tail of ['', '에서', word==='플러그인'?'을':'를', '입니다'])assert.ok(!check(word+tail).some(f=>f.language==='ko'),word+tail);
    assert.ok(check(word+'합니다').some(f=>f.type==='unknown'),word);
    assert.ok(check(word+'에서 됬어요').some(f=>f.suggestions.includes('됐어요')),word);
  }
});

test('direct present adnominal survives a shorter stem analysis',()=>{
  for(const [source,target]of [['남기는건지','남기는 건지'],['남기는건데','남기는 건데'],['남기는것','남기는 것']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['남기는 건지','남기는 건데','남기는 것'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('남기는건지',['남기는건지']).some(f=>f.applicable));
  assert.ok(check('남기는건지 됬어요',['남기는건지']).some(f=>f.suggestions.includes('됐어요')));
});

test('rental car spelling preserves particles and explicit personal usage',()=>{
  for(const [source,target]of [['렌트카','렌터카'],['렌트카를','렌터카를'],['렌트카로','렌터카로'],['렌트카입니다','렌터카입니다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(!check('렌터카를').some(f=>f.applicable));
  assert.ok(!check('렌트카를',['렌트카']).some(f=>f.applicable));
  assert.ok(check('렌트카를 됬어요',['렌트카']).some(f=>f.suggestions.includes('됐어요')));
});

test('colloquial doedo anneun does not become the different connective dwaedo',()=>{
  for(const source of ['되도 않는 소리','되도 않는 말을','쌀 한 되도 없다'])assert.ok(!check(source).some(f=>f.suggestions.includes('돼도')),source);
  assert.ok(check('되도 않는 소리. 됬어요.').some(f=>f.suggestions.includes('됐어요')));
});

test('ongat determiner preserves the following noun and its particles',()=>{
  for(const [source,target]of [['온갖군데','온갖 군데'],['온갖문제가','온갖 문제가'],['온갖사람들이','온갖 사람들이'],['온갖꽃','온갖 꽃']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(!check('온갖 방법').some(f=>f.applicable));
  assert.ok(!check('온갖꽃',['온갖꽃']).some(f=>f.applicable));
  assert.ok(check('온갖꽃 됬어요',['온갖꽃']).some(f=>f.suggestions.includes('됐어요')));
});

test('seureopda internal gaps require the complete derived adjective',()=>{
  for(const [source,target]of [['만족 스럽게','만족스럽게'],['자연 스럽게','자연스럽게'],['사랑 스러워요','사랑스러워요'],['자랑 스럽다','자랑스럽다'],['부담 스러웠다','부담스러웠다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['만족스럽게','자연스럽게','사랑스러워요','책상 스럽게'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('만족 스럽게',['만족']).some(f=>f.applicable));
  assert.ok(check('만족 스럽게 됬어요',['만족']).some(f=>f.suggestions.includes('됐어요')));
});

test('cause noun typo preserves a registered host and repairs its boundary',()=>{
  for(const [source,target]of [['무게떄문에','무게 때문에'],['가격떄문이다','가격 때문이다'],['떄문에','때문에']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(check('아즈휼떄문에',['아즈휼']).some(f=>f.suggestions.includes('아즈휼 때문에')));
  assert.ok(!check('무게떄문에',['무게떄문에']).some(f=>f.applicable));
  for(const source of ['무게 때문에','가격 때문이다'])assert.ok(!check(source).some(f=>f.applicable),source);
});

test('colloquial product labels remain personal review choices',()=>{
  for(const [source,base]of [['저렴이 블루투스','저렴이'],['저렴이로','저렴이'],['저렴이입니다','저렴이']]){
    const finding=check(source).find(f=>f.base===base&&f.reviewKind==='community');
    assert.ok(finding,source);assert.deepEqual(finding.suggestions,[]);assert.equal(finding.applicable,false);
    assert.ok(!check(source,[base]).some(f=>f.base===base),source);
  }
  for(const source of ['암튼','아무튼','저렴히','저렴하다'])assert.ok(!check(source).some(f=>f.reviewKind==='community'),source);
  assert.ok(check('저렴이로 됬어요',['저렴이']).some(f=>f.suggestions.includes('됐어요')));
});

test('prefinal get joins only a complete predicate across a horizontal gap',()=>{
  for(const [source,target]of [['써야 겠습니다','써야겠습니다'],['먹어야 겠네요','먹어야겠네요'],['좋았 겠다','좋았겠다'],['해야 겠어요','해야겠어요'],['하겠 습니다','하겠습니다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['써야겠습니다','좋았겠다','해야겠어요','하겠습니다','책상 겠습니다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('써야 겠습니다',['써야']).some(f=>f.applicable));
  assert.ok(check('써야 겠습니다 됬어요',['써야']).some(f=>f.suggestions.includes('됐어요')));
});

test('lexical repairs compose with validated derived endings',()=>{
  for(const [source,target]of [['깨닳았다','깨달았다'],['깨닳으니','깨달으니'],['깨닳음을','깨달음을'],['플라스탁','플라스틱'],['플라스탁으로','플라스틱으로'],['셋팅','세팅'],['셋팅되서','세팅돼서'],['셋팅하고','세팅하고']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['깨달음을','플라스틱으로','세팅돼서','세팅하고'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('셋팅되서',['셋팅']).some(f=>f.suggestions.includes('세팅돼서')));
  assert.ok(check('셋팅되서 됬어요',['셋팅']).some(f=>f.suggestions.includes('됐어요')));
});

test('jeon nominal suffix ambiguity does not invent a temporal boundary',()=>{
  for(const source of ['이란전','이란전에서','일본전','일본전에서'])assert.ok(!check(source).some(f=>f.applicable),source);
  for(const [source,target]of [['며칠전','며칠 전'],['식사전','식사 전'],['출발전','출발 전'],['읽기전','읽기 전']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(check('이란전 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('eojida joins only a validated connective and preserves noun subjects',()=>{
  for(const [source,target]of [['차분해 지더군요','차분해지더군요'],['좋아 져야겠다','좋아져야겠다'],['달라 졌어요','달라졌어요'],['만들어 졌다','만들어졌다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['차분해지더군요','좋아져야겠다','해 지면','해가 다 진 이후','짐을 지고','꽃이 지면','먼저 지었다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('차분해 지더군요',['차분해']).some(f=>f.applicable));
  assert.ok(check('차분해 지더군요 됬어요',['차분해']).some(f=>f.suggestions.includes('됐어요')));
});

test('jal adverb boundaries preserve whole lexical predicates',()=>{
  for(const [source,target]of [['잘체감하지','잘 체감하지'],['잘부탁드립니다','잘 부탁드립니다'],['잘읽었어요','잘 읽었어요'],['잘보세요','잘 보세요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['잘하다','잘못하다','잘살다','잘생겼다','잘 읽었어요','잘 부탁드립니다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('잘읽었어요',['잘읽었어요']).some(f=>f.applicable));
  assert.ok(check('잘읽었어요 됬어요',['잘읽었어요']).some(f=>f.suggestions.includes('됐어요')));
});

test('verified eu-stem and passive repairs validate complete inflections',()=>{
  for(const [source,target]of [['치뤄야만','치러야만'],['치뤘어요','치렀어요'],['덮힌','덮인'],['덮혔어요','덮였어요'],['덮히는','덮이는'],['덮힐','덮일'],['덮혀서','덮여서']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['치러야만','치렀어요','덮인','덮였어요','치루는','치루가'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('덮힌',['덮힌']).some(f=>f.applicable));
  assert.ok(check('덮힌 됬어요',['덮힌']).some(f=>f.suggestions.includes('됐어요')));
});

test('dependent geo spelling uses an adnominal host and preserves kkeuda',()=>{
  for(const [source,target]of [['탈꺼면','탈 거면'],['먹을꺼도','먹을 거도'],['탈 꺼면','거면'],['먹을 꺼도','거도'],['올라갈꺼야','올라갈 거야']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['불을 꺼','불을 꺼도','꺼라','꺼도','꺼진','탈 거면','먹을 거도'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('탈꺼면',['탈꺼면']).some(f=>f.applicable));
  assert.ok(!check('먹을 꺼도',['꺼']).some(f=>f.suggestions.includes('거도')));
  assert.ok(check('탈꺼면 됬어요',['탈꺼면']).some(f=>f.suggestions.includes('됐어요')));
});

test('polite doeda repairs validate the whole prefixed predicate',()=>{
  for(const [source,target]of [['안되요','안돼요'],['정리되요','정리돼요'],['잘되요','잘돼요'],['되요','돼요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(check('안되요').some(f=>f.suggestions.includes('안 돼요')&&f.ambiguous));
  for(const source of ['안돼요','안 돼요','정리돼요','잘돼요','되어요'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('안되요',['안되요']).some(f=>f.applicable));
  assert.ok(check('안되요 됬어요',['안되요']).some(f=>f.suggestions.includes('됐어요')));
});

test('auxiliary and dependent boundaries compose into a complete candidate',()=>{
  for(const [source,target]of [['해야할겁니다','해야 할 겁니다'],['해야할텐데','해야 할 텐데'],['먹어야할것','먹어야 할 것'],['해야할것이다','해야 할 것이다'],['해야할거예요','해야 할 거예요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['해야 할 겁니다','먹어야 할 것','요긴한','못지않게','어린이였어요'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('해야할겁니다',['해야할겁니다']).some(f=>f.applicable));
  assert.ok(check('해야할겁니다 됬어요',['해야할겁니다']).some(f=>f.suggestions.includes('됐어요')));
});

test('past copula repairs share derived nouns and preserve noun-final i',()=>{
  for(const [source,target]of [['지배적이였는데','지배적이었는데'],['학생이였어요','학생이었어요'],['의사이였어요','의사였어요'],['교육용이였는데','교육용이었는데']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['지배적이었는데','의사였어요','어린이였어요','학생이었어요','그레이였습니다','마이였어요'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('장미이였어요',['장미이']).some(f=>f.applicable));
  assert.ok(!check('의사이였어요',['의사이였어요']).some(f=>f.applicable));
  assert.ok(check('의사이였어요 됬어요',['의사이였어요']).some(f=>f.suggestions.includes('됐어요')));
});

test('negative auxiliaries preserve the ji boundary and verified colloquial verb',()=>{
  for(const [source,target]of [['개기지마라','개기지 마라'],['가지말고','가지 말고'],['먹지않는다','먹지 않는다'],['먹지못한다','먹지 못한다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['개기지 마라','가지 말고','먹지 않는다','먹지 못한다','개겨요','개겼다','머지않아','못지않게','못지않다','서슴지 않고','같지만','구동되었지만'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('개기지마라',['개기지마라']).some(f=>f.applicable));
  assert.ok(check('개기지마라 됬어요',['개기지마라']).some(f=>f.suggestions.includes('됐어요')));
});

test('proportional endings repair all internal gaps without joining dependent su',()=>{
  for(const [source,target]of [['갈 수록','갈수록'],['갈 수 록','갈수록'],['갈수 록','갈수록'],['먹을 수록','먹을수록'],['좋을 수록','좋을수록']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['갈수록','먹을수록','갈 수 있다','먹을 수 없다','할 수 록음','기록 수록'])assert.ok(!check(source).some(f=>f.suggestions.some(t=>t.includes('수록')&&!t.includes(' '))),source);
  assert.ok(!check('갈 수록',['갈']).some(f=>f.suggestions.includes('갈수록')));
  assert.ok(check('갈 수 록 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('emphatic auxiliary boundaries also accept nominal copula hosts',()=>{
  for(const [source,target]of [['편이긴하고요','편이긴 하고요'],['학생이기도합니다','학생이기도 합니다'],['먹긴한다','먹긴 한다'],['좋기는합니다','좋기는 합니다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['편이긴 하고요','학생이기도 합니다','먹긴 한다','좋기는 합니다','기나긴','장기화한다','요긴한','요긴했는데'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('편이긴하고요',['편이긴하고요']).some(f=>f.applicable));
  assert.ok(check('편이긴하고요 됬어요',['편이긴하고요']).some(f=>f.suggestions.includes('됐어요')));
});

test('season phrases retain the complete temporal noun hancheol',()=>{
  for(const [source,target]of [['여름한철','여름 한철'],['겨울한철을','겨울 한철을'],['봄한철에는','봄 한철에는'],['가을한철이다','가을 한철이다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['한철','여름 한철','겨울 한철을','봄철','여름철','가을철','겨울철'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('여름한철',['여름한철']).some(f=>f.applicable));
  assert.ok(check('여름한철 됬어요',['여름한철']).some(f=>f.suggestions.includes('됐어요')));
});

test('verified lexical repairs retain particles and respect personal entries',()=>{
  for(const [source,target]of [['스폰지','스펀지'],['스폰지를','스펀지를'],['스폰지입니다','스펀지입니다'],['뒷통수','뒤통수'],['뒷통수를','뒤통수를'],['마찮가지다','마찬가지다'],['마찮가지로','마찬가지로']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['스펀지','스펀지를','뒤통수','뒤통수를','마찬가지다','마찬가지로','스팩'])assert.ok(!check(source).some(f=>f.applicable),source);
  for(const word of ['스폰지','뒷통수','마찮가지']){
    assert.ok(!check(word+'를',[word]).some(f=>f.applicable),word);
    assert.ok(check(word+' 됬어요',[word]).some(f=>f.suggestions.includes('됐어요')),word);
  }
});

test('activity nominalizations retain the verb instead of splitting its syllables',()=>{
  for(const [source,target]of [['물마시기','물 마시기'],['책읽기','책 읽기'],['밥먹기','밥 먹기'],['머리감기','머리 감기'],['책읽기를','책 읽기를'],['물마시기는','물 마시기는']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['줄넘기','글쓰기','달리기','뜀뛰기','숨쉬기','물 마시기'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('물마시기',['물마시기']).some(f=>f.applicable));
  assert.ok(check('물마시기 됬어요',['물마시기']).some(f=>f.suggestions.includes('됐어요')));
});

test('device identifiers and following adjectives disambiguate short expression reviews',()=>{
  for(const [source,base]of [['갤 S25 울트라','갤'],['넘 강해서','넘'],['넘 좋아요','넘']]){
    assert.ok(check(source).some(f=>f.type==='unknown'&&f.reviewKind==='community'&&f.original===base),source);
    assert.ok(!check(source,[base]).some(f=>f.reviewKind==='community'),source);
    assert.ok(check(source+' 됬어요',[base]).some(f=>f.suggestions.includes('됐어요')));
  }
  for(const source of ['날이 갤 때','빨래를 갤 때','산을 넘어서','넘','갤'])assert.ok(!check(source).some(f=>f.reviewKind==='community'),source);
});

test('attested bieup allomorphs extend polite forms without changing regular stems',()=>{
  for(const source of ['더워요','추워요','어려워요','도와요','고와요','더우세요','어려웠어요','잡아요','좁아요'])assert.ok(!check(source).some(f=>f.applicable||f.type==='unknown'),source);
  for(const source of ['덥어요','춥어요','돕아요'])assert.ok(check(source).length>0,source);
  assert.ok(check('개더워요').some(f=>f.reviewKind==='community'));
  assert.ok(check('더울때').some(f=>f.suggestions.includes('더울 때')));
  assert.ok(check('더워요 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('internet intensifiers and informal hortatives stay whole for personal review',()=>{
  for(const source of ['개빠르네요','개더워요','떠들자요','먹자요']){
    const findings=check(source);
    assert.ok(findings.some(f=>f.type==='unknown'&&f.original===source),source);
    assert.ok(findings.some(f=>f.reviewKind==='community'),source);
    assert.ok(!findings.some(f=>f.applicable),source);
    assert.deepEqual(check(source,[source]),[],source);
    assert.ok(check(source+' 됬어요',[source]).some(f=>f.suggestions.includes('됐어요')));
  }
  for(const source of ['개운해요','개량했다','자요','의자요','부자요','팔자요'])assert.ok(!check(source).some(f=>f.reviewKind==='community'),source);
});

test('cardinal and all keep their word boundary despite descriptive joined entries',()=>{
  for(const [source,target]of [['둘다','둘 다'],['셋다','셋 다'],['넷다','넷 다'],['둘다요','둘 다요'],['둘다는','둘 다는']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['둘 다','셋 다','둘이 다','둘러보다','달다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('둘다',['둘다']).some(f=>f.applicable));
  assert.ok(check('둘다 됬어요',['둘다']).some(f=>f.suggestions.includes('됐어요')));
});

test('dependent nominal boundaries retain existential and enumeration structure',()=>{
  for(const [source,target]of [['수있으니','수 있으니'],['수있는건','수 있는 건'],['수있고','수 있고'],['부분등','부분 등'],['항목등을','항목 등을'],['민주주의인양','민주주의인 양']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['수없는','수없다','신호등','가로등','인양','수 있으니','항목 등을','민주주의인 양'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('부분등',['부분등']).some(f=>f.applicable));
  assert.ok(check('부분등 됬어요',['부분등']).some(f=>f.suggestions.includes('됐어요')));
});

test('near-event auxiliary repairs its internal gap and preserves permitted attachment',()=>{
  for(const [source,target]of [['올뻔 했는데','올 뻔했는데'],['올 뻔 했는데','뻔했는데'],['죽을뻔 했다','죽을 뻔했다'],['이동할뻔 했어요','이동할 뻔했어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['올뻔했는데','올 뻔했는데','죽을뻔했다','죽을 뻔했다','뻔했다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('이동할뻔했어요').some(f=>f.suggestions.includes('이동할 뻔했어요')));
  assert.ok(!check('올뻔했는데').some(f=>f.type==='unknown'));
  assert.ok(check('올뻔 했는데 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('spatial noun boundaries retain particles and lexical compounds',()=>{
  for(const [source,target]of [['수조속에','수조 속에'],['안개속에','안개 속에'],['폭염속','폭염 속'],['책상아래','책상 아래'],['컴퓨터쪽','컴퓨터 쪽'],['반대편쪽이','반대편 쪽이'],['노래쪽에서','노래 쪽에서']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['숲속','마음속','바닷속','안갯속','앞쪽','뒤쪽'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('컴퓨터쪽',['컴퓨터쪽']).some(f=>f.applicable));
  assert.ok(check('컴퓨터쪽 됬어요',['컴퓨터쪽']).some(f=>f.suggestions.includes('됐어요')));
});

test('standard polite connective repairs preserve noun homographs and personal voice',()=>{
  for(const [source,target]of [['좋구요','좋고요'],['먹구요','먹고요'],['필요할거구요','필요할 거고요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['친구요','가구요','공구요','거구요','좋고요'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('필요할 거구요').some(f=>f.suggestions.includes('거고요')));
  assert.ok(!check('좋구요',['좋구요']).some(f=>f.applicable));
  assert.ok(check('좋구요 됬어요',['좋구요']).some(f=>f.suggestions.includes('됐어요')));
});

test('causal clause copulas keep their complete connective without invented spaces',()=>{
  for(const source of ['않아서인데','먹어서입니다','좋아서이다','책이어서인데'])assert.deepEqual(check(source),[],source);
  assert.ok(check('아즈휼서인데').some(f=>f.type==='unknown'));
  assert.ok(check('먹어서입니다 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('이유인만큼').some(f=>f.suggestions.includes('이유인 만큼')));
});

test('verified derived action nouns keep their stems before auxiliary boundaries',()=>{
  for(const [source,target]of [['정당화해왔다는','정당화해 왔다는'],['소포장해놓고','소포장해 놓고'],['정당화해보세요','정당화해 보세요']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['정당화하다','소포장하여','소포장됩니다'])assert.deepEqual(check(source),[],source);
  assert.ok(check('정당화해왔다는 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('a bare ending homograph does not split a name and personal recognition stays local',()=>{
  for(const source of ['셀던','셀던은']){
    const findings=check(source);assert.ok(findings.some(f=>f.type==='unknown'&&f.original==='셀던'));
    assert.ok(!findings.some(f=>f.applicable));assert.deepEqual(check(source,['셀던']),[]);
  }
  for(const source of ['먹던','세던','할 말','볼 책'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('할말').some(f=>f.suggestions.includes('할 말')));
  assert.ok(check('볼책').some(f=>f.suggestions.includes('볼 책')));
  assert.ok(check('셀던 됬어요',['셀던']).some(f=>f.suggestions.includes('됐어요')));
});

test('repetition prefix uses attested action nouns and does not derive personal names',()=>{
  for(const source of ['재정의합니다','재등록했다','재설치됩니다','재검토','재분석을'])assert.deepEqual(check(source),[],source);
  assert.ok(check('재검토해보세요').some(f=>f.suggestions.includes('재검토해 보세요')));
  assert.ok(check('재정의합니다 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('재아즈휼합니다',['아즈휼']).some(f=>f.type==='unknown'));
});

test('common supplemental nouns preserve particles without hiding the following dependent boundary',()=>{
  for(const source of ['긴바지','긴바지를','배송지를','배송지에서','특별전','특별전이었던 만큼','얼리버드로','좋아요도','싫어요를'])assert.deepEqual(check(source),[],source);
  assert.ok(check('특별전이었던만큼').some(f=>f.suggestions.includes('특별전이었던 만큼')));
  assert.ok(check('긴바지를 됬어요').some(f=>f.suggestions.includes('됐어요')));
  for(const source of ['좋아요합니다','싫어요합니다','얼리버드합니다'])assert.ok(check(source).some(f=>f.type==='unknown'),source);
  assert.ok(check('아즈휼').some(f=>f.type==='unknown'));
});

test('dependent 듯 follows a complete adnominal without changing connective or auxiliary readings',()=>{
  for(const [source,target]of [['발언하신듯','발언하신 듯'],['먹은듯','먹은 듯'],['아는듯','아는 듯']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['흐르듯','먹듯','올듯하다','아는 듯','할 듯 말 듯 하다'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('발언하신듯 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(!check('다운되는듯 한데').some(f=>f.suggestions.includes('다운 되는 듯')),'An uncertain derived host must not be split to manufacture the adnominal');
});

test('quoted proposals and a short degree adverb keep complete following predicates',()=>{
  for(const [source,target]of [['만들자하고','만들자 하고'],['먹자했어요','먹자 했어요'],['덜갑니다','덜 갑니다'],['덜먹었다','덜 먹었다']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['덜었다','덜떨어졌다','덜되었다','덜하다','하자','만들자'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('아즈휼자하고').some(f=>f.type==='unknown'));
});

test('an emphatic particle keeps the complete causal connective intact',()=>{
  for(const source of ['뛰어나서가','좋아서가','먹어서가','없어서가','좋아서 가요'])assert.deepEqual(check(source),[],source);
  assert.ok(check('아즈휼서가').some(f=>f.type==='unknown'));
  assert.ok(check('먹어서가 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('elongated interjections remain one review expression and personal registration keeps neighboring repairs',()=>{
  for(const source of ['으아아아아악','와아아아아','하하하하하']){
    const result=check(source);assert.equal(result.length,1,source);
    assert.equal(result[0].type,'unknown');assert.equal(result[0].original,source);assert.deepEqual(result[0].suggestions,[]);
    assert.deepEqual(check(source,[source]),[],source);
    assert.ok(check(source+' 됬어요',[source]).some(f=>f.suggestions.includes('됐어요')));
  }
  assert.ok(check('으아아아아악 할수있다').some(f=>f.suggestions.length));
  assert.deepEqual(check('`으아아아아악`'),[]);
});

test('request auxiliaries causative contractions and honorific nominals preserve the main predicate',()=>{
  for(const [source,target]of [['공격해달라','공격해 달라'],['등록해달라고','등록해 달라고'],['폭파시켜버리고','폭파시켜 버리고'],['귀결시켜버림','귀결시켜 버림']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['생각하심을','말씀하심','가심','읽으심','색상이 달라','시켜버리고'])assert.ok(!check(source).some(f=>f.applicable),source);
  for(const source of ['생각하심을','생각하심에','말씀하심'])assert.deepEqual(check(source),[],source);
  assert.ok(check('폭파시켜버리고 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.deepEqual(check('폭파시켜버리고',['폭파시켜버리고']),[]);
});

test('quoted and proposed endings retain word boundaries and tense-bearing copula adnominals',()=>{
  for(const source of ['좋아한다면서','좋다길래','왔다면서','먹는다길래','걸어가자니','그러자니','아침이었던 만큼','학생이던 만큼','학생이었을 뿐입니다'])assert.deepEqual(check(source),[],source);
  for(const source of ['아즈휼다길래','아즈휼자니'])assert.ok(check(source).some(f=>f.type==='unknown'),source);
  assert.notDeepEqual(check('좋는다길래'),[],'A purely adjectival root must not gain a verbal present ending');
  assert.ok(check('좋다길래 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('상징성 만큼은').some(f=>f.suggestions.includes('상징성만큼은')));
  assert.ok(!check('아즈휼이었던 만큼',['아즈휼']).some(f=>f.applicable));
});

test('attested s-deletion stems and change-of-state homographs retain complete inflections',()=>{
  for(const source of ['결론지었습니다','결론지은','결론지을','쏟아부은','쏟아부었습니다','쏟아부으니','씻은','벗은','더해지니','더해지는','높아지니'])assert.deepEqual(check(source),[],source);
  assert.ok(check('결론지었습니다 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('아즈휼지니').some(f=>f.type==='unknown'));
});

test('incomplete derivational vocabulary cannot justify breaking a potential lexical predicate',()=>{
  for(const source of ['해당되는','지속됐는지','배송됩니다','재구성하며','혼란스럽고','매료되어','탈바꿈시킵니다','고착화할','정당화하는'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.equal(check('배송됩니다').length,0,'The attested delivery derivation is now recognized independently of the segmentation guard');
  for(const [source,target]of [['팔면된다고','팔면 된다고'],['하면된다고','하면 된다고'],['조립해봤습니다','조립해 봤습니다'],['해당되는 됬어요','됐어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('nominal homographs do not join subject phrases adverbs or copula adnominals',()=>{
  for(const source of ['제가 하고','제가 했어요','계속 했네요','계속 하고','기능인 만큼','학생인 만큼은','기능일 뿐입니다'])assert.ok(!check(source).some(f=>f.applicable),source);
  for(const [source,target]of [['검토 합니다','검토합니다'],['상징성 만큼은','상징성만큼은'],['학생들 뿐이다','학생들뿐이다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(!check('아즈휼인 만큼',['아즈휼']).some(f=>f.applicable));
  assert.ok(check('제가 하고 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('polite connective and contracted endings preserve tone without hiding adjacent errors',()=>{
  for(const source of ['않았지만요','했지만요','좋지만요','먹어야죠','읽어야죠','참아야죠','먹어야지요'])assert.deepEqual(check(source),[],source);
  for(const source of ['아즈휼지만요','아즈휼야죠'])assert.ok(check(source).some(f=>f.type==='unknown'),source);
  assert.ok(check('먹어야죠 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('먹어야죠 학교갈거에요').some(f=>f.suggestions.length),'Adjacent spacing remains actionable');
});

test('nominal copula adnominals retain dependent noun boundaries alongside particle analyses',()=>{
  for(const [source,target]of [['상태인거죠','상태인 거죠'],['학생인거','학생인 거'],['학생인것이','학생인 것이'],['학교일거예요','학교일 거예요'],['그것인거죠','그것인 거죠'],['학생인것들을','학생인 것들을']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['개인','자인','당일','일인','학생인','그것인','학생인걸','상태인거죠닉','`상태인거죠`'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('상태인거죠',['상태인거죠']),[]);
  assert.ok(check('상태인거죠 됬어요',['상태인거죠']).some(f=>f.suggestions.includes('됐어요')));
  for(const [source,target]of [['아즈휼인거죠','아즈휼인 거죠'],['아즈휼인것들을','아즈휼인 것들을'],['아즈휼일거예요','아즈휼일 거예요']]){
    assert.ok(check(source,['아즈휼']).some(f=>f.suggestions.includes(target)),source);
    assert.deepEqual(check(target,['아즈휼']),[],target);
  }
  assert.ok(check('아즈휼인거죠 됬어요',['아즈휼']).some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('아즈휼인거죠').some(f=>f.type==='unknown'));
});

test('verified 구동 action vocabulary supports inflections and auxiliary boundaries',()=>{
  for(const source of ['구동해','구동합니다','구동되었어요','구동되었지만','구동됐어요','구동했어요','필터링되었어요','암호화되었어요'])assert.deepEqual(check(source),[],source);
  for(const [source,target]of [['구동해보겠다는','구동해 보겠다는'],['구동 해봤어요','구동해 봤어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(!check('빠른 구동 합니다').some(f=>f.applicable));
  assert.ok(check('구동합니다 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('verified existential phrases override descriptive joined forms without splitting lexical compounds',()=>{
  for(const [source,target]of [['필요없습니다','필요 없습니다'],['필요없는','필요 없는'],['필요없었어요','필요 없었어요'],['혼자있어요','혼자 있어요'],['혼자있는','혼자 있는']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['쓸데없습니다','상관없습니다','어이없어요','필요하다','필요없닉','혼자있닉','`필요없습니다`'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('필요없습니다',['필요없습니다']),[]);
  assert.ok(check('필요없습니다 됬어요',['필요없습니다']).some(f=>f.suggestions.includes('됐어요')));
});

test('nominal derivation composes with a validated 보다 auxiliary without joining modified phrases',()=>{
  for(const [source,target]of [['이야기 해보고','이야기해 보고'],['테스트 해봤어요','테스트해 봤어요'],['검토 해보세요','검토해 보세요']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['새로운 이야기 해보고','어려운 테스트 해봤어요','사용 및 저장 해보세요','책상 해보고','해보고','`이야기 해보고`'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('이야기 해보고 됬어요',['이야기']).some(f=>f.suggestions.includes('됐어요')));
});

test('the internal 듯하다 boundary preserves repeated comparative phrases',()=>{
  const repeated='올듯 말듯 하다';
  const repairs=check(repeated).filter(f=>f.applicable);
  assert.equal(repairs.length,2);
  assert.equal([...repairs].reverse().reduce((text,f)=>text.slice(0,f.from)+f.suggestions[0]+text.slice(f.to),repeated),'올 듯 말 듯 하다');
  for(const [source,target]of [['좋을 듯 합니다','듯합니다'],['좋은듯 합니다','좋은 듯합니다'],['사는듯 한데','사는 듯한데'],['학생인 듯 해요','듯해요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['올 듯 말 듯 하다','오는 듯 마는 듯 하다','듯 하다','듯한데','좋을 듯합니다','좋을듯하다','좋은듯해요','가는듯합니다','`좋을듯 합니다`'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('좋을 듯 합니다 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('indefinite place spelling and its particle boundary do not license a name prefix rewrite',()=>{
  for(const [source,target]of [['아무대나','아무 데나'],['아무데나','아무 데나'],['아무데에서','아무 데에서'],['아무데도','아무 데도']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['아무대학교','아무대나닉','아무데나닉','`아무대나`','https://example.com/아무대나'])assert.ok(!check(source).some(f=>f.suggestions.includes('아무 데나')),source);
  assert.deepEqual(check('아무대나',['아무대나']),[]);
  assert.ok(check('아무대나 됬어요',['아무대나']).some(f=>f.suggestions.includes('됐어요')));
});

test('lexical psychological verbs preserve phrasal adjective constructions',()=>{
  for(const [source,target]of [['게임을 정말 좋아 했었고요','좋아했었고요'],['겨울을 싫어 할','싫어할'],['마음 아파 했어요','아파했어요'],['보기 싫어 합니다','싫어합니다']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['기분 좋아 하다','기분 정말 좋아 했어요','자신 있어 하다','먹고 싶어 하다','마뜩지 않아 하다','아즈싫어 합니다','`싫어 합니다`'])assert.ok(!check(source).some(f=>f.suggestions.some(s=>/^(좋아|싫어|아파)하/.test(s))),source);
  assert.ok(check('게임을 좋아 합니다 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('게임을 좋아 합니다',['좋아합니다']).some(f=>f.suggestions.includes('좋아합니다')));
});

test('verified name vocabulary keeps number-unit gaps and neighboring errors visible',()=>{
  for(const source of ['파일명','파일명은','항목명','역할명으로','작품명들','사용자명입니다'])assert.deepEqual(check(source),[],source);
  assert.ok(check('한두명').some(f=>f.suggestions.includes('한두 명')));
  assert.ok(check('파일명 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('파일명은좋아요').some(f=>f.suggestions.includes('파일명은 좋아요')));
  assert.ok(check('아즈휼명').some(f=>f.type==='unknown'));
  assert.ok(check('이재명').some(f=>f.type==='unknown'),'A personal name is not inferred from a homographic noun plus 명');
  assert.deepEqual(check('아즈휼명은',['아즈휼명']),[]);
});

test('occasion 시 follows validated activities while compounds cities and honorifics survive',()=>{
  for(const [source,target]of [['사용시','사용 시'],['구매시','구매 시'],['예약시에','예약 시에'],['방문시에는','방문 시에는'],['여행시','여행 시'],['출근시','출근 시']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['필요시','비상시','유사시','평상시','일몰시','혼잡시','서울시','구미시','오산시','진주시','고양시','서시','설치시니','가시니','사용시닉','`사용시`','https://example.com/구매시'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('사용시',['사용시']),[]);
  assert.ok(check('사용시 됬어요',['사용시']).some(f=>f.suggestions.includes('됐어요')));
});

test('dependent 중 copulas remain available alongside lexical homographs',()=>{
  for(const [source,target]of [['사용중인','사용 중인'],['공부중인','공부 중인'],['작동중인','작동 중인'],['검토중일','검토 중일'],['사용중인거','사용 중인 거']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['중인','중인으로','그중인','도중인','여중인','중앙','사용중인닉','`사용중인`','https://example.com/공부중인'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('사용중인',['사용중인']),[]);
  assert.ok(check('사용중인 됬어요',['사용중인']).some(f=>f.suggestions.includes('됐어요')));
});

test('independent quantity modifiers preserve numeric ranges and protect identifiers',()=>{
  for(const [source,target]of [['월500~800만원','월 500~800만 원'],['만4개월','만 4개월'],['만18세는','만 18세는'],['딱8시','딱 8시'],['딱3개를','딱 3개를'],['연500만원입니다','연 500만 원입니다'],['딱8 시에','딱 8 시에']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['주3일','1월2일','만4원','item월500만원','월500만원닉','만4개월차닉','`딱8시`','https://example.com/만4개월'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('만4개월',['만4개월']),[]);
  assert.ok(check('월500~800만원 됬어요',['월500~800만원']).some(f=>f.suggestions.includes('됐어요')));
});

test('noun spelling repairs compose with price modifiers and comparison predicates',()=>{
  for(const [source,target]of [['무료라이센스로','무료 라이선스로'],['무료라이선스로','무료 라이선스로'],['유료컨텐츠는','유료 콘텐츠는'],['엑세스같은','액세스 같은'],['액세스같은','액세스 같은'],['메세지같아서','메시지 같아서']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['찰떡같은','불꽃같은','찰떡같아서','불꽃같아서'])assert.deepEqual(check(source),[],source);
  for(const source of ['찰떡같은','불꽃같은','찰떡같아서','불꽃같아서','무료입장','무료입장으로','무료하다','감쪽같은','한결같이','불꽃같이','엑세스같은닉','무료라이센스닉','`무료라이센스로`','https://example.com/엑세스같은'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('무료라이센스로',['라이센스']).some(f=>f.suggestions.includes('무료 라이센스로')));
  assert.ok(check('엑세스같은',['엑세스']).some(f=>f.suggestions.includes('엑세스 같은')));
  assert.deepEqual(check('무료라이센스로',['무료라이센스로']),[]);
  assert.ok(check('무료라이센스로 됬어요',['라이센스']).some(f=>f.suggestions.includes('됐어요')));
});

test('frequency counts and duration stages retain units without duplicate interior findings',()=>{
  for(const [source,target]of [['주2회씩','주 2회씩'],['월1회는','월 1회는'],['연3번만','연 3번만'],['일2회','일 2회'],['2일차','2일 차'],['3년차입니다','3년 차입니다'],['8주차에','8주 차에'],['5 개월차','5 개월 차']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.deepEqual(check(target),[],target);
  }
  for(const source of ['제1차','3월5일','주2회분','code2일차','2일차닉','`주2회씩`','https://example.com/2일차'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(check('주2회씩 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.deepEqual(check('주2회씩',['주2회씩']),[]);
});

test('calendar nouns and elapsed durations preserve lexical dates and non-temporal particles',()=>{
  for(const [source,target]of [['올해초','올해 초'],['내년말에는','내년 말에는'],['2026년말에','2026년 말에'],['4개월만에','4개월 만에'],['9달만에도','9달 만에도'],['한달만에','한 달 만에'],['세시간만에는','세 시간 만에는'],['금년초입니다','금년 초입니다']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['연말','월초','초기','4원만에','code2026년말에','올해초닉','`올해초`','https://example.com/4개월만에'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.ok(!check('올해초').some(f=>f.suggestions.includes('올 해초')));
  assert.deepEqual(check('올해초',['올해초']),[]);
  assert.ok(check('올해초 됬어요',['올해초']).some(f=>f.suggestions.includes('됐어요')));
});

test('adnominal noun boundaries preserve nominal affixes, complete words and personal names',()=>{
  for(const [source,target]of [['큰시설','큰 시설'],['나쁜짓','나쁜 짓'],['큰감흥은','큰 감흥은'],['받을돈으로','받을 돈으로'],['맑은하늘','맑은 하늘']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
  for(const source of ['메인이고','한국판','큰걸음','쓴다던지','독거미는','작은아버지','메일함','이지엉클','`큰시설`','https://example.com/나쁜짓'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('큰시설',['큰시설']),[]);
  assert.ok(check('큰시설 됬어요',['큰시설']).some(f=>f.suggestions.includes('됐어요')));
});

test('validated auxiliary boundaries compose spacing and lexical repairs without splitting lexical 되다 words',()=>{
  for(const [source,target]of [['해야될지','해야 될지'],['나오게된','나오게 된'],['알게됐어요','알게 됐어요'],['가야됩니다','가야 됩니다'],['좋게되면','좋게 되면'],['녹여줘야되요','녹여줘야 돼요'],['알게됬어요','알게 됐어요']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.deepEqual(check(target),[],target);
  }
  for(const source of ['잘되면','참되다','기대하다','알게된닉','`해야될지`','https://example.com/나오게된'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('나오게된',['나오게된']),[]);
  assert.ok(check('녹여줘야되요',['되요']).some(f=>f.suggestions.includes('녹여줘야 되요')));
});

test('measurement particles use validated readings and protect identifiers and registered whole forms',()=>{
  for(const [source,target]of [['115cm으로서','115cm로서'],['20 cm을','20 cm를'],['5m으로써','5m로써'],['친구으로서','친구로서'],['케이블으로써','케이블로써']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.deepEqual(check(target),[],target);
  }
  for(const source of ['115cm로서','5kg으로서','5kg를','item115cm으로서','115cm으로서닉','`115cm으로서`','https://example.com/115cm으로서','7xyz으로서'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.deepEqual(check('115cm으로서',['115cm으로서']),[]);
  assert.ok(check('115cm으로서 됬어요',['115cm으로서']).some(f=>f.suggestions.includes('됐어요')));
});

test('loanword repairs compose with plural copulas and preserve personal bases and neighboring gaps',()=>{
  for(const [source,target]of [['컨텐츠들 입니다','콘텐츠들입니다'],['컨텐츠들입니다','콘텐츠들입니다'],['엑세스를','액세스를'],['워크플로우를','워크플로를'],['마이그레션','마이그레이션'],['테트스를','테스트를']]){
    const findings=check(source);assert.equal(findings.length,1,source);
    assert.ok(findings[0].suggestions.includes(target),source);
    assert.deepEqual(check(target),[],target);
  }
  assert.ok(check('컨텐츠들 입니다',['컨텐츠']).some(f=>f.suggestions.includes('컨텐츠들입니다')));
  assert.ok(check('컨텐츠들 입니다 됬어요',['컨텐츠']).some(f=>f.suggestions.includes('됐어요')));
  for(const text of ['컨텐츠별명','테트스닉','워크플로우닉','`마이그레션`','https://example.com/컨텐츠'])assert.ok(!check(text).some(f=>f.applicable),text);
});

test('verified foreign action bases share noun recognition and productive derivation without widening all foreign nouns',()=>{
  for(const base of ['마이그레이션','필터링','덤핑','패스']){
    for(const word of [base,base+'에서',base+'합니다',base+'된'])assert.deepEqual(check(word),[],word);
  }
  for(const [source,target]of [['필터링 하여','필터링하여'],['패스 했습니다','패스했습니다'],['덤핑 된','덤핑된']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const word of ['레퍼토리되다','레저되다'])assert.notDeepEqual(check(word),[],word);
  assert.ok(!check('간단한 필터링 합니다').some(f=>f.suggestions.includes('필터링합니다')));
});

test('a bare copula homograph does not split names while deictic and subject boundaries remain',()=>{
  for(const word of ['이지엉클','이지엉클은']){
    assert.ok(!check(word).some(f=>f.applicable),word);
    assert.ok(check(word).some(f=>f.type==='unknown'&&f.base==='이지엉클'),word);
    assert.deepEqual(check(word,['이지엉클']),[]);
  }
  for(const word of ['더불어민주당','더불어민주당은','더불어민주당에서'])assert.deepEqual(check(word),[],word);
  for(const [source,target]of [['이게맞다','이게 맞다'],['이가아프다','이가 아프다'],['눈이오면','눈이 오면'],['학교에갔어요','학교에 갔어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(check('이지엉클 됬어요',['이지엉클']).some(f=>f.suggestions.includes('됐어요')));
});

test('derivational boundary repairs preserve coordinated noun phrases and independent 되다',()=>{
  for(const source of ['IP 를 필터링 하여','IP를 필터링 하여','CPU 를 테스트 합니다'])assert.ok(check(source).some(f=>f.suggestions.includes(source.endsWith('하여')?'필터링하여':'테스트합니다')),source);
  assert.ok(check('IP 를 필터링 하여 됬어요',['IP']).some(f=>f.suggestions.includes('됐어요')));
  for(const source of ['도 만족 하다','IP를 어려운 테스트 합니다','IP를 사용 및 저장 합니다'])assert.ok(!check(source).some(f=>f.suggestions.includes('만족하다')||f.suggestions.includes('테스트합니다')||f.suggestions.includes('저장합니다')),source);
  for(const text of ['추가 또는 삭제 하다','추가 및 삭제 하다','사용 및 저장 합니다','사용 또는 저장 되도록','심한 중독 되다','책상 되도록','책상이 되도록','안 되고','안 됩니다','안 되는','안 된'])assert.ok(!check(text).some(f=>f.applicable),text);
  for(const [source,target]of [['형성 되도록','형성되도록'],['가결 된','가결된'],['백업 되도록','백업되도록'],['중독 될','중독될'],['대형화 되고','대형화되고']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.deepEqual(check(target),[],target);
  }
  assert.ok(check('중독 될 됬어요',['중독']).some(f=>f.suggestions.includes('중독될')));
  assert.ok(check('중독 될 됬어요',['중독']).some(f=>f.suggestions.includes('됐어요')));
});

test('verified state-change derivations stay whole without licensing every noun ending in 화',()=>{
  for(const word of ['대형화되다','대형화되고','대형화됐어요','대형화될수록','중독되다','중독된','중독될','중독돼서'])assert.deepEqual(check(word),[],word);
  assert.ok(check('대형화되고 중독된 됬어요').some(f=>f.suggestions.includes('됐어요')));
  for(const word of ['감국화되다','개옥잠화되다','중독됬어요'])assert.notDeepEqual(check(word),[],word);
});

test('nominal copula and quotation allomorphs compose with lexical gap repairs',()=>{
  for(const [source,target]of [['이곳예요','이곳이에요'],['학생예요','학생이에요'],['그곳라고','그곳이라고'],['그곳라는','그곳이라는'],['이 곳예요','이곳이에요'],['그 곳라고','그곳이라고'],['학생 예요','학생이에요'],['그곳 라고','그곳이라고']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['나무예요','거예요','학교라고','학생이라고','그곳이라는','예요','달라는','살라고','놀라는','먹으라고','`이곳예요`','https://example.com/이곳예요'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.deepEqual(check('이곳예요',['이곳예요']),[]);
  assert.ok(check('이곳예요 됬어요',['이곳예요']).some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('이 곳예요',['이곳예요']).some(f=>f.suggestions.includes('이곳예요')));
});

test('lexical place and repeated compounds join only complete validated boundaries',()=>{
  for(const [source,target]of [['이 곳에','이곳에'],['그 곳에서','그곳에서'],['저 곳입니다','저곳입니다'],['이것 저것을','이것저것을'],['그 때그 때','그때그때'],['그때 그때는','그때그때는']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['이 곳간','사이 곳에','이\n곳','`이 곳에`','https://example.com/이 곳에','그 중이 절에 있어요'])assert.equal(check(source).some(f=>f.reason.startsWith('Preserve the verified lexical compound')),false,source);
  const findings=check('이 곳에 됬어요',['곳']);
  assert.ok(findings.some(f=>f.suggestions.includes('이곳에')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('short adnominals and contracted dependent phrases preserve whole endings and lexical homographs',()=>{
  for(const [source,target]of [['온거','온 거'],['뜬거를','뜬 거를'],['하는거를','하는 거를'],['아닐거긴','아닐 거긴'],['한건','한 건'],['온거같은','온 거 같은'],['넘을거같아서','넘을 거 같아서']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
    assert.equal(check(source,[source]).some(f=>f.applicable),false,source);
  }
  for(const source of ['선거','선거를','온건','본건','할게','갈게','인거','인걸로','반복하거나','놀거나','먹거든','꿈같은'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('short adjective contractions and negative dependent phrases keep their complete boundaries',()=>{
  for(const [source,target]of [['큰거','큰 거'],['긴게','긴 게'],['먼건','먼 건'],['안잡힐거라는','안 잡힐 거라는'],['못가는거','못 가는 거']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
    assert.equal(check(source,[source]).some(f=>f.applicable),false,source);
  }
  for(const source of ['필수','이걸','과거','안개','못생긴','큰걸음','긴급','안될 거','못할 거'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('nominal dapda suffix readings are not split using a homographic down fragment',()=>{
  for(const source of ['사람다운','타이난다운']){
    assert.equal(check(source).some(f=>f.applicable),false,source);
    assert.ok(check(source).some(f=>f.type==='unknown'),source);
  }
  assert.ok(check('사람다운 됬어요').some(f=>f.suggestions.includes('됐어요')));
  for(const source of ['아름다운','다운로드','다운 재킷'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('shared action additions recognize inflection and repair only unmodified noun boundaries',()=>{
  for(const [source,target]of [['출시 했습니다','출시했습니다'],['테스트 하기로','테스트하기로'],['복호화 합니다','복호화합니다']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.deepEqual(check(target),[],target);
  }
  for(const source of ['출시해서','출시되었습니다','테스트해서','테스트했어요','간단한 테스트 합니다','테스트 하나','어려운 테스트 하기로'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.ok(check('출시됬어요').some(f=>f.suggestions.includes('출시됐어요')));
  assert.ok(check('일단 테스트 하기로').some(f=>f.suggestions.includes('테스트하기로')));
  assert.ok(check('제품을 사서 테스트 하기로').some(f=>f.suggestions.includes('테스트하기로')));
  assert.ok(check('“Tiny Cloud”를 출시 했습니다').some(f=>f.suggestions.includes('출시했습니다')));
  assert.equal(check('사서 테스트 합니다').some(f=>f.applicable),false);
  const separate=check('테스트 해서 6월말에 봐요.');
  assert.ok(separate.some(f=>f.suggestions.includes('테스트해서')));
  assert.ok(separate.some(f=>f.suggestions.includes('6월 말에')));
  assert.ok(check('테스트 하기로 됬어요',['테스트']).some(f=>f.suggestions.includes('됐어요')));
  assert.deepEqual(check('출시됬어요',['출시됬어요']),[]);
});

test('negative ha boundaries precede descriptive whole-form recognition',()=>{
  for(const word of ['안하다','안하며','안하네요','안해도','안하고','안해봤습니다']){
    assert.ok(check(word).some(f=>f.suggestions.includes('안 '+word.slice(1))),word);
    assert.equal(check('안 '+word.slice(1)).some(f=>f.applicable),false,word);
    assert.equal(check(word,[word]).some(f=>f.applicable),false,word);
  }
  for(const word of ['안하무인','안심한','안되다','못하다','못생기다'])assert.equal(check(word).some(f=>f.suggestions.includes(word[0]+' '+word.slice(1))),false,word);
  for(const word of ['못생겼어요','못생긴','못생겨도'])assert.equal(check(word).some(f=>f.applicable),false,word);
  for(const word of ['못먹었다','못갔다'])assert.ok(check(word).some(f=>f.suggestions.includes('못 '+word.slice(1))),word);
  assert.ok(check('안해도 됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('attested reu alternations extend whole-word recognition without guessing every reu stem',()=>{
  for(const word of ['배불렀습니다','배불러도','배불러서','달랐어요','몰랐어요','걸렀습니다','눌렀어요'])assert.deepEqual(check(word),[],word);
  for(const word of ['딸랐어요','칠렀어요'])assert.ok(check(word).length>0,word);
  assert.ok(check('배불렀습니다. 됬어요.').some(f=>f.suggestions.includes('됐어요')));
});

test('honorific contractions preserve normal predicates and permitted auxiliary attachment',()=>{
  for(const word of ['주셔서','가셔서','만드셔도','읽으셔야','보셔요','읽어주셔서'])assert.deepEqual(check(word),[],word);
  for(const word of ['주셔는','주셔습니다','읽어주셔은'])assert.ok(check(word).length>0,word);
  assert.ok(check('읽어주셔서 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('추천해주셔서').some(f=>f.suggestions.includes('추천해 주셔서')));
  assert.deepEqual(check('추천해 주셔서'),[]);
  assert.deepEqual(check('주셔습니다',['주셔습니다']),[]);
});

test('one-syllable fragments do not justify splitting possible names',()=>{
  for(const word of ['위고비나','위고비군','바난자와']){
    const findings=check(word);
    assert.ok(findings.some(f=>f.type==='unknown'),word);
    assert.equal(findings.some(f=>f.applicable),false,word);
  }
  assert.ok(check('눈이오면').some(f=>f.suggestions.includes('눈이 오면')));
  assert.ok(check('위고비나 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.deepEqual(check('위고비나',['위고비']),[]);
});

test('quantity suffixes are recognized without swallowing the preceding numeral boundary',()=>{
  for(const word of ['하나씩','하나씩과','번씩','군데씩','반쯤','번째','권씩은','개쯤은'])assert.deepEqual(check(word),[],word);
  for(const [source,target]of [['두번씩','두 번씩'],['한개씩','한 개씩'],['세군데씩은','세 군데씩은']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  assert.ok(check('하나씩 됬어요').some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('아즈휼씩').some(f=>f.type==='unknown'));
  assert.ok(check('하나씩닉네임').some(f=>f.type==='unknown'));
});

test('community review retains homographs and personal words without hiding nearby errors',()=>{
  for(const [source,base]of [['컴으로 작업했어요','컴'],['비추입니다','비추'],['모공에 올라온 글','모공'],['질게에서 답변했어요','질게']]){
    const review=check(source).find(f=>f.reviewKind==='community');
    assert.equal(review?.original,base,source);
    assert.deepEqual(review.suggestions,[]);
    assert.equal(review.applicable,false);
    const registered=check(source+' 됬어요',[base]);
    assert.equal(registered.some(f=>f.reviewKind==='community'),false,source);
    assert.ok(registered.some(f=>f.suggestions.includes('됐어요')),source);
  }
  for(const source of ['비추는 빛','모공에 쌓인 먼지','죽을 질게 만들어요','컴퓨터','컴파일러']){
    assert.equal(check(source).some(f=>f.reviewKind==='community'),false,source);
    assert.equal(check(source).some(f=>f.applicable),false,source);
  }
});

test('malformed stem candidates preserve inflection and intentional personal spellings',()=>{
  for(const [source,targets]of [['겹처서',['겹쳐서']],['싫어아는',['싫어하는']],['편한하게',['편안하게','편하게']]]){
    const found=check(source).find(f=>f.type==='spelling');
    assert.deepEqual(found?.suggestions,targets,source);
    for(const target of targets)assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  assert.equal(check('겹처서',['겹처']).some(f=>f.type==='spelling'),false);
  assert.equal(check('편한하게',['편한하다']).some(f=>f.type==='spelling'),false);
  for(const source of ['겹치는','싫어하는','편안하게','편한하늘'])assert.equal(check(source).some(f=>f.type==='spelling'),false,source);
});

test('possible nominal affixes remain reviewable without speculative interior spacing',()=>{
  for(const source of ['후보군','후보군이','한국판','한국판으로','차세대기는','대만족인']){
    const findings=check(source);
    assert.equal(findings.some(f=>f.applicable),false,source);
    assert.ok(findings.some(f=>f.type==='unknown'),source);
  }
  assert.ok(check('후보군이 두번이나 됬어요',['후보군']).some(f=>f.suggestions.includes('두 번이나')));
  assert.ok(check('후보군이 두번이나 됬어요',['후보군']).some(f=>f.suggestions.includes('됐어요')));
});

test('particle gaps distinguish dependent ability from an outside location',()=>{
  for(const [source,target]of [['할 수 밖에 없어요','수밖에'],['멈출 수 밖에 없었는데','수밖에'],['갈 수 가 없습니다','수가'],['거주자 로서의','거주자로서의'],['20mm 로','로'],['Claude 와의','와의']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  }
  for(const source of ['집 밖에 있어요','그 밖에 다른 이유','학교 가 봐요','책상 위에 둬요','할 수밖에 없어요','거주자로서의'])assert.equal(check(source).some(f=>f.applicable),false,source);
  const findings=check('Zzqvx 로 됬어요');
  assert.ok(findings.some(f=>f.type==='unknown'&&f.original==='Zzqvx'));
  assert.ok(findings.some(f=>f.type==='spacing'&&f.original===' 로'));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('unrecognized nominal and following copula gap remain independent review items',()=>{
  const source='아즈휼 입니다만 됬어요';
  const findings=check(source);
  assert.ok(findings.some(f=>f.type==='unknown'&&f.original==='아즈휼'));
  assert.ok(findings.some(f=>f.type==='spacing'&&f.original===' 입니다만'&&f.suggestions.includes('입니다만')));
  for(let i=1;i<findings.length;i++)assert.ok(findings[i-1].to<=findings[i].from);
  const registered=check(source,['아즈휼']);
  assert.equal(registered.some(f=>f.type==='unknown'),false);
  assert.ok(registered.some(f=>f.suggestions.includes('아즈휼입니다만')));
  assert.ok(registered.some(f=>f.suggestions.includes('됐어요')));
  assert.ok(check('아즈휼입니다만 됬어요').some(f=>f.type==='unknown'&&f.original==='아즈휼'&&f.from===0&&f.to===3));
  assert.equal(check('사과가 있습니다').some(f=>f.applicable),false);
});

test('unknown plural and comparison particles expose the base word for personal registration',()=>{
  for(const source of ['아즈휼들','아즈휼들이','아즈휼들만의','아즈휼보단']){
    const findings=check(source+' 됬어요');
    assert.ok(findings.some(f=>f.type==='unknown'&&f.original==='아즈휼'&&f.base==='아즈휼'),source);
    const registered=check(source+' 됬어요',['아즈휼']);
    assert.equal(registered.some(f=>f.type==='unknown'),false,source);
    assert.ok(registered.some(f=>f.suggestions.includes('됐어요')),source);
  }
  for(const source of ['핸들','아들','그들','우리들'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('determiner and existential boundaries retain nominal particles and whole lexical readings',()=>{
  for(const [source,target]of [['이제품으로','이 제품으로'],['그제품으로','그 제품으로'],['저제품으로','저 제품으로'],['사과가있어서','사과가 있어서'],['하나가있어서','하나가 있어서'],['시간이없어서','시간이 없어서']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['이사회','그제','저장소','저전력으로','이가','가지','곰곰이입니다','높다던가'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.ok(check('곰곰이입니다').some(f=>f.type==='unknown'));
  assert.deepEqual(check('사과가있어서',['사과가있어서']),[]);
});

test('native quantities preserve ordinal suffixes, particles and lexical homographs',()=>{
  for(const [source,target]of [['세조각으로','세 조각으로'],['몇가지를','몇 가지를'],['몇년간은','몇 년간은'],['두개째','두 개째'],['세번째','세 번째'],['두번이나','두 번이나'],['두개면','두 개면'],['한병만','한 병만']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['한번','한잔','한가지','한쪽은','한쪽으로','한층','한곳','한해','한대','여러분','여러분에게','여러분은'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.deepEqual(check('몇가지를',['몇가지']),[]);
});

test('sourced lexical candidates retain suffixes and respect personal exceptions',()=>{
  for(const [source,target]of [['스크레치들','스크래치들'],['판넬들이','패널들이'],['오랬동안','오랫동안'],['헤짚을','헤집을'],['암호화되서','암호화돼서']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.deepEqual(check(target),[],target);
  }
  assert.deepEqual(check('스크레치들',['스크레치']),[]);
  assert.deepEqual(check('헤짚을',['헤짚다']),[]);
  for(const source of ['라우터의','프로토타입까지','워크플로는','마이그레이션이','복호화되었습니다'])assert.deepEqual(check(source),[],source);
  assert.ok(check('클로드',['라우터']).some(f=>f.type==='unknown'));
});

test('dependent nouns keep complete adnominals and attached particles',()=>{
  for(const [source,target]of [['비싸진만큼','비싸진 만큼'],['연결되는줄','연결되는 줄'],['먹은것까지','먹은 것까지'],['읽을정도로','읽을 정도로'],['먹을텐데요','먹을 텐데요'],['거일텐데','거일 텐데'],['그정도까지','그 정도까지']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['그만큼','이것으로','그때부터','정도껏','밧줄','호텔텐데'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.deepEqual(check('이정도면',['이정도면']),[]);
});

test('particle attachment composes with a preceding boundary repair without overlapping findings',()=>{
  for(const [source,target]of [['나올때 까지','나올 때까지'],['할때 부터','할 때부터'],['상징성 만큼은','상징성만큼은'],['것 치고는','것치고는'],['학생들 뿐이다','학생들뿐이다']]){
    const corrections=check(source).filter(f=>f.applicable);
    assert.equal(corrections.length,1,source);
    assert.equal(corrections[0].suggestions[0],target,source);
    assert.deepEqual(check(target),[],target);
  }
  for(const source of ['먹은 만큼은','볼 만큼','할 뿐이다','시장일 뿐이에요','발버둥이나 치고 있고','박수 치고는 돌아갔다'])assert.equal(check(source).some(f=>f.applicable),false,source);
  const findings=check('할때 부터 됬어요',['할때']);
  assert.ok(findings.some(f=>f.suggestions.includes('할때부터')));
  assert.ok(findings.some(f=>f.suggestions.includes('됐어요')));
});

test('numeric measurements separate degree and time relations without splitting identifiers',()=>{
  for(const [source,target]of [['6개월전에','6개월 전에'],['10년전에도','10년 전에도'],['73kg정도','73kg 정도'],['87%정도','87% 정도'],['3번정도','3번 정도']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['10원전','모델3번정도','73kg','50000원','https://example.com/3번정도'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('auxiliary and nested nominal boundaries retain the full preceding inflection',()=>{
  for(const [source,target]of [['작성해주신','작성해 주신'],['등록해달라고','등록해 달라고'],['가능할만한','가능할 만한'],['포기하던중','포기하던 중'],['숙제중인건지','숙제 중인 건지'],['세트라는걸','세트라는 걸']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const source of ['살만한','만들어주신','그중','도중','중인'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('whole expression recognition preserves sourced states and grammatical endings',()=>{
  for(const source of ['이곳에서','그곳까지','수준에서요','학교에도요','맞겠다네요','있사오니','먹사오니','기억되었습니다','지지부진하네요','과다하게'])assert.deepEqual(check(source),[],source);
  for(const [source,target]of [['안할','안 할'],['못받았는데','못 받았는데'],['잘알려진','잘 알려진'],['개선됬는데','개선됐는데']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('negative adjective and simple auxiliary inflections preserve the full word',()=>{
  for(const word of ['아닌데','아닌데요','아닌지','아닌가요','만들어보고자','만들어보세요','만들어봤어요','흔들어보세요','받들어주세요'])assert.deepEqual(check(word),[],word);
  assert.ok(check('조언해줬습니다').some(f=>f.suggestions.includes('조언해 줬습니다')));
});

test('derived purpose nouns and ambiguous record nouns are not split internally',()=>{
  for(const word of ['입문자용','입문자용으로','입문자용은','출판기가','출판기는'])assert.equal(check(word).some(f=>f.applicable),false,word);
  assert.ok(check('계획없습니다').some(f=>f.suggestions.includes('계획 없습니다')));
});

test('similarity alone never replaces a name and personal registration remains local',()=>{
  for(const word of ['클로드','클로드도','제미나이','티이어를']){
    const findings=check(word);assert.ok(findings.some(f=>f.type==='unknown'),word);
    assert.equal(findings.some(f=>f.applicable),false,word);
  }
  assert.deepEqual(check('클로드도',['클로드']),[]);
  const findings=check('클로드도 학교에갔어요. 됬어요.',['클로드']);
  for(const correction of ['학교에 갔어요','됐어요'])assert.ok(findings.some(f=>f.suggestions.includes(correction)),correction);
});

test('bounded spelling and grammatical repairs survive conservative candidate filtering',()=>{
  for(const [word,target]of [['맞춥법을','맞춤법을'],['메세지를','메시지를'],['빠졋는데','빠졌는데'],['보게됩니다','보게 됩니다'],['질게에서답변하시는걸','질게에서 답변하시는 걸']])assert.ok(check(word).some(f=>f.suggestions.includes(target)),word);
});


test('intention endings and compound auxiliary boundaries never split inside a word',()=>{
  for(const word of ['봐야겠네요','먹어야겠어요','만들어야겠네요'])assert.equal(check(word).some(f=>f.applicable),false,word);
  assert.ok(check('넘어가볼까').some(f=>f.suggestions.includes('넘어가 볼까')));
  assert.equal(check('쓴다던지').some(f=>f.suggestions.includes('쓴다 던지')),false);
});


test('mimetic derivations and quoted alternation endings do not become fragment phrases',()=>{
  for(const word of ['버벅이지','버벅이고','빠릿하게','돌아간다거나','내려간다거나'])assert.equal(check(word).some(f=>f.applicable),false,word);
  assert.ok(check('않는거나').some(f=>f.suggestions.includes('않는 거나')));
});


test('reported connective endings stay attached to a validated declarative',()=>{
  for(const word of ['끝난다는데','먹는다는데요','좋다는데','갔다는데','안다는데'])assert.equal(check(word).some(f=>f.applicable),false,word);
  assert.ok(check('좋는다던데').some(f=>f.suggestions.includes('좋다던데')));
});


test('repeated expressions stay reviewable and sourced compound repairs win over segmentation',()=>{
  assert.equal(check('어찌어찌해서').some(f=>f.applicable),false);
  assert.ok(check('전세집을').some(f=>f.suggestions.includes('전셋집을')));
  assert.equal(check('전셋집을').some(f=>f.applicable),false);
});


test('unclassified long main verbs do not get a mandatory auxiliary space',()=>{
  for(const word of ['다스려보니','다스려보세요'])assert.equal(check(word).some(f=>f.applicable),false,word);
  assert.ok(check('들어가보니').some(f=>f.suggestions.includes('들어가 보니')));
});

test('validated predicates recover dependent nouns and negative phrase boundaries',()=>{
  for(const [word,target]of [['못하는건가요','못하는 건가요'],['못하는거예요','못하는 거예요'],['많이해서','많이 해서'],['크지않을까도','크지 않을까도']]){
    assert.ok(check(word).some(f=>f.suggestions.includes(target)),word);
    assert.equal(check(target).some(f=>f.applicable),false,target);
  }
  for(const word of ['못하는','못생겼어요','않을까도','버벅이지','빠릿하게'])assert.equal(check(word).some(f=>f.applicable),false,word);
  const findings=check('클로드도 많이해서 못하는건가요',['클로드']);
  for(const target of ['많이 해서','못하는 건가요'])assert.ok(findings.some(f=>f.suggestions.includes(target)),target);
});

test('nominal inflections and pronouns preserve their internal boundaries',()=>{
  for(const word of ['이것입니다','그것이','무엇인가를','상황들입니다','격화됐음을','가능할지도','당당하실지요','저장했는지조차','미국인들에게','제한적','이건데','어디서든'])assert.equal(check(word).some(f=>f.applicable),false,word);
  for(const [word,target]of [['만들어야한다','만들어야 한다'],['끊어지는걸','끊어지는 걸'],['달려있는게','달려있는 게']])assert.ok(check(word).some(f=>f.suggestions.includes(target)),word);
  assert.equal(check('만들어야겠다').some(f=>f.applicable),false);
});

test('attested roots and irregular suffix inflections are recognized without splitting',()=>{
  for(const word of ['피하면서','포함된다','향상시키지','약화시켰다','발전시킵니다','여유로웠습니다','부담스러울','번거로운데요','좁혀지니까요','당첨되신','당첨된다든가','용출되는'])assert.deepEqual(check(word),[],word);
  for(const word of ['여유로우다','부담스러우다','크은'])assert.ok(check(word).length,word);
});

test('optional auxiliaries remain joined while required derived boundaries stay detectable',()=>{
  for(const word of ['아파옵니다','되어버렸습니다','넣어뒀습니다','시켜둡니다','내어주시기도'])assert.equal(check(word).some(f=>f.applicable),false,word);
  assert.ok(check('공부해보신').some(f=>f.suggestions.includes('공부해 보신')));
});

test('noun homographs do not license compound splitting or hide grammatical boundaries',()=>{
  for(const word of ['파일명을','메일함처럼','백반집처럼','조림장','저전력','그분의','이상급','크기군요'])assert.equal(check(word).some(f=>f.applicable),false,word);
  for(const [word,target]of [['카드절대','카드 절대'],['다른성분입니다','다른 성분입니다'],['하루동안만','하루 동안만'],['제한때문에','제한 때문에'],['어찌보면','어찌 보면'],['퉁퉁붓고','퉁퉁 붓고']])assert.ok(check(word).some(f=>f.suggestions.includes(target)),word);
});

test('shared supplemental device vocabulary takes particles without swallowing nearby errors',()=>{
  assert.deepEqual(check('내구도가 이어버드나'),[]);
  assert.ok(check('이어버드나 학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
});

test('numeric units and separated particles preserve counters and full-duration adverbs',()=>{
  for(const [source,target]of [['5만원','5만 원'],['3천달러','3천 달러'],['2만원대였어요','2만 원대였어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['50000원','침대 2개가 한 방에 있습니다.','시계 2 만 하루 사용기'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.ok(check('USB 를 연결합니다.').some(f=>f.suggestions.includes('를')));
});

test('honorific past and attested liquid stems preserve inflected words',()=>{
  for(const source of ['사용하셨던','웃돌면서','있다면요','받아놓았던'])assert.equal(check(source).some(f=>f.applicable),false,source);
  for(const [source,target]of [['준비해두고는','준비해 두고는'],['정리해두었습니다','정리해 두었습니다']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('validated inflection repairs preserve lexical liquid stems and correct contractions',()=>{
  for(const [source,target]of [['개선됬는데','개선됐는데'],['연결할려니','연결하려니'],['뽑을려고','뽑으려고']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['개선됐는데','살려고','알려고','만들려고'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('quoted nominal forms remain intact and inference auxiliaries use the complete predicate',()=>{
  for(const source of ['그렇다기엔','쉬었답니다','보내라네요'])assert.equal(check(source).some(f=>f.applicable),false,source);
  for(const [source,target]of [['그랬나봐요','그랬나 봐요'],['불감증인가봐요','불감증인가 봐요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('internet emoticons do not swallow neighboring spelling errors or personal scope',()=>{
  const findings=check('됬어요ㅋㅋㅋ ㅠ_ㅠ');
  assert.ok(findings.some(f=>f.original==='됬어요'&&f.suggestions.includes('됐어요')));
  for(const expression of ['ㅋㅋㅋ','ㅠ_ㅠ'])assert.ok(findings.some(f=>f.original===expression&&f.type==='unknown'),expression);
  const registered=check('됬어요ㅋㅋㅋ ㅠ_ㅠ',['ㅋㅋㅋ','ㅠ_ㅠ']);
  assert.equal(registered.length,1);assert.deepEqual(registered[0].suggestions,['됐어요']);
});

test('dependent noun contractions keep their particle while demonstratives stay intact',()=>{
  for(const [source,target]of [['할거라','할 거라'],['할거라는','할 거라는'],['한것만','한 것만'],['할거죠','할 거죠']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['이거라','그거라는','그건지','새것도'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('sourced spellings keep plural particles and personally chosen forms',()=>{
  for(const [source,target]of [['데스크탑을','데스크톱을'],['라이센스들만','라이선스들만'],['런닝','러닝'],['머리속으로','머릿속으로']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.equal(check('런닝맨').some(f=>f.applicable),false);
  assert.equal(check('라이센스들만',['라이센스']).some(f=>f.applicable),false);
});

test('imperatives and particle allomorphs require a validated host',()=>{
  for(const [source,target]of [['참고하십시요','참고하십시오'],['상태을','상태를'],['케이블으로','케이블로']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['가을','노을','서울을','가십시오','읽으십시오'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.ok(check('아즈휼를',['아즈휼']).some(f=>f.suggestions.includes('아즈휼을')));
  assert.equal(check('아즈휼를',['아즈휼를']).some(f=>f.applicable),false);
});

test('complete quotation and intention endings outrank lexical fragment splits',()=>{
  for(const [source,target]of [['하려고하는데','하려고 하는데'],['한다고해도','한다고 해도'],['있다고하는데','있다고 하는데'],['하고싶어요','하고 싶어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['고하고','선고하는데','신고하는데'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('extended roots recognize whole words without bypassing explicit error boundaries',()=>{
  for(const source of ['물어뜯게나','관계없겠지','형편없죠','오래가야'])assert.deepEqual(check(source),[],source);
  for(const [source,target]of [['안할','안 할'],['못받았는데','못 받았는데'],['잘알려진','잘 알려진'],['개선됬는데','개선됐는데'],['메세지를','메시지를']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['아와세유','담자면을']){
    const findings=check(source);assert.ok(findings.some(f=>f.type==='unknown'),source);
    assert.equal(findings.some(f=>f.applicable),false,source);
  }
});


test('auxiliary 내다 preserves allowed attachment while retaining derived-verb spacing',()=>{
  for(const source of ['읽어내어 이해했습니다.','막아내고 버텨냈어요.','만들어내어 전시했어요.'])assert.equal(check(source).some(f=>f.suggestions.length),false,source);
  assert.ok(check('분석해내어').some(f=>f.suggestions.includes('분석해 내어')));
});
test('높이다 repair validates inflections and attached auxiliaries without changing names',()=>{
  for(const [source,target]of [['높혀요','높여요'],['높혀주면','높여주면'],['높힌','높인'],['높히다','높이다'],['높혔어요','높였어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['높여주면','높여요','높혀닉네임'])assert.equal(check(source).some(f=>f.reason.startsWith('Validated 높이다')),false,source);
  assert.equal(check('높혀주면',['높혀주면']).some(f=>f.suggestions.length),false);
});


test('conditional intention repairs added rieul without damaging lexical rieul stems',()=>{
  for(const [source,target]of [['구할려면','구하려면'],['뽑을려면','뽑으려면'],['연결할려면요','연결하려면요']])assert.ok(check(source).some(f=>f.suggestions[0]===target),source);
  for(const source of ['살려면','알려면','만들려면','갈려면','구하려면'])assert.equal(check(source).some(f=>f.applicable),false,source);
  const personal=check('구할려면 쓸때',['구할려면']);
  assert.ok(!personal.some(f=>f.original==='구할려면'&&f.applicable));
  assert.ok(personal.some(f=>f.suggestions.includes('쓸 때')));
});

test('determiners and prospective adnominals keep dependent noun boundaries',()=>{
  for(const [source,target]of [['모든게','모든 게'],['모든거예요','모든 거예요'],['어느것을','어느 것을'],['다른게','다른 게'],['무슨건지','무슨 건지'],['날거','날 거'],['갈거','갈 거'],['갈거야','갈 거야'],['살거','살 거'],['알거','알 거']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const text of ['모든 게 정상입니다.','내가 할게.','나는 갈게.','이게 좋아요.','그건 알아요.','날것을 먹어요.','별거 없어요.'])assert.ok(!check(text).some(f=>f.applicable),text);
  assert.ok(!check('모든게',['모든게']).some(f=>f.applicable));
});
test('subject and topic particles select final consonant forms without changing their roles',()=>{
  for(const [source,target]of [['사과은','사과는'],['사람는','사람은'],['사과이','사과가'],['사람가','사람이'],['의자는','의자는'],['고양이','고양이'],['먹이는','먹이는']]){
    const findings=check(source+(['사과이','사람가'].includes(source)?' 좋아요.':''));if(source===target)assert.ok(!findings.some(f=>f.applicable),source);else assert.ok(findings.some(f=>f.suggestions[0]===target),source);
  }
  assert.ok(check('아즈휼가 좋아요.',['아즈휼']).some(f=>f.suggestions.includes('아즈휼이')));
  assert.ok(!check('사람가',['사람가']).some(f=>f.applicable));
  for(const source of ['화훼이 매장','몇 번인가 압력을 확인했어요.'])assert.ok(!check(source).some(f=>f.suggestions.includes('화훼가')||f.suggestions.includes('번인이')),source);
});
test('a particle homograph does not justify separating an unfamiliar term',()=>{
  assert.ok(!check('타건이나').some(f=>f.applicable));
  assert.ok(check('타건이나 쓸때').some(f=>f.suggestions.includes('쓸 때')));
  assert.ok(check('타건이나').some(f=>f.type==='unknown'));
});

test('nominalized copulas retain particles after a dependent noun boundary',()=>{
  for(const [source,target]of [['한것임에','한 것임에'],['할것임을','할 것임을'],['할것이었음을','할 것이었음을'],['올려치기일것임에','올려치기일 것임에']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.deepEqual(check(target),[],target);
  }
  for(const source of ['학생임에도','사실이었음을','문제임을','것임에'])assert.deepEqual(check(source),[],source);
  assert.ok(!check('한것임에',['한것임에']).some(f=>f.applicable));
  assert.ok(check('아즈휼일것임에 됬어요',['아즈휼']).some(f=>f.suggestions.includes('아즈휼일 것임에')));
  assert.ok(check('아즈휼일것임에 됬어요',['아즈휼']).some(f=>f.suggestions.includes('됐어요')));
});

test('spatial boundaries reject particle fragments while preserving bare and possessive hosts',()=>{
  for(const source of ['정렬가속','정렬가속은','책상을아래','사람이속']){
    assert.ok(!check(source).some(f=>f.applicable),source);
    assert.ok(check(source).some(f=>f.type==='unknown'),source);
  }
  for(const [source,target]of [['컴퓨터속','컴퓨터 속'],['폭염속','폭염 속'],['사람의속','사람의 속'],['책상아래','책상 아래']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('keyboard abbreviation review keeps particles and neighboring grammar independent',()=>{
  for(const source of ['갈축','갈축이나','갈축입니다']){
    const findings=check(source+' 쓸때');
    assert.ok(findings.some(f=>f.original==='갈축'&&f.type==='unknown'&&f.reviewKind==='community'&&!f.applicable),source);
    assert.ok(!findings.some(f=>f.applicable&&f.from===0),source);
    assert.ok(findings.some(f=>f.suggestions.includes('쓸 때')),source);
    assert.ok(!check(source+' 쓸때',['갈축']).some(f=>f.type==='unknown'),source);
  }
  assert.ok(check('갈곳').some(f=>f.suggestions.includes('갈 곳')));
  assert.ok(check('할말').some(f=>f.suggestions.includes('할 말')));
});

test('invalid concatenated honorific endings cannot conceal a topic particle mismatch',()=>{
  assert.ok(check('도시은 아름다워요.').some(f=>f.suggestions.includes('도시는')));
  for(const source of ['도시는 아름다워요.','선생님이 읽으신 책','내일 오실 분','참 기차이.'])assert.ok(!check(source).some(f=>f.applicable),source);
});

test('abstract batda derivations preserve noun modifiers and dependent boundaries',()=>{
  for(const source of ['축복받은','초대받습니다','구원받았어요','검수받고','많은 사랑 받으세요.','사랑을 받았어요.','선물 받았습니다.'])assert.deepEqual(check(source),[],source);
  for(const [source,target]of [['교육 받았어요','교육받았어요'],['초대 받았습니다','초대받았습니다'],['검수받을때','검수받을 때'],['검수받아보고','검수받아 보고']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(check('아즈휼받다',['아즈휼']).length,'Personal nouns must not automatically license a derived verb');
  assert.ok(!check('아즈휼 받다',['아즈휼']).some(f=>f.applicable));
  assert.ok(!check('검수받을때',['검수받을때']).some(f=>f.applicable));
});

test('standard desire contractions and change nominalizations stay whole',()=>{
  for(const source of ['추천하고픈','추천하고팠어요','먹고프다','가고파','오고파요','오고팠어요','배가 고파요.','읽어보고픈','만들어보고픈','알려주고픈','깨어짐으로써','합쳐짐을','알려짐에','깨어 짐을 옮겼다.'])assert.deepEqual(check(source),[],source);
  assert.ok(check('추천하고플때').some(f=>f.suggestions.includes('추천하고플 때')));
  assert.ok(check('오고플때').some(f=>f.suggestions.includes('오고플 때')));
  assert.ok(check('추천하고싶은').some(f=>f.suggestions.includes('추천하고 싶은')));
  assert.ok(check('추천해보고픈').some(f=>f.suggestions.includes('추천해 보고픈')));
  assert.ok(!check('먹었고픈').some(f=>f.applicable),'An invalid contraction must not suggest a standalone 픈');
});

test('ppun particle chains differ from dependent nouns before negative copulas',()=>{
  for(const source of ['이뿐만이 아닙니다.','나뿐이다.','그것뿐만은 아니다.','사람뿐입니다.','유한한 길뿐만 아니라','할 뿐만 아니라','살 뿐'])assert.deepEqual(check(source),[],source);
  for(const [source,target]of [['이 뿐만이','이뿐만이'],['사람 뿐입니다','사람뿐입니다'],['할뿐만아니라','할 뿐만 아니라'],['한것이아니라','한 것이 아니라'],['살뿐','살 뿐']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.ok(!check('할뿐만아니라',['할뿐만아니라']).some(f=>f.applicable));
});

test('a long contracted connective does not prove mandatory auxiliary spacing',()=>{
  for(const source of ['버무려냅니다','버무려내고']){
    assert.ok(!check(source).some(f=>f.applicable),source);
    assert.ok(check(source).some(f=>f.type==='unknown'),source);
  }
  assert.ok(check('분석해보고').some(f=>f.suggestions.includes('분석해 보고')));
  for(const [source,target]of [['떠먹여준다','떠먹여 준다'],['떠먹여주면','떠먹여 주면'],['떠먹여봤어요','떠먹여 봤어요']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.ok(!check(target).some(f=>f.applicable),target);
  }
});
