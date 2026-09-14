import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

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
  for(const word of ['제미나이','연애인이','티이어를']){
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
  assert.ok(check('제미나이를').some(f=>f.type==='unknown'));
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
  for(const [source,base]of [['아스트라도','아스트라'],['제미나이를','제미나이']]){
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
