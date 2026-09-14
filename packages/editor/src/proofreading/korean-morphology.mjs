// Original MIT morphology prototype. Lexical data is supplied, never downloaded.
import {communityActionNouns,communityNominalOnly} from './community-vocabulary.mjs';
const pronouns=new Set(['이','그','저','나','너','우리','저희','너희','이것','그것','저것','요것']);
export const isPronoun=word=>pronouns.has(word);
export function createActionNounSet(data) {
  const base=new Set([...(data?.actionNouns??[]),...communityActionNouns]);
  // Repetition 재- attaches to an attested action nominal, never to a
  // personal entry or an arbitrary noun. Expand one prefix level only.
  return new Set([...base,...[...base].filter(s=>s.length>=2&&!s.startsWith('재')).map(s=>'재'+s)]);
}
export function createMorphology(sets,data,recognizeWhole=null) {
  const placeNames=new Set(data?.recognizedPlaceNames??[]);
  // Authored lexical additions for productive action/state-change uses.
  // Do not infer 化 from every noun ending in 화 (e.g. flower names).
  const actionNouns=createActionNounSet(data);
  // Bounded passive hosts; do not license arbitrary noun + 당하다.
  const passiveNouns=new Set(['삭제','강등','거절','무시','이용','체포','혹사','납치','견제','차단']);
  const doedaNouns=new Set([...actionNouns,...(data?.stateChangeNouns??[]),'포함','당첨','용출','대형화','중독','배송','호환']);
  // 말하다 is absent from the supplied stem subset. Treat it as a verb;
  // unrestricted one-syllable noun + 하 would also invent 나하다.
  // Independently verified lexical stem missing from the selected subset.
  // XR roots are not all licensed to combine with 하다.
  const roots=new Set([...sets.verb,...sets.adjective,'말하','구하','그러','유의미하','만하','듯하','뻔하','고민되','아니','받들','못하']);
  // Recover a lexical -하다 stem only when both regular adnominal forms
  // independently name that root in the supplied Apache morphology data.
  const suppliedForms=new Set((data?.forms??[]).map(([s,e,r])=>s+'\t'+e+'\t'+r));
  for(const [s,e,r]of data?.forms??[])if(r.endsWith('하')&&e==='ETM'&&s===r.slice(0,-1)+'한'&&suppliedForms.has(r.slice(0,-1)+'할\tETM\t'+r))roots.add(r);
  for(const [s,e,r]of data?.forms??[])if(e==='VV'&&r.length>1&&(r.charCodeAt(r.length-1)-0xac00)%28===8&&s===r.slice(0,-1)+String.fromCharCode(r.charCodeAt(r.length-1)-8)&&suppliedForms.has(r+'\tETM\t'+r))roots.add(r);
  // Some lexical stems occur only in the supplied inflection records.
  // Recover the regular -내 family from two matching analyses, rather than
  // treating every supplied surface or arbitrary X+내 as a verb stem.
  const naeConnectives=new Set((data?.forms??[]).filter(([s,e,r])=>r.endsWith('내')&&s===r&&e==='EC').map(([, ,r])=>r));
  for(const [s,e,r]of data?.forms??[])if(e==='ETM'&&naeConnectives.has(r)&&s===r.slice(0,-1)+'낸')roots.add(r);
  // Attested suffix uses, not every noun + 드리다 (불편 드리다 differs).
  // Expand the stems so honorific, past and connective forms share the rules.
  const dridaNouns=new Set(['감사','질문','부탁','말씀','문의','연락','송부','추천']);
  for(const base of dridaNouns)roots.add(base+'드리');
  // -받다 attaches to these verified abstract hosts. A concrete object
  // (선물 받다) or a modified noun phrase remains a separate construction.
  const batdaNouns=new Set(['축복','초대','구원','검수','교육','존경','미움','사랑','고통','눈총','인정','주목']);
  for(const base of batdaNouns)roots.add(base+'받');
  const final=s=>(s.charCodeAt(s.length-1)-0xac00)%28;
  const withFinal=(s,n)=>s.slice(0,-1)+String.fromCharCode(s.charCodeAt(s.length-1)-final(s)+n);
  const forms=new Map();
  const nominalForms=new Set();
  const connectiveForms=new Set();
  const prefixes=new Map();
  const sDeletionPrefixes=new Set();
  // Expand compound ㄷ alternations only for an existing lexical root
  // whose ㄹ allomorph is attested by the supplied verb analysis.
  const dAlternationRoots=new Set((data?.forms??[]).filter(([surface,ending,root])=>ending==='VV'&&root.length>1&&roots.has(root)&&final(root)===7&&withFinal(root,8)===surface).map(([, ,root])=>root));
  const dAlternationPrefixes=new Set();
  // Short irregular roots already have supplied surface analyses. Expand
  // missing compound inflections without making their short allomorphs
  // (e.g. 잇 -> 이) overwrite the copula's existing forms.
  const sDeletionRoots=new Set((data?.forms??[]).filter(([surface,,root])=>root.length>1&&final(root)===19&&withFinal(root,0)===surface).map(([, ,root])=>root));
  const consonantEndings=['니다','니까','시다'];
  // Expand only lexical -롭 stems with an attested -로운 allomorph.
  // A noun followed by arbitrary 롭 is not evidence for a new adjective.
  const bConnectives=new Map();
  for(const [surface,ending,root]of data?.forms??[]){
    if(ending==='EC'&&final(root)===17&&[withFinal(root,0)+'워',withFinal(root,0)+'와'].includes(surface))bConnectives.set(root,surface);
  }
  const roubRoots=new Set([...roots].filter(r=>/(?:롭|스럽)$/.test(r)||bConnectives.has(r)));
  const roubPrefixes=new Set();
  // Expand 르 alternations only when the supplied connective attests the
  // doubled ㄹ form. Regular 따르/치르 and 러-irregular stems differ.
  const reuConnectives=new Map();
  for(const [surface,ending,root]of data?.forms??[]){
    if(ending!=='EC'||!root.endsWith('르')||root.length<2)continue;
    const stem=root.slice(0,-1);
    if(final(stem)!==0)continue;
    const vowel=Math.floor((stem.charCodeAt(stem.length-1)-0xac00)%588/28);
    const candidate=withFinal(stem,8)+([0,8].includes(vowel)?'라':'러');
    if(surface===candidate)reuConnectives.set(root,surface);
  }
  function add(surface,root,adnominal=false){if(surface&&!forms.has(surface))forms.set(surface,{root,adnominal});}
  function expand(root) {
    const roub=roubRoots.has(root),vowelAllomorph=roub?withFinal(root,0)+'우':null;
    const sDropped=sDeletionRoots.has(root)?withFinal(root,0):null;
    const dChanged=dAlternationRoots.has(root)?withFinal(root,8):null;
    // Regular stem + endings, including a syllable-final adnominal consonant.
    prefixes.set(root,root);
    if(sDropped){prefixes.set(sDropped,root);prefixes.set(sDropped+'으',root);sDeletionPrefixes.add(sDropped);}
    if(dChanged){prefixes.set(dChanged,root);dAlternationPrefixes.add(dChanged);}
    if(final(root)===8)nominalForms.add(withFinal(root,10));
    // The inventory also contains vowel allomorphs such as 만드-. Only
    // the attested -하 stem is unambiguous here; do not invent *만듬.
    if(root.length>1&&root.endsWith('하')){const nominal=withFinal(root,16);nominalForms.add(nominal);add(nominal,root);}
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
      add(withFinal(vowelAllomorph,4)+'데',root);
      add(withFinal(vowelAllomorph,4)+'데요',root);
      nominalForms.add(withFinal(vowelAllomorph,16));
      add(withFinal(vowelAllomorph,16),root);
    }else if(final(root)!==0&&final(root)!==8){add((dChanged??sDropped??root)+'은',root,true);add((dChanged??sDropped??root)+'을',root,true);}
    // Honorific -시-, followed by ordinary endings.
    const honor=roub?vowelAllomorph+'시':dChanged?dChanged+'으시':sDropped?sDropped+'으시':final(root)===0?root+'시':final(root)===8?withFinal(root,0)+'시':root+'으시';
    add(withFinal(honor,4),root,true);add(withFinal(honor,8),root,true);add(honor+'는',root,true);
    const honorNominal=withFinal(honor,16);
    nominalForms.add(honorNominal);add(honorNominal,root);
    prefixes.set(honor,root);
    prefixes.set(honor.slice(0,-1)+'셨',root);
    // -시어 contracts to -셔 before these connective/final endings.
    // It is not an unrestricted stem: *셔는 and *셔습니다 stay invalid.
    const honorContracted=honor.slice(0,-1)+'셔';
    connectiveForms.add(honorContracted);
    for(const tail of ['','요','서','도','야','야만','야지'])add(honorContracted+tail,root);
    add(honor.slice(0,-1)+'세요',root);
    for(const tail of consonantEndings)add(withFinal(honor,17)+tail,root);
    add(withFinal(honor,17)+'시오',root);
    // Rules 34/35: vowel contraction and past tense. Do not invent irregular roots.
    let contracted;
    if(dChanged||sDropped){const vowel=Math.floor((root.charCodeAt(root.length-1)-0xac00)%588/28);contracted=(dChanged??sDropped)+([0,8].includes(vowel)?'아':'어');}
    else if(reuConnectives.has(root))contracted=reuConnectives.get(root);
    else if(roub)contracted=bConnectives.get(root)??withFinal(root,0)+'워';
    else if(root.endsWith('하'))contracted=root.slice(0,-1)+'해';
    // Verified ㅡ deletion. Keep this bounded: 르 and other irregular
    // stems cannot be expanded by blindly dropping every final ㅡ.
    else if(root==='잠그')contracted='잠가';
    else if(root==='담그')contracted='담가';
    else if(!root.endsWith('르')&&final(root)===0&&Math.floor((root.charCodeAt(root.length-1)-0xac00)%588/28)===18){
      const preceding=Math.floor((root.charCodeAt(root.length-2)-0xac00)%588/28);
      contracted=root.slice(0,-1)+String.fromCharCode(root.charCodeAt(root.length-1)+(([0,8].includes(preceding)?0:4)-18)*28);
    }
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
      // A descriptive stem such as 되어 overlaps the connective of 되다.
      // Keep the already established connective root for its past prefix.
      prefixes.set(past,forms.get(contracted)?.root??root);
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
      prefixes.set(withFinal(full,20),forms.get(full)?.root??root);
    }
  }
  for(const root of roots)expand(root);
  for(const [surface,ending,root] of data?.forms??[]){
    // 픈 is the contracted segment inside -고픈, not an independently
    // writable 싶다 form. The complete contraction is analyzed above.
    if(surface==='픈'&&root==='싶')continue;
    if(ending==='ETN')nominalForms.add(surface);
    // The supplied analysis attests a lost ㅅ, e.g. 낫 -> 나. Such
    // allomorphs retain -으- even though the written surface has no batchim.
    if(final(root)===19&&withFinal(root,0)===surface)sDeletionPrefixes.add(surface);
    if(ending==='EP'){
      if(!prefixes.has(surface))prefixes.set(surface,root);
    }
    else if(['EC','EF','ETM','ETN'].includes(ending)){
      const p=forms.get(surface);
      if(!p||ending==='ETM'&&!p.adnominal)forms.set(surface,{root,adnominal:ending==='ETM'});
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
  const nominalLengths=indexLengths([...sets.noun,...doedaNouns,...passiveNouns]);
  const adverbs=new Set([...sets.adverb,...(data?.adverbs??[])]);
  const recognizedNouns=new Set([...(data?.recognizedNouns??[]),...communityNominalOnly]);
  const recognitionParticles=[...sets.josa];
  const shortHostParticles=new Set(['이','가','을','를','은','는','도','만','에','로','와','과','의','에서','에게','으로','부터','까지','처럼','보다','보단','께서']);
  const isRecognizedNoun=s=>recognizedNouns.has(s)||recognitionParticles.some(p=>s.endsWith(p)&&recognizedNouns.has(s.slice(0,-p.length)));
  const derivedNominal=s=>/[적용별]$/.test(s)&&s.length>2&&(sets.noun.has(s.slice(0,-1))||recognizedNouns.has(s.slice(0,-1))||s.endsWith('용')&&s.length>3&&s[s.length-2]==='자'&&actionNouns.has(s.slice(0,-2)));
  const demonstratives=new Set(['이것','그것','저것','요것','무엇','이곳','그곳','저곳']);
  const quantityHosts=new Set(['하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉','열','스물','반','번째','개','장','번','군데','달','시간','조각','권','명','마리','살','쪽','줄','잔','병','봉지','그루','켤레','벌','세트','차례','개월','년','분','초','가지','폭','칸','날']);
  const repeatedActionNoun=s=>s.length>=3&&s.startsWith('재')&&!s.slice(1).startsWith('재')&&actionNouns.has(s.slice(1));
  const lexicalNominal=s=>sets.noun.has(s)||recognizedNouns.has(s)||repeatedActionNoun(s)||demonstratives.has(s)||derivedNominal(s);
  const knownNominal=s=>lexicalNominal(s)||s.endsWith('들')&&lexicalNominal(s.slice(0,-1));
  function isEnding(s){
    // Honorific -시- ends in a vowel: its adnominals are -신/-실,
    // never a freely concatenated -시은/-시을. The descriptive ending
    // inventory otherwise invents a predicate reading for 도시은.
    if(/^(?:시|으시)(?:은|을|으)/.test(s))return false;
    if(['잖아','잖아요','잖니'].includes(s))return true;
    // Sentence-final 요 can follow these endings; do not make every ending
    // freely combinable with 요 (e.g. an adnominal form or -다).
    if(/(?:는데|은데|던데|거든|니까|지|고|서)요$/.test(s))s=s.slice(0,-1);
    if(sets.ending.has(s))return true;
    // The surface inventory includes spoken fragments such as 있 and 싶.
    // They are not freely attachable pre-endings (이 + 있 + 으면 is invalid).
    for(let i=1;i<s.length;i++)if(/^(시|으시|았|었|였|겠|더)$/.test(s.slice(0,i))&&sets.ending.has(s.slice(i)))return true;
    return false;
  }
  function connects(prefix,ending){
    if(dAlternationRoots.has(prefix)&&/^(으|아|어|은|을)/.test(ending))return false;
    if(dAlternationPrefixes.has(prefix)&&! /^(으|아|어|은|을)/.test(ending))return false;
    if(roubRoots.has(prefix)&&/^(으|아|어|은|을)/.test(ending))return false;
    // -로우- precedes the vowel-selecting endings, not e.g. *흥미로우다.
    if(roubPrefixes.has(prefix)&&! /^(니|면|며|므로|시)/.test(ending))return false;
    const batchim=final(prefix);
    if(ending==='사오니')return batchim!==0&&batchim!==8;
    // Longer endings can include irregular allomorphs (나을까요 from 낫다).
    // Do not reject them merely by the first syllable of the surface ending.
    if((batchim===0||batchim===8)&&!sDeletionPrefixes.has(prefix)&&!dAlternationPrefixes.has(prefix)&&/^(은$|을$|으)/.test(ending))return false;
    if(batchim===8&&/^(는|니|시)/.test(ending))return false;
    return isEnding(ending);
  }
  // Noun + 하다 is checked lazily; do not materialize millions of combinations.
  // Predicate analysis uses only immutable lexical data, never a document or
  // personal dictionary. Bound retained entries while caching misses as well.
  const predicateCache=new Map();
  function predicate(s) {
    if(predicateCache.has(s))return predicateCache.get(s);
    const result=analyzePredicate(s);
    if(predicateCache.size>=4096)predicateCache.clear();
    predicateCache.set(s,result);
    return result;
  }
  function analyzePredicate(s) {
    // -고프다 is the standard contraction of -고 싶다. Validate both
    // the uninflected host and the complete 고프다 ending; do not split
    // 추천하고픈 into 추천하고 + a coincidental 픈 fragment.
    const desire=s.match(/^(.+)(고[프픈플파팠].*)$/);
    if(desire){
      const main=predicate(desire[1]+'고'),tail=predicate(desire[2]);
      // Upstream surface fragments can shadow a complete stem (오고 is
      // also tagged as part of 들어오다). A real stem + -고 remains valid.
      if((main?.root===desire[1]||roots.has(desire[1])&&connects(desire[1],'고'))&&tail?.root==='고프')return {root:desire[1]+'고프',adnominal:tail.adnominal};
      const attachedAuxiliary=/(?:보|주|내|드리|두|놓|버리)$/.test(desire[1])&&analyze(desire[1]+'고',new Set());
      if(attachedAuxiliary?.kind==='predicate'&&tail?.root==='고프')return {root:desire[1]+'고프',adnominal:tail.adnominal};
    }
    // -죠 contracts -지요; retain the author's polite ending after validating
    // the complete expanded predicate, rather than proposing plain -지.
    if(s.endsWith('죠')){
      const expanded=predicate(s.slice(0,-1)+'지요');
      if(expanded)return {...expanded,adnominal:false};
    }
    if(s.endsWith('다네요')){
      const quoted=predicate(s.slice(0,-2));
      if(quoted)return {...quoted,adnominal:false};
    }
    if(s.endsWith('답니다')){
      const declarative=predicate(s.slice(0,-3)+'다');
      if(declarative)return {...declarative,adnominal:false};
    }
    if(s.endsWith('라네요')){
      const imperative=predicate(s.slice(0,-2));
      if(imperative)return {...imperative,adnominal:false};
    }
    // Quoted -다고 하던데 / -다고 하여서 contract without a word boundary.
    // Validate the declarative base; bare present verbs require ㄴ/는다.
    const reported=s.match(/^(.+)(?:다던데|다는데|다니까|다면서|다길래|대서)(?:요)?$/);
    if(reported){
      const stem=reported[1],quoted=predicate(stem+'다');
      if(quoted){
        // These independently verified psychological verbs are also listed
        // as adjectives upstream. Do not treat every upstream VV homograph
        // as a standard verbal reading (the inventory also lists 좋 as VV).
        const psychological=['좋아하','싫어하','아파하'].includes(quoted.root);
        const state=!psychological&&sets.adjective.has(quoted.root)||['있','없'].includes(quoted.root);
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
    if(s.endsWith('다거나')&&predicate(s.slice(0,-2)))return {...predicate(s.slice(0,-2)),adnominal:false};
    if(s.endsWith('자니')){
      const proposed=predicate(s.slice(0,-1));
      if(proposed&&(!sets.adjective.has(proposed.root)||sets.verb.has(proposed.root)))return {...proposed,adnominal:false};
    }
    const intention=s.match(/^(.+야)겠(.+)$/);
    if(intention&&isEnding(intention[2])&&predicate(intention[1]))return {...predicate(intention[1]),adnominal:false};
    // Particles on a complete interrogative/connective ending stay attached.
    // Require the whole predicate before stripping the final particle.
    // Direct lexical verb + 는 must retain its regular adnominal analysis.
    const emphasizedEnding=s.match(/^(.+(?:지|서|기))(?:요|도|는|만|조차|야)$/);
    if(emphasizedEnding&&!(s.endsWith('는')&&sets.verb.has(s.slice(0,-1)))){const base=predicate(emphasizedEnding[1]);if(base&&!(emphasizedEnding[1].endsWith('지')&&base.root===emphasizedEnding[1]))return {...base,adnominal:false};}
    // Preserve the complete causal connective before emphatic 가. A noun
    // homograph such as 서가 does not justify splitting the predicate.
    if(s.endsWith('서가')){
      const connective=s.slice(0,-1),base=predicate(connective);
      if(base&&connective!==base.root)return {...base,adnominal:false};
    }
    // The causal clause can precede 이다 without an internal space.
    // Validate both complete forms; a noun homograph 서 is not a boundary.
    const causalCopula=s.match(/^(.+서)(.+)$/);
    if(causalCopula){
      const base=predicate(causalCopula[1]),copula=predicate(causalCopula[2]);
      if(base&&base.root!==causalCopula[1]&&copula?.root==='이')return {...copula};
    }
    const prospectiveQuestion=s.match(/^(.+)지$/);
    if(prospectiveQuestion&&final(prospectiveQuestion[1])===8){const base=predicate(prospectiveQuestion[1]);if(base?.adnominal)return {...base,adnominal:false};}
    if(s.endsWith('리라는')){const base=predicate(s.slice(0,-1));if(base)return {...base,adnominal:true};}
    if(/^아닌(?:데|데요|지|가|가요)$/.test(s))return {root:'아니',adnominal:false};
    // The additive particle attaches to the interrogative ending (않을까도).
    // Do not admit every unknown word merely because its last syllable is 도.
    if(s.endsWith('까도')){
      const base=predicate(s.slice(0,-1));
      if(base)return {...base,adnominal:false};
    }
    // A surface entry may describe only the main adjective (비싸진 -> 비싸).
    // Recover the adnominal ending of productive -아/어지다 first.
    const changeAdnominal=s.match(/^(.+)(진|질|지는|지던)$/);
    if(changeAdnominal&&connectiveForms.has(changeAdnominal[1])&&predicate(changeAdnominal[1]))return {root:changeAdnominal[1]+'지',adnominal:true};
    const formalPast=s.match(/^(.+[었았였])(습니다|습니까)$/);
    if(formalPast&&prefixes.has(formalPast[1]))return {root:prefixes.get(formalPast[1]),adnominal:false};
    if(forms.has(s))return forms.get(s);
    if(s.endsWith('더라고요')){
      const recalled=predicate(s.slice(0,-2));
      if(recalled)return {...recalled,adnominal:false};
    }
    if(/(?:고|서|가|나|면|지만)요$/.test(s)){
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
    for(const i of prefixLengths.get(s[0])??[])if(i>0&&i<s.length&&prefixes.has(s.slice(0,i))&&connects(s.slice(0,i),s.slice(i)))return {root:prefixes.get(s.slice(0,i)),adnominal:/(?:는|은|던|을)$/.test(s.slice(i))};
    // -아/어지다 remains one written unit, including noun-derived 해지다.
    // Validate both predicates; a coincidental 지 inside a noun is insufficient.
    for(let i=1;i<s.length;i++){
      if(!'지져졌질진집짐'.includes(s[i]))continue;
      const left=s.slice(0,i),right=s.slice(i);
      const connective=connectiveForms.has(left)||/[아어해]$/.test(left)||final(left)===0&&[6,9,14,10].includes(Math.floor((left.charCodeAt(left.length-1)-0xac00)%588/28));
      if(!connective)continue;
      const main=predicate(left),aux=predicate(right);
      if(main&&aux?.root==='지')return {root:left+'지',adnominal:aux.adnominal};
      // 지니 also has a 짓다 analysis. In this productive -어지다
      // construction, validate the 지다 reading instead of losing it to
      // the first surface homograph returned by predicate().
      if(main&&main.root!=='이'&&right.startsWith('지')&&connects('지',right.slice(1)))return {root:left+'지',adnominal:/^(는|은|던|을)$/.test(right.slice(1))};
    }
    for(const base of passiveNouns)if(s.startsWith(base)){
      const tail=predicate(s.slice(base.length));
      if(tail?.root==='당하')return {root:base+'당하',adnominal:tail.adnominal};
    }
    for(const i of nominalLengths.get(s[0])??[]) {
      if(i<2||i>=s.length)continue;
      if(!sets.noun.has(s.slice(0,i))&&!doedaNouns.has(s.slice(0,i)))continue;
      const suffix=s.slice(i);
      let tail=predicate(suffix);
      // Recover the descriptive 되어 homograph only. Retrying arbitrary
      // roots would swallow a separate auxiliary in forms like 조언해줬다.
      if(!tail||tail.root==='되어'&&suffix.startsWith('되었'))for(let j=1;j<suffix.length;j++)if(['하','되','시키'].includes(prefixes.get(suffix.slice(0,j)))&&connects(suffix.slice(0,j),suffix.slice(j)))tail={root:prefixes.get(suffix.slice(0,j)),adnominal:/^(는|은|던|을)$/.test(suffix.slice(j))};
      if(tail&&(tail.root==='하'&&(sets.noun.has(s.slice(0,i))||actionNouns.has(s.slice(0,i)))||['되','시키'].includes(tail.root)&&suffix!=='되'&&doedaNouns.has(s.slice(0,i))))return {root:s.slice(0,i)+tail.root,adnominal:tail.adnominal};
    }
    return null;
  }
  const contractedDemonstrative=s=>/^(?:이|그|저|요|새)걸로(?:는|도|만)?$/.test(s)||/^뭘로(?:는|도|만)?$/.test(s)||/^(?:이|그|저|요)거(?:라|라고|라는|죠|예요|였어요)$/.test(s);
  // Productive -기 is nominal even when absent from the surface dictionary.
  // Validate its full inflection before allowing a following particle.
  const isNominalForm=s=>nominalForms.has(s)||s.endsWith('짐')&&Boolean(predicate(s)?.root.endsWith('지'))||s.endsWith('심')&&Boolean(predicate(s))||s.endsWith('기')&&Boolean(predicate(s))||s.endsWith('다기')&&Boolean(predicate(s.slice(0,-1)))||s.endsWith('음')&&s.length>1&&final(s.slice(0,-1))!==0&&Boolean(predicate(s));
  const approximationHosts=new Set(['사이','중간','끝','처음','지금','내일','어제','오늘','모레','이맘때','그맘때','저맘때','이때','그때','저때']);
  function noun(s,personal) {
    // 께서도 / 에게만 retain the complete attested particle before the
    // supplementary particle. Do not reuse their syllables as new words.
    if(/[도만]$/.test(s)){
      const plain=s.slice(0,-1),host=noun(plain,personal);
      if(host&&host.base!==plain&&sets.josa.has(plain.slice(host.base.length)))return host;
    }
    // Quantity suffixes need not each appear as dictionary headwords.
    // Keep the host boundary so a preceding numeral still needs its space.
    if(quantityHosts.has(s))return {base:s,unknown:false};
    const quantitySuffix=s.match(/^(.+?)(씩|쯤)(.*)$/);
    if(quantitySuffix&&(quantityHosts.has(quantitySuffix[1])||quantitySuffix[2]==='쯤'&&approximationHosts.has(quantitySuffix[1]))&&(!quantitySuffix[3]||sets.josa.has(quantitySuffix[3])||predicate(quantitySuffix[3])?.root==='이'))return {base:quantitySuffix[1],unknown:false};
    const only=s.match(/^(.+?)뿐(.*)$/);
    if(only&&(knownNominal(only[1])||personal.has(only[1]))&&(!only[2]||sets.josa.has(only[2])||predicate(only[2])?.root==='이'))return {base:only[1],unknown:false,copula:predicate(only[2])?.root==='이'};
    if(s.endsWith('요')){
      const plain=s.slice(0,-1),host=noun(plain,personal);
      if(host&&host.base!==plain&&sets.josa.has(plain.slice(host.base.length)))return host;
    }
    // A nominalized indirect question can take a particle without a
    // space: 언제 굴릴지에. Elapsed-time 지 still follows an adnominal.
    for(let i=2;i<s.length;i++)if(s[i-1]==='지'&&final(s.slice(0,i-1))===8&&sets.josa.has(s.slice(i))){
      const host=predicate(s.slice(0,i));
      if(host&&!host.adnominal&&host.root!==s.slice(0,i))return {base:s.slice(0,i),unknown:false,nominal:true};
    }
    if(/^(?:이|그|저|요)건(?:데|데요|가요|지)$/.test(s))return {base:s[0]+'것',unknown:false,copula:true};
    if(/^어디서든(?:지)?$/.test(s))return {base:'어디',unknown:false};
    // Contractions of 것 + copula remain valid after inserting their space.
    // Otherwise the checker flags the very 건데/거예요 it just proposed.
    if(['건데','건가요','건지','거예요','거였어요','겁니다','거라','거라고','거라는','거죠'].includes(s))return {base:'것',unknown:false};
    if(isNominalForm(s))return {base:s,unknown:false,nominal:true};
    for(let i=1;i<s.length;i++)if(sets.josa.has(s.slice(i))&&isNominalForm(s.slice(0,i)))return {base:s.slice(0,i),unknown:false,nominal:true};
    // Rule 33: demonstrative + 것으로 can contract to 걸로, without
    // becoming a misspelling of a similar-looking dictionary word.
    if(contractedDemonstrative(s))return {base:s,unknown:false};
    for(const particle of ['를','을','는','도'])if(s.endsWith('인가'+particle)){
      const base=s.slice(0,-2-particle.length);
      if(knownNominal(base)||personal.has(base))return {base,unknown:false,copula:true};
    }
    if(personal.has(s)||sets.noun.has(s)||repeatedActionNoun(s)||demonstratives.has(s))return {base:s,unknown:false};
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
    for(let i=1;i<s.length;i++)if(s.slice(i).startsWith('들')&&(!s.slice(i+1)||sets.josa.has(s.slice(i+1)))&&(lexicalNominal(s.slice(0,i))||personal.has(s.slice(0,i))))return {base:s.slice(0,i),unknown:false};
    // Longest particle first, to avoid treating a piece of the particle as a noun.
    for(let i=1;i<s.length;i++)if(sets.josa.has(s.slice(i))&&(personal.has(s.slice(0,i))||sets.noun.has(s.slice(0,i))||repeatedActionNoun(s.slice(0,i))||demonstratives.has(s.slice(0,i))))return {base:s.slice(0,i),unknown:false};
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
        if(tail.startsWith('잖')&&predicate('이'+tail)?.root==='이')return {base,unknown:false,copula:true};
        const restored=tail.startsWith('여')?'이어'+tail.slice(1):tail.startsWith('였')?'이었'+tail.slice(1):/^(라|다|지|네)/.test(tail)?'이'+tail:null;
        if(restored&&predicate(restored)?.root==='이')return {base,unknown:false,copula:true};
      }
      if(!/^(이|인|일|임|입)/.test(tail))continue;
      // Nominalized copulas retain their particles: 것 + 임 + 에 is
      // 것임에, not 것 임에. Require the complete nominal ending and
      // particle instead of accepting arbitrary text after 임/음.
      const nominalCopula=Array.from({length:tail.length-1},(_,j)=>j+1).some(j=>
        sets.josa.has(tail.slice(j))&&isNominalForm(tail.slice(0,j))&&predicate(tail.slice(0,j))?.root==='이');
      const copula=predicate(tail)?.root==='이'||nominalCopula||['일','이긴','이기도','이기는','이기만'].includes(tail);
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
    const particles=new Set(['에서','에게','으로','부터','까지','처럼','보다','보단','대로','께서','은','는','이','가','을','를','에','의','로','도','만','만의']);
    for(let i=2;i<s.length&&i<=6;i++){
      const tail=s.slice(i);
      if(particles.has(tail)||tail==='들'||tail.startsWith('들')&&particles.has(tail.slice(1)))return {base:s.slice(0,i),unknown:true};
      // Preserve the same unknown-name span before/after its copula gap is
      // repaired. This is a review boundary, never lexical acceptance.
      if(/^(?:입니다|입니까|이었다|이었|이에요|예요|이지만|이니|이라|이던)/.test(tail)&&predicate(tail)?.root==='이')return {base:s.slice(0,i),unknown:true};
    }
    return null;
  }
  function analyze(s,personal,unknown=false) {
    const n=noun(s,personal);if(n)return {...n,kind:'noun',cost:.8};
    const p=predicate(s);if(p)return {...p,kind:'predicate',cost:.8};
    if(adverbs.has(s))return {kind:'adverb',cost:1};
    const emphasized=s.match(/^(.+)(도|만|은|는)$/);
    if(emphasized&&adverbs.has(emphasized[1])&&(!['은','는'].includes(emphasized[2])||emphasized[2]===(final(emphasized[1])===0?'는':'은')))return {kind:'adverb',cost:1};
    // Preserve a permitted auxiliary spelling; do not recommend optional spaces.
    for(let i=1;i<s.length;i++){
      const left=s.slice(0,i),p=predicate(left),aux=predicate(s.slice(i));
      // Length alone does not make a simple verb compound/derived: 만들어
      // may attach 보조 용언, whereas three-syllable noun+해 must separate.
      if(i>2&&!['만들','흔들','받들'].includes(p?.root))continue;
      // -(으)ㄹ 만하다 permits attachment after a short main predicate.
      // Noun + comparison particle 만 is a different construction.
      if(p?.adnominal&&(aux?.root==='듯하'||final(left)===8&&['만하','뻔하'].includes(aux?.root)))return {kind:'predicate',cost:.8,root:p.root,adnominal:aux.adnominal};
      const contractedVowel=final(left)===0&&[6,9,14,10].includes(Math.floor((left.charCodeAt(left.length-1)-0xac00)%588/28));
      if(p&&(connectiveForms.has(left)||/[아어해]$/.test(left)||contractedVowel)&&aux&&['주','보','내','드리','있','오','가','두','놓','버리'].includes(aux.root))return {kind:'predicate',cost:.8,root:p.root,adnominal:aux.adnominal};
    }
    const u=unknown&&unknownNoun(s);return u?{...u,kind:'noun',cost:2.5}:null;
  }
  const isNominalAdnominal=(s,analysis,personal)=>{
    // Geographic names only establish the complete copular modifier;
    // they do not become candidate segmentation fragments or verb roots.
    if(/[인일]$/.test(s)&&placeNames.has(s.slice(0,-1)))return true;
    if(analysis?.copula&&/[인일]$/.test(s))return true;
    if(!analysis?.base||!knownNominal(analysis.base)&&!personal.has(analysis.base))return false;
    const tail=s.slice(analysis.base.length),copula=predicate(tail);
    return ['인','일'].includes(tail)||copula?.root==='이'&&copula.adnominal;
  };
  function dependent(s,contractions=true,personal=new Set()) {
    if(contractedDemonstrative(s))return null;
    if(derivedNominal(s)||/^(?:이|그|저|요)건(?:데|데요|가요|지)$/.test(s))return null;
    // 텐데/테니 contract 터 + 이다. Require a prospective adnominal;
    // matching the syllables inside a name alone is not a boundary.
    const prospective=s.match(/^(.+)(텐데|텐데요|테니|테니까|테지만|테고)$/);
    if(prospective&&final(prospective[1])===8&&(predicate(prospective[1])?.adnominal||prospective[1].endsWith('일')&&noun(prospective[1],new Set())?.copula))return {text:prospective[1]+' '+prospective[2],ambiguous:false,rule:'42'};
    // A lexical noun with a particle/copula is not a new adnominal phrase.
    // In particular 이- also has verbal homographs in the source inventory.
    // Determiners precede 것 and its contractions; the descriptive particle
    // list also admits 게 after 모든, hiding this grammatical boundary.
    const determiner=s.match(/^(모든|다른|어느|무슨|여러|온갖)(것.*|거.*|게|걸|건)$/);
    if(contractions&&determiner&&!personal.has(s)&&!sets.noun.has(s)&&!recognizedNouns.has(s)&&noun(determiner[2],personal))return {text:determiner[1]+' '+determiner[2],ambiguous:false,rule:'42'};
    const whole=noun(s,new Set());
    // The descriptive particle inventory accepts 중 + 인거 as a noun.
    // Keep the explicit 중인/중일 adnominal path available; the dependent
    // endings below still validate the entire remaining expression.
    const middleAdnominal=whole?.base==='중'&&/^중[인일]/.test(s);
    const nominalDependent=whole?.base&&knownNominal(whole.base)&&/^[인일](?:거|것)/.test(s.slice(whole.base.length));
    const derivedHost=whole?.base&&derivedNominal(whole.base)&&!(whole.base.endsWith('적')&&analyze(whole.base.slice(0,-1),personal)?.adnominal);
    if(whole&&!middleAdnominal&&!nominalDependent&&(demonstratives.has(whole.base)||(sets.noun.has(whole.base)||derivedHost)&&whole.base!==s&&!predicate(whole.base)))return null;
    // A lexical adjective such as 그럴듯하다 already includes 듯하.
    // Its internal syllables do not establish a dependent-noun boundary.
    const lexical=predicate(s);
    if(lexical?.root.endsWith('듯하')&&roots.has(lexical.root))return null;
    // A complete dictionary word can happen to end in 수/때/걸.
    // Do not split 필수 or 이걸 merely because the prefix looks inflected.
    if(sets.noun.has(s)||recognizedNouns.has(s))return null;
    // A repaired dependent phrase can itself precede 같다. Preserve both
    // boundaries, without treating every noun compound as a missing gap.
    if(contractions)for(let i=2;i<s.length;i++){
      const right=s.slice(i);
      if(!(right.startsWith('같')&&predicate(right)?.root==='같'||right.startsWith('아니')&&predicate(right)?.root==='아니'))continue;
      const inner=dependent(s.slice(0,i),true,personal);
      if(inner)return {text:inner.text+' '+right,ambiguous:true,rule:'42'};
    }
    // 중 follows an activity/group noun, including particles and the copula.
    // A complete lexical noun such as 그중/도중 retains its boundary.
    if(s.includes('중')&&!isRecognizedNoun(s)&&!noun(s,new Set()))for(let i=1;i<s.length;i++){
      const left=s.slice(0,i),right=s.slice(i);
      if(!right.startsWith('중'))continue;
      const host=noun(left,new Set()),tail=noun(right,new Set());
      const nested=(host||knownNominal(left))?dependent(right,true,personal):null;
      // 중인 is also an independent noun. Keep that reading, but it must
      // not hide the grammatical 중 + 이다 reading after a known host.
      const middleForm=part=>part.startsWith('중')&&(noun(part,new Set())?.base==='중'||predicate(part.slice(1))?.root==='이');
      if((host||knownNominal(left))&&(tail?.base==='중'||middleForm(right)||nested&&middleForm(nested.text.split(' ')[0])))return {text:left+' '+(nested?.text??right),ambiguous:true,rule:'42'};
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
      for(const dep of ['때','분','곳','것','거','줄','만큼','정도','중','듯','양','뿐']){
        if(dep==='거'&&!contractions)continue;
        if(dep==='뿐'&&knownNominal(left))continue;
        if(!right.startsWith(dep))continue;
        const tail=right.slice(dep.length);
        if(tail&&!sets.josa.has(tail)&&!(noun(right,new Set())?.base===dep)&&!(dep==='분'&&tail.startsWith('들')&&(!tail.slice(1)||sets.josa.has(tail.slice(1)))))continue;
        // 이때 + 는 is an existing noun with a particle, not 이 + 때는.
        const wholeNoun=tail?s.slice(0,-tail.length):s;
        if(sets.noun.has(wholeNoun)||recognizedNouns.has(wholeNoun))continue;
        const host=predicate(left)??noun(left,personal);
        if(dep==='거'&&left.length===1&&host?.root==='이')continue;
        if(dep==='거'&&predicate(s)&&!(left.endsWith('는')||final(left)===4||final(left)===8&&['','야'].includes(tail)))continue;
        if(host?.adnominal||isNominalAdnominal(left,host,personal))return {text:left+' '+right,ambiguous:false,rule:'42'};
      }
    }
    // Surface -걸 is also an ending. Return a review candidate, not a certainty.
    for(const dep of ['건데','건가','건가요','건지','거긴','거예요','거였어요','겁니다','거라','거라고','거라는','거죠','것인데','것입니다','것을','것이','것은','것도','것만','것으로','걸로','걸로는','걸로도','일이','일을','일은','적이','적을','적은','것','걸','거','게','건','수','때','뿐','적']) {
      if(!s.endsWith(dep))continue;
      const left=s.slice(0,-dep.length),analysis=predicate(left)??analyze(left,personal);
      if(dep==='뿐'&&isPronoun(left))continue;
      const nominalAdnominal=isNominalAdnominal(left,analysis,personal)||/^중[인일]$/.test(left)||left.endsWith('라는')&&knownNominal(left.slice(0,-2));
      const p=nominalAdnominal?{...analysis,adnominal:true}:analysis;
      if(left.length===1&&p?.root==='이'&&/^(?:거|건|걸)/.test(dep))continue;
      // 게/건 also occur in verb endings; 이게 is a demonstrative contraction.
      // The descriptive inventory also accepts 하는게/가능한거. A present
      // or completed adnominal still requires the dependent-noun boundary.
      // Keep prospective -ㄹ게 (진행할게) distinct from this construction.
      const contractedNoun=p?.adnominal&&(left.endsWith('는')||final(left)===4||dep==='거'&&final(left)===8);
      const shortAdnominal=left.length===1&&p?.adnominal&&p.root!=='이';
      if(['거','게','건'].includes(dep)&&(!contractions||left.length<2&&!shortAdnominal||predicate(s)&&!contractedNoun))continue;
      if(p?.adnominal)return {text:left+' '+dep,ambiguous:dep==='걸'||dep.startsWith('적'),rule:'42'};
    }
    return null;
  }
  // The descriptive verb inventory joins 잘 + 알려지다. Confirm the tail
  // with the inflector instead of splitting every verb beginning with 잘.
  function knownAdverbBoundary(word,personal) {
    if(personal.has(word)||!word.startsWith('잘'))return null;
    const rest=word.slice(1),tail=predicate(rest);
    // Productive -어지다 analysis can retain the underlying 알리 root.
    if(word.startsWith('잘알려')&&['알려지','알리'].includes(tail?.root))return {text:'잘 '+rest,ambiguous:false,rule:'2'};
    // Complete lexical compounds keep priority over an adverb interpretation.
    if(!tail||tail.root===rest||knownNominal(word)||predicate(word)||recognizeWhole?.(word,personal))return null;
    return {text:'잘 '+rest,ambiguous:true,rule:'2'};
  }
  function auxiliaryBoundary(word,personal){
    if(personal.has(word))return null;
    for(let i=2;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i);
      const nested=/(?:야|게|지|기는|기도|기나|긴)$/.test(left)?dependent(right,true,personal):null;
      const tail=predicate(nested?.text.split(' ')[0]??right);
      const emphasis=/(?:기는|기도|기나|긴)$/.test(left)&&tail?.root==='하'&&!predicate(word);
      const copularEmphasis=emphasis&&left.match(/^(.+)(?:이기는|이기도|이기나|이긴)$/);
      const emphasisHost=copularEmphasis&&(knownNominal(copularEmphasis[1])||personal.has(copularEmphasis[1]));
      const negativeEnding=left.endsWith('지')&&right!=='만'&&['말','않','못하'].includes(tail?.root);
      const lexicalNegative=negativeEnding?(predicate(word)??recognizeWhole?.(word,personal))?.root:null;
      const lexicalNegativeAdjective=lexicalNegative?.endsWith('지않')&&(sets.adjective.has(lexicalNegative)||data?.recognitionAdjectiveRoots?.includes(lexicalNegative));
      const negative=negativeEnding&&!lexicalNegativeAdjective&&predicate(left)?.root!==left;
      const boundary=negative||left.endsWith('야')&&['하','되'].includes(tail?.root)||left.endsWith('게')&&tail?.root==='되'||emphasis;
      if(boundary&&!right.startsWith('겠')&&(predicate(left)||analyze(left,personal)?.kind==='predicate'||emphasis&&(noun(left,personal)?.copula||emphasisHost)))return {text:(negative?(knownAdverbBoundary(left,personal)?.text??left):left)+' '+(nested?.text??right),ambiguous:true,rule:'47'};
    }
    return null;
  }
  function spacing(word,personal) {
    if(personal.has(word))return null;
    const registered=personal.size?noun(word,personal):null;
    if(registered&&personal.has(registered.base)){
      // Registering a nominal licenses its copula, not a missing boundary
      // before a dependent noun. A whole-expression registration above
      // still preserves the author's explicitly chosen spelling.
      if(/^[인일](?:거|것|게|건|걸|뿐|수|때)/.test(word.slice(registered.base.length)))return dependent(word,true,personal);
      return null;
    }
    // Descriptive lexical entries can contain joined 안 하다 forms.
    // This negative construction has a boundary even when a whole-form
    // analysis exists. Do not generalize to lexical 안되다 or 못하다.
    if(word.startsWith('안')){
      const rest=word.slice(1),tail=predicate(rest);
      if(tail?.root==='하')return {text:'안 '+rest,ambiguous:true,rule:'2'};
      for(const main of ['해','하여'])if(rest.startsWith(main)&&predicate(rest.slice(main.length))?.root==='보')return {text:'안 '+rest,ambiguous:true,rule:'2/47'};
    }
    const adverbBoundary=knownAdverbBoundary(word,personal);
    if(adverbBoundary)return adverbBoundary;
    // 수 있다 keeps its boundary even when the preceding adnominal is
    // already separated. 수없다 has a lexical reading and is not included.
    if(word.startsWith('수있')){
      const right=word.slice(1),nested=dependent(right,true,personal);
      if(predicate(right)?.root==='있')return {text:'수 '+right,ambiguous:false,rule:'42'};
      if(nested&&predicate(nested.text.split(' ')[0])?.root==='있')return {text:'수 '+nested.text,ambiguous:false,rule:'42'};
    }
    // Descriptive predicate inventories can also contain joined phrases.
    // These verified boundaries precede whole-form recognition; unrelated
    // lexical compounds such as 쓸데없다 remain untouched.
    for(const [host,root]of [['필요','없'],['혼자','있'],['짜증','나']])if(word.startsWith(host)&&predicate(word.slice(host.length))?.root===root)return {text:host+' '+word.slice(host.length),ambiguous:true,rule:'2'};
    // Descriptive adverb inventories also contain these joined phrases.
    // Keep the boundary explicit instead of splitting every adverb compound.
    const together=word.match(/^다(같이|함께)(도|만|는)?$/);
    if(together)return {text:'다 '+together[1]+(together[2]??''),ambiguous:true,rule:'2'};
    // The descriptive vocabulary includes 둘다/셋다 as whole forms.
    // A cardinal followed by independent 다 still keeps its word boundary.
    const allCount=word.match(/^(둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)다(요|는|도|만)?$/);
    if(allCount)return {text:allCount[1]+' 다'+(allCount[2]??''),ambiguous:true,rule:'2'};
    const quantity=word.match(/^(한두|두세|서너|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|스무|몇|여러)(번째|개|장|번|군데|달|시간|조각|권|명|사람|배|마리|살|쪽|줄|잔|병|봉지|그루|켤레|벌|세트|차례|개월|년|분|초|가지|폭|칸|날)(.*)$/);
    if(quantity&&['년','개월','달','날','시간','분','초'].includes(quantity[2])){
      const relative=quantity[3].match(/^(전|후|만에)(.*)$/);
      if(relative&&(!relative[2]||sets.josa.has(relative[2])))return {text:quantity[1]+' '+quantity[2]+' '+quantity[3],ambiguous:true,rule:'43'};
    }
    if(quantity){
      const tail=quantity[3],suffix=tail.match(/^(째|쯤|간)(.*)$/);
      const unitTail=!tail||sets.josa.has(tail)||tail==='더'||noun(quantity[2]+tail,personal)?.base===quantity[2]||suffix&&(!suffix[2]||sets.josa.has(suffix[2]));
      // 한번/한잔/한가지/한쪽 have lexical readings as well as quantities.
      // 한배 and 세배 also have nominal meanings independent of a multiplier.
      // Keep their ambiguity; other explicit numerals still need a unit gap.
      const lexical=(quantity[1]==='한'&&['번','잔','가지','쪽'].includes(quantity[2])&&tail!=='더')||quantity[1]==='여러'&&quantity[2]==='분'||quantity[2]==='배'&&knownNominal(quantity[1]+quantity[2]);
      if(unitTail&&!lexical)return {text:quantity[1]+' '+quantity[2]+(tail==='더'?' 더':tail),ambiguous:true,rule:'43'};
    }
    // Attested uses of the independent determiner 전 retain a boundary.
    // Restrict the head rather than splitting lexical 전- words or names.
    const wholeRange=word.match(/^전(세계|국민|매장|단계|주기)(.*)$/);
    if(wholeRange){
      const rest=word.slice(1),host=noun(rest,personal);
      if(host&&(host.base===wholeRange[1]||host.base===wholeRange[1]+'적'))return {text:'전 '+rest,ambiguous:true,rule:'2'};
    }
    // Demonstrative determiners precede the independent noun 정도.
    if(word.startsWith('아무데')&&(!word.slice(3)||sets.josa.has(word.slice(3))))return {text:'아무 '+word.slice(2),ambiguous:true,rule:'42'};
    // Validate the complete particle/copula tail rather than a prefix match.
    const degree=word.match(/^(이|그|저|요|어느)((정도|기능|녀석|말|앞)(.*))$/);
    // Short monosyllabic sequences can be joined under rule 46. Only
    // consider 말/앞 when a longer nominal tail establishes the phrase.
    if(degree&&(degree[3].length>1||degree[4].length>1)&&noun(degree[2],personal)?.base===degree[3])return {text:degree[1]+' '+degree[2],ambiguous:true,rule:'2'};
    // 한철 is a whole temporal noun; a preceding season is a separate word.
    // Preserve its particle/copula instead of inventing a season + 하다 stem.
    const season=word.match(/^(봄|여름|가을|겨울)(한철.*)$/);
    if(season&&noun(season[2],personal)?.base==='한철')return {text:season[1]+' '+season[2],ambiguous:true,rule:'2'};
    const calendar=word.match(/^(올해|지난해|금년|작년|내년|재작년|후년|금월|전월|익월)(초|말)(.*)$/);
    if(calendar&&(!calendar[3]||sets.josa.has(calendar[3])||predicate(calendar[3])?.root==='이'))return {text:calendar[1]+' '+calendar[2]+calendar[3],ambiguous:true,rule:'42'};
    const d=dependent(word,true,personal);
    if(d){
      const parts=d.text.split(' '),nested=parts.map(part=>auxiliaryBoundary(part,personal));
      return {...d,text:parts.map((part,i)=>nested[i]?.text??part).join(' '),ambiguous:d.ambiguous||nested.some(Boolean)};
    }
    const auxiliary=auxiliaryBoundary(word,personal);if(auxiliary)return auxiliary;
    if(analyze(word,personal))return null;
    // Apply explicit quantity/dependent-noun checks first: dictionary nouns
    // can be homographs of phrases. Only then protect a whole noun + particle
    // from speculative segmentation (독거미는 must not become 독거 미는).
    if(isRecognizedNoun(word))return null;
    // An attested particle chain can attach to an inflected ending. Keep
    // that host intact after a gap repair instead of repartitioning its stem.
    for(let i=2;i<word.length;i++){
      const tail=word.slice(i);
      if(!/^(?:부터|까지)/.test(tail)||!sets.josa.has(tail))continue;
      const host=predicate(word.slice(0,i));
      if(host&&!host.adnominal)return null;
    }
    // Preserve complete quotation/intention endings before 하다. A lexical
    // homograph 고하다 must not steal the 고 from 하려고/한다고.
    for(let i=2;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i),tail=predicate(right);
      if(tail?.root==='하'&&/(?:려고|다고|라고|자)$/.test(left)&&predicate(left))return {text:left+' '+right,ambiguous:true,rule:'2'};
      if(tail?.root==='싶'&&left.endsWith('고')&&predicate(left))return {text:left+' '+right,ambiguous:true,rule:'47'};
    }
    for(let i=2;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i);
      if(!/(?:나|은가|는가|인가)$/.test(left)||predicate(right)?.root!=='보')continue;
      if(predicate(left)||noun(left,personal)?.copula||left.endsWith('인가')&&(knownNominal(left.slice(0,-2))||personal.has(left.slice(0,-2))))return {text:left+' '+right,ambiguous:true,rule:'47'};
    }
    // These are grammatical boundaries, not arbitrary noun segmentation.
    // Whole-word and personal recognition above still protects compounds.
    const occasion=word.match(/^(.{2,}?)시([가-힣]*)$/);
    // Action nouns also include 오산/진주/고양, which can name cities.
    // Limit this ambiguous 時 boundary to explicit activity hosts.
    if(occasion&&['사용','이용','구매','예약','방문','여행','비행','출근','퇴근','접속','결제','신청','취소','변경','작성','수정','저장','삭제','입력','출력'].includes(occasion[1])&&!recognizeWhole?.(word,personal)&&
      (!occasion[2]||sets.josa.has(occasion[2])||predicate(occasion[2])?.root==='이'))return {text:occasion[1]+' 시'+occasion[2],ambiguous:true,rule:'42'};
    for(let i=1;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i),host=noun(left,personal);
      const rightNoun=noun(right,personal);
      // Bound demonstrative hosts: arbitrary 저 + noun would split 저전력
      // and 저장소, while arbitrary 이 + noun can be a compound or name.
      const demonstrativeHost=['이','그','저'].includes(left)&&['제품','방법','문제','내용','상황','경우'].includes(rightNoun?.base);
      if((['다른','어느','아무','모든','여러','무슨','온갖'].includes(left)||demonstrativeHost)&&rightNoun)return {text:left+' '+right,ambiguous:true,rule:'2'};
      const duration=right.match(/^(동안|때문|내내)(.*)$/);
      if(host&&duration&&(!duration[2]||sets.josa.has(duration[2])))return {text:left+' '+right,ambiguous:true,rule:'2'};
      const enumeration=right.match(/^등(.*)$/);
      if(left.length>=2&&(host||knownNominal(left))&&enumeration&&!recognizeWhole?.(word,personal)&&
        (!enumeration[1]||sets.josa.has(enumeration[1])||predicate(enumeration[1])?.root==='이'))return {text:left+' '+right,ambiguous:true,rule:'42'};
      // Spatial nouns keep their particles after a separate nominal host.
      // Whole compounds (마음속 / 바닷속) and short uncertain compounds
      // retain priority; dictionary absence alone does not prove a gap.
      const spatial=right.match(/^(속|쪽|아래)(.*)$/);
      // Recognition-only strings may themselves contain particle errors
      // (정렬가). A subject/object particle is not a spatial noun modifier;
      // bare recognized nouns such as 폭염 retain their boundary.
      const spatialHost=host?(host.base===left||left.slice(host.base.length)==='의'):knownNominal(left);
      if(spatialHost&&left.length>=2&&spatial&&!recognizeWhole?.(word,personal)&&
        (!spatial[2]||sets.josa.has(spatial[2])||predicate(spatial[2])?.root==='이'))return {text:left+' '+right,ambiguous:true,rule:'2/42'};
      if(host&&['절대','계속','다시'].includes(right))return {text:left+' '+right,ambiguous:true,rule:'2'};
      const tail=predicate(right);
      const independentAdverb=sets.adverb.has(left)||left.length===2&&left[0]===left[1]&&adverbs.has(left);
      if(left.length>=2&&independentAdverb&&!right.startsWith(left)&&tail&&!['하','이','되','시키'].includes(tail.root)&&!predicate(left))return {text:left+' '+right,ambiguous:true,rule:'2'};
    }
    // Degree adverb 많이 is a separate word before 하다. The generic
    // mimetic-adverb guard below must still protect 빠릿하게/버벅이지.
    if(word.startsWith('많이')&&predicate(word.slice(2))?.root==='하')return {text:'많이 '+word.slice(2),ambiguous:false,rule:'2'};
    // 덜 is a short degree adverb excluded by the general two-syllable
    // guard. Require the complete following predicate and preserve lexical
    // whole forms, including the recognition-only 덜떨어지다 / 덜되다.
    if(word.startsWith('덜')&&predicate(word.slice(1))&&!recognizeWhole?.(word,personal))return {text:'덜 '+word.slice(1),ambiguous:true,rule:'2'};
    // The descriptive noun inventory includes the determiner 무슨. Its
    // nominal classification otherwise hides the boundary before a copula.
    if(word.startsWith('무슨')&&noun(word.slice(2),personal)?.copula)return {text:'무슨 '+word.slice(2),ambiguous:true,rule:'2'};
    // Rule 47: require a known derived/compound main verb before proposing
    // a mandatory auxiliary space. An unclassified long verb is review-only.
    for(let i=3;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i),main=predicate(left),aux=predicate(right);
      const auxiliaryRoot=aux?.root.endsWith('고프')?aux.root.slice(0,-2):aux?.root;
      // 달라 also has a 다르다 homograph. A validated -어 main verb
      // licenses the request reading here without changing standalone 달라.
      const requesting=/^달라(?:고|는|며)?$/.test(right);
      const prospectiveAux=main?.adnominal&&(aux?.root==='듯하'||final(left)===8&&['만하','뻔하'].includes(aux?.root));
      const causative=main?.root.endsWith('시키')&&left===main.root.slice(0,-1)+'켜';
      const contractedVowel=final(left)===0&&[6,9,14,10].includes(Math.floor((left.charCodeAt(left.length-1)-0xac00)%588/28));
      if(main&&(prospectiveAux||(connectiveForms.has(left)||/(?:아|어|해|하여)$/.test(left)||contractedVowel||causative)&&aux&&(['주','보','내','드리','있','오','가','두','놓','버리'].includes(auxiliaryRoot)||requesting))){
        // 떠먹이다 is a verified causative derivation. Its contracted
        // 떠먹여 retains the mandatory boundary before a following auxiliary.
        const derived=main.root==='떠먹이'||main.root.endsWith('하')&&knownNominal(main.root.slice(0,-1))||main.root.endsWith('드리')&&knownNominal(main.root.slice(0,-2))||main.root.endsWith('받')&&batdaNouns.has(main.root.slice(0,-1))||causative&&knownNominal(main.root.slice(0,-2));
        const compound=['들어가','넘어가','돌아가','내려가','올라가','알아보','돌아보','들여다보'].includes(main.root);
        return derived||compound?{text:left+' '+right,ambiguous:true,rule:'47'}:null;
      }
    }
    // Independent negative adverbs precede the predicate with a space.
    // Whole-word recognition above protects compounds such as 못생기다.
    if(/^(안|못)/.test(word)){
      // Protect the verified lexical compound in the recognition-only
      // vocabulary. Other descriptive joined forms include 못받다 errors.
      if(word.startsWith('못생')&&recognizeWhole?.(word,personal)?.root==='못생기')return null;
      const tail=predicate(word.slice(1));
      // 못하다 is also a lexical/auxiliary predicate (쓰지 못하다).
      // The surface alone cannot justify splitting it.
      if(word[0]==='못'&&tail?.root==='하')return null;
      if(tail)return {text:word[0]+' '+word.slice(1),ambiguous:true,rule:'2'};
      const phrase=dependent(word.slice(1),true,personal);
      if(phrase)return {text:word[0]+' '+phrase.text,ambiguous:true,rule:'2/42'};
    }
    // Prefer an attested noun+particle followed by a predicate over the
    // generic noun-only path (화면에 / 서보이는 hides 화면에서 / 보이는).
    // Whole-word recognition above still protects names and compounds.
    for(let i=2;i<word.length;i++){
      if(!['에서','에게','께서'].includes(word.slice(i-2,i)))continue;
      const left=word.slice(0,i),right=word.slice(i),host=noun(left,personal),tail=predicate(right);
      if(host&&['에서','에게','께서'].includes(left.slice(host.base.length))&&tail&&tail.root!=='이')return {text:left+' '+(dependent(right,false,personal)?.text??right),ambiguous:true,rule:'2'};
    }
    // Subject particles belong to the nominal before an existential predicate.
    // A homographic 가다 analysis must not take the 가 from 사과가 있다.
    for(let i=3;i<word.length;i++){
      const left=word.slice(0,i),host=noun(left,personal),right=word.slice(i),tail=predicate(right);
      if(host&&['이','가'].includes(left.slice(host.base.length))&&['있','없'].includes(tail?.root))return {text:left+' '+right,ambiguous:true,rule:'2'};
    }
    // A short unknown noun plus particle is a reviewable name, not split fodder.
    if(word.length<=4&&unknownNoun(word)?.base.length===2)return null;
    if(recognizeWhole?.(word,personal))return null;
    // A known nominal followed by a derivational suffix may be a single
    // lexical predicate even when the selected stem inventory omits it.
    // This is not recognition: retain unknown-word review instead of using
    // unrelated shorter fragments to recommend an internal space.
    for(let i=2;i<word.length;i++){
      const left=word.slice(0,i),suffix=predicate(word.slice(i))??(word.endsWith('듯')?predicate(word.slice(i,-1)):null);
      if(!knownNominal(left)&&!placeNames.has(left))continue;
      // A conditional predicate can have a noun homograph (팔면/하면).
      // In -면 되다 the independent 동사 still requires its boundary.
      if(suffix?.root==='되'&&left.endsWith('면')&&predicate(left))continue;
      if(['하','되','시키','스럽'].includes(suffix?.root))return null;
    }
    // A known nominal with an attested nominal affix is a possible single
    // word. Do not split its interior using unrelated homographs. This only
    // blocks speculative spacing: unrecognized forms still get a review.
    for(let i=3;i<=word.length;i++){
      const base=word.slice(0,i),tail=word.slice(i);
      const affixed=/[군판기]$/.test(base)&&knownNominal(base.slice(0,-1))||base.startsWith('대')&&actionNouns.has(base.slice(1));
      if(affixed&&(!tail||sets.josa.has(tail)||predicate(tail)?.root==='이'))return null;
    }
    // A complete -기 nominalization follows its object noun as a word.
    // Prefer that grammatical boundary to unrelated noun fragments, while
    // whole lexical activities (줄넘기 / 글쓰기) retain priority above.
    for(let i=1;i<word.length-1;i++){
      const left=word.slice(0,i),right=word.slice(i),host=noun(left,personal),activity=noun(right,personal);
      if(!host||host.base!==left||!activity?.nominal||!activity.base.endsWith('기'))continue;
      const verb=predicate(activity.base);
      if(verb&&verb.root!==activity.base&&verb.root!=='이')return {text:left+' '+right,ambiguous:true,rule:'2'};
    }
    for(let i=2;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i);
      // An attested X같이 can be a lexical compound whose adjective stem
      // is absent from the selected roots. Keep that uncertainty for review;
      // it does not justify inserting a space into X같은/X같아서.
      if(predicate(right)?.root==='같'&&adverbs.has(left+'같이'))return null;
      if((knownNominal(left)||personal.has(left))&&predicate(right)?.root==='같')return {text:left+' '+right,ambiguous:true,rule:'2'};
    }
    // Preserve whole lexical forms and nominal affixes before considering
    // a complete adnominal predicate followed by a known nominal.
    // 던 has a dictionary noun homograph, but after an inflected predicate
    // that fragment alone cannot justify splitting an unknown short name.
    if(word.endsWith('던')&&predicate(word.slice(0,-1)))return null;
    for(let i=1;i<word.length;i++){
      const left=word.slice(0,i),right=word.slice(i),modifier=predicate(left),nominal=noun(right,personal);
      if(!/[은는던]$/.test(left)&&![4,8].includes(final(left)))continue;
      // Two unfamiliar syllables can each resemble a verb and noun.
      // That coincidence alone does not justify splitting a short name
      // or loanword. Explicit dependent-noun boundaries ran above.
      if(word.length===2&&final(left)===4&&!sets.adjective.has(modifier?.root))continue;
      if(predicate(right)?.root==='이')continue;
      // Do not take 올 from the longer nominal 올해, or another known
      // nominal prefix, just because its first syllable is also a predicate.
      // A validated adjective modifier has an independent boundary: 큰문
      // must not block 큰 + 문제. Whole lexical compounds were kept above.
      if(!sets.adjective.has(modifier?.root)&&Array.from({length:word.length-i-1},(_,n)=>word.slice(0,i+n+1)).some(knownNominal))continue;
      if(modifier?.adnominal&&modifier.root!=='이'&&!knownNominal(left)&&nominal&&!nominal.nominal)return {text:left+' '+right,ambiguous:true,rule:'2'};
    }
    // An adverb can be used as a nickname before the copula. Keep the whole
    // unknown nominal for review; its internal fragments do not prove a gap.
    for(let i=2;i<word.length;i++)if(adverbs.has(word.slice(0,i))&&predicate(word.slice(i))?.root==='이')return null;
    if(word.length>64)return null;
    const best=Array(word.length+1).fill(null);best[0]={cost:0,parts:[],unknowns:[]};
    for(let end=1;end<=word.length;end++)for(let start=Math.max(0,end-24);start<end;start++) {
      if(!best[start])continue;
      const part=word.slice(start,end),a=analyze(part,personal,true),dep=knownAdverbBoundary(part,personal)??dependent(part,false,personal);
      if(!a&&!dep)continue;
      if(start===0&&end===word.length&&a?.unknown)continue;
      if(part.length===1&&!['수','것','걸','때','뿐','후','전','뒤','번','시','개','장','한','두','세','네','할','더'].includes(part))continue;
      const cost=best[start].cost+(a?.cost??1)+1.2+(part.length===1?2:0);
      if(!best[end]||cost<best[end].cost)best[end]={cost,parts:[...best[start].parts,dep?.text??part],unknowns:[...best[start].unknowns,...(a?.unknown&&!dep?[a.base]:[])]};
    }
    const result=best.at(-1);
    // A copula needs a nominal host. Two copula fragments cannot explain
    // an unknown name, and an imperative followed by a noun fragment is
    // not enough evidence for a missing internal space.
    if(result?.parts.length===2){
      const [left,right]=result.parts,a=analyze(left,personal,true),b=analyze(right,personal,true);
      // A standalone particle is not a new word after a possible verb ending.
      if(sets.josa.has(right)&&predicate(right)?.root==='이')return null;
      if(a?.kind==='predicate'&&!a.adnominal&&!connectiveForms.has(left)&&
        (a.root===left||/(?:습니다|어요|아요|겠다|마)$/.test(left)))return null;
      // -답다 can attach to a nominal host, including a name. A homographic
      // 다운 fragment does not prove an internal gap; retain lexical review.
      if((knownNominal(left)||isRecognizedNoun(left))&&predicate(right)?.root==='답')return null;
      if(a?.kind==='predicate'&&a.root==='이'&&b?.kind==='predicate'&&b.root==='이')return null;
      if(a?.kind==='predicate'&&!a.adnominal&&left.endsWith('자')&&b?.kind==='noun')return null;
    }
    // Repetition can belong to a single mimetic expression. Do not turn
    // that lexical uncertainty into a spacing correction.
    if(result?.parts.length===2&&adverbs.has(result.parts[0])&&result.parts[1].startsWith(result.parts[0]))return null;
    // Mimetic adverbs overlap the bases of derived verbs/adjectives.
    // Their dictionary presence cannot license a space before -이다/-하다.
    if(result?.parts.length===2&&adverbs.has(result.parts[0])&&['이','하'].includes(predicate(result.parts[1])?.root))return null;
    // 전 can be the bound suffix 戰, not only the temporal noun 前.
    // A nominal host with a verbal homograph does not establish a gap.
    // Restrict this guard to the nominal/copula homograph; duration and
    // activity hosts still allow a temporal boundary.
    if(result?.parts.length===2){
      const [left,right]=result.parts,tail=noun(right,personal);
      if(knownNominal(left)&&predicate(left)?.root==='이'&&tail?.base==='전')return null;
    }
    // -기 can name an account of an activity. Its homograph 기다 does
    // not justify separating a bare noun from 기 + particle.
    if(result?.parts.length===2&&noun(result.parts[0],personal)?.base===result.parts[0]&&result.parts[1].startsWith('기')&&sets.josa.has(result.parts[1].slice(1)))return null;
    // An ending fragment is not an independent word after a declarative.
    if(result?.parts.some((part,i)=>i>0&&/^(?:던지|던가|겠)/.test(part)))return null;
    if(result?.parts.length>1){
      const first=result.parts[0],host=noun(first,personal);
      // A one-syllable noun plus an ending-like fragment is weak evidence
      // inside a possible name. Clear particles still license 눈이 / 오면.
      const firstPredicate=predicate(first);
      const independentPredicate=firstPredicate&&firstPredicate.root!=='이'||/^[이그저요]게$/.test(first);
      if(host?.base.length===1&&!independentPredicate&&(unknownNoun(word)||!shortHostParticles.has(first.slice(host.base.length))))return null;
    }
    // Unknown fragments do not justify splitting a word. A recognized
    // multi-syllable particle can establish the boundary after an unknown
    // name; a dependent-noun rule already validates its own predicate.
    if(result?.unknowns.length&&!(result.unknowns.length===1&&['에서','에게','께서'].some(p=>result.parts[0]===result.unknowns[0]+p)))return null;
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
      return a?.kind==='noun'&&(!adverbs.has(p)||a.base!==p&&!a.nominal)&&!predicate(p)?.adnominal;
    })&&(!predicate(result.parts.at(-1))||analyze(result.parts.at(-1),personal,true)?.nominal&&result.parts.slice(0,-1).every(p=>noun(p,personal)?.base===p)))return null;
    // A verbal homograph of a bare noun (파일/메일) is not enough to
    // split its compound. Keep explicit duration/adverb boundaries usable.
    if(result&&result.parts.every(p=>analyze(p,personal,true)?.kind==='noun')&&noun(result.parts[0],personal)?.base===result.parts[0]&&!['동안','이상','이하','전','후','계속','다시'].includes(result.parts.at(-1)))return null;
    // Dictionary-recognized fragments establish a possible segmentation,
    // not its meaning in context. All generic segmentation needs review.
    return result&&result.parts.length>1?{text:result.parts.join(' '),ambiguous:true,rule:'41/42',unknowns:result.unknowns}:null;
  }
  return {analyze,predicate,spacing,unknownNoun,isDridaNoun:word=>dridaNouns.has(word),isBatdaNoun:word=>batdaNouns.has(word),isDerivedNominal:derivedNominal,isDoedaNoun:word=>doedaNouns.has(word),
    isNominalAdnominal:(word,personal)=>Boolean(isNominalAdnominal(word,noun(word,personal),personal))};
}
