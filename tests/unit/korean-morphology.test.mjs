import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('complete nominals and adverbs preserve internal lexical boundaries',()=>{
  for(const text of ['엄마한테는','어디선가','잘못인가요','잘못이지만','이른바','고려대니','무슨무슨','만원짜리','뒹굴거리다','제주어로','가죽나물이'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('잘못먹었다').some(f=>f.suggestions[0]==='잘못 먹었다'));
});

test('unknown author and product identities remain intact in explicit contexts',()=>{
  for(const text of ['프로이슬러 지음','소고기느님','맛있는라면 라면 이름이 맛있는라면이지만'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('맛있는라면을 먹었다').some(f=>f.suggestions[0]==='맛있는 라면을'));
  assert.ok(check('여기다하고 왔네요').some(f=>f.suggestions[0]==='여기다 하고'));
  assert.equal(check('모으고사에서').some(f=>f.applicable),false);
});

test('elapsed time and quantities restore complete grammatical gaps',()=>{
  for(const [text,target]of [['먹어본지가 오래된 것 같아','먹어본 지가'],['받은날','받은 날'],['한접시','한 접시'],['두번봤는데','두 번 봤는데'],['필요한건지','필요한 건지'],['치즈와함께','치즈와 함께'],['팍팍투하','팍팍 투하'],['즐기기좋은','즐기기 좋은']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['나은지','한달나라','걸걸중상','열폭하면서','오바인지','불안정인지','부담스러운지라','왜인지는','쓸만한지','습한지요'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('community endings and explicit identities retain their complete spelling',()=>{
  for(const text of ['집사람','있는데여','이해했는진 모르겠는데','재밌겠는걸','이 시기에','하늘빛나래 안식처','수도사 연맹 하다가','Maps 이 3개','크리뜨신분 이니 드림'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const text of ['호드 고고한선비 캐릭 유저입니다.','잠행안해-도적-[길드이름] 님한테'])assert.equal(check(text).some(f=>f.applicable&&['고고한선비','잠행안해'].includes(f.original)),false,text);
  for(const [text,target]of [['기간한정','기간 한정'],['가능한가해서요','가능한가 해서요'],['산출해달라니까','산출해 달라니까'],['집산다고','집 산다고']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('complete quotation and negation hosts restore overlooked boundaries',()=>{
  for(const [text,target]of [['한번쯤','한 번쯤'],['안좋아해서','안 좋아해서'],['내용묻는','내용 묻는'],['아니라하니까','아니라 하니까'],['해볼라하는데','해볼라 하는데'],['하지말라','하지 말라']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('temporal phrases retain particle and predicate boundaries',()=>{
  for(const text of ['어느새부터인가','어느덧부터','엄마한테는','확인할겨','구매하려니깐'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['이번주는','이번 주는'],['이번주해야하실듯','이번 주 해야 하실 듯'],['안정형일때','안정형일 때']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('adnominal and indirect-question analyses survive nominal homographs',()=>{
  for(const [text,target]of [['이상한생각은','이상한 생각은'],['할과제','할 과제'],['할따름입니다','할 따름입니다'],['될지모름','될지 모름'],['저보다빨라서','저보다 빨라서']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['인천대','인서울','스나이퍼','영업이익이','티이어를'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('subject particles precede validated state-change predicates',()=>{
  for(const [text,target]of [['한밤이출시되면','한밤이 출시되면'],['리셋이되니','리셋이 되니'],['클릭이되는데','클릭이 되는데']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['메이플','파이터','언어이해는','이륙가능한가요'])assert.equal(check(text).some(f=>f.suggestions[0]?.includes('이 해')||f.suggestions[0]?.includes('가 능')||f.suggestions[0]?.includes('이 터')||f.suggestions[0]?.includes('이 플')),false,text);
});

test('complete causative and quotation hosts survive nested spacing',()=>{
  assert.ok(check('통일시켜주면안되나').some(f=>f.suggestions[0]==='통일시켜 주면 안되나'));
  assert.ok(check('온다라는걸').some(f=>f.suggestions[0]==='온다라는 걸'));
  for(const [text,target]of [['갑짜기','갑자기'],['빨게졌어요','빨개졌어요']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['갑자기','빨개졌어요','0.1%권','플랜1 가 카의'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.equal(check('빨게졌어요',['빨게졌어요']).some(f=>f.applicable),false);
});

test('nominal honorific hosts take priority over internal predicate homographs',()=>{
  for(const text of ['사장님은','부장님께','교수님이'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('친절한선생님').some(f=>f.suggestions[0]==='친절한 선생님'));
});

test('permitted auxiliary compounds retain prospective promise endings',()=>{
  for(const text of ['잘해볼게','먹어볼게','읽어볼게요'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('잘하는게').some(f=>f.suggestions[0]==='잘하는 게'));
  assert.ok(check('여쭤볼게 있습니다.').some(f=>f.suggestions[0]==='여쭤볼 게'));
  assert.ok(check('비만아님').some(f=>f.suggestions[0]==='비만 아님'));
});

test('mimetic past typo repair validates a whole derived predicate',()=>{
  assert.ok(check('낑낑땠는데').some(f=>f.suggestions[0]==='낑낑댔는데'));
  assert.equal(check('낑낑댔는데').some(f=>f.applicable),false);
  assert.equal(check('낑낑땠는데',['낑낑땠는데']).some(f=>f.applicable),false);
});

test('negation and nominal particles retain their hosts before quoted or independent 하다',()=>{
  for(const [text,target]of [['안돌아간다고하면','안 돌아간다고 하면'],['견적대로하면','견적대로 하면'],['계획대로하면','계획대로 하면']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['국민대까지','안 돌아간다고 하면','견적대로 하면'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('validated connective and nominalized clauses establish every internal gap',()=>{
  for(const [text,target]of [['맞춰도괜찮을까요','맞춰도 괜찮을까요'],['구매해도상관없나요','구매해도 상관없나요'],['전부바꾸려합니다','전부 바꾸려 합니다'],['알려주시기바랍니다','알려주시기 바랍니다'],['썩어가고있다보니','썩어가고 있다 보니']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['엄마한테는','고속도로','편도선'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('purpose connectives stay separate from independently inflected motion verbs',()=>{
  for(const [text,target]of [['보러가볼까','보러 가볼까'],['먹으러가볼까','먹으러 가볼까'],['만나러왔어요','만나러 왔어요']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['보러 가볼까','먹으러 가볼까','그러니까'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.equal(check('보러가볼까',['보러가볼까']).some(f=>f.applicable),false);
});

test('recognized nouns can precede a desire clause without becoming arbitrary fragments',()=>{
  for(const [text,target]of [['오리고기먹고싶어지는데','오리고기 먹고 싶어지는데'],['인정받고싶다','인정받고 싶다'],['건강해지고싶다','건강해지고 싶다']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['오리고기','대가리','엄마한테는','재택하고싶어요'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.equal(check('오리고기먹고싶어지는데',['오리고기먹고싶어지는데']).some(f=>f.applicable),false);
});

test('bare recognized nouns separate from existential verbs while lexical wholes remain intact',()=>{
  assert.ok(check('자대있지만').some(f=>f.suggestions[0]==='자대 있지만'));
  for(const text of ['재미있지만','맛있지만','자대 있지만'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('demonstratives keep a boundary before colloquial 땜 without rewriting its spelling',()=>{
  for(const [text,target]of [['이거땜에','이거 땜에'],['그거땜에도','그거 땜에도'],['저거땜에','저거 땜에']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['이거 땜에','땜질'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('question particles and colloquial endings remain whole while grounded clauses separate',()=>{
  for(const text of ['샀는지와','먹었는지도','자자해서','자자한','햄부기','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['안한담서','안 한담서'],['어느세','어느새'],['적대적이지않고','적대적이지 않고'],['느낀점은','느낀 점은'],['비가왔나봐요','비가 왔나 봐요'],['영상만들때','영상 만들 때']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('intention and experiential predicates retain their existing boundaries',()=>{
  for(const text of ['사려 합니다','먹으려 합니다','해본 적이','만든 적이','넣으라는데','읽으라면서','의치대나','의치한약수','땡땡대','대폭등','궤를 같이하는데'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('생물학 적인').some(f=>f.suggestions[0]==='생물학적인'));
});

test('nested adverbs, nominal particles and honorific auxiliaries keep complete hosts',()=>{
  for(const [text,target]of [['잘만든것','잘 만든 것'],['어제만해도','어제만 해도'],['견적해주셨는데','견적해 주셨는데'],['괜찮다고는하는데','괜찮다고는 하는데'],['있는걸보면','있는 걸 보면'],['것처럼하길래','것처럼 하길래'],['어려운시기에','어려운 시기에'],['만들예정인','만들 예정인']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['웬만하다','기만하다','잘만','만들다'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('colloquial ending typos are restored before speculative internal spaces',()=>{
  for(const [text,target]of [['무서울정도내요','무서울 정도네요'],['모르게써요','모르겠어요']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['모르게 써요','돈 내요','재작년에'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('production-year wording is not rewritten as the year before last',()=>{
  for(const text of ['이 영화의 제작년은 2020년이다','제품 제작년: 2024','제작년에'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('quotation and obligation phrases retain complete predicates before dependent nouns',()=>{
  for(const [text,target]of [['어디가야합니까','어디 가야 합니까'],['어디가야할까요','어디 가야 할까요'],['한다고할때','한다고 할 때'],['병원인가함','병원인가 함'],['지랄맞게변했음','지랄맞게 변했음']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['한다는','인가하다','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('whole lexical forms and supplementary particles do not generate damaging neighbors',()=>{
  for(const text of ['난타전','선이수','답변드리겠습니다','이렇게까지','그렇게까지는','공보의마냥','하알라고'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('불편드려요').some(f=>f.suggestions[0]==='불편 드려요'));
});

test('contracted time and nested dependent nouns recover gaps without splitting particles',()=>{
  for(const [text,target]of [['사용할땐','사용할 땐'],['쓰시는분중','쓰시는 분 중'],['둘중하나','둘 중 하나'],['사람들있어요','사람들 있어요'],['방법밖에없음','방법밖에 없음'],['춥게잤다고','춥게 잤다고']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['어떻게든','어떻게든지','그렇게까지는','때때로'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('lexical stems and conversational endings survive competing shorter fragments',()=>{
  for(const text of ['어마무시했네요','버벅거림','제품명이','살고 있는걸요','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['구경만할지','구경만 할지'],['안내해줘서','안내해 줘서'],['집가는데','집 가는데']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('bounded grammatical relations recover mandatory spacing without splitting whole words',()=>{
  for(const [text,target]of [['다를바','다를 바'],['두어시간이','두어 시간이'],['이제품','이 제품'],['풀리길기다렸는데','풀리길 기다렸는데'],['없을것같긴한데','없을 것 같긴 한데'],['즐겨하는','즐겨 하는'],['문서확인하는','문서 확인하는'],['신경쓰는','신경 쓰는']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['바다','이내용물','저전력','기만하다'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('attested connective contractions recover boundaries and nicknames stay whole',()=>{
  for(const [text,target]of [['미쳐날뛰겠군요','미쳐 날뛰겠군요'],['흐려보입니다','흐려 보입니다']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['재미나이만','흐려','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('informal copula questions and recalled handles preserve their internal spelling',()=>{
  for(const text of ['인증 메탄가여?','학생인가여?','여기서 느린맘인가 뭔가로 활동했다던데'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('느린맘인가').some(f=>f.suggestions[0]==='느린 맘인가'));
  assert.ok(check('가는사람인가').some(f=>f.suggestions[0]==='가는 사람인가'));
});

test('informal titles stay whole while admissions group boundaries remain usable',()=>{
  assert.equal(check('슨상님이').some(f=>f.applicable),false);
  for(const [text,target]of [['가군라인과','가군 라인과'],['나군라인이','나군 라인이']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.equal(check('엄마한테는').some(f=>f.applicable),false);
});

test('complete amuri adverb and prospective geoya phrases keep their boundaries',()=>{
  for(const [text,target]of [['아무리그래도','아무리 그래도'],['학원다닐거야','학원 다닐 거야']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['아무리 그래도','이거야','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('generated spellings and auxiliary chains retain valid orthography and stem boundaries',()=>{
  for(const [text,target]of [['됫어','됐어'],['공부해보고싶네','공부해 보고 싶네'],['빌려달라해놓고','빌려 달라 해놓고'],['헷갈리게해서','헷갈리게 해서']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['숭숭세단','된찌','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('negative and nominalized clauses keep complete predicate boundaries',()=>{
  for(const [text,target]of [['환불해달라고하니까','환불해 달라고 하니까'],['적금넣었다고하더군요','적금 넣었다고 하더군요'],['나가기만한다고','나가기만 한다고'],['얼마안걸리잖아','얼마 안 걸리잖아'],['공부나처하지','공부나 처하지'],['나갔다들어왔다','나갔다 들어왔다']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['된찌','된찌랑','안주를','기만한다고','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('detached copulas cannot create auxiliary words inside a negative clause',()=>{
  assert.equal(check('기회가안주어주는지').some(f=>f.suggestions.includes('기회가 안주 어주는지')),false);
  for(const [text,target]of [['이란걸','이란 걸'],['너무화면을','너무 화면을']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['안주를','주어주는지','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('ambiguous nominal boundaries stay intact while complete required phrases remain reachable',()=>{
  for(const text of ['색조정했는데'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['환불처리한다는','환불 처리한다는'],['끌수있긴합니다','끌 수 있긴 합니다'],['며칠전','며칠 전'],['알람소리에','알람 소리에']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('complete verbs and college nouns keep lexical and quotation boundaries',()=>{
  for(const text of ['축하드려요','자연대','자연대에서','줄이자고','진작 잘할걸','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['늙다리뿐만아니라','늙다리뿐만 아니라'],['학과가기전','학과 가기 전']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.ok(check('불편드려요').some(f=>f.suggestions[0]==='불편 드려요'));
});

test('contracted consonant stems and informal dependent endings retain their boundaries',()=>{
  for(const [text,target]of [['건들지마','건들지 마'],['떨어지는거심','떨어지는 거심']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['건들지 마','건들고','엄마한테는','거심'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('community intensifiers, university names and plural kinship terms keep their boundaries',()=>{
  for(const text of ['아주대를','개웃기네','형들님','명확히진'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('영입해도되지만').some(f=>f.suggestions[0]==='영입해도 되지만'));
});

test('dependent nouns preserve attached auxiliaries and required derived-verb boundaries',()=>{
  for(const [text,target]of [['추천해주실수','추천해 주실 수'],['떼주는거임','떼주는 거임']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['추천해 주실 수','떼주는 거임','명시지로','갈아타볼까'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('concession, quantity and adjective clauses retain independently grounded boundaries',()=>{
  for(const [text,target]of [['그렇다치고','그렇다 치고'],['농어촌받고','농어촌 받고'],['더럽게많아서','더럽게 많아서'],['한모금만','한 모금만']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['감동받아서','사랑받고','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('reported obligations retain the quotation ending and demonstrative i stays independent',()=>{
  assert.ok(check('기다려야한다고합니다').some(f=>f.suggestions[0]==='기다려야 한다고 합니다'));
  assert.equal(check('700W 이 사양으로').some(f=>f.applicable),false);
  assert.ok(check('PC 가 좋아요').some(f=>f.suggestions[0]==='가'));
});

test('distributive counts, contracted possibilities and outward motion keep grammatical gaps',()=>{
  for(const [text,target]of [['한번씩해보세요','한 번씩 해보세요'],['그런걸수도','그런 걸 수도'],['뭐라하는','뭐라 하는'],['쏟아져나와요','쏟아져 나와요']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['벌렁거려요','가끔씩만','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('whole recognized names and mimetic verbs precede speculative noun and adverb gaps',()=>{
  for(const text of ['제미나이도','제미나이만','벌렁거려요','벌렁거렸다'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['많이보이네요','많이 보이네요'],['빨리마무리하고','빨리 마무리하고']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('copula negative particles and recognized group names stay intact',()=>{
  for(const text of ['고정적이지가','일반적이지가','과동아리도','천장등이','용과같이 시리즈'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('잘본과목이').some(f=>f.suggestions[0]==='잘 본 과목이'));
});

test('reported speech, purpose clauses and temporal activity nouns keep their boundaries',()=>{
  for(const [text,target]of [['있단말이죠','있단 말이죠'],['보러다니는','보러 다니는'],['이거사면','이거 사면'],['이주후','이주 후']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['조크등요','좋크등요','그저','사후','그거'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('distributive suffixes stay attached and nominalized descriptions retain their boundary',()=>{
  for(const text of ['가끔씩만','조금씩은','가끔씩도'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['내려놓기우당탕탕','내려놓기 우당탕탕'],['쓴다는가정하에','쓴다는 가정하에'],['몇번씩','몇 번씩']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('weather predicates and irregular questions retain their meaning',()=>{
  for(const [text,target]of [['비온다고','비 온다고'],['눈온다','눈 온다'],['얼마나더울까요','얼마나 더울까요']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['더울까요','추울까요','유신시기','고민고민하다가','비오틴'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('manner adverbs and explicit monetary and quantity phrases keep their boundaries',()=>{
  for(const [text,target]of [['짜게주잖아','짜게 주잖아'],['현금처리할','현금 처리할'],['한방울도','한 방울도']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['방울토마토','현금화','짜게'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('expressive repetitions preserve their runs and mimetic spelling',()=>{
  for(const text of ['똥'.repeat(26),'가나다'.repeat(4),'하하하하하'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('뻐끔뻐금').some(f=>f.suggestions[0]==='뻐끔뻐끔'));
});

test('dependent cognition and alternative clauses retain their word boundaries',()=>{
  for(const [text,target]of [['치는줄알았는데','치는 줄 알았는데'],['수입이다보니깐','수입이다 보니깐'],['볼까말까','볼까 말까'],['출장수리불렀는데','출장 수리 불렀는데'],['먹을생각하니','먹을 생각하니']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['생각하니','수입이다','수리비','뻐끔뻐끔'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('case-marked hosts and repeated counts retain required boundaries',()=>{
  for(const [text,target]of [['운이진짜','운이 진짜'],['빚까지내서','빚까지 내서'],['한번씩','한 번씩'],['또한번','또 한 번']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.equal(check('일단 한번 해 보세요').some(f=>f.original==='한번'),false);
});

test('derived nominal suffixes retain particles and contracted transport clauses split',()=>{
  for(const text of ['대체품이','자연풍도','해양대를','조립품은','복고풍으로'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('가져다놓는건데').some(f=>f.suggestions[0]==='가져다 놓는 건데'));
});

test('adnominal 듯이 remains distinct from a stem ending',()=>{
  assert.ok(check('미친듯이 노력했다').some(f=>f.suggestions[0]==='미친 듯이'));
  for(const text of ['먹듯이','날듯이','인식이 잘된답니다','서성한 라인알거 같음'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('subject particles and ambiguous amount questions preserve their meaning',()=>{
  for(const [text,target]of [['전화가옴','전화가 옴'],['소포가옴','소포가 옴'],['새로나왔나해서','새로 나왔나 해서'],['안가봣는데','안 가봤는데']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.equal(check('얼마나오나요').some(f=>f.applicable),false);
  assert.equal(check('안내합니다').some(f=>f.applicable),false);
});

test('honorific suffixes and enumeration homographs preserve ordinary prose',()=>{
  for(const text of ['요청드립니다','공유드립니다','스파, 철권 등등 합니다','붉은사막'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['남긴글','남긴 글'],['나가볼까봐요','나가볼까 봐요'],['한동한','한동안'],['옵션들인걸까요','옵션들인 걸까요'],['친구들인걸까요','친구들인 걸까요'],['감은있는데','감은 있는데'],['견적한번봐주실수있을까요','견적 한번 봐주실 수 있을까요'],['비싼가싶기도','비싼가 싶기도'],['좋다하긴했는데','좋다 하긴 했는데'],['이런말들이','이런 말들이']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('degree nouns remain separate from hada while complete activity phrases gain boundaries',()=>{
  for(const text of ['어느 정도 하려고','이 정도 하면','10분 정도 하면'])assert.equal(check(text).some(f=>f.suggestions.some(s=>s.includes('정도하'))),false,text);
  for(const [text,target]of [['배송대기중','배송 대기 중'],['주문접수중','주문 접수 중'],['추가할생각입니다','추가할 생각입니다'],['확인할내용','확인할 내용'],['구매 하려고','구매하려고']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['파일탭','볼매시네','제미나이'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('temporal ttara particles and product names remain whole words',()=>{
  for(const text of ['오늘따라','요즘따라','그날따라','이때따라','바이퍼','바이퍼를','바이퍼는'])assert.equal(check(text).some(f=>f.suggestions.length),false,text);
  assert.ok(check('친구따라').some(f=>f.suggestions.includes('친구 따라')));
});

test('colloquial particles, vowel copulas and connective deut keep their internal spelling',()=>{
  for(const text of ['엄마한테는','아빠한테도','친구한테서','수급자거든요','참가자거든요','샤워하듯','이야기하듯']){
    assert.equal(check(text).some(f=>f.suggestions.length),false,text);
  }
  for(const [text,target] of [['먹은듯','먹은 듯'],['할순','할 순']])assert.ok(check(text).some(f=>f.suggestions.includes(target)),text);
});

test('unrelated dictionary fragments cannot justify new internal boundaries',()=>{
  for(const text of ['클래스입니다','걸걸중상','볼매시네','딸기코아빠','증상나타남','맞춰져있다보니']){
    assert.equal(check(text).some(f=>f.suggestions.length),false,text);
  }
  for(const [text,target] of [['제친구들','제 친구들'],['문서를저장하고','문서를 저장하고'],['아는애랑','아는 애랑'],['개념없는','개념 없는'],['가능한가봅니다','가능한가 봅니다'],['필요한가봐요','필요한가 봐요']]){
    assert.ok(check(text).some(f=>f.suggestions.includes(target)),text);
  }
});

test('a possible name before a personal title is reviewed without a speculative split',()=>{
  const text='미친국어 선생님 강의';
  assert.equal(check(text).some(f=>f.original==='미친국어'&&f.suggestions.length),false);
  assert.equal(check(text,['미친국어']).some(f=>f.original==='미친국어'),false);
});

test('dependent nouns keep particles after completed predicate inflections',()=>{
  for(const [source,target]of [['했을때','했을 때'],['나올수도','나올 수도'],['느껴본적도','느껴본 적도'],['맞출겸','맞출 겸'],['되신걸까','되신 걸까'],['이러는거냐','이러는 거냐']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  }
  for(const text of ['수도','적도','필수','이걸'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('validated clauses survive conservative segmentation without accepting arbitrary fragments',()=>{
  for(const [source,target]of [['점심먹으러','점심 먹으러'],['병원갔더니','병원 갔더니'],['걷다보니','걷다 보니'],['해야하나싶은데','해야 하나 싶은데'],['죽어버리고싶네','죽어버리고 싶네'],['만들어볼까하는데','만들어볼까 하는데']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  }
  for(const text of ['감동받아서','배송체크해준대여','경제관념챙겨야하는데'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('negative contractions and a duration followed by 동안 keep grammatical boundaries',()=>{
  for(const [source,target]of [['하진않고','하진 않고'],['심상치않아보임','심상치 않아 보임'],['한시간동안','한 시간 동안'],['몇달동안','몇 달 동안']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.deepEqual(check(source,[source]),[]);
  }
});

test('particle typo composes a unique noun boundary without altering registered names',()=>{
  for(const [source,target] of [['상품설명에넌','상품 설명에는'],['설명에넌','설명에는'],['학교에넌','학교에는']]){
    const text='😀 '+source+' 표시가 있어요.';
    const result=check(text).find(f=>f.original===source);
    assert.deepEqual(result?.suggestions,[target]);
    assert.equal(result?.ambiguous,true);
    assert.equal(text.slice(result.from,result.to),source);
    assert.equal(check(text,[source]).some(f=>f.original===source),false);
  }
  assert.deepEqual(check('상품설명에넌',['상품설명'])[0]?.suggestions,['상품설명에는']);
  for(const text of ['설명에는 표시가 있어요.','설명에 넌 나오지 않아.','에넌','`상품설명에넌`','아즈휼에넌']){
    assert.equal(check(text).some(f=>f.reason.startsWith('Particle typo candidate')),false,text);
  }
});
import {createMorphology} from '../../packages/editor/src/proofreading/korean-morphology.mjs';

test('public prose keeps complete endings and finds validated multiword boundaries',()=>{
  for(const text of ['버는구나','햇빛','멜론','통째로','남아돈다는 게','먹을뻔했다'])assert.deepEqual(check(text),[],text);
  for(const [source,target] of [
    ['결혼하고나서','결혼하고 나서'],['해야만하는','해야만 하는'],
    ['운동안하고','운동 안 하고'],['정리해보고있습니다','정리해보고 있습니다'],
    ['집어올뻔했다','집어 올뻔했다'],['먹고있다','먹고 있다'],
    ['남아돈다는게','남아돈다는 게'],
  ])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('past ending repairs combine with word boundaries and leave unrelated nouns intact',()=>{
  for(const [source,target] of [
    ['불안햇던','불안했던'],['싶엇다','싶었다'],['살고싶엇다','살고 싶었다'],
    ['메론은','멜론은'],['통채로','통째로'],['안돼고','안 되고'],
    ['햇어서','했어서'],['좋아햇어서','좋아했어서'],['먹엇어서','먹었어서'],
  ])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const text of ['햇볕','햇빛','멜론은','통째로','안 되고','되고'])assert.deepEqual(check(text),[],text);
});

test('honorific doeda repair validates the whole predicate and preserves connective forms',()=>{
  for(const [source,target]of [['돼세요','되세요'],['돼시면','되시면'],['돼십니다','되십니다'],['등록돼세요','등록되세요']]){
    const text='😀 '+source,finding=check(text).find(f=>f.original===source);
    assert.deepEqual(finding?.suggestions,[target],source);
    assert.equal(text.slice(finding.from,finding.to),source);
    assert.deepEqual(check(text,[source]),[]);
  }
  for(const text of ['되세요','되시면','되십니다','돼라','돼도','돼요','돼서','돼지','돼지는','`돼세요`'])assert.deepEqual(check(text),[],text);
  assert.equal(check('아즈휼돼세요').some(f=>f.reason.startsWith('Honorific -시-')),false);
});

test('a connective and pronoun homograph do not split an unknown name plus particle',()=>{
  for(const text of ['모아나를','모아나는','모아나에게']){
    assert.equal(check(text).some(f=>f.applicable),false,text);
    assert.deepEqual(check(text,['모아나']),[]);
  }
  assert.deepEqual(check('모아 나를 도와줘요.'),[]);
  assert.ok(check('모아서보내요').some(f=>f.suggestions.includes('모아서 보내요')));
});

test('ro particle allomorphs preserve known nouns without licensing arbitrary endings',()=>{
  for(const text of ['이후로도','학교로도','길로도','학교로서도','학교로만'])assert.deepEqual(check(text),[],text);
  const sets={noun:new Set(['학교','길','책']),verb:new Set(),adjective:new Set(),adverb:new Set(),ending:new Set(),josa:new Set(['으로도','으로서도','으로만'])};
  const m=createMorphology(sets,{});
  for(const text of ['학교로도','길로도'])assert.equal(m.analyze(text,new Set())?.kind,'noun',text);
  for(const text of ['책로도','학교로아즈휼','아즈휼로도'])assert.equal(m.analyze(text,new Set()),null,text);
  assert.equal(m.analyze('아즈휼로도',new Set(['아즈휼']))?.kind,'noun');
  assert.ok(check('이후로도계속').some(f=>f.suggestions.includes('이후로도 계속')));
});

test('attested gomindoeda inflections stay attached without admitting every noun plus doeda',()=>{
  for(const text of ['고민되네요','고민됩니다','고민돼요','고민되었어요','고민될까요'])assert.deepEqual(check(text),[],text);
  assert.ok(check('고민되서').some(f=>f.suggestions.includes('고민돼서')));
  assert.ok(check('아즈휼되네요').length>0);
  assert.deepEqual(check('아즈휼되네요',['아즈휼되네요']),[]);
});

test('vowel noun copula contractions retain their noun instead of lexical neighbors',()=>{
  for(const text of ['소린데','얘긴데','학굔데','의산데','가순데','소린가요','얘긴지','소린데도','소리인데','시린데'])assert.deepEqual(check(text),[],text);
  const sets={noun:new Set(['학교']),verb:new Set(),adjective:new Set(),adverb:new Set(),ending:new Set(['데','가','지','다']),josa:new Set()};
  const m=createMorphology(sets,{forms:[['인데','EC','이'],['인가','EF','이'],['인지','EC','이'],['인다','EF','이']]});
  assert.equal(m.analyze('학굔데',new Set())?.base,'학교');
  for(const text of ['학굔다','학굔아즈휼','아즈휸데'])assert.equal(m.analyze(text,new Set()),null,text);
  assert.equal(m.analyze('아즈휸데',new Set(['아즈휴']))?.base,'아즈휴');
  assert.ok(check('무슨소린데').some(f=>f.suggestions.includes('무슨 소린데')));
  assert.deepEqual(check('무슨소린데',['무슨소린데']),[]);
  assert.deepEqual(check('무슨 소린데'),[]);
  assert.equal(check('무슨아즈휸데').some(f=>f.suggestions.includes('무슨 아즈휸데')),false);
});

test('reported declarative contractions remain one predicate',()=>{
  for(const text of ['있다던데','없다던데','좋다던데','좋으시다던데','먹는다던데','갔다던데','먹었다던데요','가겠다던데']){
    assert.deepEqual(check(text),[],text);
  }
  for(const text of ['아즈휼다던데','먹다던데','좋다던대','좋는다던데','있는다던데','없는다던데']){
    assert.ok(check(text).length>0,text);
  }
  assert.deepEqual(check('아즈휼다던데',['아즈휼다던데']),[]);
});

test('quoted reason contraction validates the underlying declarative before protecting it',()=>{
  for(const text of ['나온대서','먹는대서','간대서','산대서','좋대서','있대서','없대서','갔대서','먹었대서요','가겠대서','좋으시대서'])assert.deepEqual(check(text),[],text);
  for(const text of ['아즈휼대서','먹대서','좋는대서','좋대셔'])assert.ok(check(text).length>0,text);
  assert.deepEqual(check('아즈휼대서',['아즈휼대서']),[]);
  assert.ok(check('나온대서기다려요').some(f=>f.suggestions.includes('나온대서 기다려요')));
});

test('state quotation ending offers an actionable repair without changing action verbs',()=>{
  for(const [source,target]of [['좋는다던데','좋다던데'],['있는다던데','있다던데'],['없는다던데요','없다던데요'],['좋는대서','좋대서'],['있는대서','있대서'],['없는대서요','없대서요']]){
    const text='😀 '+source;
    const f=check(text).find(f=>f.original===source);
    assert.deepEqual(f?.suggestions,[target]);
    assert.equal(f.type,'spelling');
    assert.equal(text.slice(f.from,f.to),source);
    assert.deepEqual(check(text,[source]),[]);
  }
  for(const text of ['먹는다던데','찾는다던데','좋다던데','있다던데','`좋는다던데`'])assert.deepEqual(check(text),[],text);
  assert.equal(check('아즈휼는다던데').some(f=>f.reason.startsWith('State predicate quoted')),false);
});

test('nested spacing repairs stay uncertain even when every fragment is recognized',()=>{
  for(const text of ['잘알려지지않은']) {
    const finding=check(text).find(f=>f.type==='spacing'&&f.suggestions.includes('잘 알려지지 않은'));
    assert.ok(finding,text);
    assert.equal(finding.ambiguous,true,text);
    assert.ok(finding.suggestions.length>0);
  }
});

test('recognition-only noun homographs do not split an unregistered name',()=>{
  const text='연태고량주라고';
  const findings=check(text);
  assert.equal(findings.some(f=>f.type==='spacing'),false);
  assert.equal(findings.some(f=>f.type==='unknown'),true);
  assert.deepEqual(check(text,[text]),[]);
  assert.ok(check('잘알려지지않은').some(f=>f.suggestions.includes('잘 알려지지 않은')));
  for(const [source,target] of [['지금부터다시','지금부터 다시'],['일주일동안','일주일 동안']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  }
});

test('particle homograph after a predicate does not invent a spacing correction',()=>{
  const text='유의미하다까진';
  const findings=check(text);
  assert.equal(findings.some(f=>f.type==='spacing'),false);
  assert.ok(findings.some(f=>f.type==='unknown'&&!f.applicable));
  assert.deepEqual(check(text,[text]),[]);
  assert.deepEqual(check('말하면서까지도'),[]);
  assert.ok(check('잘알려지지않은').some(f=>f.suggestions.includes('잘 알려지지 않은')));
});

test('misplaced space inside manhada is repaired as one range',()=>{
  for(const [source,target]of [['갈만 할까요','갈 만할까요'],['먹을만 합니다','먹을 만합니다'],['참을만 했다','참을 만했다']]){
    const text='😀 '+source;
    const findings=check(text);
    assert.equal(findings.length,1);
    assert.deepEqual(findings[0].suggestions,[target]);
    assert.equal(text.slice(findings[0].from,findings[0].to),source);
    assert.deepEqual(check(target),[]);
    assert.equal(check(source,[source]).some(f=>f.reason.startsWith('Keep the auxiliary')),false);
  }
  for(const source of ['주먹만 합니다','일만 해서','갈만\n할까요','`갈만 할까요`'])assert.equal(check(source).some(f=>f.reason.startsWith('Keep the auxiliary')),false);
});

test('short adnominal predicates allow attached manhada auxiliary',()=>{
  for(const word of ['갈만할까요','갈 만할까요','먹을만하다','먹을 만하다','참을만한','참을 만한'])assert.deepEqual(check(word),[],word);
  const sets=Object.fromEntries(Object.entries({noun:['주먹'],verb:['먹'],adjective:[],adverb:[],josa:['만'],ending:['다']}).map(([key,value])=>[key,new Set(value)]));
  const morphology=createMorphology(sets,{});
  assert.equal(morphology.analyze('먹을만하다',new Set())?.kind,'predicate');
  assert.equal(morphology.analyze('주먹만하다',new Set()),null);
});

test('visualization and automation nouns retain action and change inflection',()=>{
  for(const word of ['시각화합니다','시각화해서','시각화되어','시각화됐어요','자동화합니다','자동화되었다'])assert.deepEqual(check(word),[],word);
  const sets=Object.fromEntries(Object.entries({noun:[],verb:['하','되'],adjective:[],adverb:[],josa:[],ending:['다']}).map(([key,value])=>[key,new Set(value)]));
  const morphology=createMorphology(sets,{recognizedNouns:['시각화','자동화','금은화']});
  assert.equal(morphology.predicate('시각화합니다')?.root,'시각화하');
  assert.equal(morphology.predicate('자동화되어')?.root,'자동화되');
  assert.equal(morphology.predicate('금은화합니다'),null);
});

test('attested nae stems expand beyond individual source surfaces',()=>{
  for(const word of ['쳐내려고','쳐내면서','쳐내겠습니다','골라내려고','긁어내면서','풀어내려고'])assert.deepEqual(check(word),[],word);
  const sets=Object.fromEntries(Object.entries({noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:['려고','면서']}).map(([key,value])=>[key,new Set(value)]));
  const records=[['쳐내','EC','쳐내'],['쳐낸','ETM','쳐내']];
  const morphology=createMorphology(sets,{forms:records});
  assert.equal(morphology.predicate('쳐내려고')?.root,'쳐내');
  assert.equal(morphology.predicate('아즈휼내려고'),null);
  assert.equal(createMorphology(sets,{forms:records.slice(0,1)}).predicate('쳐내려고'),null);
});

test('unverified noun similarity stays review-only and keeps personal exceptions',()=>{
  for(const word of ['아즈휘','연애인이','티이어를']){
    const findings=check(word);
    assert.ok(findings.some(f=>f.type==='unknown'&&!f.applicable),word);
    assert.deepEqual(check(word,[word]),[]);
  }
  assert.deepEqual(check('연애인이')[0].suggestions,[]);
  assert.ok(check('됬어요').some(f=>f.suggestions.includes('됐어요')));
});

test('known nominal plus particle stays attached before a copula',()=>{
  for(const word of ['언제부터인가','언제부터인지','여기까지입니다','누구에게인가'])assert.deepEqual(check(word),[],word);
  const sets=Object.fromEntries(Object.entries({noun:['언제'],verb:['이'],adjective:[],adverb:[],josa:['부터'],ending:['다','ㄴ가']}).map(([key,value])=>[key,new Set(value)]));
  const morphology=createMorphology(sets,{forms:[['인가','EF','이']]});
  assert.ok(morphology.analyze('언제부터인가',new Set()));
  assert.equal(morphology.analyze('아즈휼부터인가',new Set()),null);
  assert.equal(morphology.analyze('언제아즈휼인가',new Set()),null);
  assert.ok(morphology.analyze('아즈휼부터인가',new Set(['아즈휼'])));
  assert.ok(check('연애인이').some(f=>f.type==='unknown'));
  assert.ok(check('아즈휘를').some(f=>f.type==='unknown'));
});

test('attested roup adjectives retain irregular inflection without internal noun splits',()=>{
  for(const word of ['흥미로워서','흥미로웠어요','흥미로우면','흥미로울','흥미로움','흥미롭다','감미로워서','감미로웠어요','잡아서','입어서']){
    assert.deepEqual(check(word),[],word);
  }
  const sets=Object.fromEntries(Object.entries({noun:[],verb:['잡','입'],adjective:['흥미롭'],adverb:[],josa:[],ending:['다','면','니','고']}).map(([key,value])=>[key,new Set(value)]));
  const morphology=createMorphology(sets,{forms:[['흥미로운','ETM','흥미롭']]});
  for(const word of ['흥미로워서','흥미로우면','흥미로우니','흥미롭고','잡아서','입어서'])assert.ok(morphology.predicate(word),word);
  for(const word of ['흥미로우다','흥미로우고','잡워서','이워서','아즈휼로워서'])assert.equal(morphology.predicate(word),null,word);
});

test('attested longer particles keep the predicate boundary ahead of noun-only parses',()=>{
  for(const [source,target]of [['화면에서보이는','화면에서 보이는'],['사진에서보이는','사진에서 보이는'],['친구에게보낸','친구에게 보낸'],['선생님께서말씀하신','선생님께서 말씀하신']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.deepEqual(check(source,[source]),[]);
    assert.deepEqual(check(target),[]);
  }
  assert.ok(!check('영업이익이').some(f=>f.suggestions.length));
  assert.deepEqual(check('독거미는'),[]);
});

test('attested meaningful adjective uses ordinary inflection without internal noun splits',()=>{
  for(const word of ['유의미하다','유의미하다고','유의미합니다','유의미해서','유의미한','유의미하지'])assert.deepEqual(check(word),[],word);
  assert.ok(check('유의미함니다').some(f=>f.suggestions.includes('유의미합니다')));
  assert.ok(check('감사함니다').some(f=>f.suggestions.includes('감사합니다')));
  assert.deepEqual(check('감사함니다',['감사함니다']),[]);
});

test('unknown name repairs cannot shift the identified particle boundary',()=>{
  for(const [source,base]of [['아스트라도','아스트라'],['아즈휘를','아즈휘']]){
    const findings=check(source);
    assert.equal(findings.length,1);
    assert.equal(findings[0].type,'unknown');
    assert.equal(findings[0].original,base);
    assert.deepEqual(findings[0].suggestions,[]);
    assert.deepEqual(check(source,[base]),[]);
  }
  assert.ok(check('티이어를').some(f=>f.type==='unknown'));
  for(const word of ['라스트라도','세미나를'])assert.equal(check(word).filter(f=>f.applicable).length,0);
});

test('known independent adverb boundary survives a following negative auxiliary',()=>{
  for(const [source,target]of [['잘알려진','잘 알려진'],['잘알려져서','잘 알려져서'],['잘알려지지않은','잘 알려지지 않은']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).filter(f=>f.applicable).length,0,target);
    assert.equal(check(source,[source]).length,0);
  }
  for(const source of ['잘생긴','잘못한','잘 알려진'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
});

test('independent together adverbs override descriptive joined entries without splitting other words',()=>{
  for(const [source,target]of [['다같이','다 같이'],['다함께','다 함께'],['다같이도','다 같이도'],['다함께만','다 함께만']]){
    assert.deepEqual(check(source)[0].suggestions,[target]);
    assert.equal(check(target).length,0);
    assert.equal(check(source,[source]).length,0);
  }
  for(const word of ['다소','다행히','다 같이','다 함께'])assert.equal(check(word).length,0,word);
});

test('state-change nouns derive doeda without granting arbitrary noun or hada derivation',()=>{
  assert.deepEqual(check('오염되서')[0].suggestions,['오염돼서']);
  for(const word of ['오염돼서','감염됐어요','악화되어서','상승되는'])assert.equal(check(word).length,0,word);
  assert.ok(check('오염되').length);
  assert.equal(check('오염되서',['오염되서']).length,0);
  const sets=Object.fromEntries(Object.entries({noun:[],verb:['되','하'],adjective:[],adverb:[],josa:[],ending:['다','어','서']}).map(([key,value])=>[key,new Set(value)]));
  const morphology=createMorphology(sets,{stateChangeNouns:['오염']});
  assert.equal(morphology.predicate('오염돼서')?.root,'오염되');
  assert.equal(morphology.predicate('오염해서'),null);
  assert.equal(morphology.predicate('사과돼서'),null);
});

test('geu stem inflection repairs retain meaning instead of suggesting a different verb',()=>{
  for(const [source,expected]of [['잠궈서','잠가서'],['잠궜어요','잠갔어요'],['담궈서','담가서'],['담궜어요','담갔어요']]){
    assert.deepEqual(check(source)[0].suggestions,[expected],source);
    assert.equal(check(expected).length,0,expected);
  }
  assert.equal(check('잠겨서').length,0);
  assert.equal(check('잠궈서',['잠궈서']).length,0);
});

test('obligation auxiliary boundary precedes descriptive whole-form acceptance',()=>{
  for(const [source,expected]of [['해야함','해야 함'],['예약해야할지','예약해야 할지'],['가야한다','가야 한다'],['먹어야합니다','먹어야 합니다']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(expected)),source);
    assert.equal(check(expected).length,0,expected);
  }
  for(const source of ['해야지','공부해야만','이야기'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.equal(check('해야함',['해야함']).length,0);
});

test('jung attaches its particles and copula while staying separate from a preceding noun',()=>{
  for(const [source,expected]of [['고민중입니다','고민 중입니다'],['분중에','분 중에'],['분들중에서','분들 중에서'],['공부중에','공부 중에']])assert.ok(check(source).some(f=>f.suggestions.includes(expected)),source);
  for(const source of ['그중에서','도중에','공중에서','신중하게','고민 중입니다'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.equal(check('고민중입니다',['고민중입니다']).length,0);
});

test('dependent noun copula forms and quoted adnominals retain their boundary',()=>{
  for(const [source,expected]of [['찾아볼건데','찾아볼 건데'],['먹을건데','먹을 건데'],['하는건데','하는 건데'],['할거예요','할 거예요'],['다르다는게','다르다는 게'],['먹었다는건','먹었다는 건']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(expected)),source);
    assert.equal(check(expected).length,0,expected);
  }
  for(const source of ['진행할게','그런데','번데기','먹었다는','다르다는'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.equal(check('찾아볼건데',['찾아볼건데']).length,0);
});

test('past copula corrects a consonant-final known noun without rewriting vowel-final nouns',()=>{
  for(const [word,expected]of [['소설이였으면','소설이었으면'],['학생이였어요','학생이었어요'],['선물이였다','선물이었다']])assert.ok(check(word).some(f=>f.suggestions.includes(expected)),word);
  for(const word of ['소설이었으면','학생이었어요','학교였으면','친구였어요','어린이였어요','고양이였어요','올챙이였어요','지렁이였어요','영숙이였어요'])assert.equal(check(word).filter(f=>f.applicable).length,0,word);
  assert.equal(check('소설이였으면',['소설이였으면']).length,0);
});

test('colloquial recollection ending remains reviewable with a written alternative',()=>{
  for(const word of ['더라구요','먹더라구요','좋더라구요','했더라구요','모르겠더라구요'])assert.deepEqual(check(word)[0].suggestions,[word.slice(0,-4)+'더라고요'],word);
  for(const word of ['먹더라고요','모르겠더라고요'])assert.equal(check(word).length,0,word);
  assert.equal(check('먹더라구요',['먹더라구요']).length,0);
  assert.equal(check('하늘더라구요').filter(f=>f.suggestions.includes('하늘더라고요')).length,0);
});

test('an adverb homograph does not force a noun and particle fragment boundary',()=>{
  for(const word of ['조이스틱이라고','조이스틱은','조이스틱을'])assert.equal(check(word).filter(f=>f.applicable).length,0,word);
  assert.ok(check('조이스틱이라고').length>0);
  assert.equal(check('조이스틱이라고',['조이스틱']).length,0);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
});

test('ending typo candidates require a complete predicate and preserve noun particles',()=>{
  for(const [bad,good]of [['않습니나','않습니다'],['먹었습니나','먹었습니다'],['좋습니나','좋습니다'],['모릅니나','모릅니다'],['감사합니나','감사합니다']])assert.ok(check(bad).some(f=>f.suggestions.includes(good)),bad);
  for(const word of ['않습니다','먹었습니다','감사합니다','질게에','질게에서','질게는','하늘습니나'])assert.equal(check(word).filter(f=>f.applicable).length,0,word);
  assert.equal(check('않습니나',['않습니나']).length,0);
});

test('nonstandard adverb is reviewed even when the morphology inventory accepts it',()=>{
  assert.deepEqual(check('어짜피')[0].suggestions,['어차피']);
  assert.equal(check('어차피').length,0);
  assert.equal(check('어짜피',['어짜피']).length,0);
});

test('dependent noun particles are repaired before lexical neighbors',()=>{
  for(const [source,expected]of [['할때도','할 때도'],['쓸때는','쓸 때는'],['먹을때에','먹을 때에'],['좋으신분','좋으신 분'],['아시는분들께','아시는 분들께'],['가는곳으로','가는 곳으로']])assert.ok(check(source).some(f=>f.suggestions[0]===expected),source);
  for(const source of ['그때도','이때는','어떤가요','충분히','부분으로'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.equal(check('할때도',['할때도']).length,0);
});

test('colloquial surface recognition does not hide dependent noun boundaries',()=>{
  for(const [source,expected] of [['하는게','하는 게'],['대응하는게','대응하는 게'],['가능한거','가능한 거'],['있는게','있는 게'],['방문하는건','방문하는 건']])assert.ok(check(source).some(f=>f.suggestions.includes(expected)),source);
  for(const source of ['진행할게','빠르게','다르게','이게','그게'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.equal(check('하는게',['하는게']).length,0);
});

test('purpose suffix retains its noun and following particles',()=>{
  for(const source of ['사무용으로도','교육용에는','여행용이라고','연구용은','가정용으로는'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
});

test('nominal gi retains attached particles without splitting normal words',()=>{
  for(const source of ['올리기로는','먹기로도','읽기에는','검토하기부터','만들기로는'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
  assert.ok(check('하늘기로는').length>0);
});

test('interrogative predicates retain polite yo',()=>{
  for(const source of ['어떤가요','그런가요','먹는가요','가는가요','좋으신가요','먹었나요'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.ok(check('어떤게').some(f=>f.suggestions.includes('어떤 게')));
});

test('uncertain ending correction retains the required ya hada boundary',()=>{
  for(const [source,expected]of [['해야할런지','해야 할는지'],['먹어야할런지요','먹어야 할는지요']])assert.ok(check(source).some(f=>f.suggestions.includes(expected)),source);
  assert.ok(check('될런지요').some(f=>f.suggestions.includes('될는지요')));
  assert.equal(check('해야할런지',['해야할런지']).length,0);
});

test('polite recollection does not split its final goyo',()=>{
  for(const source of ['모르겠더라고요','좋더라고요','가더라고요','먹었더라고요'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
});

test('approximate quantity combines spelling and spacing while retaining dialect choice',()=>{
  for(const [source,expected]of [['세네개','서너 개'],['세네번은','서너 번은'],['세네','서너']])assert.ok(check(source).some(f=>f.suggestions.includes(expected)),source);
  assert.ok(check('세네개',['세네']).some(f=>f.suggestions.includes('세네 개')));
  assert.equal(check('세네',['세네']).length,0);
  assert.equal(check('세네갈').filter(f=>f.suggestions.some(s=>s.startsWith('서너'))).length,0);
});

test('action noun inventory supports hada inflections without all-noun derivation',()=>{
  for(const source of ['입주할','조치해','해지하면','일반화합니다'])assert.equal(check(source).length,0,source);
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
  assert.ok(check('맞춥법').some(f=>f.suggestions.includes('맞춤법')));
});

test('vowel-final nouns retain contracted copula inflections',()=>{
  for(const source of ['용도라면','정도여도','학교라서','친구라고','기차지만','학교였어요'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
});

test('contracted dependent nouns prefer spacing over meaning-changing spelling',()=>{
  for(const [source,expected]of [['이런게','이런 게'],['어떤게','어떤 게'],['가능할거','가능할 거'],['하는건','하는 건'],['먹을거','먹을 거']])assert.deepEqual(check(source).filter(f=>f.suggestions.length).map(f=>f.suggestions),[[expected]],source);
  for(const source of ['빠르게','멋지게','그게','이게'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.equal(check('이런게',['이런게']).length,0);
});

test('attested deurida suffix stems share inflection without joining all nouns',()=>{
  for(const source of ['감사드립니다','질문드렸어요','부탁드리겠습니다','말씀드리는','문의드려서','연락드리면','송부드렸습니다'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('불편드립니다').some(f=>f.suggestions.includes('불편 드립니다')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
});

test('contracted eseo keeps compound particles attached',()=>{
  for(const source of ['어디서부터','여기서부터는','거기서까지도','저기서부터도'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('여기서부터시작합니다').some(f=>f.suggestions.includes('여기서부터 시작합니다')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
});

test('eo jida inflections remain attached without licensing arbitrary ji sequences',()=>{
  for(const source of ['비싸졌네요','구려져서','궁금해져서','높아지면','깨끗해지더라도'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
});

test('derived hada predicates split at the auxiliary rather than the noun',()=>{
  for(const [source,expected] of [['공부해보신','공부해 보신'],['문의해봅니다','문의해 봅니다'],['검토해볼','검토해 볼'],['생각해봐도','생각해 봐도'],['배려해줘서','배려해 줘서'],['설명하여보세요','설명하여 보세요']]){
    assert.deepEqual(check(source).filter(f=>f.suggestions.length).map(f=>f.suggestions),[[expected]],source);
    assert.equal(check(expected).filter(f=>f.suggestions.length).length,0,expected);
    assert.equal(check(source,[source]).length,0);
  }
  for(const source of ['읽어보세요','해보세요','사드리면'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
});

test('regular adnominal endings respect vowel and rieul stem boundaries',()=>{
  const sets={noun:new Set(),verb:new Set(['가','만들','먹']),adjective:new Set(),adverb:new Set(),josa:new Set(),ending:new Set(['은','을','는','으니','으시고','고'])};
  const morphology=createMorphology(sets,{});
  for(const word of ['간','갈','가는','만든','만들','만드는','먹은','먹을','먹는','만드시고','만들고'])assert.ok(morphology.predicate(word),word);
  for(const word of ['가은','가을','가으니','만들은','만들을','만들는','만들으시고'])assert.equal(morphology.predicate(word),null,word);
});

test('jamo shorthand requires review until explicitly registered',()=>{
  for(const word of ['ㅋㅋ','ㅎㅎ','ㄱㄱ','ㅇㅇ']){
    const findings=check(word);assert.equal(findings.length,1);
    assert.equal(findings[0].type,'unknown');assert.deepEqual(findings[0].suggestions,[]);
    assert.equal(check(word,[word]).length,0);
  }
  assert.equal(check('`ㅋㅋ`').length,0);
  const finding=check('😀 ㅋㅋ')[0];assert.equal(finding.from,3);assert.equal(finding.to,5);
});

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
  assert.ok(check('해본적이').some(f=>f.suggestions.includes('해본 적이')));
});
test('spelling uses decomposed Hangul without changing source offsets',()=>{
  const source='😀 맞춥법을';const f=check(source).find(f=>f.type==='spelling');
  assert.equal(source.slice(f.from,f.to),'맞춥법을');
  assert.ok(f.suggestions.includes('맞춤법을'));
});
test('ending versus dependent noun ambiguity is exposed',()=>{
  assert.equal(check('하시는걸')[0]?.applicable??false,false);
  assert.equal(check('하시는걸 봤어요')[0].ambiguous,true);
});
test('ambiguous Korean boundaries preserve the intended reading and lexical names',()=>{
  const joined=check('교회가야해서').find(f=>f.original==='교회가야해서');
  assert.deepEqual(joined?.suggestions,['교회 가야 해서']);
  assert.equal(joined?.ambiguous,true);
  assert.deepEqual(check('교회가 야해서'),[]);

  const enumeration=check('아이등 가족손님으로');
  const childEtc=enumeration.find(f=>f.original==='아이등');
  assert.deepEqual(childEtc?.suggestions,['아이 등']);
  assert.equal(childEtc?.ambiguous,true);
  assert.equal(enumeration.some(f=>f.original==='님으로'||f.suggestions.some(s=>s.includes('님으로'))),false);

  assert.equal(check('한살림이 오픈됐어요').some(f=>f.original==='한살림이'),false);
  assert.deepEqual(check('한 살림이 필요하다'),[]);
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
test('compound English typos yield bounded candidates without replacing registered words',()=>{
  assert.equal(check("Jiwon's document is ready.").filter(f=>f.suggestions.length).length,0);
  // accidently is dictionary-attested, not a mandatory spelling correction:
  // https://www.merriam-webster.com/dictionary/accidently
  assert.deepEqual(check('accidently'),[]);
  for(const [source,target] of [['tommorow','tomorrow'],['accidentaly','accidentally']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)));
    assert.deepEqual(check(source,[source]),[]);
  }
});
test('pathological unbroken text reports an explicit analysis limitation',()=>{
  const f=check('가'.repeat(10000));assert.equal(f.length,1);assert.match(f[0].reason,/48/);assert.equal(f[0].applicable,false);
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
  for(const [source,target] of [['질문이있으면','질문이 있으면'],['제친구들','제 친구들'],['문서를저장하고','문서를 저장하고'],['비가오면','비가 오면'],['할일이','할 일이'],['누구나할','누구나 할']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
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

test('whole noun recognition follows explicit spacing rules but precedes speculative splits',()=>{
  for(const word of ['독거미는','가격대가'])assert.equal(check(word).filter(f=>f.suggestions.length).length,0,word);
  for(const [word,expected]of [['두개가','두 개가'],['한군데','한 군데'],['탈일이','탈 일이']])assert.ok(check(word).some(f=>f.suggestions.includes(expected)),word);
});

test('unverified noun typos remain reviewable without displacing predicate spacing',()=>{
  for(const source of ['티이어를','티이어는','티이어에서'])assert.ok(check(source).some(f=>f.type==='unknown'&&!f.applicable),source);
  assert.ok(check('자기전에').some(f=>f.suggestions.includes('자기 전에')));
  assert.equal(check('티이어를',['티이어']).length,0);
  assert.equal(check('`티이어를`').length,0);
});

test('nonstandard dictionary forms still receive bounded lexical corrections',()=>{
  for(const [source,target]of [['메세지를','메시지를'],['제테크는','재테크는'],['부딛히면','부딪히면'],['부딛혀도','부딪혀도']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['메시지를','재테크는','부딪히면'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.equal(check('메세지를',['메세지']).length,0);
  assert.equal(check('제테크는',['제테크']).length,0);
  assert.equal(check('메세지라는별명').filter(f=>f.suggestions.includes('메시지라는별명')).length,0);
});

test('foreign noun recognition does not expand typo candidates or silence spelling rules',()=>{
  for(const source of ['키보드','키보드를','프로그래밍','파티션','스퀘어'])assert.equal(check(source).length,0,source);
  assert.ok(check('메세지를').some(f=>f.suggestions.includes('메시지를')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
});

test('attested s-deletion allomorphs retain vowel-initial endings',()=>{
  for(const word of ['나으세요','나으니','나은지','나을까요'])assert.equal(check(word).length,0,word);
});

test('attested copula endings attach to known nouns without speculative spaces',()=>{
  for(const word of ['전문적','개인적인','기본적인','구체적이긴','친화적이기도','질문인데요','실력이었던','상황이었는데','것일까요'])assert.equal(check(word).filter(f=>f.suggestions.length).length,0,word);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
});

test('spelling candidates do not attach endings to already inflected surfaces',()=>{
  const suggestions=check('해치우고').flatMap(f=>f.suggestions);
  for(const invalid of ['해치운고','해치울고','해치워고'])assert.ok(!suggestions.includes(invalid),invalid);
  assert.ok(check('맞춥법을').some(f=>f.suggestions.includes('맞춤법을')));
  assert.ok(check('티이어를').some(f=>f.type==='unknown'));
});

test('missing doubled finals recover inflected predicates without changing valid single finals',()=>{
  for(const [source,target]of [['빠졋는데','빠졌는데'],['먹엇어요','먹었어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['벗어요','젓다','씻어요','빠졌는데','잇었어요'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.equal(check('빠졋는데',['빠졋는데']).length,0);
  assert.equal(check('`빠졋는데`').length,0);
});

test('negative adverb spacing composes with a verified doubled-final candidate',()=>{
  for(const [source,target]of [['못찾겠네요','못 찾겠네요'],['못찾겟네요','못 찾겠네요'],['안먹었어요','안 먹었어요'],['안먹엇어요','안 먹었어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['못생겼어요','안녕하세요','안됩니다'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.equal(check('못찾겟네요',['못찾겟네요']).length,0);
  for(const source of ['못하다','못했어요','못할'])assert.ok(!check(source).some(f=>f.suggestions.includes(source[0]+' '+source.slice(1))),source);
});

test('uncontracted vowel forms and polite endings remain valid predicates',()=>{
  for(const source of ['되었는데요','되었어요','되어서','보았는데요','주었어요','피었는데요','하여서','하였는데요','먹었거든요','먹었지요'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('되엇어요').some(f=>f.suggestions.includes('되었어요')));
});

test('standard uncertainty endings override permissive dictionary analysis',()=>{
  for(const [source,target]of [['될런지요','될는지요'],['계실런지요','계실는지요'],['할른지','할는지']]){
    assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
    assert.equal(check(target).length,0,target);
  }
  assert.equal(check('될런지요',['될런지요']).length,0);
  // 챌 can be a real inflection of 채다; without context this also
  // resembles a loanword. Never present the interpretation as certain.
  assert.equal(check('챌런지').find(f=>f.suggestions.includes('챌는지'))?.ambiguous,true);
  assert.equal(check('챌런지',['챌런지']).length,0);
});

test('permitted short auxiliary constructions retain their intended words',()=>{
  for(const source of ['사드리면','사드렸어요','사드릴게요','보내드려요','읽어드리면','해드려요','사보세요'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('맞춥법').some(f=>f.suggestions.includes('맞춤법')));
});

test('doe-eoseo contraction has an ending boundary and keeps ambiguous negation choices',()=>{
  assert.deepEqual(check('되서')[0].suggestions,['돼서']);
  assert.deepEqual(check('안되서')[0].suggestions,['안 돼서','안돼서']);
  for(const source of ['되어서','돼서','되고','되면','되서라는별명'])assert.ok(!check(source).some(f=>f.reason.startsWith('되어서 contracts')),source);
  assert.equal(check('안되서',['안되서']).length,0);
});

test('action noun derivation supports doeda without treating all nouns as stems',()=>{
  for(const source of ['부담돼서','입금되는','저장되고','사용되면'])assert.equal(check(source).length,0,source);
  assert.ok(check('부담되서').some(f=>f.suggestions.includes('부담돼서')));
  assert.ok(check('확정될때까지').some(f=>f.suggestions.includes('확정될 때까지')));
  for(const source of ['책되서','밥되서'])assert.ok(!check(source).some(f=>f.suggestions.includes(source.replace('되서','돼서'))),source);
  // Recognizing the derivation must not silence an unfinished stem.
  assert.ok(check('등록되 잇다고').some(f=>f.original==='등록되'));
});

test('rieul nominal forms retain rieul before mieum and accept particles',()=>{
  for(const [source,target]of [['만듬','만듦'],['만듬으로','만듦으로'],['이끔','이끎']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['만듦','만듦으로','삶','앎','믿음','웃음','알음'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.equal(check('만듬',['만듬']).length,0);
  for(const source of ['밈','밈인가요','밈인지'])assert.ok(!check(source).some(f=>f.suggestions.some(s=>s.startsWith('밂'))),source);
});

test('time quantities separate relative nouns without splitting unrelated continuations',()=>{
  for(const [source,target]of [['한달전에','한 달 전에'],['두달후','두 달 후'],['세시간전에는','세 시간 전에는'],['한달만','한 달만']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['한 달 전에','두 달 후','한달나라'])assert.ok(!check(source).some(f=>f.reason==='Spacing rule 43; review interpretation'),source);
  assert.equal(check('한달전에',['한달전에']).length,0);
});

test('verified short spellings retain particles and personal exceptions',()=>{
  for(const [source,target]of [['헤택','혜택'],['헤택을','혜택을'],['게의치','개의치']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.equal(check('헤택을',['헤택']).length,0);
  assert.equal(check('게의치',['게의치']).length,0);
  for(const source of ['혜택','개의치','게의','헤택이라는이름'])assert.ok(!check(source).some(f=>f.suggestions.includes(source.replace('헤택','혜택').replace('게의','개의'))),source);
});

test('wi vowel inflections retain eo instead of an invented contraction',()=>{
  for(const [source,target]of [['바꼈다는데','바뀌었다는데'],['바껴서','바뀌어서'],['사겼어요','사귀었어요']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  for(const source of ['바뀌었다는데','바뀌어서','사귀었어요','쉬었어요','쥐었어요'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.equal(check('바껴서',['바껴서']).length,0);
  assert.ok(!check('바껴라는이름').some(f=>f.suggestions.includes('바뀌어라는이름')));
});

test('missing basic stems do not reverse correct intention endings',()=>{
  for(const source of ['구하려고','구하면','그러겠지','팔려고','살려고','놀려고'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  for(const [source,target]of [['구할려고','구하려고'],['할려고','하려고'],['공부할려고','공부하려고'],['안그러겟지','안 그러겠지']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.equal(check('구할려고',['구할려고']).length,0);
});

test('a doubled consonant in the final jyo ending yields a complete predicate candidate',()=>{
  for(const [source,target]of [['맞겠쬬','맞겠죠'],['먹었쬬','먹었죠'],['그랬쬬','그랬죠']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
  assert.equal(check('맞겠쬬',['맞겠쬬']).length,0);
  assert.equal(check('맞겠죠').length,0);
  assert.ok(!check('쬬쬬').some(f=>f.suggestions.includes('쬬죠')));
});

test('ge doeda composition recovers the past ending before speculative unknown splits',()=>{
  assert.ok(check('알게되엇는데요').some(f=>f.suggestions.includes('알게 되었는데요')));
  assert.equal(check('알게 되었는데요').length,0);
  assert.equal(check('알게되엇는데요',['알게되엇는데요']).length,0);
});

test('adjective-derived psychological verbs and modified honorifics keep their units',()=>{
  for(const text of ['미안해하면서','불편해했다','아는 형님이'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('아는형님이').some(f=>f.suggestions[0]==='아는 형님이'));
  assert.equal(check('아는형님이',['아는형님이']).length,0);
  for(const text of ['갠적으로','데스에더'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('complete nouns are not split at a coincidental dependent noun ending',()=>{
  for(const source of ['필수','이걸','이때'])assert.equal(check(source).length,0,source);
  for(const [source,target]of [['아닌것','아닌 것'],['탈일이','탈 일이'],['한군데','한 군데']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('polite connective endings and jeok derivatives retain their boundaries',()=>{
  for(const source of ['있어서요','싶어서요','궁금해서요','올려서요','먹고요','커리어적으로','의식적으로','파멸적으로'])assert.equal(check(source).filter(f=>f.suggestions.length).length,0,source);
  assert.ok(check('학교에갔어요').some(f=>f.suggestions.includes('학교에 갔어요')));
  assert.ok(check('질게에서').some(f=>f.type==='unknown'));
  for(const [source,target]of [['달아줘야해서요','달아줘야 해서요'],['만들어야하는데','만들어야 하는데']])assert.ok(check(source).some(f=>f.suggestions.includes(target)),source);
});

test('native duration plus degree separates only the mandatory degree boundary',()=>{
  for(const [source,target]of [['한시간정도','한시간 정도'],['두달정도만','두달 정도만'],['세시간정도는','세시간 정도는']]){
    assert.ok(check(source).some(f=>f.original===source&&f.suggestions[0]===target),source);
    assert.ok(!check(source,[source]).some(f=>f.applicable),source);
  }
  assert.equal(check('한 시간 정도').filter(f=>f.applicable).length,0);
  assert.ok(!check('한시간정도쯤').some(f=>f.suggestions.includes('한시간 정도쯤')));
});

test('independent all-adverb precedes validated adjective inflections without splitting names',()=>{
  for(const [source,target]of [['다좋은데','다 좋은데'],['다좋아요','다 좋아요']])assert.ok(check(source).some(f=>f.original===source&&f.suggestions[0]===target),source);
  for(const source of ['다크','다크한','다음','다 좋은데'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.deepEqual(check('다좋은데',['다좋은데']),[]);
});

test('context resolves negative adnominal against a recognized noun homograph',()=>{
  for(const [source,word,target]of [['집엔 안가는 법이지','안가는','안 가는'],['학교에 못가는 날','못가는','못 가는']]){
    assert.ok(check(source).some(f=>f.original===word&&f.suggestions[0]===target),source);
  }
  for(const source of ['안가는','안가는 법이지','집엔 안보이는 법이지','집엔 안내는 법이지','집엔 `안가는` 법이지'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.equal(check('집엔 안가는 법이지',['안가는']).filter(f=>f.applicable).length,0);
});

test('consecutive particles attach to a nominal while elapsed-time man remains separate',()=>{
  for(const [source,target]of [['본인 만이 아니라','본인만이'],['학생 만이','학생만이']])assert.ok(check(source).some(f=>f.original===source.slice(0,target.length+1)&&f.suggestions[0]===target),source);
  for(const source of ['본인만이 아니라','십 년 만이 아니다','10년 만이 아니다','두 달 만이 아니다','일주일 만이 아니다','열흘 만이 아니다','닷새 만이 아니다','세 주일 만이 아니다','오랜 만이'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
  assert.equal(check('`본인 만이`').filter(f=>f.applicable).length,0);
});

test('rule 46 permits joined short adverbs as an author variant',()=>{
  for(const source of ['좀더 선명하고요','좀 더 선명하고요'])assert.equal(check(source).filter(f=>f.applicable).length,0,source);
});


test('subject and negative particles take precedence over unrelated noun fragments',()=>{
  for(const [source,target]of [['개학도안했는데','개학도 안 했는데'],['안준단말이야','안 준단 말이야'],['제가게이냐는','제가 게이냐는'],['잘못살까봐','잘못 살까봐']])assert.ok(check(source).some(f=>f.suggestions[0]===target),source);
  for(const source of ['잘못된','잘못한','엄마한테는','어떻게든지'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('historical community boundaries preserve required correction recall',()=>{
  for(const [source,target]of [['싶어하는','싶어 하는'],['한과목','한 과목'],['한숨쉬던','한숨 쉬던'],['그런척','그런 척'],['보던앤데','보던 앤데'],['이득이라해서','이득이라 해서']])assert.ok(check(source).some(f=>f.suggestions[0]===target),source);
  for(const source of ['미안해하면서','불편해했다','불칸으로'])assert.equal(check(source).some(f=>f.applicable),false,source);
});


test('whole products and names survive short fragment analyses',()=>{
  for(const text of ['제거제','식세기','박은정','자식이거아'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['먹은밥','먹은 밥'],['받은돈','받은 돈'],['같은과','같은 과'],['할거야','할 거야']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});


test('range suffixes and university abbreviations remain whole',()=>{
  for(const text of ['중반대에','초중반대에','후반대는','간호대를','연고서성한'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('며칠전').some(f=>f.suggestions[0]==='며칠 전'));
});

test('complete connective clauses precede shorter negative homographs',()=>{
  for(const [text,target]of [['안전하고나서','안전하고 나서'],['안하고나서','안 하고 나서'],['결혼하고나서','결혼하고 나서']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.equal(check('안전하고 나서').some(f=>f.applicable),false);
});

test('bare imperative stems do not masquerade as dependent-noun modifiers',()=>{
  for(const text of ['하거라','하거라고','가거라'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['할거라','할 거라'],['한거라고','한 거라고']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('short uncertain noun and nominalization homographs do not invent boundaries',()=>{
  for(const text of ['센경','삽사기','삽사기도'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['큰문제','큰 문제'],['책읽기','책 읽기'],['밥먹기','밥 먹기'],['머리감기','머리 감기']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});


test('verified lexical stems and nominalizations keep community boundaries intact',()=>{
  for(const text of ['인사드리고','인사드렸습니다','인사드릴게요','명문대를','명문대에서','못남과','못남을','못난'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['불편드려요','불편 드려요'],['못먹었다','못 먹었다'],['못나가겠고','못 나가겠고'],['못나와서','못 나와서']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('bounded predicate repairs precede speculative noun choice and activity gaps',()=>{
  for(const [text,target]of [['다사나단한','다사다난한'],['다사나단했다','다사다난했다'],['비꾸기','바꾸기'],['비꾸고','바꾸고']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['다사다난한','바꾸기','다사나단닉네임','비꾸닉네임'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const text of ['다사나단한','비꾸기'])assert.deepEqual(check(text,[text]),[],text);
});


test('food nouns and quantities retain lexical suffixes in community prose',()=>{
  for(const text of ['제주시로','묵은지에','데리야키','벚꽃놀이하기','고급졌습니다','대파 한 대','미술슨상님도'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('한장짜리').some(f=>f.suggestions[0]==='한 장짜리'));
});

test('complete predicates precede auxiliary and abbreviated report boundaries',()=>{
  for(const [text,target]of [['아른아른거렸을듯','아른아른거렸을 듯'],['지원해볼만할까요','지원해 볼만할까요'],['이렇게한다함','이렇게 한다 함'],['한다함','한다 함']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['안하도','떨어질가요'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('independent eating predicates and omitted objects recover mandatory gaps',()=>{
  for(const [text,target]of [['구워먹을라고','구워 먹을라고'],['만들어먹겠다는','만들어 먹겠다는'],['찍어먹기','찍어 먹기'],['비벼먹으니','비벼 먹으니'],['시켜먹습니다','시켜 먹습니다'],['발라내먹어야','발라내 먹어야'],['도움받을수','도움 받을 수'],['정신나간','정신 나간']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['받아먹었다','갉아먹었다','까먹었다','다쳐먹더라고'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('whole predicates and nominal suffixes survive fragment homographs',()=>{
  for(const text of ['짜장이기보다는','세발나물이','내세우지','때아닌','찾아다님','내신식으로','세이부가','라오쓰지','존맛','정말정말'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['이와중에','이 와중에'],['그중한곳에서','그중 한 곳에서'],['한번꼴로','한 번꼴로'],['군대가기','군대 가기'],['퍽퍽해보였는데','퍽퍽해 보였는데']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('complete adnominal and colloquial motion forms recover grammatical gaps',()=>{
  for(const [text,target]of [['한다음에','한 다음에'],['만든맛이','만든 맛이'],['구운맛입니다','구운 맛입니다'],['나온것중에','나온 것 중에'],['급식없던시절','급식 없던 시절'],['자러갈게용','자러 갈게용'],['할라하면','할라 하면'],['아님말고','아님 말고']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('food actions and elliptical state phrases keep independent word boundaries',()=>{
  for(const [text,target]of [['썰어넣은','썰어 넣은'],['건져먹고','건져 먹고'],['감당못하는','감당 못하는'],['너무행복','너무 행복']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['못생겼다','한번 해보자','엄마한테는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('copula and colloquial intent endings preserve the complete host',()=>{
  for(const text of ['이거군요','그거군요','공문서란','안내서란','모을라고','먹을라고','있어야지란 생각'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('연락오더군요').some(f=>f.suggestions[0]==='연락 오더군요'));
});

test('past and result-state typos are repaired before internal segmentation',()=>{
  for(const [text,target]of [['일어낫는대','일어났는데'],['안갓냐는','안 갔냐는'],['되있어서','돼 있어서'],['바글바글되었지만','바글바글댔지만'],['아니먼','아니면']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['웃는대','낫는대','됐지만','되있어서'])assert.equal(check(text,[text]).some(f=>f.applicable),false,text);
  for(const text of ['웃는대','낫는대'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.equal(check('타겟은').some(f=>f.applicable),false);
  assert.ok(check('안낫네').some(f=>f.suggestions[0]==='안 낫네'));
});

test('motion nominalization and additional count units retain complete boundaries',()=>{
  for(const [text,target]of [['이사가기 전에','이사 가기'],['한상자에','한 상자에'],['한단계','한 단계']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['달달구리하면서','네네가','우도나쓰는'])assert.equal(check(text).some(f=>f.applicable),false,text);
});
