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
  const actionNouns=new Set(data.morphology?.actionNouns??[]);
  const recognizedNoun=word=>recognizedNouns.has(word)||particles.some(p=>word.endsWith(p)&&recognizedNouns.has(word.slice(0,-p.length)));
  const english=new Set(data.en);
  const enLower=new Set(data.en.filter(w=>w===w.toLowerCase()));
  const englishByLength=new Map();
  for(const word of enLower){const key=word.slice(0,3)+':'+word.length;const bucket=englishByLength.get(key)||[];bucket.push(word);englishByLength.set(key,bucket);}
  const koWords=[...new Set([...sets.noun,...sets.adverb,...(data.morphology?.adverbs??[]),...(data.morphology?.forms??[]).filter(([,tag])=>['EF','EC','ETM','ETN'].includes(tag)).map(([word])=>word)])];
  const koByLength=new Map();
  for(const word of koWords){const bucket=koByLength.get(word.length)||[];bucket.push([word,word.normalize('NFD')]);koByLength.set(word.length,bucket);}
  const endingsByLength=new Map();
  for(const ending of sets.ending){
    // Short connective endings overlap particles (질게에 must not become
    // 질게요). Limit two-syllable repair to formal 니다/니까 endings.
    if(ending.length<3&&!['니다','니까'].includes(ending))continue;
    const bucket=endingsByLength.get(ending.length)||[];
    bucket.push([ending,ending.normalize('NFD')]);endingsByLength.set(ending.length,bucket);
  }
  // Damerau distance one: insertion/deletion/substitution/adjacent transposition.
  function nearOne(a,b) {
    if(Math.abs(a.length-b.length)>1||a===b)return false;
    let i=0;while(i<a.length&&a[i]===b[i])i++;
    if(a.length===b.length)return a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));
    return a.length>b.length?a.slice(i+1)===b.slice(i):a.slice(i)===b.slice(i+1);
  }
  function englishSuggestions(word) {
    // Prefer an attested acronym's casing over a different nearby word.
    // This does not register unknown abbreviations as correct vocabulary.
    if(/^[a-z]{2,}$/.test(word)&&english.has(word.toUpperCase()))return [word.toUpperCase()];
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
    // A doubled letter can be placed on the wrong run. Prefer retaining the
    // sequence of letters over changing it, within the existing edit bound.
    // This ranks candidates only; it does not accept a misspelling as a word.
    const runs=lower.replace(/([a-z])\1+/g,'$1');
    const sameRuns=new Set([...candidates].filter(s=>s.replace(/([a-z])\1+/g,'$1')===runs));
    return [...candidates].filter(s=>!(/^[A-Z]/.test(word)&&word.length>3)||s[0]===lower[0]).sort((a,b)=>Number(transpositions.has(b))-Number(transpositions.has(a))||Number(doubled.has(b))-Number(doubled.has(a))||Number(sameRuns.has(b))-Number(sameRuns.has(a))||suffixScore(b)-suffixScore(a)||Math.abs(a.length-lower.length)-Math.abs(b.length-lower.length)||a.localeCompare(b)).slice(0,5).map(s=>word===word.toUpperCase()?s.toUpperCase():/^[A-Z][a-z]+$/.test(word)?s[0].toUpperCase()+s.slice(1):s);
  }
  function formalEndingCandidate(word) {
    // Recover a mistyped ㅁ in the formal -ㅂ니다 ending only when the
    // resulting whole predicate is licensed by the inflector.
    if(word.endsWith('니다')&&word.length>=3){
      const index=word.length-3,code=word.charCodeAt(index);
      if(code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28===16){
        const candidate=word.slice(0,index)+String.fromCharCode(code+1)+word.slice(index+1);
        if(morphology.predicate(candidate))return candidate;
      }
    }
    return null;
  }
  function koreanSuggestions(word) {
    const formal=formalEndingCandidate(word);
    const suggestions=formal?[formal]:[];
    const noPersonalWords=new Set();
    // Repair an ending only when the complete replacement is a predicate.
    // Inflected surfaces need not all exist as entries in the source lists.
    for(let split=1;split<word.length-1;split++){
      const suffix=word.slice(split),nfd=suffix.normalize('NFD');
      for(const [ending,normalized]of endingsByLength.get(suffix.length)||[]){
        if(!nearOne(nfd,normalized))continue;
        const candidate=word.slice(0,split)+ending;
        if(morphology.predicate(candidate))suggestions.push(candidate);
      }
    }
    if(word.endsWith('쬬')){
      const candidate=word.slice(0,-1)+'죠';
      if(morphology.predicate(candidate))suggestions.push(candidate);
    }
    // Recover a missing doubled final in an inflected predicate, without
    // requiring every full conjugation to be a dictionary entry. The caller
    // has already rejected recognized words; validate the whole replacement.
    for(let i=0;i<word.length;i++){
      const code=word.charCodeAt(i);
      if(code>=0xac00&&code<=0xd7a3&&(code-0xac00)%28===16){
        const nominal=word.slice(0,i)+String.fromCharCode(code-6)+word.slice(i+1);
        const analysis=morphology.analyze(nominal,noPersonalWords);
        if(analysis?.nominal&&analysis.base.length>=2)suggestions.push(nominal);
      }
      if(code<0xac00||code>0xd7a3||(code-0xac00)%28!==19)continue;
      const candidate=word.slice(0,i)+String.fromCharCode(code+1)+word.slice(i+1);
      if(morphology.predicate(candidate))suggestions.push(candidate);
      else {
        // Compose explicit negative-adverb or verified -게 되다 boundaries,
        // not an arbitrary segmentation containing unknown pieces.
        const spaced=morphology.spacing(candidate,noPersonalWords);
        if(spaced?.rule==='2')suggestions.push(spaced.text);
        else if(spaced?.rule==='41/42'&&!spaced.unknowns?.length){
          const parts=spaced.text.split(' ');
          if(parts.length===2&&parts[0].endsWith('게')&&morphology.predicate(parts[0])&&morphology.predicate(parts[1])?.root==='되')suggestions.push(spaced.text);
        }
      }
    }
    for(let split=word.length;split>=2;split--) {
      const root=word.slice(0,split),suffix=word.slice(split);
      if(suffix&&!sets.josa.has(suffix)&&!sets.ending.has(suffix))continue;
      const decomposed=root.normalize('NFD');
      for(const [candidate,nfd] of koByLength.get(root.length)||[]) {
        if(root.length>=3&&nearOne(decomposed,nfd)){
          const combined=candidate+suffix;
          // A dictionary inflection is not a stem to which any ending can
          // attach. Validate the combined surface, not just its two pieces.
          if(!suffix||morphology.analyze(combined,noPersonalWords)||recognizedNoun(combined))suggestions.push(combined);
        }
      }
    }
    return [...new Set(suggestions)].slice(0,5);
  }
  return function check(text,words=[]) {
    const personal=new Set(words),results=[];
    let auxiliaryRepairEnd=0;
    const excluded=[...text.matchAll(/https?:\/\/[^\s]+|`[^`]*`|\b[A-Za-z0-9_-]+\.(?:md|txt|png|jpe?g|gif|webp|pdf|json|tsx?|jsx?|html|css|zip)\b|\b(?:Ctrl|Control|Alt|Option|Shift|Cmd|Command|Meta)(?:\+[A-Za-z0-9]+)+/g)].map(m=>[m.index,m.index+m[0].length]);
    function emit(from,to,language,type,suggestions,base) {results.push({from,to,original:text.slice(from,to),language,type,suggestions,base,applicable:suggestions.length>0,reason:type==='unknown'?'Not in the selected vocabulary':'Prototype lexical candidate; rule source not yet verified'});}
    // Arabic numerals may attach to their unit. The following independent
    // duration/comparison word still needs a boundary; preserve the number.
    for(const m of text.matchAll(/\d+(?:[.,]\d+)*(?:개월|시간|년|달|일|분|초|원|억|만)(?:동안|이상|이하|넘게)[가-힣]*/g)){
      const from=m.index,to=from+m[0].length;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      const parts=m[0].match(/^(\d+(?:[.,]\d+)*(?:개월|시간|년|달|일|분|초|원|억|만))(동안|이상|이하|넘게)(.*)$/);
      if(!parts||parts[3]&&!sets.josa.has(parts[3]))continue;
      emit(from,to,'ko','spacing',[parts[1]+' '+parts[2]+parts[3]]);
      results.at(-1).reason='Preserve Arabic numeral plus unit; separate the following duration or comparison word';
    }
    for(const m of text.matchAll(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[가-힣ㄱ-ㅎㅏ-ㅣ]+/g)) {
      const word=m[0],from=m.index,to=from+word.length;
      if(from<auxiliaryRepairEnd)continue;
      if(excluded.some(([a,b])=>from<b&&to>a)||/[0-9_]/.test(text[from-1]||'')||/[0-9_]/.test(text[to]||''))continue;
      // Internet shorthand is reviewable, not automatically standard spelling.
      // Do not invent an expansion; explicit personal entries remain respected.
      if(/[ㄱ-ㅎㅏ-ㅣ]/.test(word)){
        if(!personal.has(word))emit(from,to,'ko','unknown',[],word);
        continue;
      }
      if(word.length>64){emit(from,to,/^[A-Za-z]/.test(word)?'en':'ko','unknown',[],word);results.at(-1).reason='Prototype cannot analyze an unbroken span longer than 64 characters';continue;}
      if(/^[A-Za-z]/.test(word)) {
        // Smart punctuation changes typography, not the contracted word.
        // Normalize lookup only; offsets, user text and replacements stay intact.
        const lookup=word.replaceAll('’',"'");
        if(personal.has(word)||personal.has(lookup)||english.has(lookup)||enLower.has(lookup.toLowerCase())||english.has(lookup.replace(/'s$/,'')))continue;
        // Conventional abbreviation of an attested word; a period is optional.
        // Do not treat arbitrary short identifiers as registered vocabulary.
        if(lookup.toLowerCase()==='vs'&&enLower.has('versus'))continue;
        // Preserve camel-case identifiers and acronyms as unknown expressions.
        const candidates=/^[A-Z]{2,}$|[a-z][A-Z]/.test(word)?[]:englishSuggestions(word);
        emit(from,to,'en',candidates.length?'spelling':'unknown',candidates,word);
      } else {
        // Repair the boundary inside -(으)ㄹ 만하다, keeping the preceding
        // predicate separate. This is not noun + comparison particle 만.
        if(word.endsWith('만')&&!personal.has(word)){
          const main=word.slice(0,-1),analysis=morphology.predicate(main);
          const following=text.slice(to).match(/^[ \u00a0]+([가-힣]+)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/);
          if(analysis?.adnominal&&analysis.root!=='이'&&!sets.noun.has(main)&&!recognizedNouns.has(main)&&(main.charCodeAt(main.length-1)-0xac00)%28===8&&following&&morphology.predicate(following[1])?.root==='하'){
            const end=to+following[0].length,aux='만'+following[1];
            if(morphology.predicate(aux)?.root==='만하'&&!personal.has(text.slice(from,end))&&!excluded.some(([a,b])=>from<b&&end>a)){
              emit(from,end,'ko','spacing',[main+' '+aux]);
              results.at(-1).reason='Keep the auxiliary 만하다 together after an adnominal predicate';
              auxiliaryRepairEnd=end;continue;
            }
          }
        }
        // 하나 is also the numeral one. Morphology alone cannot justify
        // joining 질문 하나 or 상처 하나 to the preceding noun.
        if(word!=='하나'&&morphology.predicate(word)?.root==='하'){
          const preceding=text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/);
          if(preceding&&actionNouns.has(preceding[1])){
            const start=from-preceding[0].length,joined=preceding[1]+word;
            const before=text.slice(0,start).match(/([가-힣]+)[ \u00a0]+$/)?.[1];
            const modifier=before&&morphology.analyze(before,personal);
            const modified=before&&(morphology.predicate(before)?.adnominal||modifier?.kind==='noun'&&modifier.base===before);
            if(!modified&&!personal.has(text.slice(start,to))&&!excluded.some(([a,b])=>start<b&&to>a)&&!results.some(f=>f.to>start)&&morphology.predicate(joined)?.root===preceding[1]+'하'){
              emit(start,to,'ko','spacing',[joined]);
              Object.assign(results.at(-1),{ambiguous:true,reason:'Action noun plus -하다; keep separate if the noun has an independent modifier'});continue;
            }
          }
        }
        if(['에서','에게','으로','부터','까지','처럼','에','을','를','은','는'].includes(word)){
          const preceding=text.slice(0,from).match(/([A-Za-z]+)([ \u00a0]+)$/);
          if(preceding){
            const start=from-preceding[2].length,nameStart=from-preceding[0].length;
            if(!excluded.some(([a,b])=>nameStart<b&&to>a)){
              // Edit only the gap and particle: a separate unknown-name
              // notice remains non-overlapping and independently skippable.
              emit(start,to,'ko','spacing',[word]);results.at(-1).reason='Spacing rule 41: attach particle to preceding Latin-script word';continue;
            }
          }
        }
        if(['에서','에게','으로','부터','까지','처럼'].includes(word)){
          const preceding=text.slice(0,from).match(/([가-힣]+)([ \u00a0]+)$/);
          if(preceding){
            const start=from-preceding[0].length;
            if(!excluded.some(([a,b])=>start<b&&to>a)&&morphology.analyze(preceding[1],personal)?.kind==='noun'&&!results.some(f=>f.to>start)){
              emit(start,to,'ko','spacing',[preceding[1]+word]);results.at(-1).reason='Spacing rule 41: attach particle to noun';continue;
            }
          }
        }
        const rule=contextSuggestion(text,from,to,personal,w=>Boolean(morphology.predicate(w)))??orthography(word,sets,personal,w=>Boolean(morphology.predicate(w)),w=>sets.noun.has(w)||recognizedNouns.has(w));
        if(rule){emit(from,to,'ko','spelling',rule.suggestions,word);Object.assign(results.at(-1),rule);continue;}
        // Bounded typo candidate, not a claim about arbitrary noun compounds.
        // Keep registered compounds intact; split only one uniquely attested
        // pair of nouns, and leave the interpretation to the author.
        if(word.endsWith('에넌')&&!personal.has(word)&&!morphology.analyze(word,personal)&&!recognizedNoun(word)){
          const host=word.slice(0,-2),known=w=>sets.noun.has(w)||recognizedNouns.has(w)||personal.has(w);
          const hosts=[];
          if(host.length>=2&&known(host))hosts.push(host);
          else for(let i=2;i<=host.length-2;i++)if(known(host.slice(0,i))&&known(host.slice(i)))hosts.push(host.slice(0,i)+' '+host.slice(i));
          if(hosts.length===1){
            emit(from,to,'ko','spelling',[hosts[0]+'에는'],word);
            Object.assign(results.at(-1),{ambiguous:true,reason:'Particle typo candidate 에넌/에는 with a known noun boundary; confirm intended phrase'});
            continue;
          }
        }
        // A trailing Korean particle on an English word is not a separate error.
        if(/[A-Za-z]/.test(text[from-1]||'')&&(sets.josa.has(word)||sets.ending.has(word)||morphology.predicate(word)))continue;
        const formal=formalEndingCandidate(word);
        if(formal&&!personal.has(word)&&!morphology.analyze(word,personal)&&!recognizedNoun(word)){
          emit(from,to,'ko','spelling',[formal],word);continue;
        }
        const spaced=morphology.spacing(word,personal);
        if(spaced?.unknowns?.length&&!morphology.analyze(word,personal)&&!recognizedNoun(word)){
          const composed=koreanSuggestions(word).filter(candidate=>candidate.includes(' '));
          if(composed.length){emit(from,to,'ko','spelling',composed,word);results.at(-1).ambiguous=true;continue;}
        }
        // A known noun one edit away is a stronger candidate than speculative
        // segmentation of an unknown noun + particle. Keep explicit spacing
        // rules and personal vocabulary ahead of this lexical alternative.
        const unknown=morphology.unknownNoun(word);
        if(spaced?.rule==='41/42'&&unknown&&!recognizedNoun(word)&&!morphology.analyze(word,personal)&&!personal.has(unknown.base)&&!morphology.predicate(spaced.text.split(' ')[0])){
          const particle=word.slice(unknown.base.length);
          const nounCandidates=koreanSuggestions(unknown.base).filter(candidate=>sets.noun.has(candidate));
          if(nounCandidates.length===1){
            emit(from,to,'ko','spelling',[nounCandidates[0]+particle],unknown.base);
            Object.assign(results.at(-1),{ambiguous:true,reason:'Noun spelling candidate before speculative segmentation; confirm intended word'});
            continue;
          }
        }
        if(spaced&&spaced.text.replaceAll(' ','')===word){emit(from,to,'ko','spacing',[spaced.text]);Object.assign(results.at(-1),{ambiguous:spaced.ambiguous,reason:`Spacing rule ${spaced.rule}; review interpretation`});continue;}
        if(morphology.analyze(word,personal)||recognizedNoun(word))continue;
        // Keep the identified noun/particle boundary in lexical repairs.
        // Another split can otherwise turn an unknown name into a known
        // noun plus a different particle (아스트라+도 -> 라스트+라도).
        const particle=unknown?word.slice(unknown.base.length):null;
        const candidates=koreanSuggestions(word).filter(candidate=>{
          if(!particle)return true;
          if(!candidate.endsWith(particle))return false;
          const host=candidate.slice(0,-particle.length);
          return sets.noun.has(host)||recognizedNouns.has(host)||morphology.analyze(host,personal)?.nominal;
        });
        if(candidates.length){
          emit(from,to,'ko','spelling',candidates,unknown?.base??word);
          // Lexical similarity cannot distinguish a typo from an intended
          // name or coined expression. Preserve suggestions, but disclose
          // that uncertainty through the shared review UI.
          Object.assign(results.at(-1),{ambiguous:true,reason:'Lexical similarity candidate; confirm intended word or register the original'});
          continue;
        }
        if(unknown?.unknown){emit(from,from+unknown.base.length,'ko','unknown',[],unknown.base);continue;}
        emit(from,to,'ko',candidates.length?'spelling':'unknown',candidates,word);
      }
    }
    return results.sort((a,b)=>a.from-b.from||a.to-b.to);
  };
}
