// Original, bounded rules. Morphological acceptance is not spelling correctness.
// Sources and limits: docs/planning/spelling-orthography-sources.md.
export function orthography(word,sets,personal) {
  if(personal.has(word))return null;
  const exact=new Map([['웬지','왠지'],['꼼꼼이','꼼꼼히'],['뵈요','봬요'],['되요','돼요'],['구지','굳이']]);
  if(word==='않되요')return {suggestions:['안 돼요'],reason:'Negative adverb 안 and 되어/돼 contraction',ambiguous:false};
  if(exact.has(word))return {suggestions:[exact.get(word)],reason:'Verified lexical spelling; see source registry',ambiguous:false};
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
  const lexical=[['몇일','며칠'],['설겆이','설거지'],['오랫만','오랜만'],['역활','역할'],['뒤치닥거리','뒤치다꺼리'],['환골탈퇴','환골탈태']];
  for(const [bad,good] of lexical)if(word.startsWith(bad)){
    const tail=word.slice(bad.length);
    if(!tail||sets.josa.has(tail))return {suggestions:[good+tail],reason:'Verified lexical spelling; see source registry',ambiguous:false};
  }
  // These -이 adverbs are explicitly attested in the official norm examples.
  const iAdverbs=['곰곰','일일','깨끗','번번','겹겹','틈틈','따뜻','반듯','산뜻','의젓','버젓'];
  if(iAdverbs.some(root=>word===root+'히'))return {suggestions:[word.slice(0,-1)+'이'],reason:'Orthography 51: attested -이 form',ambiguous:false};
  // 되 + 었 is 되었/됐; do not rewrite correct 되다/되고/되면.
  if(word.startsWith('됬')&&sets.ending.has(word.slice(1)))return {suggestions:['됐'+word.slice(1)],reason:'Orthography 35: 되어/돼 contraction',ambiguous:false};
  return null;
}
