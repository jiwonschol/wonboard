// Conservative, locally evaluated English grammar candidates. Each rule has
// enough surrounding context to avoid changing a valid word in isolation.
export function englishGrammar(text,excluded=[],personal=new Set()) {
  const findings=[];
  const add=(from,to,suggestion,reason,type='grammar')=>{
    if(excluded.some(([a,b])=>from<b&&to>a)||personal.has(text.slice(from,to)))return;
    if(findings.some(item=>item.from<to&&item.to>from))return;
    findings.push({from,to,original:text.slice(from,to),language:'en',type,suggestions:[suggestion],applicable:true,reason});
  };
  for(const match of text.matchAll(/\bharnesss\b/gi)){
    const before=text.slice(Math.max(0,match.index-40),match.index),after=text.slice(match.index+match[0].length);
    const pluralDeterminer=/\b(?:these|those|many|several|some|both|two|three|four|five|[2-9]|[1-9]\d+)\s+$/i.test(before);
    const pluralPredicate=/^\s+(?:(?:which|that)\s+(?:I|we|you|they|he|she)\s+(?:(?:have|has|had)\s+)?(?:(?:previously|already|recently)\s+)?(?:used|tried|tested|bought|made)\s+)?(?:are|were|have)\b/i.test(after);
    if(pluralDeterminer||pluralPredicate)add(match.index,match.index+match[0].length,match[0][0]==='H'?'Harnesses':'harnesses','The plural context requires harnesses, retaining the final plural syllable','spelling');
  }
  for(const match of text.matchAll(/\b[Dd]ifferents(?=\s+(?:things|people|ways|tools|ideas|options|types|kinds|versions|results|methods|approaches)\b)/g)){
    add(match.index,match.index+match[0].length,match[0].slice(0,-1),'The adjective different does not take plural agreement');
  }
  for(const match of text.matchAll(/\b(?:I|we|you|they|he|she)\s+(?:(?:just|recently|already)\s+)?(notined)(?=\s+(?:that|a|an|the|this|something)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'noticed','This perception verb is spelled noticed','spelling');
  }
  for(const match of text.matchAll(/\b(?:a|the)\s+(leasee)(?=\s+(?:for|of)\s+(?:a|the)\s+(?:domain|property|flat|apartment|car)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'lessee','The person holding the lease is the lessee','spelling');
  }
  for(const match of text.matchAll(/\b[Ww]hats(?=\s+the\s+(?:cheapest|best|easiest|quickest|safest|fastest)\s+(?:way|option|route|method|choice)\b)/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='W'?"What's":"what's",'This singular question uses the contraction what is');
  }
  for(const match of text.matchAll(/\bect\b(?=\s*[,.;:!?)]|$|\s+(?:is|are|was|were)\b)/g)){
    const before=text.slice(Math.max(0,match.index-80),match.index);
    if(!/\b(?:and|or)\s+(?:[a-z]+\s+){1,4}$/i.test(before)&&!/[A-Za-z][A-Za-z-]*,\s*[A-Za-z][A-Za-z-]*,\s*$/.test(before))continue;
    add(match.index,match.index+3,'etc','The abbreviation after a list is etc','spelling');
  }
  for(const match of text.matchAll(/\b(?:in|within|after)\s+(?:\d+|a few|several|two|three|four|five|six|seven|eight|nine|ten)\s+((?:days|weeks|months|years)\s+time)\b(?=\s*[,.;:!?)]|$|\s+(?:we|I|you|they|he|she|it|will|from)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,match[1].replace(/(\s+)(time)$/i,"'$1$2"),'This plural duration takes a possessive apostrophe before time');
  }
  for(const match of text.matchAll(/\b([Ww]e)['’]re(?=\s*\(\d+\s+(?:adults|children|people)(?:\s*,\s*\d+\s+(?:adults|children|people))*\)\s+are\b)/g)){
    add(match.index,match.index+match[0].length,match[1],'The following are already supplies the copula after this parenthetical count');
  }
  for(const match of text.matchAll(/\bin\s+\d+\s+(?:days|weeks|months|years)\s+(ant)(?=\s+[Ii]\s+(?:want|wanted|need|needed|plan|planned)\b)/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+3,'and','The duration is followed by a coordinated first-person clause','spelling');
  }
  for(const match of text.matchAll(/\ba\s+(?:travelling|traveling)\s+(companions)(?=\s+(?:father|mother|parent|child|partner)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,match[1].slice(0,-1)+"'s",'The singular companion determined by a possesses the following relation');
  }
  for(const match of text.matchAll(/\bfor\s+(child)\b(?=\s*[,.;!?)])/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'a '+match[1],'This complete singular count noun phrase needs an article');
  }
  for(const match of text.matchAll(/\b(?:is|was|been)\s+(red flag)\b(?=\s*[,.;:!?)]|$|\s+(?:for|that|to)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'a '+match[1],'The singular count phrase red flag needs an article');
  }
  for(const match of text.matchAll(/\bfor\s+(a\s+)(?:[2-9]|[1-9]\d+)\s+(?:days|weeks|months|years)\b(?=\s*[,.;!?)]|$|\s+(?:with|in|at|from|to|before|after)\b)/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'','A complete plural duration does not take the singular article a');
  }
  for(const match of text.matchAll(/\b(?:start|end|middle|beginning)\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b(?=\s*[,.;!?)]|$|\s+(?:for|with|and|or|in)\b)/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,match[1][0].toUpperCase()+match[1].slice(1),'A month name in this calendar phrase is capitalized');
  }
  for(const match of text.matchAll(/\b(?:from|with|of|at|to)\s+(it['’]s)\s+connection\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'its','The preposition introduces a possessed connection, not an it-is clause');
  }
  for(const match of text.matchAll(/\b(?:had|have|has)\s+to\s+(got)\b/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+3,'go','Have to takes the base infinitive go');
  }
  for(const match of text.matchAll(/\b(I|We|we|You|you|They|they) live here since (\d+ (?:years|months|weeks|days))\b/g)){
    add(match.index,match.index+match[0].length,match[1]+' have lived here for '+match[2],'Continuing residence over a duration uses the perfect tense and for');
  }
  for(const match of text.matchAll(/\b(?:the|this|that|my|your|our|their)\s+(whol)(?=\s+(?:process|thing|day|week|time)\b)/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+4,'whole','The complete extent adjective is whole','spelling');
  }
  for(const match of text.matchAll(/(?:^|[.!?]\s+)([Tt]hankd)(?=\s*(?:[.!?]|$)|\s+for\b)/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,match[1][0]==='T'?'Thanks':'thanks','Restore the thanks expression in a standalone acknowledgement','spelling');
  }
  for(const match of text.matchAll(/\b(?:I|we|you|they)['’]ve\s+(build)(?=\s+(?:a|an|the|this|that|my|your|our|their)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'built','This perfect contraction takes the past participle built');
  }
  for(const match of text.matchAll(/\b(?:have|has|had)\s+(?:it|them)\s+(setup)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'set up','The object complement is the participle set up');
  }
  for(const match of text.matchAll(/\b[Ii]ts(?=\s+(?:obvious|clear|evident|likely|unlikely|possible)\s+that\b)/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's":"it's",'This adjective clause requires it is');
  }
  for(const match of text.matchAll(/\b(?:I am|I['’]m|he is|she is|he['’]s|she['’]s)\s+(a)\s+\d{1,3}\s+years\s+old\b(?=\s+(?:trying|working|and|but|who)\b|[.,!?;:]|$)/gi)){
    const from=match.index+match[0].indexOf(' '+match[1]+' ')+1;
    add(from,from+2,'','A predicative years-old age does not take an indefinite article');
  }
  for(const match of text.matchAll(/\b[Ii]t seems\s+(me)(?=\s+that\b)/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+2,'to me','Seem takes to before its experiencer');
  }
  for(const match of text.matchAll(/\b(?:wrap|wrapping)\s+(?:my|your|his|her|our|their)\s+(?:mind|head)\s+(about)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'around','The figurative construction is wrap one’s mind around');
  }
  // Complete constructions with missing function words. Bound the following
  // head/verb so fragments, names and open noun modifiers stay reviewable.
  for(const match of text.matchAll(/\b(?:allow|allows|allowed|allowing)\s+(?:users|developers|people|us|me|them|you)\s+(disable|enable|access|create|change|select|use|edit|delete)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'to '+match[1],'Allow takes a to-infinitive after its object');
  }
  for(const match of text.matchAll(/\b(?:I am|I['’]m|you are|you['’]re|we are|we['’]re)\s+(doing)\s+(?:a|the)\s+(?:right|wrong|good|bad)\s+choice\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'making','The decision construction uses make a choice');
  }
  for(const match of text.matchAll(/\b(?:there is|there was|there['’]s)\s+(small|large|significant|tiny)\s+amount\s+of\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'a '+match[1],'This singular amount phrase needs a determiner');
  }
  for(const match of text.matchAll(/\b(?:it is|it was|it['’]s|that is|that['’]s)\s+quite\s+(old|interesting|important|unusual)\s+(?:project|house|idea|problem)\b(?=\s+(?:that|which|with|from|for|to)\b|\s*[-,.;:!?)]|$)/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'an '+match[1],'Quite an adjective plus a singular count head needs an article');
  }
  for(const match of text.matchAll(/\b(?:for|of|with|introduce|introduced|develop|developed)\s+(new type)\s+of\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'a '+match[1],'A new type of is a singular count phrase');
  }
  for(const match of text.matchAll(/\b(thousands|hundreds|millions|billions)\s+(?=(?:test cases|users|people|posts|files|requests|dollars|years)\b)/gi)){
    add(match.index,match.index+match[1].length,match[1]+' of','This plural quantity requires of before the counted noun');
  }
  for(const match of text.matchAll(/\btoo much\s+(an?)\s+(?:angle|problem|issue|risk|burden|effort)\b/gi)){
    const from=match.index+match[0].indexOf(match[1],8);
    add(from,from+match[1].length,'of '+match[1],'Too much of takes this indefinite noun phrase');
  }
  for(const match of text.matchAll(/\bof any\s+(beneficial)\s+to\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'benefit','The preposition of requires the noun benefit in this construction');
  }
  for(const match of text.matchAll(/\b[Tt]here\s+(exists)\s+(?:(?:purely|pure|technical|several|many|different|other|possible)\s+){0,3}(?:solutions|options|ways|problems|examples)\b(?=\s+(?:that|which|to|for|in|on|with|like|and|but)\b|[.,;:!?]|$)/g)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'exist','The plural head controls existential agreement');
  }
  for(const match of text.matchAll(/\b(?:AI |software |developer )?tooling\s+(are)\s+(?:making|becoming|getting)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    if(/\b(?:and|or)\s+$/i.test(text.slice(Math.max(0,match.index-20),match.index)))continue;
    add(from,from+match[1].length,'is','Tooling is a singular mass noun in this clause');
  }
  for(const match of text.matchAll(/\bwev['’]e(?=\s+(?:been|had|got|seen|done|made|taken|found|heard|read|written|[a-z]+ed)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='W'?"We've":"we've",'Keep the perfect contraction and move its misplaced apostrophe','spelling');
  }
  for(const match of text.matchAll(/\b[Ii]ts(?=\s+(?:something|nothing|anything)\s+(?:you|we|they|I|he|she)\b)/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's":"it's",'This pronoun clause needs it is rather than possessive its');
  }
  for(const match of text.matchAll(/\b(?:pulled|took|pull|take|pulling|taking)\s+(?:it|them)\s+out (if)(?=\s+the\s+(?:fridge|freezer|oven|box|bag)(?:[.,!?]|$|\s+(?:this|that|yesterday|today|to)\b))/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+2,'of','The source-container phrase is out of');
  }
  for(const match of text.matchAll(/\bIt it(?=\s+(?:possible|safe|normal|necessary|okay|ok)\s+to\b)/g)){
    add(match.index,match.index+5,'Is it','This question uses an inverted copula, not a duplicated pronoun');
  }
  for(const match of text.matchAll(/\ba lot of (recipe)(?=\s+(?:for|about|that|which)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'recipes','The count noun is plural after a lot of');
  }
  for(const match of text.matchAll(/\bI (?:a|an)(?=\s+(?:visiting|trying|looking|working|planning|using|having|seeing)\b)/g)){
    add(match.index,match.index+match[0].length,'I am','A first-person progressive clause needs am');
  }
  for(const match of text.matchAll(/\b(panner)(?=\s+tikka\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='P'?'Paneer':'paneer','The cheese in this dish is paneer','spelling');
  }
  for(const match of text.matchAll(/\bmade\s+(threw)(?=\s+a\s+coffee\s+pot\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'through','This describes the preparation route, not a throwing action');
  }
  for(const match of text.matchAll(/\bterms\s+(contains)(?=\s+(?:this|that|the|a|an)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'contain','The plural subject terms takes contain');
  }
  for(const match of text.matchAll(/\bupto\b(?=\s+\d)/g)){
    add(match.index,match.index+match[0].length,'up to','Up to is a two-word quantity expression','spelling');
  }
  for(const match of text.matchAll(/\ba\s+(?:two|three|four|five|six|seven|eight|nine|ten)\s+(?:power strips|windows|doors|questions|devices|files|people)\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/^a\s+/i,''),'An indefinite singular article does not modify this explicit plural count');
  }
  for(const match of text.matchAll(/\bThose\s+(where)\s+the\s+(?:plastic|metal|wooden)\s+kind\b(?=\s+and\b|[.!?]|$)/g)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'were','This demonstrative clause needs the past copula were');
  }
  for(const match of text.matchAll(/\b(wouldnt|couldnt|shouldnt)\b(?=\s+(?:(?:really|ever|even|just)\s+)?(?:have|be|do|go|come|use|work|need|want|know|say|make|take|get|see|read|write)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].slice(0,-1)+"'t",'The negative modal contraction needs an apostrophe');
  }
  for(const match of text.matchAll(/\b(?:I['’]m|I am)\s+(bit)\b(?=\s+(?:concerned|worried|confused|tired|scared|surprised|lost)\b)/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+3,'a bit','The degree phrase is a bit before this adjective');
  }
  for(const match of text.matchAll(/\b(?:rate|assess|review)\s+(it['’]s)\s+(?:work|output|results)\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'its','The object after this verb uses the possessive its');
  }
  const permitsBaseVerb=from=>{
    const before=text.slice(Math.max(0,from-160),from);
    // An object followed by a bare infinitive and a mandative that-clause
    // both legitimately use the base form after a singular pronoun.
    return /\b(?:do|does|did|don['’]t|doesn['’]t|didn['’]t|can|could|may|might|must|should|would|will|shall|can['’]?t|cannot|couldn['’]?t|mightn['’]?t|mustn['’]?t|shouldn['’]?t|wouldn['’]?t|won['’]?t|shan['’]?t|let|lets|make|makes|made|help|helps|helped|see|sees|saw|watch|watched|hear|heard|feel|felt|want|wants|wanted|need|needs|needed|expect|expects|expected|have|has|had|is|are|was|were|[a-z]+ing)\s*$/i.test(before)
      || /\b(?:suggest(?:s|ed)?|recommend(?:s|ed)?|request(?:s|ed)?|requir(?:e|es|ed)|demand(?:s|ed)?|insist(?:s|ed)?|propos(?:e|es|ed))\s+(?:that\s+)?$/i.test(before)
      || /\b(?:suggestion|recommendation|request|demand|requirement|important|essential|necessary|vital)\s+that\s+$/i.test(before);
  };
  for(const match of text.matchAll(/\bwante['’]d\b(?=\s+to\s+[a-z])/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/['’]/,''),'The past-tense verb wanted has no internal apostrophe','spelling');
  }
  for(const match of text.matchAll(/\bspoofying\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/ying$/i,'ing'),'The participle of spoof is spoofing','spelling');
  }
  for(const match of text.matchAll(/\b(?:am|is|are|was|were|be|been)\s+(?:(?:increasingly|still|always|completely)\s+)?(stucking)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'stuck','Be takes the participle stuck, not an invented -ing form');
  }
  for(const match of text.matchAll(/\bi['’](?:m|d|ll|ve)\b/g)){
    add(match.index,match.index+match[0].length,'I'+match[0].slice(1),'Capitalize the first-person contraction without replacing its word');
  }
  for(const match of text.matchAll(/\b(?:ive|Ive)\b(?=\s+(?:been|had|got|seen|done|made|taken|found|heard|read|written|[a-z]+ed)\b)/g)){
    add(match.index,match.index+match[0].length,"I've",'A first-person perfect contraction before the participle needs I and an apostrophe');
  }
  for(const match of text.matchAll(/\b[Ii]ve(?=\s+no\s+(?:idea|reason|doubt|intention|interest)\b)/g)){
    add(match.index,match.index+match[0].length,"I've",'The first-person have contraction before this negative noun phrase needs an apostrophe');
  }
  for(const match of text.matchAll(/\bi\b(?=\s+(?:(?:just|still|also|really|often|usually|sometimes|always|never|already|recently|now|first|ever)\s+)?(?:am|was|have|had|will|would|can|could|should|may|might|must|think|thought|hope|hoped|hear|heard|feel|felt|want|wanted|need|needed|like|liked|do|did|don't|didn't|couldn't|wouldn't|shouldn't|can't|won't|haven't|hadn't|wasn't)\b)/g)){
    add(match.index,match.index+1,'I','English first-person pronoun is capitalized');
  }
  for(const match of text.matchAll(/\bi\b(?=\s+(?:(?:just|still|also|really|often|usually|sometimes|always|never|already|recently|now|first|ever)\s+)?(?:decided|read|kept|look|comment|found|bought|put|knew|know|tried|try|mentioned|said|wrote|noticed|believe|believed|remember|remembered|reached|started|used|use|see|saw|get|got|work|worked|wiped|killed|made|mean|sound|own|hit|installed|missed|buy)\b)/g)){
    add(match.index,match.index+1,'I','English first-person pronoun is capitalized');
  }
  for(const match of text.matchAll(/\b(?:can|could|should|would|will|may|might|must|do|did|does|am|was|were|have|had)\s+(i)\b/gi)){
    if(match[1]==='I')continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+1,'I','English first-person pronoun is capitalized');
  }
  for(const match of text.matchAll(/\b(?:Should|Could|Would|Can|Will) (?:we|they|you|I|he|she|it) (?:worried|concerned|prepared|ready)\b/g)){
    add(match.index,match.index+match[0].length,match[0].replace(/ (worried|concerned|prepared|ready)$/,' be $1'),'The modal needs be before this predicative adjective');
  }
  for(const match of text.matchAll(/\b[Ii]ts\b(?=\s+(?:broken|fun|fine|okay|ok|great|possible|impossible|necessary|available|ready)\b(?:\s*(?:[.!?]|[:;][)(DP]|$)))/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's":"it's",'The following adjective needs the contraction it is');
  }
  for(const match of text.matchAll(/\b[Ii]ts\b(?=\s+(?:a|an|been)\b)/g)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?"It's":"it's",'It is or it has needs a contraction here');
  }
  for(const match of text.matchAll(/\b([Ii])ts\s+(reached|completed|finished|changed|improved|opened|closed|started|stopped)\b(?=\s+(?:the|a|an|this|that|my|your|our|their|its)\b)/g)){
    add(match.index,match.index+match[0].length,(match[1]==='I'?"It's":"it's")+' '+match[2],'A completed action before this object needs it has');
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
  for(const match of text.matchAll(/\b[Ii]m\b(?=\s+(?:(?:mostly|currently|really|just)\s+)?(?:a|an|back|going|doing|using|building|creating|related|split|sorry|sure|ready|glad|not|still|here|having|trying|looking|Looking|working|wondering)\b)/g)){
    add(match.index,match.index+match[0].length,"I'm",'First-person contraction needs an apostrophe');
  }
  for(const match of text.matchAll(/\b[Ii]m\b(?=\s+(?:planning\s+to|planning\s+(?:a|an|the)|painting\s+(?:a|an|the)|replacing\s+(?:some|a|an|the|my|our)|keen\s+to|stuck\s+(?:between|with|in|on)|concerned\s+about|after\s+(?:some|a|an|the)|at\s+(?:a|an|the)|the\s+\d+(?:st|nd|rd|th)|new\s+(?:here|to|so))\b)/g)){
    add(match.index,match.index+match[0].length,"I'm",'This first-person predicate needs the contraction I am');
  }
  for(const match of text.matchAll(/\b(?:airers?|devices?|printers?|computers?|routers?|cameras?|systems?|equipment)\s+(?:is|are|was|were|has been|have been)\s+(setup)\b(?=\s*(?:[.!?;]|$)|\s+(?:in|on|at|for|with|by)\s+(?:a|an|the|my|your|our|their)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'set up','This passive predicate takes the participle set up, not the noun setup');
  }
  for(const match of text.matchAll(/\b(?:(?:I|you|we|they|he|she|it|anyone|someone)\s+(?:can|could|would|should|will|may|might|must)|(?:can|could|would|should|will|may|might|must)\s+(?:I|you|we|they|he|she|it|anyone|someone))\s+(advice)\b(?=\s*(?:[.!?;]|$)|\s+(?:me|us|you|them|him|her|on|about|whether|how)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'advise','A modal takes the verb advise rather than the noun advice');
  }
  for(const match of text.matchAll(/\b(?:anyone|someone|everyone|no one)\s+(?:else\s+)?(have)\s+had\b/gi)){
    if(permitsBaseVerb(match.index))continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'has','This singular indefinite subject takes has in the perfect tense');
  }
  for(const match of text.matchAll(/\ba\s+(weeks|months|years)\s+(?:holiday|vacation|leave|notice)\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,match[1].slice(0,-1)+"'s",'A singular duration possesses this period of leave or notice');
  }
  for(const match of text.matchAll(/\bcountry-side\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace('-',''),'Countryside is one lexical word');
  }
  for(const match of text.matchAll(/\bI`(?:m|d|ll|ve)\b/g)){
    add(match.index,match.index+match[0].length,match[0].replace('`',"'"),'A contraction uses an apostrophe, not a grave accent');
  }
  for(const match of text.matchAll(/\bId\b(?=\s+(?:like|rather|prefer)\b)/g)){
    add(match.index,match.index+2,"I'd",'I would needs an apostrophe before this preference verb');
  }
  for(const match of text.matchAll(/\bwont\b(?=\s+(?:(?:ever|even|really|just)\s+)?(?:let|allow|work|run|load|open|start|stop|be|have|do|go|come|use|show)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='W'?"Won't":"won't",'The future negative before a verb needs an apostrophe');
  }
  for(const match of text.matchAll(/\bit['’]s(?=\s+own\s+[a-z]+\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='I'?'Its':'its','Own modifies a possessed noun here');
  }
  for(const match of text.matchAll(/\b(?:(?:trying|try|tries|tried|want|wants|wanted|need|needs|needed|how)\s+to|asked\s+(?:me|you|us|them|Google)\s+to)\s+(setup|backup)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,match[1].toLowerCase()==='backup'?'back up':'set up','The infinitive phrasal verb is written as two words');
  }
  for(const match of text.matchAll(/\b(?:have|has|had|need|needs|needed|want|wants|wanted)\s+to\s+(spent)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'spend','The infinitive takes the base verb spend');
  }
  for(const match of text.matchAll(/\b(?:have|has|had|need|needs|needed|want|wants|wanted)\s+to\s+(login)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'log in','The infinitive phrasal verb log in is written as two words');
  }
  for(const match of text.matchAll(/\b[Tt]here\s+(has)\s+been\s+(?:a few|several|many)\s+(?:posts|people|questions|problems|changes|days|years|cases)\b/g)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+3,'have','The following plural noun controls the agreement');
  }
  for(const match of text.matchAll(/\b(?:advices|softwares)\b/gi)){
    add(match.index,match.index+match[0].length,match[0].slice(0,-1),'This mass noun has no plural -s in ordinary prose');
  }
  for(const match of text.matchAll(/\b(\d+)[ -]+(?:yrs?|years?)[ -]+old\b(?=\s+(?:son|daughter|child|kid|boy|girl|person|house|car|fridge|refrigerator|washer|computer|laptop|phone|boiler|conservatory)\b)/gi)){
    const replacement=match[1]+'-year-old';
    if(match[0]!==replacement)add(match.index,match.index+match[0].length,replacement,'An age modifier before a noun uses singular year and hyphens');
  }
  const modalForms=new Map([['built','build'],['went','go'],['came','come'],['did','do'],['was','be'],['were','be'],['breaked','break'],['broke','break'],['broken','break']]);
  for(const match of text.matchAll(/\b(?:can|could|should|would|may|might|must|will)\s+(?:built|went|came|did|was|were|breaked|broke|broken)\b/gi)){
    const words=match[0].split(/\s+/),replacement=words[0]+' '+modalForms.get(words[1].toLowerCase());
    add(match.index,match.index+match[0].length,replacement,'A modal verb takes the base form of the following verb');
  }
  for(const match of text.matchAll(/\bto treated as\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/ treated as$/i,' be treated as'),'A passive infinitive needs be');
  }
  for(const match of text.matchAll(/\bmake it sounds\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/sounds$/i,'sound'),'Make takes a bare infinitive after its object');
  }
  for(const match of text.matchAll(/\bin past (\d+ years?)\b/gi)){
    add(match.index,match.index+match[0].length,'in the past '+match[1],'This time phrase uses the before past');
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
  for(const match of text.matchAll(/\b(?:bank|save|have|had|need|use) couple\b(?=\s+of\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/ couple$/i,' a couple'),'A couple of needs an article here');
  }
  for(const match of text.matchAll(/\b(?:get|need|want|provide|give|seek)\s+(more clarify)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'more clarification','This noun phrase needs clarification, not the verb clarify');
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
  for(const match of text.matchAll(/\bdidnt\b(?=\s+(?:(?:really|ever|even|quite|actually|just)\s+)?(?:read|write|do|have|know|think|want|need|like|see|hear|feel|go|come|get|take|make|work|use|try|find|mean|say|expect|understand|believe|notice|remember)\b|\s+(?:I|you|we|they|he|she|it)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0][0]==='D'?"Didn't":"didn't",'The negative auxiliary before a verb or question subject needs an apostrophe');
  }
  for(const match of text.matchAll(/\b(?:I|you|we|they|he|she|it)\s+(didnt)\b(?=\s*(?:[.!?;]|$))/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,"didn't",'The negative auxiliary in this elliptical clause needs an apostrophe');
  }
  for(const match of text.matchAll(/\b(?:a A\/B|a XP)\b/g)){
    add(match.index,match.index+match[0].length,'an '+match[0].slice(2),'These initialisms begin with a vowel sound');
  }
  for(const match of text.matchAll(/\ba expert\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/\ba /i,'an '),'Expert begins with a vowel sound');
  }
  for(const match of text.matchAll(/\ban (["“‘']?)(takeout|tool|test|time|team|thread|task|new)\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/\ban /i,'a '),'This noun begins with a consonant sound');
  }
  // Forward to is prepositional here. Avoid noun homographs such as work,
  // play and travel, which are already valid after this expression.
  const anticipatedActions=new Map([['write','writing'],['see','seeing'],['hear','hearing'],['meet','meeting'],['try','trying']]);
  for(const match of text.matchAll(/\blook(?:s|ed|ing)? forward to\s+(write|see|hear|meet|try)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,anticipatedActions.get(match[1].toLowerCase()),'The preposition in look forward to takes a gerund');
  }
  for(const match of text.matchAll(/\b(?:I am|I['’]m|you are|you['’]re|he is|he['’]s|she is|she['’]s)\s+(newbie)\b(?=\s+(?:here|at|in|to)\b|[.,!?;:]|$)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'a '+match[1],'This singular count noun needs an article');
  }
  // Require a completed plural head, not a modifier in parts store.
  for(const match of text.matchAll(/\b([Ww])hat['’]s\s+(?:your|their|our)\s+favou?rite\s+(?:parts|books|games|tools|features|things|ways)\b(?=\s+of\b|\s*[?!]|$)/g)){
    const length=match[0].indexOf(' ');
    add(match.index,match.index+length,match[1]+'hat are','The plural subject in this question takes are');
  }
  // A small set of unambiguously singular count heads avoids treating mass
  // nouns or open compound modifiers as missing an indefinite article.
  const vowelAdjectives=new Set(['upcoming','enormous','urgent','important','interesting','excellent','expensive','unusual']);
  const singularCountHeads=new Set(['project','flood','opportunity','issue','event','idea','report','task','problem','option','meeting']);
  for(const match of text.matchAll(/\b(?:in|into|on|for|with|without|about|under|over|after|before|have|has|had|need|needs|needed|want|wants|wanted|face|faced|saw|see)\s+([a-z]+)\s+([a-z]+)\b(?=\s+(?:of|for|in|on|with|at|to|from|that|which)\b|[.,;:!?)]|$)/gi)){
    if(!vowelAdjectives.has(match[1].toLowerCase())||!singularCountHeads.has(match[2].toLowerCase()))continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length+1+match[2].length,'an '+match[1]+' '+match[2],'A singular count noun with an adjective needs a determiner');
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
  for(const match of text.matchAll(/\b([Tt])here is\b(?=\s+(?:many(?!\s+(?:a|an)\b)|several|numerous|multiple)\b)/g)){
    add(match.index,match.index+match[0].length,match[1]+'here are','A plural quantity takes there are');
  }
  for(const match of text.matchAll(/\b(?:instruments|machines|devices|systems|programs) that only runs\b/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/runs$/i,'run'),'A plural subject takes run');
  }
  for(const match of text.matchAll(/\b(?:it|he|she|this|that)\s+(don['’]?t)\s+(login|work|need|have|load|run|open|start|stop|show|connect|respond)\b/gi)){
    // Relative that inherits its antecedent's number (forums that don't).
    // Only a sentence-initial demonstrative establishes singular agreement.
    if(/^that\b/i.test(match[0])&&!/(?:^|[.!?]\s*)$/.test(text.slice(0,match.index)))continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,match.index+match[0].length,"doesn't "+(match[2].toLowerCase()==='login'?'log in':match[2].toLowerCase()),'Third-person singular uses does not and the base verb');
  }
  for(const match of text.matchAll(/\b([Ww]e|[Tt]hey|[Yy]ou)\s+was\b/g)){
    add(match.index,match.index+match[0].length,match[1]+' were','This plural or second-person subject takes were');
  }
  const pluralSubjectVerbs=new Map([['seems','seem'],['works','work'],['needs','need'],['uses','use'],['wants','want'],['has','have'],['does','do'],['goes','go'],['makes','make'],['takes','take'],['runs','run'],['opens','open'],['switches','switch'],['connects','connect'],['understands','understand']]);
  for(const match of text.matchAll(/\b([Tt]hey|[Ww]e|[Yy]ou|[Ii])\s+(seems|works|needs|uses|wants|has|does|goes|makes|takes|runs|opens|switches|connects|understands)\b/g)){
    add(match.index,match.index+match[0].length,(match[1]==='i'?'I':match[1])+' '+pluralSubjectVerbs.get(match[2]),'This subject takes the uninflected present-tense verb');
  }
  // Mass nouns can be modifiers in a software company or a feedback loop.
  // Only remove the article when this is the completed noun phrase.
  for(const match of text.matchAll(/\b(?:a|an)\s+(?:(?:genuine|useful|helpful)\s+)?(?:feedback|advice|software|spyware|travel insurance)\b(?=\s*[,.;!?)]|$|\s+(?:on|about|for|from|to|that|which|in|with)\b)/gi)){
    add(match.index,match.index+match[0].length,match[0].replace(/^(?:a|an)\s+/i,''),'This mass noun does not take an indefinite article');
  }
  for(const match of text.matchAll(/\bmuch\s+(?:false\s+)?(?:positives|negatives|errors|problems|issues|people|files|users)\b/gi)){
    add(match.index,match.index+4,match[0][0]==='M'?'Many':'many','This plural count noun takes many');
  }
  for(const match of text.matchAll(/\b(?:it|he|she)\s+(?:just|often|always|sometimes)\s+(try|work|use|need|want)\b/gi)){
    if(permitsBaseVerb(match.index))continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,match[1].toLowerCase()==='try'?'tries':match[1]+'s','This singular subject takes a third-person present verb');
  }
  // Need of is a noun construction after a copula, not a finite need verb.
  for(const match of text.matchAll(/\b(?:am|is|are|was|were|been|be|it['’]s|that['’]s|there['’]s)\s+(it)\s+need\s+of\b/gi)){
    const from=match.index+match[0].search(/\bit\s+need\s+of$/i);
    add(from,from+match[1].length,'in','The prepositional phrase is in need of');
  }
  const singularSubjectVerbs=new Map([['switch','switches'],['work','works'],['need','needs'],['use','uses'],['want','wants'],['make','makes'],['take','takes'],['run','runs'],['open','opens'],['close','closes'],['show','shows'],['respond','responds'],['seem','seems'],['start','starts'],['stop','stops']]);
  for(const match of text.matchAll(/\b([Ii]t|[Hh]e|[Ss]he)\s+(switch|work|need|use|want|make|take|run|open|close|show|respond|seem|start|stop)(?:\s+(on|off|out|up|down))?\b/g)){
    if(permitsBaseVerb(match.index))continue;
    if(match[2]==='need'&&/^\s+of\b/i.test(text.slice(match.index+match[0].length)))continue;
    if(match[2]==='open'&&/\b(?:get|gets|got|keep|keeps|kept|leave|leaves|left|hold|holds|held)\s*$/i.test(text.slice(Math.max(0,match.index-30),match.index)))continue;
    add(match.index,match.index+match[0].length,match[1]+' '+singularSubjectVerbs.get(match[2])+(match[3]?' '+match[3]:''),'This singular subject takes a third-person singular verb');
  }
  for(const match of text.matchAll(/(?:^|[.!?]\s+)[Aa]ll the (?:steps|tasks|issues|files|changes|tests|features)(?:\s+(?:of|in|for|on|with)\s+(?:(?:[a-z]+)\s+){0,8}[a-z]+)?\s+(has been)\b/gim)){
    const between=match[0].slice(match[0].indexOf(' the ')+5,match[0].lastIndexOf(match[1]));
    if(/\b(?:that|which|who|whom|whose|he|she|it|we|they|you|has|have|had|is|are|was|were|will|would|could|should)\b/i.test(between))continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    const participle=text.slice(from+match[1].length).match(/^\s+(?:[a-z]+ed|done|seen|known|shown|given|taken|made|found|built|sent|put|read)\b/i)?.[0]??'';
    add(from,from+match[1].length+participle.length,'have been'+participle,'The plural head noun governs this auxiliary');
  }
  for(const match of text.matchAll(/\b([Ii])t['’]s\s+(displays|happens|seems|appears|loads|starts|fails|opens|closes)\b/g)){
    add(match.index,match.index+match[0].length,match[1]+'t '+match[2],"It's means it is or it has, not a bare finite verb");
  }
  // Keep apostrophe repairs on the token, but a perfect auxiliary can make
  // dont a mistyped participle instead of a negative contraction.
  for(const [source,replacement] of [['thats',"that's"],['theres',"there's"],['dont',"don't"],['doesnt',"doesn't"],['arent',"aren't"]]){
    for(const match of text.matchAll(new RegExp(`\\b${source}\\b`,'gi'))){
      if(source==='dont'&&/\b(?:have|has|had)(?:\s+(?:I|we|you|they|he|she|it))?(?:\s+(?:already|just|never|ever))?\s+$/i.test(text.slice(0,match.index))){
        add(match.index,match.index+match[0].length,'done','The perfect auxiliary requires the past participle done','spelling');
        continue;
      }
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
  for(const match of text.matchAll(/\bi\b(?=\s+(?:consider|find|prompt|got|wait|send|doodle)\b)/g))add(match.index,match.index+1,'I','Capitalize the first-person pronoun');
  for(const match of text.matchAll(/\bin short time\b/gi))add(match.index,match.index+match[0].length,'in a short time','Singular count noun time needs an article here');
  for(const match of text.matchAll(/\b(?:use|need|spend|allocate|provide) marginal amount\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/ marginal amount$/i,' a marginal amount'),'A singular count noun needs an article');
  for(const match of text.matchAll(/\b(?:got|get|gets|getting) couple\b(?=\s+of\b)/gi))add(match.index,match.index+match[0].length,match[0].replace(/ couple$/i,' a couple'),'A couple of needs an article');
  for(const match of text.matchAll(/\b(?:get|gets|getting|got) worst\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/worst$/i,'worse'),'A change in degree uses the comparative worse');
  for(const match of text.matchAll(/\b(?:advancements|improvements|developments|results|devices) has\b/gi))add(match.index,match.index+match[0].length,match[0].replace(/ has$/i,' have'),'A plural subject agrees with have');
  const singularMassSubjects=new Set(['luggage','baggage','equipment','information','furniture']);
  const singularVerbs=new Map([['contain','contains'],['include','includes'],['require','requires'],['need','needs'],['have','has']]);
  for(const match of text.matchAll(/\b(?:this|that)\s+([a-z]+)\s+(contain|include|require|need|have)\b/gi)){
    if(!singularMassSubjects.has(match[1].toLowerCase()))continue;
    const from=match.index+match[0].lastIndexOf(match[2]);
    add(from,from+match[2].length,singularVerbs.get(match[2].toLowerCase()),'This singular subject takes a third-person singular verb');
  }
  for(const match of text.matchAll(/\b(?:it|he|she|this|that)\s+(?:(?:itself|himself|herself)\s+)?(?:(?:only|still|also|already|usually|always|often|sometimes|never)\s+)?(have)\b/gi)){
    if(permitsBaseVerb(match.index))continue;
    // That can introduce a relative clause with a plural antecedent. Only
    // treat a demonstrative as singular at an explicit sentence boundary.
    if(/^(?:this|that)\b/i.test(match[0])&&!/(?:^|[.!?]\s*)$/.test(text.slice(0,match.index)))continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'has','This singular subject takes has');
  }
  const doSupportForms=new Map([['tries','try'],['has','have'],['uses','use'],['works','work'],['needs','need'],['wants','want'],['seems','seem'],['worked','work'],['came','come'],['went','go'],['made','make'],['took','take'],['broke','break']]);
  for(const match of text.matchAll(/\b(do|does|did|don['’]?t|doesn['’]?t|didn['’]?t)\s+(?:(i|you|we|they|it|he|she|this|that)\s+)?(has|uses|works|needs|wants|seems|tries|worked|came|went|made|took|broke)\b/gi)){
    const from=match[2]?match.index+match[0].lastIndexOf(match[3]):match.index;
    const base=doSupportForms.get(match[3].toLowerCase());
    add(from,match.index+match[0].length,match[2]?base:match[1]+' '+base,'Do-support takes the base form of the main verb');
  }
  for(const match of text.matchAll(/\b(?:[Dd]o|[Dd]oes|[Dd]id)\s+(?:[A-Z][A-Z0-9]{1,}(?:\s+[A-Z][A-Z0-9]{1,}){0,2}|[A-Z][a-z]+|(?:the|a|an|my|our|your|his|her|their|this|that)\s+[a-z]+)\s+(?:(?:really|ever|also|still|only|always|often)\s+)?(has|uses|works|needs|wants|seems)\b/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,doSupportForms.get(match[1]),'Do-support takes the base form of the main verb');
  }
  // Restrict setup to a pronoun-led clause: the noun and noun modifier are
  // valid in phrases such as my setup, the setup process, and go to setup.
  for(const match of text.matchAll(/(?:^|[.!?]\s+|\b(?:then|and|but|because|when|if)\s+)(I|you|we|they|he|she|it)\s+(?:(can|could|will|would|should|must|may|might|have|has|had|just|already)\s+)?(setup)\b/gi)){
    // Bare singular subjects leave tense unresolved: she sets up today,
    // but she set up yesterday. An auxiliary makes set up unambiguous.
    if(/^(?:he|she|it)$/i.test(match[1])&&(!match[2]||/^(?:just|already)$/i.test(match[2])))continue;
    const from=match.index+match[0].lastIndexOf(match[3]);
    add(from,from+match[3].length,'set up','Set up is the verb; setup is a noun or noun modifier');
  }
  const irregularParticiples=new Map([['went','gone'],['came','come'],['saw','seen'],['wrote','written'],['took','taken'],['broke','broken'],['ran','run'],['did','done'],['ate','eaten'],['spoke','spoken'],['knew','known'],['drank','drunk'],['gave','given']]);
  for(const match of text.matchAll(/\b(have|has|had|haven['’]t|hasn['’]t|hadn['’]t)\s+(went|came|saw|wrote|took|broke|ran|did|ate|spoke|knew|drank|gave)\b/gi)){
    add(match.index,match.index+match[0].length,match[1]+' '+irregularParticiples.get(match[2].toLowerCase()),'Perfect aspect takes the past participle');
  }
  const oneOfPluralHeads=new Map([['friend','friends'],['project','projects'],['movie','movies'],['student','students'],['book','books'],['team','teams'],['option','options'],['example','examples'],['issue','issues'],['university','universities'],['work','works'],['person','people'],['child','children'],['company','companies']]);
  for(const match of text.matchAll(/\b[Oo]ne of (?:the|my|your|his|her|our|their)\s+(?:(?:best|worst|notable|greatest|favorite|favourite|biggest|first|last|newest|oldest)\s+){0,2}([a-z]+)\b(?=\s+(?:in|of|for|with|at|on|is|was|are|were|that|which|who)\b|[.,!?;:]|$)/g)){
    const plural=oneOfPluralHeads.get(match[1]);
    if(!plural)continue;
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,plural,'One of is followed by a plural count noun');
  }
  const singularCountNouns=new Map([['questions','question'],['devices','device'],['users','user'],['files','file'],['apps','app'],['projects','project'],['tasks','task'],['issues','issue'],['cases','case'],['options','option'],['servers','server'],['cameras','camera'],['systems','system'],['models','model'],['features','feature'],['tests','test'],['versions','version'],['reports','report'],['messages','message'],['answers','answer'],['programs','program'],['children','child']]);
  for(const match of text.matchAll(/\b([Oo]ne|[Ee]very)\s+(questions|devices|users|files|apps|projects|tasks|issues|cases|options|servers|cameras|systems|models|features|tests|versions|reports|messages|answers|programs|children)\b(?!['’])/g)){
    add(match.index,match.index+match[0].length,match[1]+' '+singularCountNouns.get(match[2]),'One and every take a singular count noun here');
  }
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
  for(const match of text.matchAll(/\b([2-9]|[1-9]\d+) PR\b(?!s|[-‐‑][A-Za-z])/g))add(match.index,match.index+match[0].length,match[1]+' PRs','A numeral above one takes a plural count abbreviation');
  for(const match of text.matchAll(/\b([2-9]|[1-9]\d+) (URL|API|LLM)\b(?!s|[-‐‑][A-Za-z])/g)){
    // HTTP status numbers and counted noun modifiers do not pluralize the
    // acronym: 500 API Error, 20 API requests, 3 LLM providers.
    if(/^\s+(?:errors?|requests?|calls?|keys?|responses?|endpoints?|providers?|models?|tokens?|parameters?|links?|addresses?)\b/i.test(text.slice(match.index+match[0].length)))continue;
    add(match.index,match.index+match[0].length,match[1]+' '+match[2]+'s','A numeral above one takes a plural count abbreviation');
  }
  for(const match of text.matchAll(/\b(?:hundreds|thousands|millions) of (?:URL|API|LLM)\b(?!s|[-‐‑][A-Za-z])/g))add(match.index,match.index+match[0].length,match[0]+'s','A plural quantity takes a plural count abbreviation');
  for(const match of text.matchAll(/\bthrough is many\b/gi))add(match.index,match.index+match[0].length,'through as many','As many forms the comparative quantity phrase');
  for(const match of text.matchAll(/\ba implemention\b/gi))add(match.index,match.index+match[0].length,'an implementation','Correct the noun and its preceding article');
  // Initialisms use the spoken letter name rather than the first written
  // letter. Restrict this to familiar initialisms with unambiguous readings.
  for(const match of text.matchAll(/\b([Aa])\s+(AI|API|AMD|ML|LLM|MRI|HTML|HTTP|SSD|SSL|SDK)\b/g)){
    if(match[1]==='A'&&/[\p{L}\p{N}]\s+$/u.test(text.slice(0,match.index)))continue;
    add(match.index,match.index+match[1].length,match[1]==='A'?'An':'an','The initialism starts with a vowel sound');
  }
  for(const match of text.matchAll(/\b[Aa]n\s+(?:year|YC)\b/g))add(match.index,match.index+2,match[0][0]==='A'?'A':'a','This word or initialism starts with a consonant sound');
  for(const match of text.matchAll(/\b(?:a|one)\s+(fortnights|weeks|months|years)\s+time\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,match[1].slice(0,-1)+"'s",'A singular duration takes a singular possessive before time');
  }
  for(const match of text.matchAll(/\b(?:can|could|would|should|will|may|might|must)\s+(feedback)\b(?=\s+(?:observations|results|findings|comments|to)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'feed back','The modal takes the phrasal verb feed back');
  }
  for(const match of text.matchAll(/\b(?:cant|cants)\b(?=\s+(?:go|figure|find|work|use|see|hear|understand|afford|remember|wait)\b)/gi))add(match.index,match.index+match[0].length,match[0][0]==='C'?"Can't":"can't",'The negative modal before this verb requires an apostrophe');
  for(const match of text.matchAll(/\b(?:[Ww]hats)(?=\s+the\s+(?:legal|current|official|actual)\s+(?:status|position|reason|name)\b)/g))add(match.index,match.index+match[0].length,match[0][0]==='W'?"What's":"what's",'This question needs what is');
  for(const match of text.matchAll(/\b[Ll]ets(?=\s+say\b)/g))add(match.index,match.index+match[0].length,match[0][0]==='L'?"Let's":"let's",'This invitation is the contraction let us');
  for(const match of text.matchAll(/\blooking\s+(advice)\b(?=\s+(?:on|about|regarding|for|from)\b|[.!?,;:]|$)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'for advice','Looking takes for before the sought object');
  }
  for(const match of text.matchAll(/\b(?:have|has|had)\s+(their)\s+been\b/gi)){
    const from=match.index+match[0].indexOf(match[1]);
    add(from,from+match[1].length,'there','The existential perfect uses there, not possessive their');
  }
  for(const match of text.matchAll(/\b([Ii])\s+have\s+(have)(?=\s+(?:a|an|the|some|no)\b)/g)){
    const from=match.index+match[0].lastIndexOf(match[2]);
    add(from,from+match[2].length+1,'','The adjacent auxiliary is duplicated before a noun phrase');
  }
  for(const match of text.matchAll(/\b(around)\s+\1\b/gi))add(match.index,match.index+match[0].length,match[1],'The adjacent preposition is duplicated');
  for(const match of text.matchAll(/\b(?:have|has|had|we['’]ve|I['’]ve)\s+(book)(?=\s+(?:walking tours|flights|tickets|hotels)\b)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'booked','The perfect auxiliary takes the participle booked');
  }
  for(const match of text.matchAll(/\b(?:in|for)\s+(same price)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'the same price','Same in this price phrase needs a determiner');
  }
  for(const match of text.matchAll(/\b(?:am|is|was)\s+(fresh graduate)(?=\s+(?:working|looking|from|with|and|but)\b|[.!?,;:]|$)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'a '+match[1],'The singular count phrase fresh graduate needs an article');
  }
  for(const match of text.matchAll(/\b(?:with|without)\s+(separate answer)(?=\s+(?:to|for|from)\b|[.!?,;:]|$)/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'a '+match[1],'This complete singular answer phrase needs an article');
  }
  for(const match of text.matchAll(/\b(?:survive|survives|survived|surviving|withstand|withstood)\s+(test of time)\b/gi)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    add(from,from+match[1].length,'the '+match[1],'The fixed expression is the test of time');
  }
  for(const match of text.matchAll(/\b(?:in)\s+(UK|USA)\b/g)){
    const from=match.index+match[0].lastIndexOf(match[1]);
    if(/^\s+(?:law|English|schools|companies|cities|politics|history|markets|terms)\b/.test(text.slice(from+match[1].length)))continue;
    if(!/^(?:\s*[,.;:!?)]|$|\s+(?:and|but|for|with|to|since|next|last|this)\b)/.test(text.slice(from+match[1].length)))continue;
    add(from,from+match[1].length,'the '+match[1],'This country name takes the definite article as a complete location phrase');
  }
  // Run broad article agreement after exact lexical repairs so a compound
  // correction can repair both the article and a misspelled head noun.
  for(const match of text.matchAll(/\b([Aa]) ([aeio][a-z]{2,})\b/g)){
    if(match.index>0&&/[\p{L}\p{N}&/+_-]/u.test(text[match.index-1]))continue;
    // A following a word can label an entity (Agent A, Grade A). Its
    // uppercase spelling is evidence to abstain from article agreement.
    if(match[1]==='A'&&/[\p{L}\p{N}]\s+$/u.test(text.slice(0,match.index)))continue;
    if(/^(?:eu|ew)/.test(match[2])||/^(?:one|once|ones|oneness)$/.test(match[2]))continue;
    if(['and','or','as','is','are','of','in','on','at','out','into'].includes(match[2]))continue;
    add(match.index,match.index+match[0].length,(match[1]==='A'?'An':'an')+' '+match[2],'Use an before this vowel sound');
  }
  for(const match of text.matchAll(/\b([Aa])n ([bcdfgjkpqtvwz][a-z]+er)\b/g)){
    add(match.index,match.index+match[0].length,match[1]+' '+match[2],'Use a before this consonant sound');
  }
  return findings;
}
