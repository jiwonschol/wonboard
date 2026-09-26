// Conservative, locally evaluated English grammar candidates. Each rule has
// enough surrounding context to avoid changing a valid word in isolation.
export function englishGrammar(text,excluded=[],personal=new Set()) {
  const findings=[];
  const add=(from,to,suggestion,reason,type='grammar')=>{
    if(excluded.some(([a,b])=>from<b&&to>a)||personal.has(text.slice(from,to)))return;
    if(findings.some(item=>item.from<to&&item.to>from))return;
    findings.push({from,to,original:text.slice(from,to),language:'en',type,suggestions:[suggestion],applicable:true,reason});
  };
  for(const match of text.matchAll(/\bi\b(?=\s+(?:am|was|have|had|will|would|can|could|should|may|might|must|think|thought|hope|hoped|hear|heard|feel|felt|want|wanted|need|needed|like|liked|do|did|don't|didn't)\b)/g)){
    add(match.index,match.index+1,'I','English first-person pronoun is capitalized');
  }
  for(const match of text.matchAll(/\bi\b(?=\s+(?:mentioned|said|wrote|noticed|believe|believed|remember|remembered)\b)/g)){
    add(match.index,match.index+1,'I','English first-person pronoun is capitalized');
  }
  for(const match of text.matchAll(/\b(?:Should|Could|Would|Can|Will) (?:we|they|you|I|he|she|it) (?:worried|concerned|prepared|ready)\b/g)){
    add(match.index,match.index+match[0].length,match[0].replace(/ (worried|concerned|prepared|ready)$/,' be $1'),'The modal needs be before this predicative adjective');
  }
  for(const match of text.matchAll(/\b[Ii]ts\b(?=\s+(?:fun|fine|okay|ok|great)\b(?:\s*(?:[.!?]|[:;][)(DP]|$)))/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's":"it's",'The following adjective needs the contraction it is');
  }
  for(const match of text.matchAll(/\bit['’]s\b(?=\s+(?:account|owner|name|title|role|users|settings|source|purpose|tail|tool)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?'Its':'its','A possessive determiner before this noun has no apostrophe');
  }
  for(const match of text.matchAll(/\bits\b(?=\s+(?:summarizing|running|working|writing|using|doing)\s+(?:noise|code|work|well|fine|that|this|it|them|the|a|an)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's":"it's",'The present participle here needs it is');
  }
  for(const match of text.matchAll(/\byour going(?=\s+to\s+be\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='Y'?"You're going":"you're going",'Use you are before going to be');
  }
  for(const match of text.matchAll(/\bIm\b(?=\s+(?:back|going|sorry|sure|ready|glad|not|still|here)\b)/g)){
    add(match.index,match.index+match[0].length,"I'm",'First-person contraction needs an apostrophe');
  }
  const modalForms=new Map([['built','build'],['went','go'],['did','do'],['was','be'],['were','be']]);
  for(const match of text.matchAll(/\b(?:can|could|should|would|may|might|must|will)\s+(?:built|went|did|was|were)\b/gi)){
    const words=match[0].split(/\s+/),replacement=words[0]+' '+modalForms.get(words[1].toLowerCase());
    add(match.index,match.index+match[0].length,replacement,'A modal verb takes the base form of the following verb');
  }
  for(const match of text.matchAll(/\ba few hundreds\b(?!\s+of)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/hundreds$/i,'hundred'),'A few is followed by the uninflected hundred');
  }
  for(const match of text.matchAll(/\breigned in\b(?=\s+(?:my|your|his|her|their|our)\s+(?:emotions|spending|behavior|behaviour|ambitions|expectations)\b)/gi)){
    add(match.index,match.index+match[0].length,'reined in','Rein in means restrain; reign means rule');
  }
  for(const match of text.matchAll(/\bsue (?:Claude|GPT|Gemini)\b(?=\s+models?\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/^sue/i,'use'),'Use a model in a tool; sue has a legal meaning');
  }
  for(const match of text.matchAll(/\bsuch (?:hook|tool|feature|problem|case|app|idea)\b(?=\s*[,.;!?]|\s+(?:and|but|that|which)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/\s+/, ' a '),'Such precedes an article before this singular count noun');
  }
  for(const match of text.matchAll(/\b(?:bank|save|have|need|use) couple\b(?=\s+of\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/ couple$/i,' a couple'),'A couple of needs an article here');
  }
  for(const match of text.matchAll(/\bI rather\b(?=\s+(?:have|do|use|go|see|not|be|wait|keep|take|make)\b)/g)){
    add(match.index,match.index+match[0].length,"I'd rather",'Would rather expresses a preference');
  }
  for(const match of text.matchAll(/(?:^|[.!?]\s+|,\s+but\s+)(what you will do)\b(?=[^.!?]*\?)/gim)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'what will you do','A direct question inverts the subject and auxiliary');
  }
  for(const match of text.matchAll(/\bhave audience\b(?=\s*[,?!]|\s*$)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/audience$/i,'an audience'),'Singular count noun audience needs an article here');
  }
  for(const match of text.matchAll(/\bwho['’]s primary(?=\s+(?:contributors|authors|developers|maintainers|users|role|goal)\b)/gi)){
    add(match.index,match.index+match[0].length,'whose primary','Use the possessive pronoun before a noun phrase');
  }
  for(const match of text.matchAll(/\bwasnt\b/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='W'?"Wasn't":"wasn't",'The contraction of was not needs an apostrophe');
  }
  for(const match of text.matchAll(/\b(?:a A\/B|a XP)\b/g)){
    add(match.index,match.index+match[0].length,'an '+match[0].slice(2),'These initialisms begin with a vowel sound');
  }
  for(const match of text.matchAll(/\ba expert\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/\ba /i,'an '),'Expert begins with a vowel sound');
  }
  for(const match of text.matchAll(/\ban (["“‘']?)(takeout|tool|test|time|team|thread|task)\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/\ban /i,'a '),'This noun begins with a consonant sound');
  }
  for(const match of text.matchAll(/\b(?:into|onto) (chip|board|box|machine|computer|device)\b(?=\s*[,.;!?]|\s+(?:and|to|for|with|from|that|which|in|on)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/ /,' a '),'This singular count noun needs an article');
  }
  for(const match of text.matchAll(/\bimminently(?=\s+(?:more|less)\s+(?:capable|suitable|likely|qualified|important)\b)/gi)){
    add(match.index,match.index+match[0].length,'eminently','Eminently modifies degree; imminently means soon');
  }
  for(const match of text.matchAll(/\bequipments\b/gi)){
    add(match.index,match.index+match[0].length,'equipment','Equipment is an uncountable noun in this sense');
  }
  for(const match of text.matchAll(/\b(?:worked|works|working|ran|runs|running) perfectly seamless\b/gi)){
    const from=match.index+match[0].lastIndexOf('seamless');
    add(from,from+'seamless'.length,'seamlessly','An adverb modifies the preceding verb');
  }
  for(const match of text.matchAll(/(?:^|[.!?]\s+)(Few years ago)\b/gm)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'A few years ago','This temporal phrase needs an article');
  }
  for(const match of text.matchAll(/\b(?:discover(?:ed)?|find|found|see|saw|need(?:ed)?|use(?:d)?) couple of\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/ couple of$/i,' a couple of'),'A couple of needs an article here');
  }
  for(const match of text.matchAll(/\bThere['’]s a few\b(?=\s+(?:(?:car|computer|software|local)\s+)?(?:people|things|cars|machines|devices|businesses|companies|dealerships|options|ways|files|cases|examples)\b)/gi)){
    add(match.index,match.index+match[0].length,'There are a few','Plural subject agrees with are');
  }
  for(const match of text.matchAll(/\b(?:instruments|machines|devices|systems|programs) that only runs\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/runs$/i,'run'),'A plural subject takes run');
  }
  for(const match of text.matchAll(/\bit don['’]?t need\b/gi))add(match.index,match.index+match[0].length,"it doesn't need",'Third-person singular uses does not');
  // Apostrophe omissions are lexical contractions, independent of sentence
  // parsing. Keep the replacement on the misspelled token itself.
  for(const [source,replacement] of [['thats',"that's"],['theres',"there's"],['dont',"don't"],['arent',"aren't"]]){
    for(const match of text.matchAll(new RegExp(`\\b${source}\\b`,'gi'))){
      const value=match[0][0]===match[0][0].toUpperCase()?replacement[0].toUpperCase()+replacement.slice(1):replacement;
      add(match.index,match.index+match[0].length,value,'This contraction needs an apostrophe');
    }
  }
  for(const match of text.matchAll(/\b(?:They|they) ate(?=\s+[a-z]+ing\b)/g)){
    add(match.index,match.index+match[0].length,match[0].replace(/ate$/,'are'),'The present participle here needs are');
  }
  for(const match of text.matchAll(/\boaid\b/gi))add(match.index,match.index+match[0].length,'paid','Reviewed letter substitution in paid','spelling');
  for(const match of text.matchAll(/\bnatual\b/gi))add(match.index,match.index+match[0].length,'natural','Reviewed missing letter in natural','spelling');
  for(const match of text.matchAll(/\bchinnese\b/gi))add(match.index,match.index+match[0].length,'Chinese','Reviewed spelling of the proper adjective Chinese','spelling');
  for(const match of text.matchAll(/\b(?:news|front page|go there|do this|work on it) everyday\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/everyday$/i,'every day'),'Every day is the adverbial time expression');
  }
  for(const match of text.matchAll(/\bloose their minds\b/gi))add(match.index,match.index+match[0].length,'lose their minds','Lose means to cease to have; loose is an adjective or verb');
  for(const match of text.matchAll(/\ban (LLMs) output\b/g))add(match.index,match.index+match[0].length,"an LLM's output",'The singular model possesses its output');
  for(const match of text.matchAll(/\b(?:AI|LLM)['’]s are\b/g))add(match.index,match.index+match[0].length,match[0].replace(/['’]s are$/,'s are'),'A plural acronym has no possessive apostrophe');
  for(const match of text.matchAll(/\b(?:AI|LLM|API|GPU|CPU)['’]s\b(?=\s+(?:exist|have)\b)/g)){
    add(match.index,match.index+match[0].length,match[0].replace(/['’]s$/,'s'),'A plural acronym before a plural verb has no possessive apostrophe');
  }
  for(const match of text.matchAll(/\b(the|a|an)\s+\1\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/^(\S+)\s+\S+$/,'$1'),'The adjacent function word is repeated');
  }
  for(const match of text.matchAll(/\b[Ii]t a\b(?=\s+(?:paradox|problem|mistake|feature|bug|tool|model|question)\b)/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's a":"it's a",'A singular subject needs is before the article');
  }
  for(const match of text.matchAll(/\b[Ii]ts so\b(?=\s+(?:cheap|fast|slow|simple|easy|hard|expensive|good|bad)\b)/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's so":"it's so",'The degree adverb follows it is');
  }
  for(const match of text.matchAll(/\b(?:tuning|using|training|running) it make\b(?=\s+(?:it|them|the|a|an|this|that)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/make$/i,'makes'),'The singular it takes makes');
  }
  for(const match of text.matchAll(/\b(?:wars|battles|games) in history won\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/ won$/,' were won'),'This passive construction needs an auxiliary');
  for(const match of text.matchAll(/\bonce case\b/gi))add(match.index,match.index+match[0].length,'one case','One is the numeral before this singular noun');
  for(const match of text.matchAll(/\bsophisticated to we\b/gi))add(match.index,match.index+match[0].length,'sophisticated do we','The question uses auxiliary do before we');
  for(const match of text.matchAll(/\b(?:I am|I'm) not (?:devops|software|hardware|security) person\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/not /i,'not a '),'This singular count noun needs an article');
  for(const match of text.matchAll(/\bthere were no firewall\b/gi))add(match.index,match.index+match[0].length,'there was no firewall','Singular firewall agrees with was');
  for(const match of text.matchAll(/\bdid they workout\b/gi))add(match.index,match.index+match[0].length,'did they work out','Work out is the verb; workout is a noun or adjective');
  for(const match of text.matchAll(/\bNo its not\b/g))add(match.index,match.index+match[0].length,"No it's not",'It is contracts to it’s here');
  for(const match of text.matchAll(/\b(?:get|got|gain|gained) access into\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/into$/i,'to'),'Access normally takes to in this construction');
  for(const match of text.matchAll(/\bbut agent\b(?=\s+(?:can|could|will|would|should|must|has|had|is|was)\b)/gi))add(match.index,match.index+match[0].length,match[0].replace(/agent$/i,'an agent'),'This singular count noun needs an article');
  for(const match of text.matchAll(/\baround time of\b/gi))add(match.index,match.index+match[0].length,'around the time of','This noun phrase needs the article the');
  for(const match of text.matchAll(/\bi\b(?=\s+(?:consider|find|prompt)\b)/g))add(match.index,match.index+1,'I','Capitalize the first-person pronoun');
  for(const match of text.matchAll(/\bin short time\b/gi))add(match.index,match.index+match[0].length,'in a short time','Singular count noun time needs an article here');
  for(const match of text.matchAll(/\b(?:use|need|spend|allocate|provide) marginal amount\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/ marginal amount$/i,' a marginal amount'),'A singular count noun needs an article');
  for(const match of text.matchAll(/\b(?:got|get|gets|getting) couple\b(?=\s+of\b)/gi))add(match.index,match.index+match[0].length,match[0].replace(/ couple$/i,' a couple'),'A couple of needs an article');
  for(const match of text.matchAll(/\b(?:get|gets|getting|got) worst\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/worst$/i,'worse'),'A change in degree uses the comparative worse');
  for(const match of text.matchAll(/\b(?:advancements|improvements|developments|results|devices) has\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/ has$/i,' have'),'A plural subject agrees with have');
  for(const match of text.matchAll(/\blifes\b/gi))add(match.index,match.index+match[0].length,'lives','The plural of life changes f to v');
  for(const match of text.matchAll(/\bMathematics have\b/g))add(match.index,match.index+match[0].length,'Mathematics has','Mathematics is singular in this sense');
  for(const match of text.matchAll(/\ba (?:dumping|testing|training) grounds\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/grounds$/i,'ground'),'A singular article takes the singular noun ground');
  for(const match of text.matchAll(/\bit let['’]s\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/let['’]s$/i,'lets'),'Lets is the third-person verb; let’s means let us');
  for(const match of text.matchAll(/\b(?:exceptions|models|agents|users|people) does\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/does$/i,'do'),'A plural subject agrees with do');
  for(const match of text.matchAll(/\bmost of time\b/gi))add(match.index,match.index+match[0].length,'most of the time','This time expression needs the');
  for(const match of text.matchAll(/\b(?:the|an) agent get\b(?=\s+(?:tools|access|results|data|a|the)\b)/gi))add(match.index,match.index+match[0].length,match[0].replace(/get$/i,'gets'),'A singular subject takes gets');
  for(const match of text.matchAll(/\bbefore and agent\b/gi))add(match.index,match.index+match[0].length,'before an agent','An precedes this singular noun');
  for(const match of text.matchAll(/\btried using to generate\b/gi))add(match.index,match.index+match[0].length,'tried using it to generate','Using needs an object in this construction');
  for(const match of text.matchAll(/\blots of important bit\b/gi))add(match.index,match.index+match[0].length,'lots of important bits','The plural quantity lots of takes bits');
  for(const match of text.matchAll(/\b([2-9]|[1-9]\d+) PR\b(?!s)/g))add(match.index,match.index+match[0].length,match[1]+' PRs','A numeral above one takes a plural count abbreviation');
  for(const match of text.matchAll(/\b([2-9]|[1-9]\d+) (URL|API|LLM)\b(?!s)/g))add(match.index,match.index+match[0].length,match[1]+' '+match[2]+'s','A numeral above one takes a plural count abbreviation');
  for(const match of text.matchAll(/\b(?:hundreds|thousands|millions) of (?:URL|API|LLM)\b(?!s)/g))add(match.index,match.index+match[0].length,match[0]+'s','A plural quantity takes a plural count abbreviation');
  for(const match of text.matchAll(/\bthrough is many\b/gi))add(match.index,match.index+match[0].length,'through as many','As many forms the comparative quantity phrase');
  for(const match of text.matchAll(/\ba implemention\b/gi))add(match.index,match.index+match[0].length,'an implementation','Correct the noun and its preceding article');
  return findings;
}
