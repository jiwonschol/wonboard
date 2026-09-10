// Original Wonboard prototype (MIT). Not connected to the production Worker.
// No network access; dictionaries are supplied by the caller.
export function createChecker(data) {
  const sets=Object.fromEntries(Object.entries(data.ko).map(([k,v])=>[k,new Set(v)]));
  const stems=new Set([...sets.verb,...sets.adjective]);
  const english=new Set(data.en);
  const enLower=new Set(data.en.filter(w=>w===w.toLowerCase()));
  const koWords=[...new Set([...sets.noun,...sets.adverb,...stems])];
  const koByLength=new Map();
  for(const word of koWords){const bucket=koByLength.get(word.length)||[];bucket.push(word);koByLength.set(word.length,bucket);}
  function ending(s) {
    if(sets.ending.has(s))return true;
    for(let i=1;i<s.length;i++) if(sets.preEnding.has(s.slice(0,i))&&sets.ending.has(s.slice(i)))return true;
    return false;
  }
  function verb(s) {
    for(let i=1;i<s.length;i++) {
      const stem=s.slice(0,i), tail=s.slice(i);
      if((stems.has(stem)||(stem.endsWith('하')&&sets.noun.has(stem.slice(0,-1))))&&ending(tail))return true;
      // Honorific marker follows the lexical stem, before the ending.
      if(stem.endsWith('시')&&stems.has(stem.slice(0,-1))&&ending(tail))return true;
      if(stem.endsWith('하시')&&sets.noun.has(stem.slice(0,-2))&&ending(tail))return true;
    }
    return false;
  }
  function analysis(s,personal,allowUnknown=false) {
    if(personal.has(s)||sets.noun.has(s))return {cost:1,base:s};
    if(sets.adverb.has(s))return {cost:1,base:s};
    if(verb(s))return {cost:.8,base:s};
    for(let i=s.length-1;i>0;i--) if(sets.josa.has(s.slice(i))) {
      const base=s.slice(0,i);
      if(personal.has(base)||sets.noun.has(base))return {cost:.6,base};
      if(allowUnknown&&base.length>=2&&base.length<=6)return {cost:4,base,unknown:true};
    }
    return null;
  }
  function segment(word,personal) {
    // Bound work for pathological unspaced input; caller sees unknown, not success.
    if(word.length>64)return null;
    const best=Array(word.length+1).fill(null);best[0]={cost:0,parts:[]};
    for(let end=1;end<=word.length;end++)for(let start=Math.max(0,end-24);start<end;start++) {
      if(!best[start])continue;
      const part=word.slice(start,end),a=analysis(part,personal,true);
      if(!a)continue;
      const candidate={cost:best[start].cost+a.cost+1.3,parts:[...best[start].parts,part]};
      if(!best[end]||candidate.cost<best[end].cost)best[end]=candidate;
    }
    return best.at(-1)?.parts.length>1?best.at(-1).parts.join(' '):null;
  }
  // Damerau distance one: insertion/deletion/substitution/adjacent transposition.
  function nearOne(a,b) {
    if(Math.abs(a.length-b.length)>1||a===b)return false;
    let i=0;while(i<a.length&&a[i]===b[i])i++;
    if(a.length===b.length)return a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));
    return a.length>b.length?a.slice(i+1)===b.slice(i):a.slice(i)===b.slice(i+1);
  }
  function englishSuggestions(word) {
    const lower=word.toLowerCase(),alphabet='abcdefghijklmnopqrstuvwxyz',candidates=new Set();
    const add=s=>{if(enLower.has(s))candidates.add(s);};
    for(let i=0;i<=lower.length;i++) {
      add(lower.slice(0,i)+lower.slice(i+1));
      if(i+1<lower.length)add(lower.slice(0,i)+lower[i+1]+lower[i]+lower.slice(i+2));
      for(const c of alphabet){add(lower.slice(0,i)+c+lower.slice(i));if(i<lower.length)add(lower.slice(0,i)+c+lower.slice(i+1));}
    }
    return [...candidates].sort((a,b)=>Math.abs(a.length-lower.length)-Math.abs(b.length-lower.length)||a.localeCompare(b)).slice(0,5).map(s=>word===word.toUpperCase()?s.toUpperCase():/^[A-Z][a-z]+$/.test(word)?s[0].toUpperCase()+s.slice(1):s);
  }
  function koreanSuggestions(word) {
    const suggestions=[];
    for(let split=word.length;split>=2;split--) {
      const root=word.slice(0,split),suffix=word.slice(split);
      if(suffix&&!sets.josa.has(suffix)&&!ending(suffix))continue;
      for(const n of [root.length,root.length-1,root.length+1])for(const candidate of koByLength.get(n)||[]) {
        if(nearOne(root,candidate))suggestions.push(candidate+suffix);
      }
    }
    return [...new Set(suggestions)].slice(0,5);
  }
  return function check(text,words=[]) {
    const personal=new Set(words),results=[];
    const excluded=[...text.matchAll(/https?:\/\/[^\s]+|`[^`]*`/g)].map(m=>[m.index,m.index+m[0].length]);
    function emit(from,to,language,type,suggestions,base) {results.push({from,to,original:text.slice(from,to),language,type,suggestions,base,applicable:suggestions.length>0,reason:type==='unknown'?'Not in the selected vocabulary':'Prototype lexical candidate; rule source not yet verified'});}
    for(const m of text.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[가-힣]+/g)) {
      const word=m[0],from=m.index,to=from+word.length;
      if(excluded.some(([a,b])=>from<b&&to>a)||/[0-9_]/.test(text[from-1]||'')||/[0-9_]/.test(text[to]||''))continue;
      if(/^[A-Za-z]/.test(word)) {
        if(personal.has(word)||english.has(word)||enLower.has(word.toLowerCase())||english.has(word.replace(/['’]s$/,'')))continue;
        // Preserve camel-case identifiers and acronyms as unknown expressions.
        const candidates=/^[A-Z]{2,}$|[a-z][A-Z]/.test(word)?[]:englishSuggestions(word);
        emit(from,to,'en',candidates.length?'spelling':'unknown',candidates,word);
      } else {
        // A trailing Korean particle on an English word is not a separate error.
        if(/[A-Za-z]/.test(text[from-1]||'')&&(sets.josa.has(word)||ending(word)))continue;
        if(analysis(word,personal))continue;
        const spaced=segment(word,personal);
        if(spaced&&spaced.replaceAll(' ','')===word){emit(from,to,'ko','spacing',[spaced]);continue;}
        const unknown=analysis(word,personal,true);
        if(unknown?.unknown){emit(from,from+unknown.base.length,'ko','unknown',[],unknown.base);continue;}
        const candidates=koreanSuggestions(word);
        emit(from,to,'ko',candidates.length?'spelling':'unknown',candidates,word);
      }
    }
    return results.sort((a,b)=>a.from-b.from||a.to-b.to);
  };
}
