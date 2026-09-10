// Original MIT morphology prototype. Lexical data is supplied, never downloaded.
export function createMorphology(sets,data) {
  const roots=new Set([...sets.verb,...sets.adjective]);
  const final=s=>(s.charCodeAt(s.length-1)-0xac00)%28;
  const withFinal=(s,n)=>s.slice(0,-1)+String.fromCharCode(s.charCodeAt(s.length-1)-final(s)+n);
  const forms=new Map();
  const prefixes=new Map();
  const consonantEndings=['니다','니까','시다'];
  function add(surface,root,adnominal=false){if(surface&&!forms.has(surface))forms.set(surface,{root,adnominal});}
  function expand(root) {
    // Regular stem + endings, including a syllable-final adnominal consonant.
    prefixes.set(root,root);
    if(final(root)===0||final(root)===8){
      const vowelStem=final(root)===8?withFinal(root,0):root;
      for(const tail of consonantEndings)add(withFinal(vowelStem,17)+tail,root);
      for(const tail of ['게','게요','까','까요'])add(withFinal(vowelStem,8)+tail,root);
    }
    if(final(root)===0){add(withFinal(root,4),root,true);add(withFinal(root,8),root,true);}
    else if(final(root)===8){add(withFinal(root,4),root,true);add(root,root,true);}
    add(root+'는',root,true);add(root+'은',root,true);add(root+'을',root,true);
    // Honorific -시-, followed by ordinary endings.
    const honor=final(root)===0?root+'시':final(root)===8?withFinal(root,0)+'시':root+'으시';
    add(withFinal(honor,4),root,true);add(honor+'는',root,true);
    prefixes.set(honor,root);
    for(const tail of consonantEndings)add(withFinal(honor,17)+tail,root);
    // Rules 34/35: vowel contraction and past tense. Do not invent irregular roots.
    let contracted;
    if(root.endsWith('하'))contracted=root.slice(0,-1)+'해';
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
      add(contracted,root);
      for(const tail of ['요','서','도','야','야만','야지','줘','주세요'])add(contracted+tail,root);
      const past=withFinal(contracted,20);
      prefixes.set(past,root);
      add(past+'어요',root);add(past+'습니다',root);
    }
  }
  for(const root of roots)expand(root);
  for(const [surface,ending,root] of data?.forms??[]){
    if(ending==='EP')prefixes.set(surface,root);
    else if(['EC','EF','ETM','ETN'].includes(ending)){
      const p=forms.get(surface);
      if(!p||ending==='ETM')forms.set(surface,{root,adnominal:ending==='ETM'});
    }
  }
  const adverbs=new Set([...sets.adverb,...(data?.adverbs??[])]);
  function isEnding(s){
    if(sets.ending.has(s))return true;
    for(let i=1;i<s.length;i++)if(sets.preEnding.has(s.slice(0,i))&&sets.ending.has(s.slice(i)))return true;
    return false;
  }
  // Noun + 하다 is checked lazily; do not materialize millions of combinations.
  function predicate(s) {
    if(forms.has(s))return forms.get(s);
    for(let i=1;i<s.length;i++)if(prefixes.has(s.slice(0,i))&&isEnding(s.slice(i)))return {root:prefixes.get(s.slice(0,i)),adnominal:/^(는|은|던|을)$/.test(s.slice(i))};
    for(let i=2;i<s.length;i++) {
      if(!sets.noun.has(s.slice(0,i)))continue;
      const suffix=s.slice(i);
      let tail=forms.get(suffix);
      if(!tail)for(let j=1;j<suffix.length;j++)if(prefixes.get(suffix.slice(0,j))==='하'&&isEnding(suffix.slice(j)))tail={root:'하',adnominal:/^(는|은|던|을)$/.test(suffix.slice(j))};
      if(tail?.root==='하')return {root:s.slice(0,i)+'하',adnominal:tail.adnominal};
    }
    return null;
  }
  function noun(s,personal) {
    if(personal.has(s)||sets.noun.has(s))return {base:s,unknown:false};
    for(let i=1;i<s.length;i++)if(s.slice(i).startsWith('들')&&(!s.slice(i+1)||sets.josa.has(s.slice(i+1)))&&(sets.noun.has(s.slice(0,i))||personal.has(s.slice(0,i))))return {base:s.slice(0,i),unknown:false};
    // Longest particle first, to avoid treating a piece of the particle as a noun.
    for(let i=1;i<s.length;i++)if(sets.josa.has(s.slice(i))&&(personal.has(s.slice(0,i))||sets.noun.has(s.slice(0,i))))return {base:s.slice(0,i),unknown:false};
    for(const tail of ['입니다','입니까','이었다','이었어요','이에요','예요'])if(s.endsWith(tail)){
      const base=s.slice(0,-tail.length);if(sets.noun.has(base)||personal.has(base))return {base,unknown:false};
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
    // Preserve a permitted auxiliary spelling; do not recommend optional spaces.
    for(const tail of ['주세요','주다','줬어요','보세요','보다','봤어요'])if(s.endsWith(tail)){
      const left=s.slice(0,-tail.length),p=predicate(left);
      if(p&&/[아어해]$/.test(left)&&left.length<=2)return {kind:'predicate',cost:.8,root:p.root};
    }
    const u=unknown&&unknownNoun(s);return u?{...u,kind:'noun',cost:2.5}:null;
  }
  function dependent(s) {
    // Surface -걸 is also an ending. Return a review candidate, not a certainty.
    for(const dep of ['것을','것이','것은','것','걸','수','때','뿐']) {
      if(!s.endsWith(dep))continue;
      const left=s.slice(0,-dep.length),p=predicate(left);
      if(p?.adnominal)return {text:left+' '+dep,ambiguous:dep==='걸',rule:'42'};
    }
    return null;
  }
  function spacing(word,personal) {
    if(personal.has(word))return null;
    const quantity=word.match(/^(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)(개|장|번)(.*)$/);
    if(quantity&&(!quantity[3]||sets.josa.has(quantity[3])||quantity[3]==='더')){
      // 한 번 vs 한번 and 세 시 vs 세시 need contextual interpretation.
      if(quantity[2]!=='번'||quantity[3]==='더')return {text:quantity[1]+' '+quantity[2]+(quantity[3]==='더'?' 더':quantity[3]),ambiguous:true,rule:'43'};
    }
    const d=dependent(word);if(d)return d;
    if(analyze(word,personal))return null;
    // A short unknown noun plus particle is a reviewable name, not split fodder.
    if(word.length<=4&&unknownNoun(word)?.base.length===2)return null;
    if(word.length>64)return null;
    const best=Array(word.length+1).fill(null);best[0]={cost:0,parts:[],unknowns:[]};
    for(let end=1;end<=word.length;end++)for(let start=Math.max(0,end-24);start<end;start++) {
      if(!best[start])continue;
      const part=word.slice(start,end),a=analyze(part,personal,true),dep=dependent(part);
      if(!a&&!dep)continue;
      if(start===0&&end===word.length&&a?.unknown)continue;
      if(part.length===1&&!['수','것','걸','때','뿐','후','전','뒤','번','시','개','장','한','두','세','네','할','더'].includes(part))continue;
      const cost=best[start].cost+(a?.cost??1)+1.2+(part.length===1?2:0);
      if(!best[end]||cost<best[end].cost)best[end]={cost,parts:[...best[start].parts,dep?.text??part],unknowns:[...best[start].unknowns,...(a?.unknown?[a.base]:[])]};
    }
    const result=best.at(-1);
    // Adjacent dictionary nouns may be one name/compound. Without a predicate
    // or adverb boundary, do not recommend splitting an unknown proper name.
    if(result&&result.parts.every(p=>analyze(p,personal,true)?.kind==='noun'&&!adverbs.has(p)&&!predicate(p)?.adnominal))return null;
    return result&&result.parts.length>1?{text:result.parts.join(' '),ambiguous:result.unknowns.length>0||result.parts.some(p=>p.endsWith(' 걸')),rule:'41/42',unknowns:result.unknowns}:null;
  }
  return {analyze,predicate,spacing,unknownNoun};
}
