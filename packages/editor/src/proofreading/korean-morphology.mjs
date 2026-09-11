// Original MIT morphology prototype. Lexical data is supplied, never downloaded.
export function createMorphology(sets,data) {
  // Authored lexical additions for productive action/state-change uses.
  // Do not infer 化 from every noun ending in 화 (e.g. flower names).
  const actionNouns=new Set([...(data?.actionNouns??[]),'시각화','자동화']);
  const doedaNouns=new Set([...actionNouns,...(data?.stateChangeNouns??[])]);
  // 말하다 is absent from the supplied stem subset. Treat it as a verb;
  // unrestricted one-syllable noun + 하 would also invent 나하다.
  // Independently verified lexical stem missing from the selected subset.
  // XR roots are not all licensed to combine with 하다.
  const roots=new Set([...sets.verb,...sets.adjective,'말하','구하','그러','유의미하','만하','고민되']);
  // Some lexical stems occur only in the supplied inflection records.
  // Recover the regular -내 family from two matching analyses, rather than
  // treating every supplied surface or arbitrary X+내 as a verb stem.
  const naeConnectives=new Set((data?.forms??[]).filter(([s,e,r])=>r.endsWith('내')&&s===r&&e==='EC').map(([, ,r])=>r));
  for(const [s,e,r]of data?.forms??[])if(e==='ETM'&&naeConnectives.has(r)&&s===r.slice(0,-1)+'낸')roots.add(r);
  // Attested suffix uses, not every noun + 드리다 (불편 드리다 differs).
  // Expand the stems so honorific, past and connective forms share the rules.
  for(const base of ['감사','질문','부탁','말씀','문의','연락','송부','추천'])roots.add(base+'드리');
  const final=s=>(s.charCodeAt(s.length-1)-0xac00)%28;
  const withFinal=(s,n)=>s.slice(0,-1)+String.fromCharCode(s.charCodeAt(s.length-1)-final(s)+n);
  const forms=new Map();
  const nominalForms=new Set();
  const connectiveForms=new Set();
  const prefixes=new Map();
  const sDeletionPrefixes=new Set();
  const consonantEndings=['니다','니까','시다'];
  // Expand only lexical -롭 stems with an attested -로운 allomorph.
  // A noun followed by arbitrary 롭 is not evidence for a new adjective.
  const roubRoots=new Set((data?.forms??[]).filter(([s,e,r])=>
    r.endsWith('롭')&&e==='ETM'&&s===r.slice(0,-1)+'로운').map(([, ,r])=>r));
  const roubPrefixes=new Set();
  function add(surface,root,adnominal=false){if(surface&&!forms.has(surface))forms.set(surface,{root,adnominal});}
  function expand(root) {
    const roub=roubRoots.has(root),vowelAllomorph=roub?root.slice(0,-1)+'로우':null;
    // Regular stem + endings, including a syllable-final adnominal consonant.
    prefixes.set(root,root);
    if(final(root)===8)nominalForms.add(withFinal(root,10));
    if(final(root)===0||final(root)===8){
      const vowelStem=final(root)===8?withFinal(root,0):root;
      for(const tail of consonantEndings)add(withFinal(vowelStem,17)+tail,root);
      for(const tail of ['게','게요','까','까요'])add(withFinal(vowelStem,8)+tail,root);
    }
    if(final(root)===0){add(withFinal(root,4),root,true);add(withFinal(root,8),root,true);}
    else if(final(root)===8){add(withFinal(root,4),root,true);add(root,root,true);}
    add((final(root)===8?withFinal(root,0):root)+'는',root,true);
    // -(으)ㄴ/-(으)ㄹ select an allomorph by the stem's final consonant.
    // Unconditional concatenation invented 가은, 만들을 and 만들는.
    if(roub){
      prefixes.set(vowelAllomorph,root);
      roubPrefixes.add(vowelAllomorph);
      add(withFinal(vowelAllomorph,4),root,true);
      add(withFinal(vowelAllomorph,8),root,true);
      nominalForms.add(withFinal(vowelAllomorph,16));
      add(withFinal(vowelAllomorph,16),root);
    }else if(final(root)!==0&&final(root)!==8){add(root+'은',root,true);add(root+'을',root,true);}
    // Honorific -시-, followed by ordinary endings.
    const honor=roub?vowelAllomorph+'시':final(root)===0?root+'시':final(root)===8?withFinal(root,0)+'시':root+'으시';
    add(withFinal(honor,4),root,true);add(honor+'는',root,true);
    prefixes.set(honor,root);
    for(const tail of consonantEndings)add(withFinal(honor,17)+tail,root);
    // Rules 34/35: vowel contraction and past tense. Do not invent irregular roots.
    let contracted;
    if(roub)contracted=root.slice(0,-1)+'로워';
    else if(root.endsWith('하'))contracted=root.slice(0,-1)+'해';
    // Verified ㅡ deletion. Keep this bounded: 르 and other irregular
    // stems cannot be expanded by blindly dropping every final ㅡ.
    else if(root==='잠그')contracted='잠가';
    else if(root==='담그')contracted='담가';
    else if(final(root)===0){
      const vowel=Math.floor((root.charCodeAt(root.length-1)-0xac00)%588/28);
      const map=new Map([[0,0],[4,4],[1,1],[5,5],[8,9],[13,14],[20,6],[11,10]]);
      if(map.has(vowel))contracted=root.slice(0,-1)+String.fromCharCode(root.charCodeAt(root.length-1)+(map.get(vowel)-vowel)*28);
    }
    if(!contracted){
      const lastVowel=Math.floor((root.charCodeAt(root.length-1)-0xac00)%588/28);
      if(final(root)!==0)contracted=root+([0,8].includes(lastVowel)?'아':'어');
    }
    if(contracted){
      connectiveForms.add(contracted);
      add(contracted,root);
      for(const tail of ['요','서','도','야','야만','야지','줘','주세요'])add(contracted+tail,root);
      const past=withFinal(contracted,20);
      prefixes.set(past,root);
      add(past+'어요',root);add(past+'습니다',root);
    }
    // Retain the uncontracted forms as well: 되어/되었, 보아/보았,
    // 주어/주었, 이어/이었 and 하여/하였. Contraction is not mandatory.
    const vowel=Math.floor((root.charCodeAt(root.length-1)-0xac00)%588/28);
    const full=root.endsWith('하')?root+'여':final(root)===0&&[8,13,16,20,11].includes(vowel)?root+(vowel===8?'아':'어'):null;
    if(full){
      connectiveForms.add(full);
      add(full,root);
      for(const tail of ['요','서','도','야','야만','야지'])add(full+tail,root);
      prefixes.set(withFinal(full,20),root);
    }
  }
  for(const root of roots)expand(root);
  for(const [surface,ending,root] of data?.forms??[]){
    if(ending==='ETN')nominalForms.add(surface);
    // The supplied analysis attests a lost ㅅ, e.g. 낫 -> 나. Such
    // allomorphs retain -으- even though the written surface has no batchim.
    if(final(root)===19&&withFinal(root,0)===surface)sDeletionPrefixes.add(surface);
    if(ending==='EP')prefixes.set(surface,root);
    else if(['EC','EF','ETM','ETN'].includes(ending)){
      const p=forms.get(surface);
      if(!p||ending==='ETM')forms.set(surface,{root,adnominal:ending==='ETM'});
    }
  }
  function indexLengths(words) {
    const index=new Map();
    for(const word of words){
      const lengths=index.get(word[0])??new Set();
      lengths.add(word.length);index.set(word[0],lengths);
    }
    return new Map([...index].map(([first,lengths])=>[first,[...lengths].sort((a,b)=>a-b)]));
  }
  // Exact lookup indexes: omit only lengths absent from the same inventories.
  // Sorted lengths preserve the previous first successful analysis.
  const prefixLengths=indexLengths(prefixes.keys());
  const nominalLengths=indexLengths([...sets.noun,...doedaNouns]);
  const adverbs=new Set([...sets.adverb,...(data?.adverbs??[])]);
  const recognizedNouns=new Set(data?.recognizedNouns??[]);
  const recognitionParticles=[...sets.josa];
  const isRecognizedNoun=s=>recognizedNouns.has(s)||recognitionParticles.some(p=>s.endsWith(p)&&recognizedNouns.has(s.slice(0,-p.length)));
  const derivedNominal=s=>/[적용]$/.test(s)&&s.length>2&&(sets.noun.has(s.slice(0,-1))||recognizedNouns.has(s.slice(0,-1)));
  const knownNominal=s=>sets.noun.has(s)||recognizedNouns.has(s)||derivedNominal(s);
  function isEnding(s){
    if(['잖아','잖아요','잖니'].includes(s))return true;
    // Sentence-final 요 can follow these endings; do not make every ending
    // freely combinable with 요 (e.g. an adnominal form or -다).
    if(/(?:는데|은데|던데|거든|지|고|서)요$/.test(s))s=s.slice(0,-1);
    if(sets.ending.has(s))return true;
    // The surface inventory includes spoken fragments such as 있 and 싶.
    // They are not freely attachable pre-endings (이 + 있 + 으면 is invalid).
    for(let i=1;i<s.length;i++)if(/^(시|으시|았|었|였|겠|더)$/.test(s.slice(0,i))&&sets.ending.has(s.slice(i)))return true;
    return false;
  }
  function connects(prefix,ending){
    // -로우- precedes the vowel-selecting endings, not e.g. *흥미로우다.
    if(roubPrefixes.has(prefix)&&! /^(니|면|며|므로|시)/.test(ending))return false;
    const batchim=final(prefix);
    // Longer endings can include irregular allomorphs (나을까요 from 낫다).
    // Do not reject them merely by the first syllable of the surface ending.
    if((batchim===0||batchim===8)&&!sDeletionPrefixes.has(prefix)&&/^(은$|을$|으)/.test(ending))return false;
    if(batchim===8&&/^(는|니|시)/.test(ending))return false;
    return isEnding(ending);
  }
  // Noun + 하다 is checked lazily; do not materialize millions of combinations.
  function predicate(s) {
    // Quoted -다고 하던데 / -다고 하여서 contract without a word boundary.
    // Validate the declarative base; bare present verbs require ㄴ/는다.
    const reported=s.match(/^(.+)(?:다던데|대서)(?:요)?$/);
    if(reported){
      const stem=reported[1],quoted=predicate(stem+'다');
      if(quoted){
        const state=sets.adjective.has(quoted.root)||['있','없'].includes(quoted.root);
        const tense=final(stem)===20||stem.endsWith('겠');
        const present=state
          ? stem===quoted.root||stem.endsWith('시')&&prefixes.get(stem)===quoted.root
          : final(stem)===4;
        if(tense||present)return {...quoted,adnominal:false};
      }
    }
    if(s.endsWith('다는')){
      const quoted=predicate(s.slice(0,-1));
      if(quoted)return {...quoted,adnominal:true};
    }
    if(forms.has(s))return forms.get(s);
    if(s.endsWith('더라고요')){
      const recalled=predicate(s.slice(0,-2));
      if(recalled)return {...recalled,adnominal:false};
    }
    if(/(?:고|서|가|나)요$/.test(s)){
      const plain=predicate(s.slice(0,-1));
      if(plain)return {...plain,adnominal:false};
    }
    // -(으)ㄴ가 after an attested adnominal form, including honorific -신가.
    if(s.endsWith('가')){
      const base=s.slice(0,-1),p=forms.get(base);
      if(p?.adnominal&&final(base)===4)return {...p,adnominal:false};
    }
    const uncertain=s.match(/^(.+)는지(?:요)?$/);
    if(uncertain&&final(uncertain[1])===8&&forms.get(uncertain[1])?.adnominal)return {root:forms.get(uncertain[1]).root,adnominal:false};
    for(const i of prefixLengths.get(s[0])??[])if(i>0&&i<s.length&&prefixes.has(s.slice(0,i))&&connects(s.slice(0,i),s.slice(i)))return {root:prefixes.get(s.slice(0,i)),adnominal:/^(는|은|던|을)$/.test(s.slice(i))};
    // -아/어지다 remains one written unit, including noun-derived 해지다.
    // Validate both predicates; a coincidental 지 inside a noun is insufficient.
    for(let i=1;i<s.length;i++){
      if(!'지져졌질진집'.includes(s[i]))continue;
      const left=s.slice(0,i),right=s.slice(i);
      const connective=connectiveForms.has(left)||/[아어해]$/.test(left)||final(left)===0&&[6,9,14,10].includes(Math.floor((left.charCodeAt(left.length-1)-0xac00)%588/28));
      if(!connective)continue;
      const main=predicate(left),aux=predicate(right);
      if(main&&aux?.root==='지')return {root:left+'지',adnominal:aux.adnominal};
    }
    for(const i of nominalLengths.get(s[0])??[]) {
      if(i<2||i>=s.length)continue;
      if(!sets.noun.has(s.slice(0,i))&&!doedaNouns.has(s.slice(0,i)))continue;
      const suffix=s.slice(i);
      let tail=forms.get(suffix);
      if(!tail)for(let j=1;j<suffix.length;j++)if(['하','되'].includes(prefixes.get(suffix.slice(0,j)))&&connects(suffix.slice(0,j),suffix.slice(j)))tail={root:prefixes.get(suffix.slice(0,j)),adnominal:/^(는|은|던|을)$/.test(suffix.slice(j))};
      if(tail&&(tail.root==='하'&&(sets.noun.has(s.slice(0,i))||actionNouns.has(s.slice(0,i)))||tail.root==='되'&&suffix!=='되'&&doedaNouns.has(s.slice(0,i))))return {root:s.slice(0,i)+tail.root,adnominal:tail.adnominal};
    }
    return null;
  }
  const contractedDemonstrative=s=>/^(?:이|그|저|요|새)걸로(?:는|도|만)?$/.test(s)||/^뭘로(?:는|도|만)?$/.test(s);
  // Productive -기 is nominal even when absent from the surface dictionary.
  // Validate its full inflection before allowing a following particle.
  const isNominalForm=s=>nominalForms.has(s)||s.endsWith('기')&&Boolean(predicate(s));
  function noun(s,personal) {
    // Contractions of 것 + copula remain valid after inserting their space.
    // Otherwise the checker flags the very 건데/거예요 it just proposed.
    if(['건데','건가요','거예요','거였어요'].includes(s))return {base:'것',unknown:false};
    if(isNominalForm(s))return {base:s,unknown:false,nominal:true};
    for(let i=1;i<s.length;i++)if(sets.josa.has(s.slice(i))&&isNominalForm(s.slice(0,i)))return {base:s.slice(0,i),unknown:false,nominal:true};
    // Rule 33: demonstrative + 것으로 can contract to 걸로, without
    // becoming a misspelling of a similar-looking dictionary word.
    if(contractedDemonstrative(s))return {base:s,unknown:false};
    if(personal.has(s)||sets.noun.has(s))return {base:s,unknown:false};
    // The supplied inventory has 으로도/으로서도 but misses their 로 forms.
    // Recover only an attested particle's vowel/ㄹ allomorph on a known noun.
    for(let i=1;i<s.length;i++){
      const base=s.slice(0,i),tail=s.slice(i);
      if([0,8].includes(final(base))&&tail.startsWith('로')&&sets.josa.has('으'+tail)&&(knownNominal(base)||personal.has(base)))return {base,unknown:false};
    }
    // 서 is the contracted 에서 after a vowel-final nominal. Reuse the
    // existing compound-particle inventory for 서부터/서부터는/서까지도.
    for(let i=1;i<s.length;i++){
      const base=s.slice(0,i),tail=s.slice(i);
      if(final(base)===0&&tail.startsWith('서')&&sets.josa.has('에'+tail)&&(knownNominal(base)||personal.has(base)))return {base,unknown:false};
    }
    if(derivedNominal(s))return {base:s,unknown:false};
    for(let i=3;i<s.length;i++)if(derivedNominal(s.slice(0,i))&&sets.josa.has(s.slice(i)))return {base:s.slice(0,i),unknown:false};
    for(let i=1;i<s.length;i++)if(s.slice(i).startsWith('들')&&(!s.slice(i+1)||sets.josa.has(s.slice(i+1)))&&(sets.noun.has(s.slice(0,i))||personal.has(s.slice(0,i))))return {base:s.slice(0,i),unknown:false};
    // Longest particle first, to avoid treating a piece of the particle as a noun.
    for(let i=1;i<s.length;i++)if(sets.josa.has(s.slice(i))&&(personal.has(s.slice(0,i))||sets.noun.has(s.slice(0,i))))return {base:s.slice(0,i),unknown:false};
    for(const tail of ['입니다','입니까','이었다','이었어요','이에요','예요'])if(s.endsWith(tail)){
      const base=s.slice(0,-tail.length);if(sets.noun.has(base)||personal.has(base))return {base,unknown:false};
    }
    // Reuse attested copula inflections instead of splitting a noun from
    // 인/인데요/이었던. Extended nouns remain recognition-only here.
    for(let i=1;i<s.length;i++){
      const base=s.slice(0,i),tail=s.slice(i);
      // Vowel-final noun + 이- can lose 이 before ㄴ데/ㄴ가/ㄴ지.
      // Restore the noun and copula independently, not an arbitrary final ㄴ.
      if(final(base)===4&&/^(데|가|지)/.test(tail)){
        const restored=withFinal(base,0);
        if((knownNominal(restored)||personal.has(restored))&&predicate('인'+tail)?.root==='이')return {base:restored,unknown:false,copula:true};
      }
      if(final(base)===0&&(knownNominal(base)||personal.has(base))){
        const restored=tail.startsWith('여')?'이어'+tail.slice(1):tail.startsWith('였')?'이었'+tail.slice(1):/^(라|다|지|네)/.test(tail)?'이'+tail:null;
        if(restored&&predicate(restored)?.root==='이')return {base,unknown:false,copula:true};
      }
      if(!/^(이|인|일|임|입)/.test(tail))continue;
      const copula=predicate(tail)?.root==='이'||['이긴','이기도','이기는','이기만'].includes(tail);
      if(copula){
        if(knownNominal(base)||personal.has(base))return {base,unknown:false,copula:true};
        // A particle can precede the copula: 언제+부터+인가, 여기+까지+입니다.
        // Require a known host and an attested particle, not arbitrary text.
        // Single-syllable fragments also occur inside misspellings/names
        // (연애인이, 제미나이); they cannot establish this extra boundary.
        for(let j=1;j<base.length-1;j++)if(sets.josa.has(base.slice(j))&&(knownNominal(base.slice(0,j))||personal.has(base.slice(0,j))))return {base:base.slice(0,j),unknown:false};
      }
    }
    return null;
  }
  function unknownNoun(s) {
    // The upstream list mixes colloquial endings with particles. Unknown nouns
    // only license these explicit particle forms, never endings such as -요.
    const particles=new Set(['에서','에게','으로','부터','까지','처럼','보다','께서','은','는','이','가','을','를','에','의','로','도','만']);
    for(let i=2;i<s.length;i++)if(i<=6&&particles.has(s.slice(i)))return {base:s.slice(0,i),unknown:true};
    return null;
  }
  function analyze(s,personal,unknown=false) {
    const n=noun(s,personal);if(n)return {...n,kind:'noun',cost:.8};
    const p=predicate(s);if(p)return {...p,kind:'predicate',cost:.8};
    if(adverbs.has(s))return {kind:'adverb',cost:1};
    const emphasized=s.match(/^(.+)(도|만|은|는)$/);
    if(emphasized&&adverbs.has(emphasized[1])&&(!['은','는'].includes(emphasized[2])||emphasized[2]===(final(emphasized[1])===0?'는':'은')))return {kind:'adverb',cost:1};
    // Preserve a permitted auxiliary spelling; do not recommend optional spaces.
    for(let i=1;i<=2&&i<s.length;i++){
      const left=s.slice(0,i),p=predicate(left),aux=predicate(s.slice(i));
      // -(으)ㄹ 만하다 permits attachment after a short main predicate.
      // Noun + comparison particle 만 is a different construction.
      if(p?.adnominal&&final(left)===8&&aux?.root==='만하')return {kind:'predicate',cost:.8,root:p.root};
      const contractedVowel=final(left)===0&&[6,9,14,10].includes(Math.floor((left.charCodeAt(left.length-1)-0xac00)%588/28));
      if(p&&(connectiveForms.has(left)||/[아어해]$/.test(left)||contractedVowel)&&aux&&['주','보','드리'].includes(aux.root))return {kind:'predicate',cost:.8,root:p.root};
    }
    const u=unknown&&unknownNoun(s);return u?{...u,kind:'noun',cost:2.5}:null;
  }
  function dependent(s,contractions=true) {
    if(contractedDemonstrative(s))return null;
    // A complete dictionary word can happen to end in 수/때/걸.
    // Do not split 필수 or 이걸 merely because the prefix looks inflected.
    if(sets.noun.has(s)||recognizedNouns.has(s))return null;
    // 중 follows an activity/group noun, including particles and the copula.
    // A complete lexical noun such as 그중/도중 retains its boundary.
    if(s.includes('중')&&!isRecognizedNoun(s)&&!noun(s,new Set()))for(let i=1;i<s.length;i++){
      const left=s.slice(0,i),right=s.slice(i);
      if(!right.startsWith('중'))continue;
      const host=noun(left,new Set()),tail=noun(right,new Set());
      if((host||knownNominal(left))&&tail?.base==='중')return {text:left+' '+right,ambiguous:true,rule:'42'};
    }
    // A nominalized predicate followed by 전 is a phrase, even though 전에
    // can also be analyzed as an adverb. Keep this grammatical boundary.
    for(let i=2;i<s.length;i++){
      const left=s.slice(0,i),right=s.slice(i);
      if(left.endsWith('기')&&isNominalForm(left)&&right.startsWith('전')&&(!right.slice(1)||sets.josa.has(right.slice(1))))return {text:left+' '+right,ambiguous:false,rule:'2'};
    }
    // Keep a dependent noun and its particles together after an adnominal.
    // Do not run edit-distance repair on 할때도 before finding 할 + 때도.
    for(let i=1;i<s.length;i++){
      const left=s.slice(0,i),right=s.slice(i);
      for(const dep of ['때','분','곳']){
        if(!right.startsWith(dep))continue;
        const tail=right.slice(dep.length);
        if(tail&&!sets.josa.has(tail)&&!(dep==='분'&&tail.startsWith('들')&&(!tail.slice(1)||sets.josa.has(tail.slice(1)))))continue;
        // 이때 + 는 is an existing noun with a particle, not 이 + 때는.
        const wholeNoun=tail?s.slice(0,-tail.length):s;
        if(sets.noun.has(wholeNoun)||recognizedNouns.has(wholeNoun))continue;
        if(predicate(left)?.adnominal)return {text:left+' '+right,ambiguous:false,rule:'42'};
      }
    }
    // Surface -걸 is also an ending. Return a review candidate, not a certainty.
    for(const dep of ['건데','건가요','거예요','거였어요','것인데','것입니다','것을','것이','것은','걸로','걸로는','걸로도','일이','일을','일은','적이','적을','적은','것','걸','거','게','건','수','때','뿐','적']) {
      if(!s.endsWith(dep))continue;
      const left=s.slice(0,-dep.length),p=predicate(left);
      // 게/건 also occur in verb endings; 이게 is a demonstrative contraction.
      // The descriptive inventory also accepts 하는게/가능한거. A present
      // or completed adnominal still requires the dependent-noun boundary.
      // Keep prospective -ㄹ게 (진행할게) distinct from this construction.
      const contractedNoun=p?.adnominal&&(left.endsWith('는')||final(left)===4);
      if(['거','게','건'].includes(dep)&&(!contractions||left.length<2||predicate(s)&&!contractedNoun))continue;
      if(p?.adnominal)return {text:left+' '+dep,ambiguous:dep==='걸'||dep.startsWith('적'),rule:'42'};
    }
    return null;
  }
  // The descriptive verb inventory joins 잘 + 알려지다. Confirm the tail
  // with the inflector instead of splitting every verb beginning with 잘.
  function knownAdverbBoundary(word,personal) {
    if(personal.has(word)||!word.startsWith('잘알려'))return null;
    // Productive -어지다 analysis can retain the underlying 알리 root.
    return ['알려지','알리'].includes(predicate(word.slice(1))?.root)?{text:'잘 '+word.slice(1),ambiguous:false,rule:'2'}:null;
  }
  function spacing(word,personal) {
    if(personal.has(word))return null;
    const adverbBoundary=knownAdverbBoundary(word,personal);
    if(adverbBoundary)return adverbBoundary;
    // Descriptive adverb inventories also contain these joined phrases.
    // Keep the boundary explicit instead of splitting every adverb compound.
    const together=word.match(/^다(같이|함께)(도|만|는)?$/);
    if(together)return {text:'다 '+together[1]+(together[2]??''),ambiguous:true,rule:'2'};
    const quantity=word.match(/^(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)(개|장|번|군데|달|시간)(.*)$/);
    if(quantity&&['달','시간'].includes(quantity[2])){
      const relative=quantity[3].match(/^(전|후)(.*)$/);
      if(relative&&(!relative[2]||sets.josa.has(relative[2])))return {text:quantity[1]+' '+quantity[2]+' '+quantity[3],ambiguous:true,rule:'43'};
    }
    if(quantity&&(!quantity[3]||sets.josa.has(quantity[3])||quantity[3]==='더')){
      // 한 번 vs 한번 and 세 시 vs 세시 need contextual interpretation.
      if(quantity[2]!=='번'||quantity[3]==='더')return {text:quantity[1]+' '+quantity[2]+(quantity[3]==='더'?' 더':quantity[3]),ambiguous:true,rule:'43'};
    }
    const d=dependent(word);if(d)return d;
    // A descriptive inventory may contain a joined -야 하다 surface.
    // Apply its grammatical boundary before accepting that whole form.
    for(let i=2;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i);
      if(left.endsWith('야')&&(predicate(left)||analyze(left,personal)?.kind==='predicate')&&predicate(right)?.root==='하')return {text:left+' '+right,ambiguous:true,rule:'47'};
    }
    if(analyze(word,personal))return null;
    // Apply explicit quantity/dependent-noun checks first: dictionary nouns
    // can be homographs of phrases. Only then protect a whole noun + particle
    // from speculative segmentation (독거미는 must not become 독거 미는).
    if(isRecognizedNoun(word))return null;
    // The descriptive noun inventory includes the determiner 무슨. Its
    // nominal classification otherwise hides the boundary before a copula.
    if(word.startsWith('무슨')&&noun(word.slice(2),personal)?.copula)return {text:'무슨 '+word.slice(2),ambiguous:true,rule:'2'};
    // Rule 47: a noun-derived 하다 form of three or more syllables
    // is separated from the auxiliary, never from its own nominal base.
    for(let i=3;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i),main=predicate(left),aux=predicate(right);
      if(/(?:해|하여)$/.test(left)&&main?.root.endsWith('하')&&knownNominal(main.root.slice(0,-1))&&aux&&['주','보','드리'].includes(aux.root))return {text:left+' '+right,ambiguous:true,rule:'47'};
    }
    // Independent negative adverbs precede the predicate with a space.
    // Whole-word recognition above protects compounds such as 못생기다.
    if(/^(안|못)/.test(word)){
      const tail=predicate(word.slice(1));
      // 못하다 is also a lexical/auxiliary predicate (쓰지 못하다).
      // The surface alone cannot justify splitting it.
      if(word[0]==='못'&&tail?.root==='하')return null;
      if(tail)return {text:word[0]+' '+word.slice(1),ambiguous:true,rule:'2'};
    }
    // Prefer an attested noun+particle followed by a predicate over the
    // generic noun-only path (화면에 / 서보이는 hides 화면에서 / 보이는).
    // Whole-word recognition above still protects names and compounds.
    for(let i=2;i<word.length;i++){
      if(!['에서','에게','께서'].includes(word.slice(i-2,i)))continue;
      const left=word.slice(0,i),right=word.slice(i),host=noun(left,personal),tail=predicate(right);
      if(host&&['에서','에게','께서'].includes(left.slice(host.base.length))&&tail&&tail.root!=='이')return {text:left+' '+(dependent(right,false)?.text??right),ambiguous:true,rule:'2'};
    }
    // A short unknown noun plus particle is a reviewable name, not split fodder.
    if(word.length<=4&&unknownNoun(word)?.base.length===2)return null;
    if(word.length>64)return null;
    const best=Array(word.length+1).fill(null);best[0]={cost:0,parts:[],unknowns:[]};
    for(let end=1;end<=word.length;end++)for(let start=Math.max(0,end-24);start<end;start++) {
      if(!best[start])continue;
      const part=word.slice(start,end),a=analyze(part,personal,true),dep=knownAdverbBoundary(part,personal)??dependent(part,false);
      if(!a&&!dep)continue;
      if(start===0&&end===word.length&&a?.unknown)continue;
      if(part.length===1&&!['수','것','걸','때','뿐','후','전','뒤','번','시','개','장','한','두','세','네','할','더'].includes(part))continue;
      const cost=best[start].cost+(a?.cost??1)+1.2+(part.length===1?2:0);
      if(!best[end]||cost<best[end].cost)best[end]={cost,parts:[...best[start].parts,dep?.text??part],unknowns:[...best[start].unknowns,...(a?.unknown?[a.base]:[])]};
    }
    const result=best.at(-1);
    // 까진 can be the contracted particle 까지는, not only an inflection
    // of 까다. A preceding non-adnominal predicate does not justify
    // splitting that particle off. Leave unresolved usage for review.
    if(result?.parts.some((part,i)=>{
      if(i===0||!/^까(?:진|지(?:는|도|만)?)$/.test(part))return false;
      const host=predicate(result.parts[i-1]);
      return host&&!host.adnominal;
    }))return null;
    // The copula attaches to its nominal host, including an unknown name.
    // Do not invent 영숙이 였어요 merely because both fragments analyze.
    if(result?.parts.length>1&&predicate(result.parts.at(-1))?.root==='이'&&result.parts.slice(0,-1).every(p=>analyze(p,personal,true)?.kind==='noun'))return null;
    // Recognition-only nouns can have adverb homographs. Before a nominal
    // copula phrase, that homograph does not justify splitting a name.
    // Do not extend this guard to adverb or duration boundaries.
    if(result?.parts.length>1&&analyze(result.parts.at(-1),personal,true)?.copula&&result.parts.slice(0,-1).every(p=>isRecognizedNoun(p)||analyze(p,personal,true)?.kind==='noun'))return null;
    // Adjacent dictionary nouns may be one name/compound. Without a predicate
    // or adverb boundary, do not recommend splitting an unknown proper name.
    if(result&&result.parts.every(p=>{
      const a=analyze(p,personal,true);
      // An adverb homograph does not establish a boundary when the same
      // fragment was parsed as noun + particle (조 + 이 in 조이스틱).
      return a?.kind==='noun'&&(!adverbs.has(p)||a.base!==p&&!a.nominal)&&!predicate(p)?.adnominal;
    })&&!predicate(result.parts.at(-1)))return null;
    // Dictionary-recognized fragments establish a possible segmentation,
    // not its meaning in context. All generic segmentation needs review.
    return result&&result.parts.length>1?{text:result.parts.join(' '),ambiguous:true,rule:'41/42',unknowns:result.unknowns}:null;
  }
  return {analyze,predicate,spacing,unknownNoun};
}
