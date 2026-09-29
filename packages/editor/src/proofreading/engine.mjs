// Original Wonboard experimental checker (MIT), shared by evaluation and review Worker.
// No network access; dictionaries are supplied by the caller.
import {createMorphology,createActionNounSet,isPronoun} from './korean-morphology.mjs';
import {orthography,lexicalNounRepair} from './korean-orthography.mjs';
import {contextSuggestion,communityExpression,communityAction,contextualProductName} from './korean-context.mjs';
import {englishGrammar} from './english-grammar.mjs';
import {englishUsage} from './english-usage.mjs';
import {communityNouns,communityNominalOnly,technicalAbbreviations,englishRecognizedTerms,communityActionNouns,communityAdjectiveStems,communityVerbStems,candidatePhraseBoundaries,candidateJoinedPhrases} from './community-vocabulary.mjs';
const analysisLimit=48;
export function createChecker(data) {
  const sets=Object.fromEntries(Object.entries(data.ko).map(([k,v])=>[k,new Set(v)]));
  for(const word of [...communityNouns,...communityActionNouns])sets.noun.add(word);
  // 한살림 is the proper name of the consumer cooperative; do not parse it
  // as the ordinary phrase 한 살림 when followed by a particle.
  sets.noun.add('한살림');
  for(const stem of communityVerbStems)sets.verb.add(stem);
  for(const stem of communityAdjectiveStems)sets.adjective.add(stem);
  // Additional stems recognize a complete word only. They must not become
  // new fragments in the spacing search or bypass explicit correction rules.
  const recognition=data.morphology?.recognitionVerbRoots?.length?createMorphology({...sets,
    noun:new Set([...sets.noun,...(data.morphology.recognitionStaticStateNouns??[])]),
    verb:new Set([...sets.verb,...data.morphology.recognitionVerbRoots]),
    adjective:new Set([...sets.adjective,...(data.morphology.recognitionAdjectiveRoots??[])]),
  },data.morphology):null;
  const recognizeWhole=recognition?(word,personal)=>recognition.analyze(word,personal):null;
  const morphology=createMorphology(sets,data.morphology,recognizeWhole);
  // An extended recognition vocabulary must not flood candidate generation or
  // split community names into obscure dictionary nouns.
  const recognizedNouns=new Set([...(data.morphology?.recognizedNouns??[]),...communityNominalOnly]);
  const knownOrthographicPredicate=word=>Boolean(morphology.predicate(word)||recognition?.predicate(word));
  const knownOrthographicNoun=word=>sets.noun.has(word)||recognizedNouns.has(word)||morphology.isDerivedNominal(word);
  const candidateBoundary=(word,personal,text,from,to)=>{
    if(personal.has(word))return null;
    // A common surname followed by an office title keeps the title whole.
    // Established compounds (이사장, 부사장) and personal entries win first.
    const namedTitle=word.match(/^([김이박최정강조윤장임])((?:과장|차장|부장|팀장|실장|사장|회장)(?:님)?)(.*)$/);
    if(namedTitle&&!knownOrthographicNoun(namedTitle[1]+namedTitle[2])&&(!namedTitle[3]||sets.josa.has(namedTitle[3])||morphology.predicate(namedTitle[3])?.root==='이'))return {type:'spacing',suggestions:[namedTitle[1]+' '+namedTitle[2]+namedTitle[3]],reason:'Separate a surname from its complete office title; confirm the intended person',ambiguous:true};
    // 웬걸 is a complete interjection, not determiner 왠 + dependent 걸.
    const surprise=word.match(/^(이거|그거|저거)?왠걸$/);
    if(surprise)return {type:'spelling',suggestions:[(surprise[1]?surprise[1]+' ':'')+'웬걸'],reason:'Restore the interjection 웬걸 and preserve a preceding demonstrative boundary',ambiguous:false};
    // Elapsed-time context distinguishes dependent 지 from question endings.
    const elapsed=word.match(/^(.+)지(가|는|도)?$/u),elapsedHost=elapsed&&(morphology.predicate(elapsed[1])??morphology.analyze(elapsed[1],personal));
    if(elapsedHost?.adnominal&&elapsedHost.root!=='이'&&(elapsed[1].charCodeAt(elapsed[1].length-1)-0xac00)%28===4&&!elapsed[1].endsWith('는')&&/^[ \u00a0]+(?:얼마[ \u00a0]+(?:안|되)|오래|[0-9]+[ \u00a0]*(?:년|달|개월|일))/u.test(text.slice(to)))return {type:'spacing',suggestions:[elapsed[1]+' 지'+(elapsed[2]??'')],reason:'Elapsed-time context selects dependent 지',ambiguous:true};
    // A following existential predicate disambiguates contracted 것+이
    // from the homographic promise ending: 여쭤볼 게 있습니다.
    const contractedSubject=word.endsWith('게')?word.slice(0,-1):null;
    if(contractedSubject&&(morphology.predicate(contractedSubject)??morphology.analyze(contractedSubject,personal))?.adnominal&&/^[ \u00a0]+(?:있|없)(?:습니다|어요|어|는데|다|음)(?=$|[\s,.!?])/u.test(text.slice(to)))return {type:'spacing',suggestions:[contractedSubject+' 게'],reason:'The following existential predicate selects the contracted nominal subject 게',ambiguous:true};
    // A misspelled mimetic -대다 is one predicate. Validate the repaired
    // whole before an adverb + 때다 homograph can invent a word boundary.
    const mimeticPast=word.match(/^(.+)(땠|되었|됐)(.*)$/);
    if(mimeticPast&&sets.adverb.has(mimeticPast[1])&&morphology.predicate(mimeticPast[1]+'댔'+mimeticPast[3])?.root===mimeticPast[1]+'대')return {type:'spelling',suggestions:[mimeticPast[1]+'댔'+mimeticPast[3]],reason:'Restore the validated mimetic predicate ending -댔-',ambiguous:true};
    // Recover a missing past-tense double final before speculative spacing.
    // A valid original predicate (낫는대, 웃는대) must keep its own reading.
    if(!knownOrthographicPredicate(word)&&!knownOrthographicNoun(word)&&!morphology.analyze(word,personal)&&!recognizedNoun(word)&&!(/^(안|못)/.test(word)&&morphology.predicate(word.slice(1)))){
      for(let i=0;i<word.length-1;i++){
        const code=word.charCodeAt(i);
        if((code-0xac00)%28!==19)continue;
        if(!/^(?:어|던|다|고|지|면|는데|는대|냐|었|겠|습니다|습니까)/.test(word.slice(i+1)))continue;
        let repaired=word.slice(0,i)+String.fromCharCode(code+1)+word.slice(i+1);
        if(repaired.endsWith('는대'))repaired=repaired.slice(0,-1)+'데';
        if(/^(안|못)/.test(repaired)&&knownOrthographicPredicate(repaired.slice(1)))return {type:'spelling',suggestions:[repaired[0]+' '+repaired.slice(1)],reason:'Restore the past predicate and its independent negative adverb',ambiguous:true};
        if(knownOrthographicPredicate(repaired)){
          const repair=orthography(repaired,sets,personal,knownOrthographicPredicate,knownOrthographicNoun);
          return {type:'spelling',suggestions:repair?.suggestions??[repaired],reason:'Restore a validated past-tense predicate before splitting its ending',ambiguous:true};
        }
      }
    }
    const existsTypo=word.match(/^(.+[아어해춰워여])잇(.*)$/);
    if(existsTypo&&knownOrthographicPredicate(existsTypo[1])&&knownOrthographicPredicate('있'+existsTypo[2]))return {type:'spelling',suggestions:[existsTypo[1]+' 있'+existsTypo[2]],reason:'Restore 있다 after a complete connective predicate',ambiguous:true};
    if(word==='있다라면')return {type:'spelling',suggestions:['있다면'],reason:'Restore the conditional 있다 ending without introducing past counterfactual tense',ambiguous:true};
    const degreeEnding=word.match(/^(.+)정도내요$/);
    if(degreeEnding&&morphology.predicate(degreeEnding[1])?.adnominal)return {type:'spelling',suggestions:[degreeEnding[1]+' 정도네요'],reason:'Restore the copular ending after an adnominal degree phrase',ambiguous:true};
    // A recognition-only noun plus topic particle can coincide with 안/못
    // and an adnominal verb (안가+는 / 안 가는). A preceding destination or
    // object and following nominal support the negative reading in context.
    const negativeAdnominal=word.match(/^(안|못)([가-힣]{2,})$/);
    if(negativeAdnominal&&recognizedNoun(word)&&!recognizeWhole?.(word,personal)){
      const before=text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/)?.[1];
      const after=text.slice(to).match(/^[ \u00a0]+([가-힣]+)/)?.[1];
      if(before&&/(?:에|엔|에서|에선|에게|께|으?로|을|를)$/.test(before)&&after&&morphology.predicate(negativeAdnominal[2])?.adnominal&&morphology.analyze(after,personal)?.kind==='noun')return {type:'spacing',suggestions:[negativeAdnominal[1]+' '+negativeAdnominal[2]],reason:'Context review: separate the negative adverb before an adnominal predicate',ambiguous:true};
    }
    // Keep a validated noun + 가야 해서 boundary reviewable. The unspaced
    // form can also parse as noun + 가 + 야해서, so never auto-resolve it.
    const mustGo=word.match(/^([가-힣]{2,})가야해서(요)?$/);
    if(mustGo&&knownOrthographicNoun(mustGo[1])&&!isPronoun(mustGo[1])&&morphology.predicate('가야')&&morphology.predicate('해서'))return {type:'spacing',suggestions:[`${mustGo[1]} 가야 해서${mustGo[2]??''}`],reason:'Separate the validated predicate 가야 해서; the joined form can have another reading',ambiguous:true};
    const countedKinds=word.match(/^(두|세|네|몇)가지(중(?:에|에서|의)?)$/);
    if(countedKinds)return {type:'spacing',suggestions:[countedKinds[1]+' 가지 '+countedKinds[2]],reason:'The count noun 가지 and following 중 are separate words',ambiguous:false};
    for(let i=2;i<word.length-2;i++){
      if(!placeNames.has(word.slice(0,i)))continue;
      const tail=word.slice(i),nominal=tail.match(/^(남자|여자|사람)(들)?(.*)$/);
      if(nominal&&(!nominal[3]||sets.josa.has(nominal[3])))return {type:'spacing',suggestions:[word.slice(0,i)+' '+tail],reason:'Separate a place name from the independent person noun',ambiguous:false};
    }
    if(word.endsWith('좀')&&knownOrthographicNoun(word.slice(0,-1))&&!morphology.analyze(word,personal))return {type:'spacing',suggestions:[word.slice(0,-1)+' 좀'],reason:'Separate the adverb 좀 from the preceding recognized noun',ambiguous:false};
    const activeUser=word.match(/^엑티브유저(.*)$/);
    if(activeUser&&(!activeUser[1]||sets.josa.has(activeUser[1])))return {type:'spelling',suggestions:['액티브 유저'+activeUser[1]],reason:'Reviewed loanword and independent noun boundary',ambiguous:true};
    const craftsmanship=word.match(/^만듬세(.*)$/);
    if(craftsmanship&&(!craftsmanship[1]||sets.josa.has(craftsmanship[1])))return {type:'spelling',suggestions:['만듦새'+craftsmanship[1]],reason:'The lexical noun 만듦새 takes the nominalizing ㅁ and the intervening ㄹ',ambiguous:false};
    const returned=word.match(/^갔다(왔[가-힣]*)$/);
    if(returned&&morphology.predicate('갔다')&&morphology.predicate(returned[1])?.root==='오')return {type:'spacing',suggestions:['갔다 '+returned[1]],reason:'The completed motion verbs 갔다 and 왔다 form separate words',ambiguous:false};
    if(word.startsWith('대층')&&!personal.has('대층')&&sets.adverb.has('대충')){
      const repaired='대충'+word.slice(2),spaced=morphology.spacing(repaired,new Set());
      if(spaced&&!spaced.unknowns?.length)return {type:'spelling',suggestions:[spaced.text],reason:'Repair 대층 to 대충 and validate the complete spaced phrase',ambiguous:true};
    }
    if(word.endsWith('네용')){
      const standard=word.slice(0,-2)+'네요',spaced=morphology.spacing(standard,new Set());
      if(spaced&&!spaced.unknowns?.length&&spaced.text.endsWith('네요'))return {type:'spacing',suggestions:[spaced.text.slice(0,-2)+'네용'],reason:'Preserve colloquial 네용 while separating the validated preceding phrase',ambiguous:true};
    }
    if(!morphology.analyze(word,personal)&&!recognizedNoun(word)&&!recognizeWhole?.(word,personal)&&!morphology.spacing(word,personal)){
      const boundaries=[];
      // Preserve colloquial 땜, but keep it separate from a demonstrative.
      const cause=word.match(/^(이거|그거|저거)(땜.*)$/);
      if(cause&&morphology.analyze(cause[2],personal)?.base==='땜')boundaries.push(cause[1]+' '+cause[2]);
      for(let i=2;i<word.length-1;i++){
        const left=word.slice(0,i),right=word.slice(i),tail=morphology.predicate(right);
        // A purpose connective and its motion verb remain separate, including
        // the auxiliary compound 가보다. Keep complete lexical forms above.
        if(left.endsWith('러')&&morphology.predicate(left)&&['가','오','다니','가보','와보'].includes(tail?.root))boundaries.push(left+' '+right);
        if(!knownOrthographicNoun(left))continue;
        if(['있','없'].includes(tail?.root)&&!(left.endsWith('수')&&morphology.predicate(left.slice(0,-1))?.adnominal))boundaries.push(left+' '+right);
        // Recognition-only nouns must not become arbitrary segmentation
        // fragments. A validated -고 싶다 clause supplies its own boundary,
        // provided its first predicate does not derive from the noun.
        const clause=morphology.spacing(right,personal),parts=clause?.text.split(' ');
        if(parts?.length===2&&parts[0].endsWith('고')&&parts[1].startsWith('싶')&&!clause.unknowns?.length&&morphology.predicate(parts[0])&&!['이','하','되','시키','스럽','받','주','드리'].includes(morphology.predicate(parts[0]).root)&&!knownOrthographicPredicate(left+parts[0]))boundaries.push(left+' '+clause.text);
      }
      const unique=[...new Set(boundaries)];
      if(unique.length===1)return {type:'spacing',suggestions:unique,reason:'Separate a validated purpose or nominal boundary before an independent clause',ambiguous:true};
    }
    if(!morphology.analyze(word,personal)&&!recognizedNoun(word)&&!recognizeWhole?.(word,personal))for(let i=2;i<word.length-2;i++){
      if(word[i]!=='나')continue;
      const left=word.slice(0,i),right=word.slice(i+1);
      if(knownOrthographicNoun(left)&&knownOrthographicNoun(right)&&!morphology.predicate(left+'나')&&!morphology.predicate(word.slice(i))){
        // A verified whole-word spelling repair precedes a speculative
        // noun + choice-particle boundary inside the malformed word.
        return orthography(word,sets,personal,knownOrthographicPredicate,knownOrthographicNoun)??{type:'spacing',suggestions:[left+'나 '+right],reason:'Separate two recognized nouns joined by the choice particle 나',ambiguous:true};
      }
    }
    const pair=candidatePhraseBoundaries.find(([source])=>{
      if(!word.startsWith(source))return false;
      const tail=word.slice(source.length);
      return !tail||sets.josa.has(tail)||tail.startsWith('들')&&(!tail.slice(1)||sets.josa.has(tail.slice(1)))||morphology.predicate('이'+tail)?.root==='이';
    });
    return pair?{type:pair[2]??(pair[0]==='몇일전'?'spelling':'spacing'),suggestions:[pair[1]+word.slice(pair[0].length)],reason:'Phrase boundary candidate; confirm intended compound',ambiguous:true}:null;
  };
  const particles=[...sets.josa];
  const actionNouns=createActionNounSet(data.morphology);
  const unambiguousParticles=new Set(['에서','에게','으로','로','부터','까지','처럼','와의','과의','로서의','으로서의']);
  for(const particle of sets.josa)if(/^(?:에서|에게|으로|부터|까지|처럼)/.test(particle))unambiguousParticles.add(particle);
  const recognizedNoun=word=>recognizedNouns.has(word)||particles.some(p=>word.endsWith(p)&&recognizedNouns.has(word.slice(0,-p.length)));
  // Geographic names recognize complete nominals only. They never enter
  // edit-distance candidates, segmentation fragments or productive stems.
  const placeNames=new Set(data.morphology?.recognizedPlaceNames??[]);
  const placeParticles=new Set(['은','는','이','가','을','를','에','의','로','와','과','도','만','에서','에게','으로','부터','까지','처럼','보다','보단','에서는','에서도','에는','에도','로는','으로는','에서의','까지는','까지도','으로부터']);
  const recognizedPlace=word=>{
    if(placeNames.has(word))return true;
    for(let i=2;i<word.length;i++)if(placeNames.has(word.slice(0,i))){
      const tail=word.slice(i);
      if(placeParticles.has(tail)||tail==='인'||tail==='일'||/^(?:입니다|입니까|이에요|이었다|이었|이지만|이라|이니|이던)/.test(tail)&&morphology.predicate(tail)?.root==='이')return true;
    }
    return false;
  };
  const english=new Set(data.en);
  const knownTechnicalAbbreviations=new Set(technicalAbbreviations.map(word=>word.toLowerCase()));
  const recognizedEnglish=new Set([...englishRecognizedTerms,'carry-on','systemd','tuya','zigbee']);
  const enLower=new Set(data.en.filter(w=>w===w.toLowerCase()));
  const englishByLength=new Map();
  for(const word of enLower){const key=word.slice(0,3)+':'+word.length;const bucket=englishByLength.get(key)||[];bucket.push(word);englishByLength.set(key,bucket);}
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
    // Apostrophes encode contractions/possessives. Lexical edit distance
    // must not remove them to invent an unrelated dictionary word. Hyphens
    // likewise carry compound/name boundaries, not replaceable letters.
    if(/['-]/.test(word)||/^(?:didnt|isnt|hasnt|havent|hadnt|couldnt|wouldnt|shouldnt)$/i.test(word))return [];
    // Prefer an attested acronym's casing over a different nearby word.
    // This does not register unknown abbreviations as correct vocabulary.
    if(/^[a-z]{2,}$/.test(word)&&(english.has(word.toUpperCase())||word==='css'))return [word.toUpperCase()];
    const lower=word.toLowerCase(),alphabet='abcdefghijklmnopqrstuvwxyz',candidates=new Set();
    // Reviewed spelling repairs that weak edit-distance evidence otherwise
    // suppresses. These remain errors, never recognition-only vocabulary.
    const lexicalRepair={levvies:'levies',subscribition:'subscription',unfortuantly:'unfortunately',especulation:'speculation',especulations:'speculations',woudl:'would',recommention:'recommendation',basiically:'basically',shiney:'shiny',monitized:'monetized',condemed:'condemned',succintly:'succinctly',asbandoned:'abandoned',debarcle:'debacle',jepardy:'jeopardy',breathble:'breathable',insectasides:'insecticides',comapss:'compass',optitician:'optician',proofreaded:'proofread',anyboby:'anybody',technicaians:'technicians',lucious:'luscious',havock:'havoc',possiblilties:'possibilities',enought:'enough',boioer:'boiler',tasteledss:'tasteless',behemonth:'behemoth',conming:'coming',washine:'washing',opnions:'opinions',maube:'maybe',staistic:'statistic',sautee:'saute',nothwithstanding:'notwithstanding',creasote:'creosote',subtley:'subtly',harasssed:'harassed',headequarter:'headquarters',unbereable:'unbearable',diptheria:'diphtheria',communial:'communal',clobering:'clobbering',mantlepiece:'mantelpiece',spolit:'spoilt',breathelessness:'breathlessness',ancestores:'ancestors',combustable:'combustible',desparately:'desperately',predesessors:'predecessors',squeeking:'squeaking',adheasion:'adhesion',mismangement:'mismanagement',aneamic:'anaemic',duatpan:'dustpan',idiogram:'ideogram',omeprazol:'omeprazole',antogonistic:'antagonistic',unprecented:'unprecedented',neibours:'neighbours',recovety:'recovery'}[lower];
    if(lower==='carchup')return ['catch-up'];
    if(lexicalRepair&&(enLower.has(lexicalRepair)||englishUsage.has(lexicalRepair)))return [word===word.toUpperCase()?lexicalRepair.toUpperCase():/^[A-Z][a-z]+$/.test(word)?lexicalRepair[0].toUpperCase()+lexicalRepair.slice(1):lexicalRepair];
    if(lower==='alot')return ['a lot'];
    if(lower==='canthe')return ['can the'];
    if(lower==='flooplan'&&enLower.has('floor')&&enLower.has('plan'))return ['floor plan'];
    const add=s=>{if(enLower.has(s))candidates.add(s);};
    for(let i=0;i<=lower.length;i++) {
      add(lower.slice(0,i)+lower.slice(i+1));
      if(i+1<lower.length)add(lower.slice(0,i)+lower[i+1]+lower[i]+lower.slice(i+2));
      for(const c of alphabet){add(lower.slice(0,i)+c+lower.slice(i));if(i<lower.length)add(lower.slice(0,i)+c+lower.slice(i+1));}
    }
    // Two edits need evidence of misplaced/doubled letters, not just a nearby
    // dictionary entry. This preserves repairs such as tommorow -> tomorrow
    // without replacing an unfamiliar package name with an unrelated word.
    if(lower.length>=6&&lower.length<=32&&/^[a-z]+$/.test(lower)){
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
        const sameLetters=lower.split('').sort().join('')===candidate.split('').sort().join('');
        const sameSequence=lower.replace(/([a-z])\1+/g,'$1')===candidate.replace(/([a-z])\1+/g,'$1');
        const sameConsonants=lower.slice(-3)===candidate.slice(-3)&&lower.replace(/[aeiou]/g,'')===candidate.replace(/[aeiou]/g,'');
        if((sameLetters||sameSequence||sameConsonants)&&distanceTwo(lower,candidate))candidates.add(candidate);
      }
    }
    const transpositions=new Set(),doubled=new Set();
    for(let i=0;i+1<lower.length;i++)transpositions.add(lower.slice(0,i)+lower[i+1]+lower[i]+lower.slice(i+2));
    for(let i=0;i<lower.length;i++){
      doubled.add(lower.slice(0,i)+lower[i]+lower.slice(i));
      if(lower[i]===lower[i+1])doubled.add(lower.slice(0,i)+lower.slice(i+1));
    }
    // Keep an attested adjective ending before preferring a letter swap:
    // continous needs continuous, not the musical plural continuos.
    const adjectiveEnding=s=>lower.endsWith('ous')&&s.endsWith('ous');
    const suffixScore=s=>['ly','ing','ed'].some(ending=>lower.endsWith(ending)&&s.endsWith(ending))||lower.endsWith('ley')&&s===lower.slice(0,-2)+'y'?1:0;
    // A doubled letter can be placed on the wrong run. Prefer retaining the
    // sequence of letters over changing it, within the existing edit bound.
    // This ranks candidates only; it does not accept a misspelling as a word.
    const runs=lower.replace(/([a-z])\1+/g,'$1');
    const sameRuns=new Set([...candidates].filter(s=>s.replace(/([a-z])\1+/g,'$1')===runs));
    const sharedPrefix=s=>{let i=0;while(i<lower.length&&lower[i]===s[i])i++;return i;};
    // At three letters an accidental swap often produces a rare dictionary
    // word from an acronym or a foreign article (des -> eds). Require a
    // common grammatical target; longer spelling evidence is unchanged.
    const shortTargets=new Set(['the','and','for','you','are','was','not','but','our','his','her','him','she','has','had','can','may','any','all','who','how','why','its']);
    if(lower.length===3)for(const candidate of candidates)if(!shortTargets.has(candidate))candidates.delete(candidate);
    // Consonant replacement is weak evidence for an unknown word: it turns
    // names and technical terms into unrelated valid words. Keep letter-order,
    // vowel and omission evidence, while leaving other spans for review.
    // Resolve an existing internal-vowel-deletion ambiguity with a final
    // neighboring keyboard key (sensoe/sense/sensor). It must not make new
    // lone candidates for unfamiliar words such as Italian logistica.
    const hasVowelDeletion=[...candidates].some(s=>s.length===lower.length-1&&s.at(-1)===lower.at(-1)&&(englishUsage.get(s)??0)>0&&[...lower].some((c,i)=>i<lower.length-1&&/[aeiou]/.test(c)&&lower.slice(0,i)+lower.slice(i+1)===s));
    const terminalKeySlip=s=>hasVowelDeletion&&lower.length>=6&&s.length===lower.length&&sharedPrefix(s)===lower.length-1&&['qwertyuiop','asdfghjkl','zxcvbnm'].some(row=>Math.abs(row.indexOf(lower.at(-1))-row.indexOf(s.at(-1)))===1&&row.includes(lower.at(-1))&&row.includes(s.at(-1)));
    const spellingEvidence=s=>{
      if(transpositions.has(s)||sameRuns.has(s)||leadingKeySlip(s))return true;
      // Stable spelling on both sides supports an internal typo without
      // admitting short neighbors such as muslim/muslin or clojure/closure.
      let suffix=0;while(suffix<Math.min(lower.length,s.length)&&lower.at(-1-suffix)===s.at(-1-suffix))suffix++;
      if(sharedPrefix(s)>=2&&(suffix>=4||suffix>=2&&sharedPrefix(s)+suffix>=7))return true;
      if(terminalKeySlip(s))return true;
      if(lower.length===s.length)return lower.replace(/[aeiou]/g,'')===s.replace(/[aeiou]/g,'');
      if(s.length===lower.length+1)return true;
      if(lower.length===s.length+1){let i=0;while(lower[i]===s[i]&&i<s.length)i++;return /[aeiou]/.test(lower[i]);}
      return false;
    };
    // A word-game dictionary contains many rare neighbors. Require observed
    // target usage and rank familiar targets before prefix resemblance.
    // Strong letter-order/run evidence takes priority among attested targets.
    const usage=s=>englishUsage.get(s)??0;
    // A high-frequency target with an otherwise exact long suffix can be a
    // strong first-letter typo (tather -> rather). Keep this evidence narrow.
    const keyboardRows=['qwertyuiop','asdfghjkl','zxcvbnm'];
    const adjacentLeadingKeys=(a,b)=>keyboardRows.some(row=>Math.abs(row.indexOf(a)-row.indexOf(b))===1&&row.includes(a)&&row.includes(b));
    const leadingKeySlip=s=>/^[a-z]+$/.test(word)&&lower.length>=6&&s.length===lower.length&&s[0]!==lower[0]&&adjacentLeadingKeys(lower[0],s[0])&&s.slice(1)===lower.slice(1)&&usage(s)>=20;
    // Allow a dictionary adverb with an internal omission even when the usage
    // sample contains no occurrence of that particular -ly form.
    const adverbOmission=s=>lower.length>=7&&lower.endsWith('ly')&&s.endsWith('ly')&&s.length===lower.length+1&&enLower.has(s.slice(0,-2))&&sharedPrefix(s)>=3&&nearOne(lower,s);
    // A repeated source letter alone is not proof that it should be deleted.
    // A much more frequent insertion target can preserve the intended word
    // (litte/little) instead of a rare doubled-letter deletion (lite).
    const frequentInsertion=s=>s.length===lower.length+1&&usage(s)>=20&&[...sameRuns].some(other=>other.length<lower.length&&usage(s)>=10*Math.max(1,usage(other)));
    // With equally observed candidates, prefer filling an internal omission
    // while retaining both ends over deleting an original letter.
    const internalInsertion=s=>s.length===lower.length+1&&usage(s)>=1&&sharedPrefix(s)>=3&&s.slice(-2)===lower.slice(-2)&&nearOne(lower,s)&&[...candidates].some(other=>other.length===lower.length-1&&usage(other)>=1&&usage(s)>=usage(other)&&nearOne(lower,other));
    return [...candidates].filter(s=>spellingEvidence(s)&&(usage(s)>=1||adverbOmission(s)||s.length>lower.length&&sameRuns.has(s))&&(lower.length>=5||transpositions.has(s)||s.length===lower.length+1&&sameRuns.has(s)&&usage(s)>=20||/([a-z])\1{2,}/.test(lower)&&sameRuns.has(s))&&(s[0]===lower[0]||leadingKeySlip(s)||!(/^[A-Z]/.test(word))&&transpositions.has(s))).sort((a,b)=>Number(leadingKeySlip(b))-Number(leadingKeySlip(a))||Number(internalInsertion(b))-Number(internalInsertion(a))||Number(frequentInsertion(b))-Number(frequentInsertion(a))||Number(terminalKeySlip(b))-Number(terminalKeySlip(a))||Number(adjectiveEnding(b))-Number(adjectiveEnding(a))||Number(sameRuns.has(b))-Number(sameRuns.has(a))||Number(transpositions.has(b))-Number(transpositions.has(a))||Number(b[0]===lower[0])-Number(a[0]===lower[0])||Number(doubled.has(b))-Number(doubled.has(a))||suffixScore(b)-suffixScore(a)||Number(b===lower.slice(0,-1))-Number(a===lower.slice(0,-1))||usage(b)-usage(a)||sharedPrefix(b)-sharedPrefix(a)||Math.abs(a.length-lower.length)-Math.abs(b.length-lower.length)||a.localeCompare(b)).slice(0,5).map(s=>word===word.toUpperCase()?s.toUpperCase():/^[A-Z][a-z]+$/.test(word)?s[0].toUpperCase()+s.slice(1):s);
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
      if(morphology.predicate(candidate)){
        // Morphological acceptance also includes nonstandard forms such
        // as 됬어. A generated candidate still needs orthographic repair.
        const repair=orthography(candidate,sets,noPersonalWords,knownOrthographicPredicate,knownOrthographicNoun);
        suggestions.push(repair?.suggestions.length===1?repair.suggestions[0]:candidate);
      }
      else {
        // Compose explicit negative-adverb or verified -게 되다 boundaries,
        // not an arbitrary segmentation containing unknown pieces.
        const spaced=morphology.spacing(candidate,noPersonalWords);
        if(spaced?.rule==='2')suggestions.push(spaced.text);
        else if(['41/42','47'].includes(spaced?.rule)&&!spaced.unknowns?.length){
          const parts=spaced.text.split(' ');
          if(parts.length===2&&parts[0].endsWith('게')&&morphology.predicate(parts[0])&&morphology.predicate(parts[1])?.root==='되')suggestions.push(spaced.text);
        }
      }
    }
    // Edit distance alone cannot distinguish a misspelled noun from a name.
    // Noun replacements belong in sourced, bounded orthography rules.
    return [...new Set(suggestions)].slice(0,5);
  }
  return function check(text,words=[],boundary={}) {
    const personal=new Set(words.flatMap(word=>[word,word.normalize('NFC').replaceAll('’',"'")])),results=[];
    const mixedKorean=/[가-힣]/.test(text);
    // Spacing analysis depends on the word and this check's dictionary only.
    // Reuse it for repeated words; context rules and offsets stay per occurrence.
    const spacingResults=new Map();
    let auxiliaryRepairEnd=0;
    const repositoryNames=[...text.matchAll(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/([A-Za-z0-9_.-]+)/g)].map(m=>m[1].toLowerCase());
    // A parenthetical Romance-language name is not English edit-distance
    // input. Keep the words reviewable and preserve the surrounding prose.
    const foreignGlosses=[...text.matchAll(/\([a-z]+(?:\s+[a-z]+){0,2}\s+(?:de|del|du|des)\s+[a-z]+(?:\s+[a-z]+){0,2}\)/gi)].map(m=>[m.index,m.index+m[0].length]);
    // Preserve this established French idiom as a phrase, without allowlisting
    // its component word lettres in ordinary English prose.
    const protectedForeignPhrases=[...text.matchAll(/\bhomme\s+des\s+lettres\b/gi)].map(m=>[m.index,m.index+m[0].length]);
    // A name stated explicitly in the same input also identifies earlier
    // mentions. Keep the identity reviewable without inventing internal gaps.
    const statedKoreanNames=[...text.matchAll(/(?:이름|제품명|상표명)(?:이|은)[ \u00a0]+([가-힣]{2,}?)(?:이지만|입니다|이라고|이라서|이에요)(?=$|[^가-힣])/gu)].map(m=>m[1]);
    const excluded=[...protectedForeignPhrases,...[...text.matchAll(/https?:\/\/[^\s]+|`[^`]*`|\b[A-Za-z0-9_-]+\.(?:md|txt|png|jpe?g|gif|webp|pdf|json|tsx?|jsx?|html|css|zip)\b|\b(?:Ctrl|Control|Alt|Option|Shift|Cmd|Command|Meta)(?:\+[A-Za-z0-9]+)+/g)].map(m=>[m.index,m.index+m[0].length])];
    // TeX control words are identifiers, including when pasted without math
    // delimiters. Their arguments and surrounding prose remain checkable.
    for(const m of text.matchAll(/\\[A-Za-z]+/g))excluded.push([m.index,m.index+m[0].length]);
    // Bare DOI names are identifiers even without a doi.org URL.
    // Modern Crossref suffix syntax: crossref.org/blog/dois-and-matching-regular-expressions/.
    for(const m of text.matchAll(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi))excluded.push([m.index,m.index+m[0].length]);
    // Bare hosts and email addresses are structured identifiers even without
    // a URL scheme. Protect the full span before grammar and token checking.
    for(const m of text.matchAll(/\b(?:[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@)?(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}\b(?:\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]*)?/g))excluded.push([m.index,m.index+m[0].length]);
    for(const m of text.matchAll(/\b(?=[A-Za-z0-9_]*[A-Za-z])(?=[A-Za-z0-9_]*[0-9_])[A-Za-z0-9_]+\b/g)){
      const quantity=m[0].match(/^(\d+(?:[.,]\d+)*)(개월|시간|달러|유로|원|엔|년|달|일|시|분|초|세|살|개|명|회|번|kg|km|cm|mm|GB|MB|TB|KB|ml|mL|g|m|L|%)$/);
      const after=text.slice(m.index+m[0].length);
      const quantityTail=/^[ \u00a0]*(?:으로서|으로써|으로|로서|로써|로|인데|이고|입니다|이었다|이었|은|는|이|가|을|를|도|만|정도|짜리|쯤|이상|이하|동안|만에|전|후|에서|부터|까지)?(?=$|[\s.,!?;:)\]…])/u.test(after);
      if(quantity&&quantityTail)continue;
      excluded.push([m.index,m.index+m[0].length]);
    }
    // Relative request targets are structured identifiers, including query
    // placeholders containing spaces. Do not change their path/key casing.
    for(const m of text.matchAll(/(?:^|[\s(])\/[A-Za-z0-9._~/-]+\?[A-Za-z0-9_%-]+=(?:<[^>\n]*>|[^\s)]*)/g)){
      const start=m.index+(m[0][0]==='/'?0:1);excluded.push([start,m.index+m[0].length]);
    }
    // Slash-delimited resource paths retain identifier casing without a query.
    for(const m of text.matchAll(/(?:^|[\s("'])\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)+\/?/g)){
      const start=m.index+(m[0][0]==='/'?0:1);excluded.push([start,m.index+m[0].length]);
    }
    // CSS URL functions carry code identifiers and resource paths together.
    for(const m of text.matchAll(/\burl\(\s*(?:"[^"]*"|'[^']*'|[^\s)]*)\s*\)/gi))excluded.push([m.index,m.index+m[0].length]);
    // Explicitly introduced foreign sayings retain their quoted spelling.
    // Ordinary English quotations remain eligible for spelling checks.
    for(const m of text.matchAll(/\b(?:in|from) (?:Tamil|Hindi|Spanish|French|German|Italian|Portuguese|Latin|Arabic|Japanese|Korean|Chinese)\b[^.!?\n]{0,100}?\b(?:saying|phrase|word)\s+(['"“‘])[^'"”’\n]+['"”’]/gi)){
      const quote=m[0].indexOf(m[1]);excluded.push([m.index+quote,m.index+m[0].length]);
    }
    for(const m of text.matchAll(/(?:"[^"\n]+"|“[^”\n]+”|'[^'\n]+'|‘[^’\n]+’)\s*\((?:Tamil|Hindi|Spanish|French|German|Italian|Portuguese|Latin|Arabic|Japanese|Korean|Chinese)\s+for\b/gi)){
      const end=m[0].search(/\s*\(/);excluded.push([m.index,m.index+end]);
    }
    for(const m of text.matchAll(/\bde facto\b/gi))excluded.push([m.index,m.index+m[0].length]);
    results.push(...englishGrammar(text,[...excluded,...foreignGlosses],personal));
    const quotedEnds=new Set([...text.matchAll(/"[^"\n]+"|'[^'\n]+'|“[^”\n]+”|‘[^’\n]+’|「[^」\n]+」|『[^』\n]+』|\([^()\n]+\)|\[[^\[\]\n]+\]/g)].map(m=>m.index+m[0].length));
    function emit(from,to,language,type,suggestions,base) {results.push({from,to,original:text.slice(from,to),language,type,suggestions,base,applicable:suggestions.length>0,reason:type==='unknown'?'Not in the selected vocabulary':'Prototype lexical candidate; rule source not yet verified'});}
    // In the paired expression “~ㄹ 듯 말 듯 하다”, keep the independent
    // boundary repair on 말듯 limited to a validated adnominal host.
    for(const m of text.matchAll(/([가-힣]+)[ \u00a0]*듯[ \u00a0]+(말듯)(?=[ \u00a0]+하다(?:요)?(?=$|[^가-힣ㄱ-ㅎㅏ-ㅣ]))/g)){
      const host=m[1],from=m.index+m[0].lastIndexOf(m[2]),to=from+m[2].length;
      if(!morphology.predicate(host)?.adnominal||personal.has(m[2])||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      emit(from,to,'ko','spacing',['말 듯']);
      results.at(-1).reason='Separate 말 듯 in the paired expression ~ㄹ 듯 말 듯 하다';
    }
    // These boundaries require a complete preceding predicate or an explicit
    // sentence context; a bare substring could also be a lexical compound.
    for(const m of text.matchAll(/좋은[ \u00a0]+일하면(?=[ \u00a0]+좋은[ \u00a0]+곳)/g)){
      if(personal.has(m[0])||excluded.some(([a,b])=>m.index<b&&m.index+m[0].length>a))continue;
      emit(m.index,m.index+m[0].length,'ko','spacing',[m[0].replace('일하면','일 하면')]);
    }
    for(const m of text.matchAll(/([가-힣]{2,})뻔한(?=$|[^가-힣])/g)){
      const host=m[1],analysis=morphology.predicate(host),from=m.index,to=from+m[0].length;
      if(!analysis?.adnominal||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      emit(from,to,'ko','spacing',[host+' 뻔한']);
    }
    for(const m of text.matchAll(/결승보고(?=[ \u00a0]+뽕차서)/g)){
      if(personal.has(m[0])||excluded.some(([a,b])=>m.index<b&&m.index+m[0].length>a))continue;
      emit(m.index,m.index+m[0].length,'ko','spacing',['결승 보고']);
    }
    for(const m of text.matchAll(/것보면(?=$|[^가-힣])/g)){
      if(!/(?:이런|그런|저런)[ \u00a0]+$/.test(text.slice(Math.max(0,m.index-10),m.index))||personal.has(m[0])||excluded.some(([a,b])=>m.index<b&&m.index+m[0].length>a))continue;
      emit(m.index,m.index+m[0].length,'ko','spacing',['것 보면']);
    }
    for(const [pattern,replace,reason] of [
      [/\d+만개(?:를|가|는|도|만|에)?(?![가-힣\d])/g,s=>s.replace('만개','만 개'),'A written scale and following counter are separate'],
      [/\d+월\d+일날(?![가-힣\d])/g,s=>s.replace('월','월 ').replace('일날','일 날'),'Calendar date and following noun 날 are separate'],
      [/\d+분전임(?![가-힣\d])/g,s=>s.replace('분전임','분 전임'),'Duration and dependent noun 전 are separate'],
      [/명예[ \u00a0]+를(?![가-힣])/g,s=>s.replace(/[ \u00a0]+/,'') ,'Attach the object particle to its noun'],
      [/그[ \u00a0]+녀에게(?![가-힣])/g,s=>s.replace(/[ \u00a0]+/,'') ,'Keep the pronoun 그녀 intact'],
    ])for(const m of text.matchAll(pattern)){
      const from=m.index,to=from+m[0].length;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      emit(from,to,'ko','spacing',[replace(m[0])]);results.at(-1).reason=reason;
    }
    // An attested action noun joins 해, while the auxiliary 주다 keeps its
    // permitted boundary. Require both complete predicate forms.
    for(const match of text.matchAll(/([가-힣]{2,})[ \u00a0]+(해[가-힣]+)(?=$|[^가-힣])/g)){
      const from=match.index,to=from+match[0].length,host=match[1],auxiliary=match[2].slice(1);
      if(actionNouns.has(host)&&morphology.predicate(host+'해')&&morphology.predicate(auxiliary)?.root==='주'&&!personal.has(match[0])&&!excluded.some(([a,b])=>from<b&&to>a)){
        emit(from,to,'ko','spacing',[host+'해 '+auxiliary]);
        results.at(-1).reason='Join the action noun with 해 and separate auxiliary 주다';
      }
    }
    // Validate the complete quantity before separating its independent
    // modifier. Preserve numeric ranges and permitted digit-unit attachment.
    for(const m of text.matchAll(/(만|딱|주|월|연|일)(\d+(?:[.,]\d+)*(?:[~～–-]\d+(?:[.,]\d+)*)?)(천|만|억|조)?([ \u00a0]*)(개월|시간|달러|유로|원|엔|년|달|일|시|분|초|세|살|개|명|회|번)([가-힣]*)/g)){
      const from=m.index,to=from+m[0].length,tail=m[6],currency=['원','달러','유로','엔'].includes(m[5]);
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      if(m[1]==='만'&&!['개월','시간','년','달','일','분','초','세','살'].includes(m[5]))continue;
      if(['주','월','연','일'].includes(m[1])&&!currency)continue;
      if(m[3]&&!currency)continue;
      if(tail&&!sets.josa.has(tail)&&morphology.predicate(tail)?.root!=='이')continue;
      emit(from,to,'ko','spacing',[m[1]+' '+m[2]+(m[3]??'')+(m[3]?' ':m[4])+m[5]+tail]);
      results.at(-1).reason='Separate the independent quantity modifier while preserving the numeric range and validated unit';
    }
    // Frequency nouns precede a counted occurrence; a duration phrase
    // precedes dependent noun 차. Neither rule separates an identifier.
    for(const m of text.matchAll(/(주|월|연|일)(\d+(?:[.,]\d+)*(?:회|번))([가-힣]*)/g)){
      const from=m.index,to=from+m[0].length,tail=m[3].startsWith('씩')?m[3].slice(1):m[3];
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      if(tail&&!sets.josa.has(tail))continue;
      emit(from,to,'ko','spacing',[m[1]+' '+m[2]+m[3]]);
      results.at(-1).reason='Separate the frequency noun from a counted occurrence while preserving its unit and particle';
    }
    for(const m of text.matchAll(/(\d+(?:[.,]\d+)*[ \u00a0]*(?:개월|시간|년|달|주|일|분|초))차([가-힣]*)/g)){
      const from=m.index,to=from+m[0].length;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      if(m[2]&&!sets.josa.has(m[2])&&morphology.predicate(m[2])?.root!=='이')continue;
      emit(from,to,'ko','spacing',[m[1]+' 차'+m[2]]);
      results.at(-1).reason='Dependent noun 차 follows the complete duration phrase, unlike a numeral ordinal such as 제1차';
    }
    // Numeric attachments otherwise skip the token scanner to protect IDs.
    // A consonant-final counting unit still takes past copula 이었-, with
    // the complete ending validated independently of the numeral.
    for(const m of text.matchAll(/(\d+(?:[.,]\d+)*)(주년|개월|년|일|분|원|명|권|호)이였([가-힣]+)/g)){
      const from=m.index,to=from+m[0].length,unit=m[2],ending=m[3];
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||excluded.some(([a,b])=>from<b&&to>a))continue;
      if(personal.has(unit+'이였'+ending)||(unit.charCodeAt(unit.length-1)-0xac00)%28===0||morphology.predicate('이었'+ending)?.root!=='이')continue;
      emit(from,to,'ko','spelling',[m[1]+unit+'이었'+ending]);
      results.at(-1).reason='Consonant-final counting unit followed by past copula 이었-; preserve the numeral';
    }
    // Read only explicit measurement symbols, never arbitrary Latin names.
    // Reuse Korean allomorph rules and retain the author's number and unit.
    const measurementSymbols=[];
    for(const m of text.matchAll(/\d+(?:[.,]\d+)*(?:[ \u00a0]*)(cm|mm|km|m)(으로서|으로써|으로|로서|로써|로|을|를)?(?![A-Za-z0-9_가-힣])/g)){
      const from=m.index,to=from+m[0].length;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      const symbolEnd=to-(m[2]?.length??0);
      measurementSymbols.push([symbolEnd-m[1].length,symbolEnd]);
      if(!m[2])continue;
      const reading='미터';
      const repair=orthography(reading+m[2],sets,personal,knownOrthographicPredicate,w=>w===reading);
      if(!repair)continue;
      emit(from,to,'ko','spelling',repair.suggestions.map(s=>m[0].slice(0,-m[2].length)+s.slice(reading.length)));
      results.at(-1).reason='Particle allomorph follows the Korean reading of the explicit measurement unit';
    }
    // A calendar month may keep its digit attached, but 말/초 are separate
    // dependent nouns. Do not scan inside identifiers, URLs, or code.
    for(const m of text.matchAll(/(?:\d{4}년|(?:1[0-2]|[1-9])월|(?:3[01]|[12]\d|[1-9])일)(?:말|초|달|날)[가-힣]*/g)){
      const from=m.index,to=from+m[0].length;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      const parts=m[0].match(/^(\d+[년월일])(말|초|달|날)(.*)$/);
      if(parts[1].endsWith('일')?parts[2]!=='날':parts[2]==='날'||parts[2]==='달'&&!parts[1].endsWith('월'))continue;
      if(parts[3]&&!sets.josa.has(parts[3])&&morphology.analyze(parts[2]+parts[3],new Set())?.base!==parts[2])continue;
      emit(from,to,'ko','spacing',[parts[1]+' '+parts[2]+parts[3]]);
      results.at(-1).reason=['말','초'].includes(parts[2])
        ?`Calendar ${parts[1].endsWith('월')?'month':'year'} followed by dependent noun 말/초`
        :'Calendar date followed by a separate noun 달/날; retain the author’s wording';
    }
    // A written scale and a following counting/currency unit are separate:
    // 5만 원 differs from the permitted Arabic-number attachment in 50000원.
    for(const m of text.matchAll(/\d+(?:[.,]\d+)*(?:천|만|억|조)(?:원|달러|엔|유로|명|호)[가-힣]*/g)){
      const from=m.index,to=from+m[0].length;
      if(results.some(f=>f.from<=from&&f.to>=to))continue;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      const parts=m[0].match(/^(\d+(?:[.,]\d+)*(?:천|만|억|조))(원|달러|엔|유로|명|호)(.*)$/);
      const tail=parts[3];
      const rangeTail=tail.startsWith('대')&&(!tail.slice(1)||sets.josa.has(tail.slice(1))||morphology.analyze(tail,personal)?.kind==='noun'||tail.startsWith('대였')&&morphology.predicate('이었'+tail.slice(2))?.root==='이');
      // Copula inflections preserve the same counting-unit boundary.
      // Validate the entire tail instead of listing observed sentences.
      const copulaTail=morphology.predicate(tail)?.root==='이';
      if(tail&&!sets.josa.has(tail)&&!rangeTail&&!copulaTail)continue;
      emit(from,to,'ko','spacing',[parts[1]+' '+parts[2]+tail]);
      results.at(-1).reason='Separate the written numeric scale from its counting or currency unit';
    }
    // Arabic numerals may attach to their unit. The following independent
    // duration/comparison word still needs a boundary; preserve the number.
    for(const m of text.matchAll(/\d+(?:[.,]\d+)*(?:개월|시간|년|달|일|시|분|초|원|억|만|번|개|명|칸|kg|km|cm|mm|%)(?:동안|이상|이하|넘게|정도|만에|전|후)[가-힣]*/g)){
      const from=m.index,to=from+m[0].length;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a))continue;
      const parts=m[0].match(/^(\d+(?:[.,]\d+)*(?:개월|시간|년|달|일|시|분|초|원|억|만|번|개|명|칸|kg|km|cm|mm|%))(동안|이상|이하|넘게|정도|만에|전|후)(.*)$/);
      if(!parts||parts[3]&&!sets.josa.has(parts[3])&&morphology.analyze(parts[2]+parts[3],new Set())?.base!==parts[2])continue;
      if(['전','후','만에'].includes(parts[2])&&!/(?:개월|시간|년|달|일|시|분|초)$/.test(parts[1]))continue;
      emit(from,to,'ko','spacing',[parts[1]+' '+parts[2]+parts[3]]);
      results.at(-1).reason='Preserve Arabic numeral plus unit; separate the following duration or comparison word';
    }
    // A percentage is a complete quantity. Keep its attached particles and
    // copula, but separate a following independently recognized word.
    for(const m of text.matchAll(/(\d+(?:[.,]\d+)*(?:[~～–-]\d+(?:[.,]\d+)*)?%)([가-힣]+)/g)){
      const from=m.index,to=from+m[0].length,word=m[2];
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a)||results.some(f=>f.from<to&&f.to>from))continue;
      const predicate=morphology.predicate(word),nominal=morphology.analyze(word,personal);
      if(sets.josa.has(word)||predicate?.root==='이')continue;
      const suffix=word.match(/^(가량|짜리|쯤|대|여|권)([가-힣]*)$/);
      if(suffix&&(!suffix[2]||sets.josa.has(suffix[2])||morphology.predicate(suffix[2])?.root==='이'))continue;
      if(!predicate&&!(nominal?.kind==='noun'&&!nominal.unknown)&&!recognizedNoun(word))continue;
      emit(from,to,'ko','spacing',[m[1]+' '+word]);
      Object.assign(results.at(-1),{ambiguous:true,reason:'Separate the independent word after a percentage while preserving attached particles and copulas'});
    }
    // Verified lexical compounds, not a general noun-concatenation rule.
    // Keep particles/copulas intact and never cross a line or protected span.
    for(const m of text.matchAll(/([이그저][ \u00a0]+곳|이것[ \u00a0]+저것|그[ \u00a0]*때[ \u00a0]*그[ \u00a0]*때|안경[ \u00a0]+다리|아무[ \u00a0]+것)([가-힣]*)/g)){
      const from=m.index,to=from+m[0].length;
      if(!/[ \u00a0]/.test(m[1])||/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||excluded.some(([a,b])=>from<b&&to>a)||personal.has(m[0]))continue;
      if(m[2]&&!sets.josa.has(m[2])&&morphology.predicate(m[2])?.root!=='이')continue;
      const joined=m[1].replace(/[ \u00a0]/g,'')+m[2];
      const repair=orthography(joined,sets,personal,knownOrthographicPredicate,knownOrthographicNoun);
      emit(from,to,'ko',repair?'spelling':'spacing',repair?.suggestions??[joined]);
      results.at(-1).reason=repair?repair.reason+'; also restore the lexical compound boundary':'Preserve the verified lexical compound and its following particle';
    }
    for(const [source,replacement] of candidateJoinedPhrases){
      for(let from=text.indexOf(source);from!==-1;from=text.indexOf(source,from+source.length)){
        const to=from+source.length;
        if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(source)||excluded.some(([a,b])=>from<b&&to>a)||results.some(f=>from<f.to&&to>f.from))continue;
        emit(from,to,'ko','spacing',[replacement]);
        Object.assign(results.at(-1),{ambiguous:true,reason:'Joined expression candidate; confirm intended usage'});
      }
    }
    for(const m of text.matchAll(/=ㅅ=|개[ \u00a0]+더운|극[ \u00a0]+불호/g)){
      const from=m.index,to=from+m[0].length;
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||(/[A-Za-z0-9_가-힣]/.test(text[to]||'')&&!(m[0].startsWith('극')&&/^였/.test(text.slice(to))))||excluded.some(([a,b])=>from<b&&to>a))continue;
      if(!personal.has(m[0])){
        emit(from,to,'ko','unknown',[],m[0]);
        Object.assign(results.at(-1),{ambiguous:true,reviewKind:'community',reason:'Possible informal expression; review or register the intended whole phrase'});
      }
      excluded.push([from,to]);
    }
    for(const m of text.matchAll(/(\d+)?([가-힣]{2,})떄(도|는|가|에|마다|부터|까지)?(?![가-힣])/g)){
      const from=m.index,to=from+m[0].length,host=m[2],tail=m[3]??'';
      if(/[A-Za-z0-9_가-힣]/.test(text[from-1]||'')||/[A-Za-z0-9_가-힣]/.test(text[to]||'')||personal.has(m[0])||excluded.some(([a,b])=>from<b&&to>a)||results.some(f=>from<f.to&&to>f.from))continue;
      const hostFrom=from+(m[1]?.length??0),typoFrom=hostFrom+host.length;
      if(host==='프맥'&&!personal.has(host))emit(hostFrom,typoFrom,'ko','unknown',[],host);
      emit(typoFrom,to,'ko','spelling',[' 때'+tail]);
      Object.assign(results.at(-1),{ambiguous:true,reason:'Typo 떄 for dependent noun 때 after a nominal; confirm the intended boundary'});
    }
    const initialRepairSpans=results.filter(f=>f.applicable).map(f=>[f.from,f.to]);
    const tokens=[...text.matchAll(/\p{Script=Latin}[\p{Script=Latin}\p{M}]*(?:['’-][\p{Script=Latin}\p{M}]+)*|[가-힣ㄱ-ㅎㅏ-ㅣ]+(?:_[ㄱ-ㅎㅏ-ㅣ]+)*/gu)].flatMap(m=>{
      // A laugh/emoticon suffix must not swallow the preceding word's
      // spelling error. Keep offsets in the original sentence for context.
      if(!/[ㄱ-ㅎㅏ-ㅣ]/.test(m[0])||personal.has(m[0]))return [m];
      return [...m[0].matchAll(/[가-힣]+|[ㄱ-ㅎㅏ-ㅣ]+(?:_[ㄱ-ㅎㅏ-ㅣ]+)*/g)].map(part=>({0:part[0],index:m.index+part.index}));
    });
    for(const m of tokens) {
      const word=m[0],from=m.index,to=from+word.length;
      if(from<auxiliaryRepairEnd)continue;
      if(measurementSymbols.some(([a,b])=>from===a&&to===b))continue;
      if(initialRepairSpans.some(([a,b])=>a<=from&&b>=to))continue;
      if(excluded.some(([a,b])=>from<b&&to>a)||/[0-9_]/.test(text[from-1]||'')||/[0-9_]/.test(text[to]||''))continue;
      // Internet shorthand is reviewable, not automatically standard spelling.
      // Do not invent an expansion; explicit personal entries remain respected.
      if(/[ㄱ-ㅎㅏ-ㅣ]/.test(word)){
        if(!personal.has(word))emit(from,to,'ko','unknown',[],word);
        continue;
      }
      if(word.length>analysisLimit){
        if(!personal.has(word)){
          emit(from,to,/^\p{Script=Latin}/u.test(word)?'en':'ko','unknown',[],word);
          Object.assign(results.at(-1),{analysisLimit,reason:`An unbroken span longer than ${analysisLimit} characters needs manual review`});
        }
        continue;
      }
      if(/^\p{Script=Latin}/u.test(word)) {
        if(results.some(item=>item.language==='en'&&item.from<to&&item.to>from))continue;
        if(foreignGlosses.some(([a,b])=>from>a&&to<b)){
          if(!personal.has(word))emit(from,to,'en','unknown',[],word);
          continue;
        }
        // Smart punctuation changes typography, not the contracted word.
        // Normalize lookup only; offsets, user text and replacements stay intact.
        const lookup=word.replaceAll('’',"'");
        const localBefore=text.slice(Math.max(0,from-50),from);
        if(lookup.toLowerCase()==='celular'&&/\bwith\s+$/i.test(localBefore)&&/^\s+Number\s+or\s+IMEI\b/i.test(text.slice(to))&&enLower.has('cellular')){
          emit(from,to,'en','spelling',[word[0]===word[0].toUpperCase()?'Cellular':'cellular'],word);continue;
        }
        // Capitalized names and plural acronyms are not misspellings merely
        // because a smaller word list contains a similar unrelated word.
        // A letter swap can also make a different name; only an excessive
        // repeated letter retains a narrow spelling candidate here.
        if(/^[A-Z]{2,}s$/.test(lookup))continue;
        // A capitalized provider before an interface acronym is a possible
        // name even when deleting a repeated letter yields a dictionary word.
        // Keep it reviewable instead of treating that coincidence as a typo.
        if(/^[A-Z][a-z]+$/.test(lookup)&&/^\s+(?:API|SDK|CLI|IDE)\b/.test(text.slice(to))&&!personal.has(word)&&!personal.has(lookup)&&!english.has(lookup)&&!enLower.has(lookup.toLowerCase())&&!recognizedEnglish.has(lookup.toLowerCase())){
          emit(from,to,'en','unknown',[],word);continue;
        }
        if(!mixedKorean&&/^[A-Z][a-z]+(?:'s)?$/.test(lookup)){
          const candidates=englishSuggestions(lookup),lower=lookup.toLowerCase();
          const strong=candidates.some(candidate=>{
            const target=candidate.toLowerCase();
            if(['woudl','basiically'].includes(lower)&&(!localBefore.trim()||/[.!?][ \u00a0]*$/.test(localBefore)))return true;
            // A missing repeated consonant in a familiar word is distinct
            // from weak name-like substitutions such as Amature/amateur.
            if(target.length===lower.length+1&&englishUsage.get(target)>=10&&lower.replace(/([a-z])\1+/g,'$1')===target.replace(/([a-z])\1+/g,'$1'))return true;
            // Moving a doubled letter to another run preserves the complete
            // letter sequence and length, unlike substituting a similar name.
            if(lower.length>=6&&target.length===lower.length&&englishUsage.get(target)>=1&&lower.replace(/([a-z])\1+/g,'$1')===target.replace(/([a-z])\1+/g,'$1'))return true;
            // Preserve the attested -ceive spelling repair after c.
            if(/^(?:re|de|per|con)cieve(?:d|s)?$/.test(lower)&&lower.replace('cie','cei')===target)return true;
            if(lower.length>=6&&/([a-z])\1{2,}/.test(lower)&&lower.replace(/([a-z])\1+/g,'$1')===target.replace(/([a-z])\1+/g,'$1'))return true;
            return false;
          });
          if(!strong)continue;
        }
        if(knownTechnicalAbbreviations.has(lookup.toLowerCase())||recognizedEnglish.has(lookup.toLowerCase()))continue;
        // A lower-case plural of an attested initialism is still that
        // initialism, not a transposition of an unrelated short word.
        if(/^[a-z]{2,5}s$/.test(lookup)&&english.has(lookup.slice(0,-1).toUpperCase()))continue;
        // Productive -ate -> -ator nouns name an actor or tool. Retain the
        // attested verb base instead of adding an adjective's final y.
        const agentNoun=lookup.toLowerCase().match(/^([a-z]{3,})ators?$/);
        if(agentNoun&&enLower.has(agentNoun[1]+'ate'))continue;
        // Repeated final consonants extend hesitation sounds in prose.
        if(/^(?:u+m+|h+m+|u+h+)$/i.test(lookup)&&enLower.has(lookup[0].toLowerCase()==='h'?'hmm':lookup.toLowerCase().includes('h')?'uh':'um'))continue;
        // Regular plural/third-person suffixes preserve an attested base.
        // This expands recognition only; no synthetic word becomes a target.
        const lowerLookup=lookup.toLowerCase();
        // British -ise/-ising forms remain the same verb as their attested
        // -ize/-izing counterparts. A productive -less adjective likewise
        // retains its known base, rather than borrowing a nearby noun.
        const americanVerb=lowerLookup.replace(/is(e[ds]?|ing)$/,'iz$1');
        if(americanVerb!==lowerLookup&&enLower.has(americanVerb))continue;
        if(!personal.has(word)&&!personal.has(lookup)&&lowerLookup.endsWith('i')&&lowerLookup.length>=7&&enLower.has(lowerLookup.slice(0,-1))){emit(from,to,'en','unknown',[],word);continue;}
        if(lowerLookup.endsWith('less')&&lowerLookup.length>6&&enLower.has(lowerLookup.slice(0,-4)))continue;
        if(lowerLookup.endsWith('ish')&&lowerLookup.length>5&&enLower.has(lowerLookup.slice(0,-3)))continue;
        const inflectionBase=/[sxz]es$|(?:ch|sh)es$/.test(lowerLookup)?lowerLookup.slice(0,-2):/[^aeiou]ies$/.test(lowerLookup)?lowerLookup.slice(0,-3)+'y':/[^s]s$/.test(lowerLookup)?lowerLookup.slice(0,-1):null;
        if(inflectionBase&&inflectionBase.length>=3&&(enLower.has(inflectionBase)||recognizedEnglish.has(inflectionBase)))continue;
        // Regular participles retain a known base (diffing, vibing). This
        // is recognition only, not another edit-distance candidate source.
        if(lowerLookup.endsWith('ing')){
          const stem=lowerLookup.slice(0,-3),bases=[stem,stem+'e'];
          // An attested doubled-consonant participle must still compete:
          // recognizing control alone must not approve controling.
          const doubledParticiple=stem+stem.at(-1)+'ing';
          if(!enLower.has(doubledParticiple)&&bases.some(base=>base.length>=3&&(enLower.has(base)||recognizedEnglish.has(base))))continue;
        }
        // A matching repository link explicitly identifies this name. Keep
        // it reviewable rather than turning it into an unrelated dictionary word.
        if(repositoryNames.includes(lowerLookup)){emit(from,to,'en','unknown',[],word);continue;}

        // Productive prefixes preserve a known whole base, including its
        // inflection. They recognize words without creating correction targets.
        const prefixed=lookup.match(/^(?:un|non|re|micro|multi|co|pre|post|sub|super)-?([a-z]{3,})$/i);
        if(!personal.has(word)&&!personal.has(lookup)&&lookup.toLowerCase()==='unprecented'){emit(from,to,'en','spelling',['unprecedented'],word);continue;}
        if(prefixed&&(enLower.has(prefixed[1].toLowerCase())||recognizedEnglish.has(prefixed[1].toLowerCase())))continue;
        if(personal.has(word)||personal.has(lookup)||english.has(lookup)||enLower.has(lookup.toLowerCase())||enLower.has(lookup.toLowerCase().replace(/'s$/,''))||english.has(lookup.replace(/'s$/,'')))continue;
        // An accented Latin word is one token, including decomposed marks.
        // ASCII edit distance must not replace an isolated fragment of it.
        if(/[^A-Za-z'’-]/.test(lookup)){emit(from,to,'en','unknown',[],word);continue;}
        // Conventional abbreviation of an attested word; a period is optional.
        // Do not treat arbitrary short identifiers as registered vocabulary.
        if(lookup.toLowerCase()==='vs'&&enLower.has('versus'))continue;
        // An unfamiliar kinship/cultural term with an explicit parenthetical
        // gloss is intentional vocabulary, not evidence for a letter swap.
        const glossed=/\b(?:my|your|his|her|our|their|called|named)\s+$/i.test(text.slice(Math.max(0,from-30),from))&&/^\s*\([a-z]+(?:[ -][a-z]+){1,5}\)/i.test(text.slice(to));
        if(glossed){emit(from,to,'en','unknown',[],word);continue;}
        // Context selects the part of speech where a nearby dictionary
        // adjective would otherwise win over an ordinary verb/noun typo.
        const before=text.slice(Math.max(0,from-50),from);
        if(/\b(?:(?:app|tool|project|service|manager|platform|library|package)\s+(?:called|named)|(?:I|we)\s+call)\s+$/i.test(before)){
          emit(from,to,'en','unknown',[],word);continue;
        }
        // A repeated initial in a provider name is not necessarily a typo.
        // Preserve it when a determiner and customer relationship identify it.
        if(/^([a-z])\1[a-z]+$/i.test(lookup)&&/\b(?:a|an|the|my|your|their)\s+$/i.test(before)&&/^\s+(?:customers?|subscribers?)\b/i.test(text.slice(to))){
          emit(from,to,'en','unknown',[],word);continue;
        }
        // Colloquial -in after a progressive auxiliary preserves an attested
        // -ing verb; lexical distance must not turn givin into given.
        if(/^[a-z]{3,}in$/.test(lookup)&&enLower.has(lookup+'g')&&englishSuggestions(word)[0]!==lookup+'g'&&/\b(?:am|is|are|was|were|ain['’]?t)(?:\s+not)?\s+$/i.test(before)){
          emit(from,to,'en','unknown',[],word);continue;
        }
        if(lookup.toLowerCase()==='checkin'&&/\bself\s+$/i.test(before)&&/^\s+terminals?\b/i.test(text.slice(to)))continue;
        const financialTypo=lookup==='traffi'&&/\bfixed\s+$/i.test(before)?'tariff':lookup==='gping'&&/\b(?:am|is|are|was|were)(?:\s+not)?\s+$/i.test(before)&&/^\s+(?:from|to)\b/i.test(text.slice(to))?'going':null;
        if(financialTypo&&enLower.has(financialTypo)){emit(from,to,'en','spelling',[financialTypo],word);continue;}
        if(lookup.toLowerCase()==='throught'&&/\b(?:attempts?|efforts?|tries)\s+$/i.test(before)&&/^\s+history\b/i.test(text.slice(to))&&enLower.has('through')&&enLower.has('throughout')){
          emit(from,to,'en','spelling',['through','throughout'],word);continue;
        }
        const contextualRepair=lookup==='weakend'&&/\b(?:seriously|seriusly|severely|badly|further)\s+$/i.test(before)?'weakened':lookup==='noices'&&/\bmaking\s+these\s+$/i.test(before)?'noises':lookup==='ther'&&/\b(?:hi|hello|hey)\s+$/i.test(before)?'there':lookup==='avpid'&&/\bto\s+$/.test(before)?'avoid':lookup==='ceilingd'&&/\b(?:wall|walls)\s+and\s+$/.test(before)?'ceiling':lookup==='extrem'&&/^\s+(?:knowledgeable|difficult|important|good|bad|useful)\b/i.test(text.slice(to))?'extremely':null;
        if(contextualRepair&&enLower.has(contextualRepair)){emit(from,to,'en','spelling',[contextualRepair],word);continue;}
        // Preserve camel-case identifiers and acronyms as unknown expressions.
        // In Korean prose, a capitalized word with a close dictionary match
        // can be a name; do not replace it with that unrelated match. A word
        // with no candidate still receives the usual unknown-word review.
        if(personal.has(word)||personal.has(lookup)||english.has(lookup)||enLower.has(lookup.toLowerCase())||recognizedEnglish.has(lookup.toLowerCase()))continue;
        const titleCandidates=mixedKorean&&/^[A-Z][a-z]/.test(word)?englishSuggestions(word):null;
        if(titleCandidates?.length)continue;
        const shortAcronym=/^[a-z]{2,4}$/.test(word)&&english.has(word.toUpperCase());
        const shortIdentifier=mixedKorean&&/^[a-z]{2,4}$/.test(word)&&word!=='teh'&&!shortAcronym;
        const consonantIdentifier=/^[a-z]{2,4}$/i.test(word)&&!/[aeiouy]/i.test(word);
        const candidates=shortIdentifier||consonantIdentifier&&(!shortAcronym||text[from-1]==='.')||word.length<=2&&!shortAcronym||/^[A-Z]{2,}$|[a-z][A-Z]|[A-Z].*[A-Z]/.test(word)?[]:titleCandidates??englishSuggestions(word);
        emit(from,to,'en',candidates.length?'spelling':'unknown',candidates,word);
        if(shortIdentifier)Object.assign(results.at(-1),{ambiguous:true,reason:'Possible short identifier in Korean prose; no automatic replacement'});
      } else {
        const statedName=statedKoreanNames.find(name=>word.startsWith(name)&&(!word.slice(name.length)||sets.josa.has(word.slice(name.length))||morphology.predicate(word.slice(name.length))?.root==='이'));
        const authorName=/^[ \u00a0]+(?:지음|옮김)(?=$|[\s.,!?])/u.test(text.slice(to));
        if(statedName||authorName||contextualProductName(text,from,to)){
          if(!personal.has(word)){
            emit(from,to,'ko','unknown',[],word);
            results.at(-1).reason='Name, author credit, or locally identified product; preserve the complete identity for review';
          }
          continue;
        }
        // A named avatar is an identity, even when its syllables form a
        // normal adjective/noun phrase. Keep the unknown-name review.
        const avatarName=/^[ \u00a0]+캐릭(?:터)?[ \u00a0]+유저/u.test(text.slice(to))||/^-[가-힣]+-\[[^\]\n]+\][ \u00a0]+님/u.test(text.slice(to));
        if(avatarName){emit(from,to,'ko','unknown',[],word);results.at(-1).reason='Explicit character-name context; preserve the whole identity';continue;}
        // Sentence-final -는걸 is a conversational ending. Object clauses
        // with a following predicate still use the dependent noun boundary.
        if(word.endsWith('는걸')&&morphology.predicate(word)&&/^(?:[ \u00a0]*[.!?…~]|[ \u00a0]*$)/u.test(text.slice(to)))continue;
        if(word==='되느냐였는데')continue;
        if(word==='하다하다'){emit(from,to,'ko','unknown',[],word);continue;}
        // This gaming noun's copula form is complete; the general nominal
        // split search otherwise mistakes its ending for 캐다 + 던데.
        if(word==='호감캐던데')continue;
        // -(으)ㄹ수록 is an ending, unlike the dependent noun 수 in 할 수 있다.
        // Validate the reconstructed predicate and keep its full original span.
        const proportionalBase=word.endsWith('수')?word.slice(0,-1):word;
        const proportional=word.endsWith('수')?text.slice(to).match(/^[ \u00a0]+록([가-힣]*)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/):text.slice(to).match(/^[ \u00a0]+수[ \u00a0]*록([가-힣]*)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/);
        if(proportional&&!personal.has(word)&&(proportionalBase.charCodeAt(proportionalBase.length-1)-0xac00)%28===8){
          const base=morphology.predicate(proportionalBase),joined=proportionalBase+'수록'+proportional[1],complete=morphology.predicate(joined);
          const end=to+proportional[0].length;
          if(base?.adnominal&&complete?.root===base.root&&!excluded.some(([a,b])=>from<b&&end>a)&&!results.some(f=>f.from<end&&f.to>from)){
            emit(from,end,'ko','spacing',[joined]);
            results.at(-1).reason='Keep the validated proportional ending -(으)ㄹ수록 attached';
            auxiliaryRepairEnd=end;continue;
          }
        }
        // 겠 is a bound prefinal ending. Validate the complete predicate
        // before removing an internal horizontal gap, including 겠 습니다.
        const volitional=text.slice(to).match(/^[ \u00a0]+(겠[가-힣]+|습니다)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/);
        if(volitional&&!personal.has(word)&&!personal.has(volitional[1])&&(volitional[1]!=='습니다'||word.endsWith('겠'))){
          const joined=word+volitional[1],end=to+volitional[0].length;
          if(knownOrthographicPredicate(joined)&&!excluded.some(([a,b])=>from<b&&end>a)&&!results.some(f=>f.from<end&&f.to>from)){
            emit(from,end,'ko','spacing',[joined]);
            results.at(-1).reason='Keep the validated prefinal ending -겠- within its predicate';
            auxiliaryRepairEnd=end;continue;
          }
        }
        // Restore an internal honorific gap only when the complete inflection
        // retains the preceding stem, not before independent 시/실 nouns.
        const honorific=text.slice(to).match(/^[ \u00a0]+((?:으)?[시신실셨셔십][가-힣]*)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/);
        if(honorific&&!personal.has(word)&&!personal.has(honorific[1])){
          const stem=morphology.predicate(word+'다'),joined=word+honorific[1],complete=morphology.predicate(joined),end=to+honorific[0].length;
          // 시인 is a whole noun, not a free honorific ending. Other
          // nominal homographs need a core nominal/adverb host (새 신).
          const honorificNoun=morphology.analyze(honorific[1],personal);
          const independent=honorific[1]==='시인'||(knownOrthographicNoun(honorific[1])||honorificNoun?.kind==='noun')&&(sets.noun.has(word)||sets.adverb.has(word)||['이','그','저','어느'].includes(word));
          if(!independent&&stem?.root===word&&complete?.root===word&&!excluded.some(([a,b])=>from<b&&end>a)&&!results.some(f=>f.from<end&&f.to>from)){
            emit(from,end,'ko','spacing',[joined]);
            Object.assign(results.at(-1),{ambiguous:true,reason:'Keep the validated honorific inflection attached to its stem; confirm the intended predicate'});
            auxiliaryRepairEnd=end;continue;
          }
        }
        // -스럽다 forms a derived adjective, including its ㅂ irregular forms.
        // A complete attested root must match the nominal host across the gap.
        const descriptive=text.slice(to).match(/^[ \u00a0]+(스(?:럽|러)[가-힣]+)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/);
        if(descriptive&&!personal.has(word)&&!personal.has(descriptive[1])){
          const joined=word+descriptive[1],end=to+descriptive[0].length;
          const complete=morphology.predicate(joined)??recognition?.predicate(joined);
          if(complete?.root===word+'스럽'&&!excluded.some(([a,b])=>from<b&&end>a)&&!results.some(f=>f.from<end&&f.to>from)){
            emit(from,end,'ko','spacing',[joined]);
            results.at(-1).reason='Attach -스럽다 within the validated derived adjective';
            auxiliaryRepairEnd=end;continue;
          }
        }
        // Preserve the complete particle/copula after the nominal suffix -적.
        // Bare 적 can be an independent noun; do not join that homograph.
        const nominalSuffix=text.slice(to).match(/^[ \u00a0]+적([가-힣]+)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/);
        if(nominalSuffix&&!morphology.predicate(word)?.adnominal&&morphology.isDerivedNominal(word+'적')&&!personal.has('적'+nominalSuffix[1])){
          const tail=nominalSuffix[1],end=to+nominalSuffix[0].length;
          if((/^(?:으로|의|에|도|만)/.test(tail)&&sets.josa.has(tail)||/^(?:인|이|입|였)/.test(tail)&&morphology.predicate(tail)?.root==='이')&&!excluded.some(([a,b])=>from<b&&end>a)&&!results.some(f=>f.from<end&&f.to>from)){
            emit(from,end,'ko','spacing',[word+'적'+tail]);
            Object.assign(results.at(-1),{ambiguous:true,reason:'Attach the nominal suffix -적 while preserving its validated particle or copula; confirm the intended derived meaning'});
            auxiliaryRepairEnd=end;continue;
          }
        }
        // Recognize the complete bounded nominal before joining -쯤. Keep
        // prior repairs outside this gap, such as 두번 -> 두 번.
        if(word.startsWith('쯤')){
          const preceding=text.slice(0,from).match(/([가-힣]+)([ \u00a0]+)$/);
          if(preceding&&morphology.analyze(preceding[1]+word,personal)?.base===preceding[1]){
            const start=from-preceding[2].length,hostStart=start-preceding[1].length;
            if(!excluded.some(([a,b])=>hostStart<b&&to>a)&&!results.some(f=>f.from<to&&f.to>start)){
              emit(start,to,'ko','spacing',[word]);
              results.at(-1).reason='Attach approximation suffix -쯤 to its recognized nominal host';continue;
            }
          }
        }
        // -짜리 attaches to a quantity phrase. Edit just its preceding gap
        // so numeral/unit repairs and any separate name review stay intact.
        if(word.startsWith('짜리')){
          const suffix=word.slice(2);
          const quantity=text.slice(0,from).match(/(?:^|[^A-Za-z0-9_가-힣])(\d+(?:[.,]\d+)*(?:천|만|억|조)?[ \u00a0]*(?:개월|시간|달러|유로|원|엔|년|달|일|분|초|개|명|권|장|살|GB|MB|TB|KB|kg|km|cm|mm|ml|mL|g|m|L|%))([ \u00a0]+)$/);
          if(quantity&&(!suffix||sets.josa.has(suffix)||morphology.predicate(suffix)?.root==='이')){
            const start=from-quantity[2].length,hostStart=start-quantity[1].length;
            if(!excluded.some(([a,b])=>hostStart<b&&to>a)&&!results.some(f=>f.from<to&&f.to>start)){
              emit(start,to,'ko','spacing',[word]);results.at(-1).reason='Attach quantity suffix -짜리 while preserving the numeral and unit';continue;
            }
          }
        }
        // A particle belongs outside the quoted/code/URL span. Change only
        // the following gap so protected text and a name review stay intact.
        const demonstrativeI=word==='이'&&(()=>{
          const next=text.slice(to).match(/^[ \u00a0]+([가-힣]+)/)?.[1];
          const unknown=next&&!knownOrthographicPredicate(next)&&morphology.unknownNoun(next);
          const nominalTail=unknown&&/^(?:은|는|이|가|을|를|의)$/.test(next.slice(unknown.base.length));
          return /^[ \u00a0]+\d+(?:개|명|가지|권|장|대|번|곳)/.test(text.slice(to))||next&&(knownOrthographicNoun(next)||morphology.analyze(next,personal)?.kind==='noun'||nominalTail);
        })();
        if(!demonstrativeI&&(unambiguousParticles.has(word)||['에','을','를','은','는','이','가','와','과','도','만','의','라고','이라는','라는'].includes(word))){
          const gap=text.slice(0,from).match(/[ \u00a0]+$/);
          const end=gap?from-gap[0].length:-1;
          if(gap&&(end===0&&boundary.afterProtected||quotedEnds.has(end)||excluded.some(([,b])=>b===end))){
            emit(end,to,'ko','spacing',[word]);
            Object.assign(results.at(-1),{ambiguous:true,reason:'Spacing rule 41: attach the following particle while preserving the quoted or protected span'});continue;
          }
        }
        const actionBase=communityAction(word,w=>morphology.predicate(w));
        if(actionBase&&(personal.has(word)||personal.has(actionBase)))continue;
        const communityBase=actionBase??communityExpression(text,from,to,personal,sets,w=>morphology.predicate(w));
        if(communityBase){
          emit(from,from+communityBase.length,'ko','unknown',[],communityBase);
          Object.assign(results.at(-1),{ambiguous:true,reviewKind:'community',reason:'Possible community abbreviation in context; not a spelling verdict'});continue;
        }
        // Keep 듯하다 internally whole, but do not collapse a repeated
        // phrase such as 올 듯 말 듯 하다 into a lexical auxiliary.
        if(/[듯뻔]$/.test(word)&&!personal.has(word)){
          const auxiliaryStem=word.at(-1),inline=word.slice(0,-1),preceding=text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/);
          const main=inline||preceding?.[1],analysis=main&&morphology.predicate(main);
          const nominal=main&&morphology.analyze(main,personal);
          const nominalAdnominal=nominal?.kind==='noun'&&main===nominal.base+'인';
          const following=text.slice(to).match(/^[ \u00a0]+([가-힣]+)(?![가-힣ㄱ-ㅎㅏ-ㅣ])/);
          const repeated=auxiliaryStem==='듯'&&/듯[ \u00a0]+(?:말|마는)[ \u00a0]*$/.test(text.slice(0,from)+inline);
          const licensed=auxiliaryStem==='듯'?(analysis?.adnominal||nominalAdnominal):analysis?.adnominal&&(main.charCodeAt(main.length-1)-0xac00)%28===8;
          if(licensed&&!repeated&&following&&morphology.predicate(following[1])?.root==='하'){
            const end=to+following[0].length,aux=auxiliaryStem+following[1];
            if(morphology.predicate(aux)?.root===auxiliaryStem+'하'&&!excluded.some(([a,b])=>from<b&&end>a)&&!results.some(f=>f.from<end&&f.to>from)){
              emit(from,end,'ko','spacing',[(inline?inline+' ':'')+aux]);
              Object.assign(results.at(-1),{ambiguous:true,reason:`Keep the auxiliary ${auxiliaryStem}하다 together after an adnominal predicate; preserve repeated phrases`});
              auxiliaryRepairEnd=end;continue;
            }
          }
        }
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
        // The -어지다 construction is joined, including contracted 져/졌.
        // A noun homograph needs an explicit lexical derived verb; 해 alone is insufficient.
        if(/^[지져졌질진집]/.test(word)){
          const preceding=text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/);
          if(preceding){
            const start=from-preceding[0].length;
            const prior=results.find(f=>f.type==='spelling'&&f.from===start&&f.to===start+preceding[1].length&&f.suggestions.length===1&&!f.suggestions[0].includes(' '));
            const host=prior?.suggestions[0]??preceding[1],joined=host+word;
            if(host.length>=2&&!personal.has(host)&&(!knownOrthographicNoun(host)||sets.verb.has(host+'지'))&&morphology.predicate(host)&&morphology.predicate(joined)?.root===host+'지'&&!excluded.some(([a,b])=>start<b&&to>a)&&!results.some(f=>f!==prior&&f.from<to&&f.to>start)){
              if(prior)results.splice(results.indexOf(prior),1);
              emit(start,to,'ko',prior?'spelling':'spacing',[joined]);
              Object.assign(results.at(-1),{ambiguous:true,reason:'Keep the validated -어지다 construction joined, including contracted forms'});continue;
            }
          }
        }
        // 하나 is also the numeral one. Morphology alone cannot justify
        // joining 질문 하나 or 상처 하나 to the preceding noun.
        const derivationalAux=word.startsWith('해')&&morphology.predicate(word.slice(1))?.root==='보'?word.slice(1):null;
        const derivationalTail=derivationalAux?'하':morphology.predicate(word)?.root;
        if(derivationalTail==='하'){
          const feeling=text.slice(0,from).match(/(좋아|싫어|아파)[ \u00a0]+$/);
          if(feeling){
            const start=from-feeling[0].length,host=feeling[1],joined=host+word;
            const prefix=text.slice(0,start);
            // 좋아하다 can instead be part of 기분 좋아 하다. Require
            // an overt object for this homograph; 싫어하다/아파하다
            // have independently attested lexical readings.
            const object=/(?:^|[^가-힣])[가-힣]+[을를][ \u00a0]+(?:(?:정말|아주|매우|너무|무척|참)[ \u00a0]+)*$/.test(prefix);
            if(!/[가-힣A-Za-z0-9]$/.test(prefix)&&(host!=='좋아'||object)&&!excluded.some(([a,b])=>start<b&&to>a)&&!results.some(f=>f.from<to&&f.to>start)&&morphology.predicate(joined)?.root===host+'하'){
              emit(start,to,'ko','spacing',[joined]);
              Object.assign(results.at(-1),{ambiguous:true,reason:'Keep the validated psychological verb together; preserve phrasal adjective constructions'});continue;
            }
          }
        }
        if(word!=='하나'&&['하','되','드리','받'].includes(derivationalTail)){
          const preceding=text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/);
          const adjectiveHost=preceding&&derivationalTail==='하'&&sets.adjective.has(preceding[1]+'하')&&!morphology.predicate(preceding[1]);
          if(preceding&&(derivationalTail==='하'?(actionNouns.has(preceding[1])||adjectiveHost):derivationalTail==='드리'?morphology.isDridaNoun(preceding[1]):derivationalTail==='받'?morphology.isBatdaNoun(preceding[1]):morphology.isDoedaNoun(preceding[1]))&&!/\d$/.test(text.slice(0,from-preceding[0].length))){
            const start=from-preceding[0].length,joined=preceding[1]+(derivationalAux?'해':word);
            // An action-noun homograph does not override a complete particle
            // phrase (제가) or an independent adverb (계속) before 하다.
            const host=morphology.analyze(preceding[1],personal);
            const intentionHost=derivationalTail==='하'&&/(?:려|려고)$/.test(preceding[1])&&morphology.predicate(preceding[1]);
            const quantityOne=word==='한'&&/^[ \u00a0]+(?:대|개|장|병|봉지|줄|명|번|그루|마리)(?=$|[^가-힣]|[은는이가을를도만])/u.test(text.slice(to));
            const independentHost=quantityOne||intentionHost||['정도','등등','소리'].includes(preceding[1])||sets.adverb.has(preceding[1])||host?.kind==='noun'&&host.base!==preceding[1]&&sets.josa.has(preceding[1].slice(host.base.length));
            const beforeMatch=text.slice(0,start).match(/([가-힣]+)[ \u00a0]+$/);
            const before=beforeMatch?.[1];
            const modifier=before&&morphology.analyze(before,personal);
            const beforePredicate=before&&morphology.predicate(before);
            const objectClause=beforePredicate&&!beforePredicate.adnominal&&/(?:고|서|면)$/.test(before)&&/[가-힣]+[을를][ \u00a0]+[가-힣]+[ \u00a0]+$/.test(text.slice(0,start));
            const quotedParticle=before&&sets.josa.has(before)&&/["'”’」』)\]][가-힣]+[ \u00a0]+$/.test(text.slice(0,start));
            const beforeStart=beforeMatch?start-beforeMatch[0].length:start;
            // A particle already attached to Latin text, or whose preceding
            // gap has an actual repair, is not an independent noun modifier.
            const attachedParticle=before&&sets.josa.has(before)&&(/[A-Za-z0-9]$/.test(text.slice(0,beforeStart))||results.some(f=>f.applicable&&f.type==='spacing'&&f.to===beforeStart+before.length&&f.from<beforeStart&&f.suggestions.length===1&&f.suggestions[0]===before));
            const modified=before&&!(adjectiveHost&&!knownOrthographicNoun(preceding[1]))&&(before==='및'||before==='또는'||beforePredicate?.adnominal||modifier?.kind==='noun'&&modifier.base===before&&!sets.adverb.has(before)&&!objectClause&&!quotedParticle&&!attachedParticle);
            const stemNotice=adjectiveHost&&results.find(f=>f.type==='unknown'&&f.from===start&&f.to===start+preceding[1].length);
            if(!independentHost&&!modified&&!personal.has(text.slice(start,to))&&!excluded.some(([a,b])=>start<b&&to>a)&&!results.some(f=>f!==stemNotice&&f.from<to&&f.to>start)&&morphology.predicate(joined)?.root===preceding[1]+derivationalTail){
              if(stemNotice)results.splice(results.indexOf(stemNotice),1);
              emit(start,to,'ko','spacing',[joined+(derivationalAux?' '+derivationalAux:'')]);
              Object.assign(results.at(-1),{ambiguous:true,reason:'Noun plus validated derivational predicate; keep separate after an independently modified or coordinated noun phrase'});continue;
            }
          }
        }
        if(word==='밖에'||word==='가'){
          const preceding=text.slice(0,from).match(/([가-힣]+)[ \u00a0]+수([ \u00a0]+)$/);
          const following=text.slice(to).match(/^[ \u00a0]+([가-힣]+)/)?.[1];
          const nextPredicate=following&&morphology.predicate(following);
          if(preceding&&morphology.predicate(preceding[1])?.adnominal&&(word==='밖에'?nextPredicate?.root==='없':['있','없'].includes(nextPredicate?.root))){
            const start=from-preceding[2].length-1;
            if(!excluded.some(([a,b])=>start<b&&to>a)&&!results.some(f=>f.from<to&&f.to>start)){
              emit(start,to,'ko','spacing',['수'+word]);results.at(-1).reason='Spacing rule 41: attach the particle after dependent noun 수 before an existential predicate';continue;
            }
          }
        }
        const pastHost=word.startsWith('였')&&text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/)?.[1];
        const pastHostAnalysis=pastHost&&morphology.analyze(pastHost,personal);
        // 이었- may contract to 였- after a vowel-final Korean nominal.
        // Do not join a consonant host into an invalid 학생였어요 form.
        const contractedPast=pastHost&&(pastHost.charCodeAt(pastHost.length-1)-0xac00)%28===0&&(!pastHostAnalysis||pastHostAnalysis.kind==='noun'&&pastHostAnalysis.base===pastHost);
        const connectiveHost=/^(?:이고|인데)(?:요)?$/.test(word)&&text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/)?.[1];
        const connectiveAnalysis=connectiveHost&&morphology.analyze(connectiveHost,personal);
        // 이고 also inflects the verb 이다 (carry on the head). Require
        // a bare nominal, not an object phrase such as 짐을 이고.
        const connectiveCopula=!!connectiveHost&&!/[을를]$/.test(connectiveHost)&&(connectiveAnalysis?.kind==='noun'&&connectiveAnalysis.base===connectiveHost||knownOrthographicNoun(connectiveHost));
        const numericCopula=/^(?:이고|인데)(?:요)?$/.test(word)&&/(?:^|[^A-Za-z0-9_])\d+(?:[.,]\d+)*[A-Za-z]+[ \u00a0]+$/.test(text.slice(0,from));
        const communityCurrency=word==='이니'&&/^[ \u00a0]+(?:드림|드려|드립|드립니다|주세요|지급|선물|나눔|보내)/.test(text.slice(to));
        const copulaBoundary=!communityCurrency&&(contractedPast||connectiveCopula||numericCopula||/^(?:입니다|입니까|이었다|이었|이에요|예요|이지만|이니|이라|이던)/.test(word))&&morphology.predicate(word)?.root==='이';
        if(copulaBoundary){
          const preceding=text.slice(0,from).match(/([가-힣]+)([ \u00a0]+)$/);
          const nominalReview=preceding&&results.some(f=>f.type==='unknown'&&f.reviewKind==='community'&&f.from===from-preceding[0].length&&f.to===from-preceding[2].length);
          if(preceding&&(nominalReview||!morphology.analyze(preceding[1],personal)&&!recognizedNoun(preceding[1]))){
            const start=from-preceding[2].length,nameStart=from-preceding[0].length;
            if(!excluded.some(([a,b])=>nameStart<b&&to>a)){
              // Keep the unknown-name notice separate from its following gap.
              // Skipping or registering the name must not consume this repair.
              emit(start,to,'ko','spacing',[word]);results.at(-1).reason='Spacing rule 41: attach the copula while reviewing the unrecognized nominal separately';continue;
            }
          }
        }
        const fullDuration=word==='만'&&/^[ \u00a0]+(?:하루|이틀|사흘|나흘|한|두|세|네|\d)/.test(text.slice(to));
        // A letter following a numbered plan can be a group label, not
        // the subject particle of the plan number (플랜1 가 ...).
        const planLabel=['가','나','다'].includes(word)&&/(?:플랜|계획|안)[ \u00a0]*\d+[ \u00a0]+$/.test(text.slice(0,from));
        if(!fullDuration&&!planLabel&&!demonstrativeI&&(copulaBoundary||unambiguousParticles.has(word)||['에','을','를','은','는','이','가','와','과','도','만','의','라고','라는'].includes(word))){
          const jamo=text.slice(0,from).match(/([ㄱ-ㅎㅏ-ㅣ]+(?:_[ㄱ-ㅎㅏ-ㅣ]+)*)([ \u00a0]+)$/);
          const standaloneJamo=jamo&&jamo[1].length>=2&&!/[A-Za-z0-9_가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text[from-jamo[0].length-1]||'');
          const preceding=text.slice(0,from).match(/([A-Za-z0-9](?:[A-Za-z0-9._+-]*[A-Za-z0-9])?)([ \u00a0]+)$/)??(standaloneJamo?jamo:null);
          if(preceding){
            const start=from-preceding[2].length,nameStart=from-preceding[0].length;
            if(!excluded.some(([a,b])=>nameStart<b&&to>a)){
              // Edit only the gap and particle: a separate unknown-name
              // notice remains non-overlapping and independently skippable.
              emit(start,to,'ko','spacing',[word]);
              results.at(-1).reason='Spacing rule 41: attach particle or copula to preceding Latin-script, numeric, or jamo expression';
              if(standaloneJamo)results.at(-1).ambiguous=true;
              continue;
            }
          }
        }
        const comparisonNext=['보다','보단'].includes(word)&&text.slice(to).match(/^[ \u00a0]+(?:(?:더|덜|훨씬|조금|소폭)[ \u00a0]+)?([가-힣]+)/)?.[1];
        const comparisonPredicate=comparisonNext&&morphology.predicate(comparisonNext);
        const comparative=!!comparisonPredicate&&sets.adjective.has(comparisonPredicate.root);
        const nominalParticle=comparative||word==='만이'||/^(?:에|마다|조차도|마저도|만큼(?:은|도|만)?|치고는|뿐(?:만(?:이|은|도|으로(?:는)?)?|이다|이고|입니다|이에요|이지만)?)$/.test(word);
        if(copulaBoundary||nominalParticle||unambiguousParticles.has(word)||['라고','이라는','라는','이나마'].includes(word)){
          const preceding=text.slice(0,from).match(/([가-힣]+)([ \u00a0]+)$/);
          if(preceding){
            const start=from-preceding[0].length,previousEnd=from-preceding[2].length;
            const prior=results.find(f=>f.from===start&&f.to===previousEnd&&['spacing','spelling'].includes(f.type)&&f.suggestions.length===1);
            const phrase=prior?.suggestions[0]??preceding[1],host=phrase.split(' ').at(-1);
            // A prior boundary repair can expose the noun before its particle
            // (나올때 까지 -> 나올 때까지). Keep one non-overlapping repair.
            const hostAnalysis=morphology.analyze(host,personal);
            const adnominal=nominalParticle&&!(word.startsWith('뿐')&&isPronoun(host))&&!((word==='마다'||comparative)&&knownOrthographicNoun(host))&&(morphology.predicate(host)?.adnominal||morphology.isNominalAdnominal(host,personal));
            const predicateHost=morphology.predicate(host);
            const afterEnding=predicateHost&&!predicateHost.adnominal&&/^(?:부터|까지)/.test(word)&&sets.josa.has(word);
            const quotationHost=predicateHost&&['라고','라는'].includes(word);
            const comparativeHost=!comparative||knownOrthographicNoun(host)||personal.has(host)||hostAnalysis?.kind==='noun'&&hostAnalysis.base===host;
            const nominalHost=comparativeHost&&(((hostAnalysis?.kind==='noun'||recognizedNoun(host))&&(word!=='치고는'||host==='것'))||afterEnding||quotationHost);
            // Elapsed-time 만 is a dependent noun. Reuse the quantity
            // analysis for joined counts (한시간 -> 한 시간), then keep both
            // unit nouns and attested whole duration nouns separate from 만이.
            let elapsedTime=false;
            if(word==='만이'){
              const durationUnits=['년','개월','달','일','시간','분','초','주','주일'];
              const quantity=morphology.spacing(host,personal);
              const elapsedUnit=durationUnits.includes(host)||quantity?.rule==='43'&&durationUnits.includes(quantity.text.split(' ').at(-1));
              const wholeDuration=(hostAnalysis?.kind==='noun'||recognizedNoun(host))&&
                (['하루','이틀','사흘','나흘','닷새','엿새','이레','여드레','아흐레','열흘','보름','달포'].includes(host)||/^(?:일|한|두|세|네)주일$/.test(host));
              elapsedTime=elapsedUnit||wholeDuration;
            }
            if(!adnominal&&!elapsedTime&&!excluded.some(([a,b])=>start<b&&to>a)&&nominalHost&&!results.some(f=>f!==prior&&f.from<to&&f.to>start)){
              if(prior)results.splice(results.indexOf(prior),1);
              const repair=orthography(host+word,sets,personal,knownOrthographicPredicate,knownOrthographicNoun);
              const candidates=repair?repair.suggestions.map(s=>phrase.slice(0,-host.length)+s):[phrase+word];
              emit(start,to,'ko',repair||prior?.type==='spelling'?'spelling':'spacing',candidates);
              Object.assign(results.at(-1),{ambiguous:comparative||!!quotationHost||!!repair?.ambiguous||!!prior?.ambiguous,reason:comparative?'Context review: attach comparative 보다 after its nominal host before an adjective; confirm the comparison':repair?repair.reason+'; also attach the particle to its nominal host':prior?.type==='spelling'?prior.reason+'; also attach the particle to the repaired nominal':'Spacing rule 41: attach particle to its nominal or inflected host after preserving the boundary'});continue;
            }
          }
        }
        const priorAdnominal=(word==='거구요'||word.startsWith('꺼'))&&morphology.predicate(text.slice(0,from).match(/([가-힣]+)[ \u00a0]+$/)?.[1]??'')?.adnominal;
        const rule=contextSuggestion(text,from,to,personal,w=>Boolean(morphology.predicate(w)))??candidateBoundary(word,personal,text,from,to)??orthography(word,sets,personal,knownOrthographicPredicate,knownOrthographicNoun,Boolean(priorAdnominal),knownOrthographicPredicate(text.slice(to).match(/^[ \t\u00a0]+([가-힣]+)/)?.[1]??''));
        if(rule){emit(from,to,'ko',rule.type??'spelling',rule.suggestions,word);Object.assign(results.at(-1),rule);continue;}
        // Price modifiers remain separate from a following noun. Protect
        // lexical wholes such as 무료입장 before repairing the noun itself.
        const priceModifier=word.match(/^(무료|유료)(.+)$/);
        if(priceModifier&&!personal.has(word)&&!morphology.analyze(word,personal)&&!recognizedNoun(word)&&!recognizeWhole?.(word,personal)){
          const right=priceModifier[2],repair=lexicalNounRepair(right,sets,personal,knownOrthographicPredicate);
          const nominal=repair&&!repair.suggestions.some(s=>s.includes(' '))||recognizedNoun(right)||morphology.analyze(right,personal)?.kind==='noun';
          if(nominal){
            emit(from,to,'ko',repair?'spelling':'spacing',(repair?.suggestions??[right]).map(s=>priceModifier[1]+' '+s));
            Object.assign(results.at(-1),{ambiguous:true,reason:'Separate the price modifier and validated nominal, including a bounded lexical repair when needed'});continue;
          }
        }
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
        const financial=word.match(/^(미국|한국|일본|중국|영국)(금리)(인상|인하)(.*)$/);
        if(financial&&!personal.has(word)&&(!financial[4]||sets.josa.has(financial[4]))){
          emit(from,to,'ko','spacing',[financial[1]+' '+financial[2]+' '+financial[3]+financial[4]]);
          Object.assign(results.at(-1),{ambiguous:true,reason:'Separate country, interest rate and rate change; preserve the final particle'});continue;
        }
        // Review an unknown name separately from dependent noun 측. Registering
        // the name must not consume the missing boundary after it. Known whole
        // compounds and intentional personal words take priority. Do not apply
        // this name heuristic to known hosts: 측 also has suffix readings.
        const side=word.match(/^([가-힣]{2,})측([가-힣]*)$/);
        if(side&&!personal.has(word)&&!morphology.analyze(word,personal)&&!recognizedNoun(word)&&!recognizeWhole?.(word,personal)&&
          (!side[2]||sets.josa.has(side[2])||morphology.predicate(side[2])?.root==='이')){
          const host=side[1],withoutPersonal=new Set();
          if(!morphology.analyze(host,withoutPersonal)&&!recognizedNoun(host)&&!recognizeWhole?.(host,withoutPersonal)){
            if(!personal.has(host))emit(from,from+host.length,'ko','unknown',[],host);
            emit(from+host.length,to,'ko','spacing',[' '+word.slice(host.length)],word);
            Object.assign(results.at(-1),{ambiguous:true,reason:'Separate dependent noun 측 from the preceding nominal; confirm that this is not an intentional whole name'});
            continue;
          }
        }
        // An unrecognized name and the dependent honorific 님 are separate
        // review spans. Registering just the name must not hide its gap.
        const compoundWithHonorific=word.match(/^([가-힣]+님)(.*)$/);
        if(compoundWithHonorific){
          const compound=compoundWithHonorific[1];
          // An established nominal host keeps suffix 님 attached. Its
          // internal predicate homograph does not establish a missing gap.
          if(!compound.endsWith('아님')&&knownOrthographicNoun(compound.slice(0,-1))&&morphology.analyze(word,new Set([compound]))?.kind==='noun')continue;
          let titleBoundary=null;
          for(let i=1;i<compound.length-1;i++)if(morphology.predicate(compound.slice(0,i))?.adnominal&&sets.noun.has(compound.slice(i))&&morphology.analyze(word.slice(i),personal)?.kind==='noun'){titleBoundary=i;break;}
          if(titleBoundary!==null&&!personal.has(word)){emit(from,to,'ko','spacing',[word.slice(0,titleBoundary)+' '+word.slice(titleBoundary)]);continue;}
          let recognizedCompound=false;
          for(let i=1;i<compound.length-1;i++)if(sets.noun.has(compound.slice(0,i))&&sets.noun.has(compound.slice(i))){recognizedCompound=true;break;}
          // Recognizing the title must not hide an arbitrary following span.
          if(recognizedCompound&&morphology.analyze(word,new Set([compound]))?.kind==='noun')continue;
        }
        const namedHonorific=word.match(/^([가-힣]{2,})님(.*)$/);
        if(namedHonorific&&!word.endsWith('아님')&&!/(?:대표|지사|회장|사장|부장|과장|팀장|실장|원장|교수|선생|슨상|박사|작가|기사|감독|코치|대장|장관|의원|보좌관|총장|교장|사범|스승)$/.test(namedHonorific[1])&&!knownOrthographicNoun(namedHonorific[1])&&!(namedHonorific[1].endsWith('들')&&knownOrthographicNoun(namedHonorific[1].slice(0,-1)))&&!morphology.analyze(word,personal)&&!recognizedNoun(word)&&!recognizeWhole?.(word,personal)){
          const name=namedHonorific[1],tail=namedHonorific[2];
          const nominalTail=!tail||sets.josa.has(tail)||/^(?:입니다|입니까|이었다|이었|이에요|이지만|이니|이라|이던)/.test(tail)&&morphology.predicate(tail)?.root==='이';
          if(nominalTail){
            const split=from+name.length;
            if(!personal.has(name))emit(from,split,'ko','unknown',[],name);
            emit(split,to,'ko','spacing',[' '+word.slice(name.length)]);
            Object.assign(results.at(-1),{ambiguous:true,reason:'Separate the dependent honorific 님 when the preceding expression is a name; review or register the name independently'});
            continue;
          }
        }
        if(recognizedPlace(word))continue;
        // An unfamiliar token immediately before a person's title may be
        // their name. Review it whole instead of splitting dictionary parts.
        if(/^[ \u00a0]+(?:선생님|교수님|작가님|감독님)(?=$|[\s,.!?]|[은는이가의께])/u.test(text.slice(to))&&
          !morphology.analyze(word,personal)&&!recognizedNoun(word)&&!recognizeWhole?.(word,personal)){
          emit(from,to,'ko','unknown',[],word);
          Object.assign(results.at(-1),{ambiguous:true,reason:'Possible name before a personal title; retain its complete spelling for review'});continue;
        }
        // A recalled handle before "뭔가로 활동" is an identity, even if its
        // syllables also form an ordinary adjective and noun.
        if(word.endsWith('인가')&&/^[ \u00a0]+뭔가로[ \u00a0]+활동/u.test(text.slice(to))&&
          !morphology.analyze(word,personal)&&!recognizedNoun(word)&&!recognizeWhole?.(word,personal)){
          emit(from,to,'ko','unknown',[],word);
          Object.assign(results.at(-1),{ambiguous:true,reason:'Possible recalled handle in an activity-name context; preserve its spelling for review'});continue;
        }
        if(!spacingResults.has(word))spacingResults.set(word,morphology.spacing(word,personal));
        const spaced=spacingResults.get(word);
        if(spaced?.unknowns?.length&&!morphology.analyze(word,personal)&&!recognizedNoun(word)){
          const composed=koreanSuggestions(word).filter(candidate=>candidate.includes(' '));
          if(composed.length){emit(from,to,'ko','spelling',composed,word);results.at(-1).ambiguous=true;continue;}
        }
        const unknown=morphology.unknownNoun(word);
        if(spaced&&spaced.text.replaceAll(' ','')===word){
          const parts=spaced.text.split(' ');
          const repairs=parts.map((part,i)=>orthography(part,sets,personal,knownOrthographicPredicate,knownOrthographicNoun,i>0&&Boolean(morphology.predicate(parts[i-1])?.adnominal)));
          const repaired=repairs.some(r=>r?.suggestions.length===1)&&repairs.every(r=>!r||r.suggestions.length===1);
          const candidate=repaired?spaced.text.split(' ').map((part,i)=>repairs[i]?.suggestions[0]??part).join(' '):spaced.text;
          if(word.startsWith('예판')&&!personal.has('예판')){
            emit(from,from+2,'ko','unknown',[],'예판');
            Object.assign(results.at(-1),{ambiguous:true,reviewKind:'community',reason:'Possible preorder abbreviation; review or register the base expression'});
          }
          emit(from,to,'ko',repaired?'spelling':'spacing',[candidate]);
          Object.assign(results.at(-1),{ambiguous:spaced.ambiguous||repairs.some(r=>r?.ambiguous),reason:`Spacing rule ${spaced.rule}${repaired?'; combine validated lexical repairs at the identified boundaries':''}; review interpretation`});continue;
        }
        if(morphology.analyze(word,personal)||recognizedNoun(word)||recognizeWhole?.(word,personal))continue;
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
          // Inflection repairs remain reviewable: a valid replacement alone
          // cannot establish the author's intended expression.
          Object.assign(results.at(-1),{ambiguous:true,reason:'Validated inflection candidate; confirm intended word or register the original'});
          continue;
        }
        if(unknown?.unknown){emit(from,from+unknown.base.length,'ko','unknown',[],unknown.base);continue;}
        emit(from,to,'ko',candidates.length?'spelling':'unknown',candidates,word);
      }
    }
    return results.sort((a,b)=>a.from-b.from||a.to-b.to);
  };
}
