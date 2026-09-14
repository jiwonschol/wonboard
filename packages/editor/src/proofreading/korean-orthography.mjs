// Original, bounded rules. Morphological acceptance is not spelling correctness.
// Sources and limits: docs/planning/spelling-orthography-sources.md.
export function orthography(word,sets,personal,isPredicate,isKnownNoun=w=>sets.noun.has(w),precedingAdnominal=false,followingPredicate=false) {
  if(personal.has(word))return null;
  // 높이다 is the attested causative; validate the complete repaired inflection.
  for(const [bad,good]of [['높히','높이'],['높혀','높여'],['높혔','높였'],['높힌','높인'],['높힐','높일']]){
    if(!word.startsWith(bad)||personal.has(bad)||personal.has('높히다'))continue;
    const candidate=good+word.slice(bad.length);
    const auxiliary=candidate.startsWith('높여')?candidate.slice(2):'';
    const joinedAuxiliary=/^(?:주|줘|줬|보|봐|봤|드리|드려|드렸|두|둬|뒀|놓|버리|버려|버렸)/.test(auxiliary)&&isPredicate(auxiliary);
    if(isPredicate(candidate)||joinedAuxiliary)return {suggestions:[candidate],reason:'Validated 높이다 inflection; 높히다 is nonstandard',ambiguous:false};
  }
  const shortenedGajida=word.match(/^갖(았|었|아|어)(.*)$/);
  if(shortenedGajida){
    const corrected=(['았','었'].includes(shortenedGajida[1])?'가졌':'가져')+shortenedGajida[2];
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'The shortened 갖다 stem cannot take a vowel-initial ending; restore 가지다 inflection',ambiguous:false};
  }
  if(word.startsWith('푹신축신')&&!personal.has('푹신축신')){
    const corrected='푹신푹신'+word.slice(4);
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Validated repeated 푹신푹신하다 adjective with corrected consonant',ambiguous:false};
  }
  if(word.startsWith('쨰려')&&!personal.has('쨰려보다')){
    const corrected='째려'+word.slice(2);
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Validated inflection of 째려보다 with corrected initial vowel',ambiguous:false};
  }
  if(/^맟[추춰췄]/.test(word)&&!personal.has('맟추다')){
    const corrected='맞'+word.slice(1);
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Validated 맞추다 inflection with restored stem consonant',ambiguous:false};
  }
  const causeTypo=word.match(/^(.*?)떄문(.*)$/);
  if(causeTypo){
    const [,host,tail]=causeTypo;
    if((!host||isKnownNoun(host)||personal.has(host))&&(!tail||sets.josa.has(tail)||isPredicate('이'+tail)))return {suggestions:[(host?host+' ':'')+'때문'+tail],reason:'Verified 때문에 spelling with the preceding nominal boundary',ambiguous:Boolean(host)};
  }
  if(word==='아무대나')return {suggestions:['아무 데나'],reason:'Place expression 아무 데나 uses dependent noun 데 and a separate determiner',ambiguous:true};
  if(word.endsWith('십시요')){
    const corrected=word.slice(0,-1)+'오';
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Formal imperative ending -십시오 on a validated predicate',ambiguous:false};
  }
  // A descriptive morphological analysis can accept a malformed copula or
  // quotation particle. Select its consonant-host form explicitly.
  if(!isKnownNoun(word))for(const [tail,replacement]of [['예요','이에요'],['라고','이라고'],['라는','이라는']]){
    if(!word.endsWith(tail))continue;
    if(tail!=='예요'&&isPredicate(word))continue;
    const base=word.slice(0,-tail.length);
    if(base&&(isKnownNoun(base)||personal.has(base))&&(base.charCodeAt(base.length-1)-0xac00)%28!==0)return {suggestions:[base+replacement],reason:'Consonant-final nominal takes 이에요 or the 이- form of the quotation particle',ambiguous:false};
  }
  // Correct a particle allomorph only after a known multi-syllable noun.
  // Whole lexical words and personally registered forms retain priority.
  if(!isKnownNoun(word))for(const [particle,replacement]of [['을','를'],['를','을'],['으로서','로서'],['으로써','로써'],['으로','로']]){
    if(!word.endsWith(particle))continue;
    const base=word.slice(0,-particle.length);
    if(base.length<2||!(isKnownNoun(base)||personal.has(base)))continue;
    const final=(base.charCodeAt(base.length-1)-0xac00)%28;
    if(particle==='을'&&final===0||particle==='를'&&final!==0||particle.startsWith('으로')&&[0,8].includes(final))return {suggestions:[base+replacement],reason:'Particle allomorph selected by the final consonant of a known noun',ambiguous:false};
  }
  // Subject/topic allomorphs depend on the noun's final consonant. Do not
  // reinterpret a whole lexical noun or valid predicate as noun + particle.
  if(!isKnownNoun(word)&&!isPredicate(word))for(const [particle,replacement,needsFinal]of [['은','는',false],['는','은',true],['이','가',false],['가','이',true]]){
    if(!word.endsWith(particle))continue;
    if(['이','가'].includes(particle)&&(!followingPredicate||word.endsWith('인가')&&isKnownNoun(word.slice(0,-2))))continue;
    const base=word.slice(0,-1);
    if(base.length<2||!(isKnownNoun(base)||personal.has(base)))continue;
    const hasFinal=(base.charCodeAt(base.length-1)-0xac00)%28!==0;
    if(hasFinal===needsFinal)return {suggestions:[base+replacement],reason:'Subject/topic particle allomorph follows the final consonant; retains the same grammatical role',ambiguous:['이','가'].includes(particle)};
  }
  // State predicates do not take present-action 는 in these quotations.
  // Leave verb/adjective homographs alone; morphology must accept the repair.
  const reportedState=word.match(/^(.+)는(다던데|대서)(요)?$/);
  if(reportedState){
    const [,root,ending,polite]=reportedState;
    const state=['있','없'].includes(root)||sets.adjective.has(root)&&!sets.verb.has(root);
    const corrected=root+ending+(polite??'');
    if(state&&isPredicate(corrected))return {suggestions:[corrected],reason:'State predicate quoted without present-action 는; confirm intended expression',ambiguous:true};
  }
  const copulaPast=word.match(/^(.+)이였(.+)$/);
  if(copulaPast){
    const [,base,ending]=copulaPast;
    // In 어린이였어요, 이 belongs to the noun 어린이, not the copula.
    const vowelHost=(base.charCodeAt(base.length-1)-0xac00)%28===0;
    // A verbal homograph can be only the prefix of an unknown 이-final noun.
    if(!isKnownNoun(base+'이')&&!personal.has(base+'이')&&(!vowelHost||!isPredicate(base))&&(isKnownNoun(base)||personal.has(base))&&isPredicate('이었'+ending)){
      const copula=vowelHost?'였':'이었';
      return {suggestions:[base+copula+ending],reason:'Past copula 이었- and its vowel-host contraction 였-',ambiguous:false};
    }
  }
  if(word.includes('꺼')&&!personal.has('꺼')){
    const dependentGe=part=>{
      if(!part.startsWith('꺼')||personal.has(part))return null;
      const tail=part.slice(1);
      return !tail||sets.josa.has(tail)||isPredicate('이'+tail)?'거'+tail:null;
    };
    const separate=precedingAdnominal&&dependentGe(word);
    if(separate)return {suggestions:[separate],reason:'Dependent 거 retains its spelling after an adnominal; distinguish the verb 끄다',ambiguous:true};
    for(let i=1;i<word.length;i++){
      const left=word.slice(0,i),right=dependentGe(word.slice(i));
      if(right&&(left.charCodeAt(left.length-1)-0xac00)%28===8&&isPredicate(left))return {suggestions:[left+' '+right],reason:'Dependent 거 after a prospective adnominal, with its word boundary',ambiguous:true};
    }
  }
  if(word.endsWith('더라구요')){
    const corrected=word.slice(0,-4)+'더라고요';
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Written ending -더라고요; colloquial pronunciation can be kept by the author',ambiguous:false};
  }
  // Standard -고요 keeps the polite ending. A noun followed by 요
  // (친구요 / 가구요) can share this surface and must remain unchanged.
  if(word.endsWith('구요')&&(!isKnownNoun(word.slice(0,-1))||precedingAdnominal&&word==='거구요')&&!personal.has(word.slice(0,-1))){
    const base=word.slice(0,-2),corrected=base+'고요';
    const nominal=base&&(base.charCodeAt(base.length-1)-0xac00)%28===0&&isKnownNoun(base)&&isPredicate('이고요');
    if(isPredicate(corrected)||nominal)return {suggestions:[corrected],reason:'Written ending -고요; the author may keep the colloquial pronunciation',ambiguous:true};
  }
  const approximate=word.match(/^세네(개|명|번|장|마리|권|시간|군데)?(.*)$/);
  if(approximate&&(!approximate[2]||approximate[1]&&sets.josa.has(approximate[2]))){
    const number=personal.has('세네')?'세네':'서너';
    return {suggestions:[number+(approximate[1]?' '+approximate[1]:'')+approximate[2]],reason:'Standard quantity 서너; retain dialect if personally registered',ambiguous:true};
  }
  const exact=new Map([['어짜피','어차피'],['웬지','왠지'],['꼼꼼이','꼼꼼히'],['뵈요','봬요'],['되요','돼요'],['구지','굳이'],['게의치','개의치']]);
  if(word==='않되요')return {suggestions:['안 돼요'],reason:'Negative adverb 안 and 되어/돼 contraction',ambiguous:false};
  if(exact.has(word))return {suggestions:[exact.get(word)],reason:'Verified lexical spelling; see source registry',ambiguous:false};
  if(word.endsWith('할려고')){
    // Remove the extra final ㄹ from 하, not from a genuine ㄹ stem.
    const corrected=word.slice(0,-3)+'하려고';
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'하 + 려고, without an extra ㄹ; see source registry',ambiguous:false};
  }
  const intention=word.match(/^(.+)(려고|려니|려면)(요)?$/);
  if(intention){
    const [,base,ending,polite]=intention;
    // Preserve lexical ㄹ stems (살다/알다/만들다). Only remove an
    // added adnominal ㄹ, then require the resulting whole inflection.
    if((base.charCodeAt(base.length-1)-0xac00)%28===8&&!isPredicate(base+'다')){
      const restored=base.slice(0,-1)+String.fromCharCode(base.charCodeAt(base.length-1)-8);
      const corrected=restored+ending+(polite??'');
      if(isPredicate(corrected))return {suggestions:[corrected],reason:'Attach -(으)려고/려니/려면 to the stem without an added adnominal ㄹ',ambiguous:false};
    }
  }
  for(const [bad,good]of [['바껴','바뀌어'],['바꼈','바뀌었'],['사겨','사귀어'],['사겼','사귀었'],['잠궈','잠가'],['잠궜','잠갔'],['담궈','담가'],['담궜','담갔'],['치뤄','치러'],['치뤘','치렀'],['덮히','덮이'],['덮힌','덮인'],['덮힐','덮일'],['덮혀','덮여'],['덮혔','덮였']])if(word.startsWith(bad)){
    const candidate=good+word.slice(bad.length);
    if(isPredicate(candidate))return {suggestions:[candidate],reason:'Verified stem and inflection; see source registry',ambiguous:false};
  }
  const awareness=word.match(/^깨닳([아았으].*)$/);
  if(awareness&&isPredicate('깨달'+awareness[1]))return {suggestions:['깨달'+awareness[1]],reason:'Verified irregular 깨닫다 vowel-initial inflection',ambiguous:false};
  // Polite 되어요 contracts to 돼요 after the whole 되다 predicate,
  // including a derived prefix. 안되다 also has a lexical reading.
  if(word.endsWith('되요')&&(isPredicate(word.slice(0,-1)+'어요')||isPredicate(word.slice(0,-2)+'돼요'))){
    const corrected=word.slice(0,-2)+'돼요';
    return {suggestions:word==='안되요'?[corrected,'안 돼요']:[corrected],reason:'되어요 contracts to 돼요; negative 안 spacing depends on meaning',ambiguous:word==='안되요'};
  }
  // -어서 contracts to -돼서, never -되서. Keep the stem boundary:
  // this is not a search-and-replace inside a noun or a longer identifier.
  if(word.endsWith('되서')&&isPredicate(word.slice(0,-1)+'어서')){
    const corrected=word.slice(0,-2)+'돼서';
    return {suggestions:word==='안되서'?['안 돼서',corrected]:[corrected],reason:'되어서 contracts to 돼서; 안되다 spacing depends on meaning',ambiguous:word==='안되서'};
  }
  const uncertain=word.match(/^(.+)(?:런지|른지)(요)?$/);
  if(uncertain&&uncertain[1].endsWith('야할')&&isPredicate(uncertain[1].slice(0,-1)))return {suggestions:[uncertain[1].slice(0,-1)+' 할는지'+(uncertain[2]??'')],reason:'Standard -ㄹ는지 plus the -야 하다 boundary; confirm intended meaning',ambiguous:true};
  if(uncertain&&(uncertain[1].charCodeAt(uncertain[1].length-1)-0xac00)%28===8&&isPredicate(uncertain[1]))return {suggestions:[uncertain[1]+'는지'+(uncertain[2]??'')],reason:'Standard ending -ㄹ는지 when this is a predicate; confirm intended word',ambiguous:true};
  // A bound stem correction must still have a grammatical ending; do not
  // replace these syllables inside a nickname or an unrelated noun.
  for(const [bad,good] of [['왠만','웬만'],['희안','희한'],['환골탈퇴','환골탈태']])if(word.startsWith(bad)){
    const tail=word.slice(bad.length);
    const haForms=new Set(['하다','하면','하고','하지','하니','하네요','합니다','한','할','해서','해도','해요','했다','했어요','했지만']);
    if(haForms.has(tail))return {suggestions:[good+tail],reason:'Verified bound stem spelling; see source registry',ambiguous:false};
  }
  if(word.startsWith('어의없')&&sets.ending.has(word.slice(3)))return {suggestions:['어이없'+word.slice(3)],reason:'Candidate for 어이없다; check intended meaning',ambiguous:true};
  if(word.startsWith('헤짚')&&!personal.has('헤짚')&&!personal.has('헤짚다')){
    const corrected='헤집'+word.slice(2);
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Validated inflection of the attested stem 헤집다; confirm intended word',ambiguous:true};
  }
  // Bounded malformed stems: validate each complete repair, and leave the
  // choice of lexical meaning to the author when two repairs are possible.
  for(const [bad,alternatives]of [['겹처',['겹쳐']],['싫어아',['싫어하']],['편한하',['편안하','편하']]]){
    if(!word.startsWith(bad)||personal.has(bad)||personal.has(bad+'다')||isKnownNoun(word)||isPredicate(word))continue;
    const suggestions=alternatives.map(good=>good+word.slice(bad.length)).filter(isPredicate);
    if(suggestions.length)return {suggestions,reason:'Possible spelling repair on a validated full predicate; confirm the intended meaning',ambiguous:true};
  }
  if(word==='어떻해')return {suggestions:['어떻게','어떡해'],reason:'어떻게 modifies a predicate; 어떡해 means 어떻게 해',ambiguous:true};
  if(word.startsWith('되물림')){
    const tail=word.slice(3);
    if(!tail||sets.josa.has(tail)||(tail.startsWith('되')&&sets.ending.has(tail.slice(1))))return {suggestions:['대물림'+tail],reason:'대물림 means handing down; confirm the intended meaning',ambiguous:true};
  }
  const lexicalRepair=lexicalNounRepair(word,sets,personal,isPredicate);
  if(lexicalRepair)return lexicalRepair;
  for(const [bad,good]of [['부딛히','부딪히'],['부딛혀','부딪혀']])if(word.startsWith(bad)){
    const tail=word.slice(bad.length);
    if((!tail||sets.ending.has(tail))&&!personal.has(bad)&&!personal.has('부딛히다'))return {suggestions:[good+tail],reason:'Verified stem spelling; passive versus active meaning remains for the author to review',ambiguous:false};
  }
  // These -이 adverbs are explicitly attested in the official norm examples.
  const iAdverbs=['곰곰','일일','깨끗','번번','겹겹','틈틈','따뜻','반듯','산뜻','의젓','버젓'];
  if(iAdverbs.some(root=>word===root+'히'))return {suggestions:[word.slice(0,-1)+'이'],reason:'Orthography 51: attested -이 form',ambiguous:false};
  // 되 + 었 is 되었/됐; do not rewrite correct 되다/되고/되면.
  if(word.includes('됬')){
    const corrected=word.replace('됬','됐');
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Orthography 35: 되었/됐 contraction on a validated predicate',ambiguous:false};
  }
  if(word.startsWith('됬')&&sets.ending.has(word.slice(1)))return {suggestions:['됐'+word.slice(1)],reason:'Orthography 35: 되어/돼 contraction',ambiguous:false};
  return null;
}

