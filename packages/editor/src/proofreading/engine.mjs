// Original Wonboard experimental checker (MIT), shared by evaluation and review Worker.
// No network access; dictionaries are supplied by the caller.
import {createMorphology} from './korean-morphology.mjs';
import {orthography} from './korean-orthography.mjs';
import {contextSuggestion} from './korean-context.mjs';
export function createChecker(data) {
  const sets=Object.fromEntries(Object.entries(data.ko).map(([k,v])=>[k,new Set(v)]));
  const morphology=createMorphology(sets,data.morphology);
  // An extended recognition vocabulary must not flood candidate generation or
  // split community names into obscure dictionary nouns.
  const recognizedNouns=new Set(data.morphology?.recognizedNouns??[]);
  const particles=[...sets.josa];
  const recognizedNoun=word=>recognizedNouns.has(word)||particles.some(p=>word.endsWith(p)&&recognizedNouns.has(word.slice(0,-p.length)));
  const english=new Set(data.en);
  const enLower=new Set(data.en.filter(w=>w===w.toLowerCase()));
  const englishByLength=new Map();
  for(const word of enLower){const key=word.slice(0,3)+':'+word.length;const bucket=englishByLength.get(key)||[];bucket.push(word);englishByLength.set(key,bucket);}
  const koWords=[...new Set([...sets.noun,...sets.adverb,...(data.morphology?.adverbs??[]),...(data.morphology?.forms??[]).filter(([,tag])=>['EF','EC','ETM','ETN'].includes(tag)).map(([word])=>word)])];
  const koByLength=new Map();
  for(const word of koWords){const bucket=koByLength.get(word.length)||[];bucket.push([word,word.normalize('NFD')]);koByLength.set(word.length,bucket);}
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
    // Recover compound typos only when a one-edit candidate does not exist.
    // Keep the search bounded and preserve the initial letter for names.
    if(!candidates.size&&lower.length>=6&&lower.length<=32&&/^[a-z]+$/.test(lower)){
      const distanceTwo=(a,b)=>{
        let previous=Array.from({length:b.length+1},(_,i)=>i),before;
        for(let i=1;i<=a.length;i++){
          const row=[i];let minimum=i;
          for(let j=1;j<=b.length;j++){
            row[j]=Math.min(previous[j]+1,row[j-1]+1,previous[j-1]+Number(a[i-1]!==b[j-1]));
            if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],before[j-2]+1);
            minimum=Math.min(minimum,row[j]);
          }
          if(minimum>2)return false;
          before=previous;previous=row;
        }
        return previous[b.length]<=2;
      };
      for(let length=lower.length-2;length<=lower.length+2;length++)for(const candidate of englishByLength.get(lower.slice(0,3)+':'+length)||[]){
        if(candidate[0]===lower[0]&&distanceTwo(lower,candidate))candidates.add(candidate);
      }
    }
    const transpositions=new Set(),doubled=new Set();
    for(let i=0;i+1<lower.length;i++)transpositions.add(lower.slice(0,i)+lower[i+1]+lower[i]+lower.slice(i+2));
    for(let i=0;i<lower.length;i++){
      doubled.add(lower.slice(0,i)+lower[i]+lower.slice(i));
      if(lower[i]===lower[i+1])doubled.add(lower.slice(0,i)+lower.slice(i+1));
    }
    const suffixScore=s=>['ly','ing','ed'].some(ending=>lower.endsWith(ending)&&s.endsWith(ending))?1:0;
    return [...candidates].filter(s=>!(/^[A-Z]/.test(word)&&word.length>3)||s[0]===lower[0]).sort((a,b)=>Number(transpositions.has(b))-Number(transpositions.has(a))||Number(doubled.has(b))-Number(doubled.has(a))||suffixScore(b)-suffixScore(a)||Math.abs(a.length-lower.length)-Math.abs(b.length-lower.length)||a.localeCompare(b)).slice(0,5).map(s=>word===word.toUpperCase()?s.toUpperCase():/^[A-Z][a-z]+$/.test(word)?s[0].toUpperCase()+s.slice(1):s);
  }
  function koreanSuggestions(word) {
    const suggestions=[];
    for(let split=word.length;split>=2;split--) {
      const root=word.slice(0,split),suffix=word.slice(split);
      if(suffix&&!sets.josa.has(suffix)&&!sets.ending.has(suffix))continue;
      const decomposed=root.normalize('NFD');
      for(const [candidate,nfd] of koByLength.get(root.length)||[]) {
        if(root.length>=3&&nearOne(decomposed,nfd))suggestions.push(candidate+suffix);
      }
    }
    return [...new Set(suggestions)].slice(0,5);
  }
  return function check(text,words=[]) {
    const personal=new Set(words),results=[];
    const excluded=[...text.matchAll(/https?:\/\/[^\s]+|`[^`]*`|\b[A-Za-z0-9_-]+\.(?:md|txt|png|jpe?g|gif|webp|pdf|json|tsx?|jsx?|html|css|zip)\b|\b(?:Ctrl|Control|Alt|Option|Shift|Cmd|Command|Meta)(?:\+[A-Za-z0-9]+)+/g)].map(m=>[m.index,m.index+m[0].length]);
    function emit(from,to,language,type,suggestions,base) {results.push({from,to,original:text.slice(from,to),language,type,suggestions,base,applicable:suggestions.length>0,reason:type==='unknown'?'Not in the selected vocabulary':'Prototype lexical candidate; rule source not yet verified'});}
    for(const m of text.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[가-힣ㄱ-ㅎㅏ-ㅣ]+/g)) {
      const word=m[0],from=m.index,to=from+word.length;
      if(excluded.some(([a,b])=>from<b&&to>a)||/[0-9_]/.test(text[from-1]||'')||/[0-9_]/.test(text[to]||''))continue;
      // Internet shorthand is reviewable, not automatically standard spelling.
      // Do not invent an expansion; explicit personal entries remain respected.
      if(/[ㄱ-ㅎㅏ-ㅣ]/.test(word)){
        if(!personal.has(word))emit(from,to,'ko','unknown',[],word);
        continue;
      }
      if(word.length>64){emit(from,to,/^[A-Za-z]/.test(word)?'en':'ko','unknown',[],word);results.at(-1).reason='Prototype cannot analyze an unbroken span longer than 64 characters';continue;}
      if(/^[A-Za-z]/.test(word)) {
        if(personal.has(word)||english.has(word)||enLower.has(word.toLowerCase())||english.has(word.replace(/['’]s$/,'')))continue;
        // Preserve camel-case identifiers and acronyms as unknown expressions.
        const candidates=/^[A-Z]{2,}$|[a-z][A-Z]/.test(word)?[]:englishSuggestions(word);
        emit(from,to,'en',candidates.length?'spelling':'unknown',candidates,word);
      } else {
        if(['에서','에게','으로','부터','까지','처럼'].includes(word)){
          const preceding=text.slice(0,from).match(/([가-힣]+)([ \u00a0]+)$/);
          if(preceding){
            const start=from-preceding[0].length;
            if(!excluded.some(([a,b])=>start<b&&to>a)&&morphology.analyze(preceding[1],personal)?.kind==='noun'&&!results.some(f=>f.to>start)){
              emit(start,to,'ko','spacing',[preceding[1]+word]);results.at(-1).reason='Spacing rule 41: attach particle to noun';continue;
            }
          }
        }
        const rule=orthography(word,sets,personal)??contextSuggestion(text,from,to,personal,w=>Boolean(morphology.predicate(w)));
        if(rule){emit(from,to,'ko','spelling',rule.suggestions,word);Object.assign(results.at(-1),rule);continue;}
        // A trailing Korean particle on an English word is not a separate error.
        if(/[A-Za-z]/.test(text[from-1]||'')&&(sets.josa.has(word)||sets.ending.has(word)||morphology.predicate(word)))continue;
        const spaced=morphology.spacing(word,personal);
        if(spaced&&spaced.text.replaceAll(' ','')===word){emit(from,to,'ko','spacing',[spaced.text]);Object.assign(results.at(-1),{ambiguous:spaced.ambiguous,reason:`Spacing rule ${spaced.rule}; review interpretation`});continue;}
        if(morphology.analyze(word,personal)||recognizedNoun(word))continue;
        const unknown=morphology.unknownNoun(word);
        const candidates=koreanSuggestions(word);
        if(candidates.length){emit(from,to,'ko','spelling',candidates,unknown?.base??word);continue;}
        if(unknown?.unknown){emit(from,from+unknown.base.length,'ko','unknown',[],unknown.base);continue;}
        emit(from,to,'ko',candidates.length?'spelling':'unknown',candidates,word);
      }
    }
    return results.sort((a,b)=>a.from-b.from||a.to-b.to);
  };
}
