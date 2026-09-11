// Original, bounded rules. Morphological acceptance is not spelling correctness.
// Sources and limits: docs/planning/spelling-orthography-sources.md.
export function orthography(word,sets,personal,isPredicate,isKnownNoun=w=>sets.noun.has(w)) {
  if(personal.has(word))return null;
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
    if(!isKnownNoun(base+'이')&&(base.charCodeAt(base.length-1)-0xac00)%28!==0&&isKnownNoun(base)&&isPredicate('이었'+ending))return {suggestions:[base+'이었'+ending],reason:'Consonant-final noun followed by past copula 이었-',ambiguous:false};
  }
  if(word.endsWith('더라구요')){
    const corrected=word.slice(0,-4)+'더라고요';
    if(isPredicate(corrected))return {suggestions:[corrected],reason:'Written ending -더라고요; colloquial pronunciation can be kept by the author',ambiguous:false};
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
  for(const [bad,good]of [['바껴','바뀌어'],['바꼈','바뀌었'],['사겨','사귀어'],['사겼','사귀었'],['잠궈','잠가'],['잠궜','잠갔'],['담궈','담가'],['담궜','담갔']])if(word.startsWith(bad)){
    const candidate=good+word.slice(bad.length);
    if(isPredicate(candidate))return {suggestions:[candidate],reason:'Verified vowel-stem inflection; see source registry',ambiguous:false};
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
  if(word==='어떻해')return {suggestions:['어떻게','어떡해'],reason:'어떻게 modifies a predicate; 어떡해 means 어떻게 해',ambiguous:true};
  if(word.startsWith('되물림')){
    const tail=word.slice(3);
    if(!tail||sets.josa.has(tail)||(tail.startsWith('되')&&sets.ending.has(tail.slice(1))))return {suggestions:['대물림'+tail],reason:'대물림 means handing down; confirm the intended meaning',ambiguous:true};
  }
  const lexical=[['몇일','며칠'],['설겆이','설거지'],['오랫만','오랜만'],['역활','역할'],['뒤치닥거리','뒤치다꺼리'],['환골탈퇴','환골탈태'],['메세지','메시지'],['제테크','재테크'],['헤택','혜택']];
  for(const [bad,good] of lexical)if(word.startsWith(bad)){
    const tail=word.slice(bad.length);
    if((!tail||sets.josa.has(tail))&&!personal.has(bad))return {suggestions:[good+tail],reason:'Verified lexical spelling; see source registry',ambiguous:false};
  }
  for(const [bad,good]of [['부딛히','부딪히'],['부딛혀','부딪혀']])if(word.startsWith(bad)){
    const tail=word.slice(bad.length);
    if((!tail||sets.ending.has(tail))&&!personal.has(bad)&&!personal.has('부딛히다'))return {suggestions:[good+tail],reason:'Verified stem spelling; passive versus active meaning remains for the author to review',ambiguous:false};
  }
  // These -이 adverbs are explicitly attested in the official norm examples.
  const iAdverbs=['곰곰','일일','깨끗','번번','겹겹','틈틈','따뜻','반듯','산뜻','의젓','버젓'];
  if(iAdverbs.some(root=>word===root+'히'))return {suggestions:[word.slice(0,-1)+'이'],reason:'Orthography 51: attested -이 form',ambiguous:false};
  // 되 + 었 is 되었/됐; do not rewrite correct 되다/되고/되면.
  if(word.startsWith('됬')&&sets.ending.has(word.slice(1)))return {suggestions:['됐'+word.slice(1)],reason:'Orthography 35: 되어/돼 contraction',ambiguous:false};
  return null;
}