// Shared noun-only repair path: prefix composition must not invoke arbitrary
// predicate or particle replacements on an unrelated interior fragment.
export function lexicalNounRepair(word,sets,personal,isPredicate){
  if(personal.has(word))return null;
  const lexical=[['맞춥법','맞춤법'],['전세집','전셋집'],['몇일','며칠'],['설겆이','설거지'],['오랫만','오랜만'],['오랬동안','오랫동안'],['역활','역할'],['뒤치닥거리','뒤치다꺼리'],['환골탈퇴','환골탈태'],['메세지','메시지'],['제테크','재테크'],['헤택','혜택'],['데스크탑','데스크톱'],['라이센스','라이선스'],['런닝','러닝'],['머리속','머릿속'],['스크레치','스크래치'],['판넬','패널'],['컨텐츠','콘텐츠'],['엑세스','액세스'],['워크플로우','워크플로'],['마이그레션','마이그레이션'],['테트스','테스트'],['스폰지','스펀지'],['뒷통수','뒤통수'],['마찮가지','마찬가지'],['깨닳음','깨달음'],['플라스탁','플라스틱'],['셋팅','세팅'],['렌트카','렌터카']];
  for(const [bad,good] of lexical)if(word.startsWith(bad)){
    const tail=word.slice(bad.length);
    // Compose the verified noun repair with a complete derived predicate.
    // In 되서, validate the uncontracted ending before proposing 돼서.
    if(!personal.has(bad)&&tail&&/^(?:하|해|했|되|돼|된|될|됩)/.test(tail)){
      const correctedTail=tail==='되서'&&isPredicate(good+'되어서')?'돼서':tail;
      if(isPredicate(good+correctedTail))return {suggestions:[good+correctedTail],reason:'Verified lexical spelling and complete derived predicate',ambiguous:false};
    }
    const copula=/^(이|인|일|임|입)/.test(tail)&&isPredicate(tail);
    const pluralTail=tail.startsWith('들')?tail.slice(1):null;
    const plural=pluralTail!==null&&(!pluralTail||sets.josa.has(pluralTail)||/^(이|인|일|임|입)/.test(pluralTail)&&isPredicate(pluralTail));
    if(!personal.has(bad)&&tail.startsWith('같')&&isPredicate(tail))return {suggestions:[good+' '+tail],reason:'Verified lexical spelling and the boundary before comparison predicate 같다',ambiguous:true};
    if((!tail||sets.josa.has(tail)||copula||plural)&&!personal.has(bad))return {suggestions:[good+tail],reason:'Verified lexical spelling; see source registry',ambiguous:false};
  }
  return null;
}
