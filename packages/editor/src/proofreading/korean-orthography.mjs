// Original, bounded rules. Morphological acceptance is not spelling correctness.
// Sources and limits: docs/planning/spelling-orthography-sources.md.
export function orthography(word,sets,personal) {
  if(personal.has(word))return null;
  const lexical=[['몇일','며칠'],['설겆이','설거지'],['오랫만','오랜만']];
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
