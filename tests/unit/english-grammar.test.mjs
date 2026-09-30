import {test} from 'node:test';
import assert from 'node:assert/strict';

test('how much may describe the degree of a following plural clause',()=>{
  for(const text of ['We measured how much positives outweigh negatives.','How much users contribute varies.','We measured how much users joined in during the trial'])assert.equal(check(text).some(f=>f.suggestions[0]==='many'),false,text);
  assert.ok(check('There are much errors.').some(f=>f.suggestions[0]==='many'));
  for(const text of ['How much errors did you find?','How much files are missing?','How much files remain?','How much users joined?'])assert.ok(check(text).some(f=>f.suggestions[0]==='many'),text);
});

test('mass equipment repairs retain source capitalization',()=>{
  for(const [text,target] of [['Equipments are expensive.','Equipment'],['EQUIPMENTS','EQUIPMENT'],['equipments','equipment']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('perfect indefinite subject repairs abstain when question inversion is needed',()=>{
  for(const text of ['Anyone have had this issue?','Anyone have had this issue in the U.S.?','Anyone have had this issue in v2.0?'])assert.equal(check(text).some(f=>f.suggestions[0]==='has'),false,text);
  assert.ok(check('Everyone have had this issue.').some(f=>f.suggestions[0]==='has'));
});

test('perfect setup verbs with definite objects remain distinct from setup nouns',()=>{
  for(const text of ['I have setup the server.','We had setup the account before noon.','I have setup this server.','We had setup those accounts.'])assert.ok(check(text).some(f=>f.suggestions[0]==='set up'),text);
  for(const text of ['I have setup experience.','I have setup this week.','I have setup the following morning.'])assert.equal(check(text).some(f=>f.suggestions[0]==='set up'),false,text);
});

test('favorite plural modifiers before an of-phrase retain a singular compound head',()=>{
  assert.equal(check("What's your favorite parts of speech book?").some(f=>f.suggestions[0]==='What are'),false);
  assert.ok(check("What's your favorite parts of Cocoa?").some(f=>f.suggestions[0]==='What are'));
});

test('possessive have does not turn book-themed tours into bookings',()=>{
  assert.equal(check('We have book walking tours available.').some(f=>f.suggestions[0]==='booked'),false);
  assert.ok(check("we've book flights").some(f=>f.suggestions[0]==='booked'));
});

test('explicitly named spellings bypass both exact and distance spelling repairs',()=>{
  for(const text of ['Our project is called Natual.','The app named Natual is useful.'])assert.equal(check(text).some(f=>f.original==='Natual'&&f.applicable),false,text);
  assert.ok(check('Natual language processing is useful.').some(f=>f.suggestions[0]==='Natural'));
});

test('let binds a lowercase variable without creating a first-person pronoun',()=>{
  for(const text of ['Let i find the first matching index','Let i consider each element'])assert.equal(check(text).some(f=>f.original==='i'&&f.applicable),false,text);
  assert.ok(check('i find it useful').some(f=>f.suggestions[0]==='I'));
});

test('exact spelling repairs preserve title and upper case',()=>{
  for(const [text,target] of [['Natual language processing is useful.','Natural'],['NATUAL LANGUAGE','NATURAL'],['CHINNESE','CHINESE'],['chinnese','Chinese']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('explicit foreign word labels protect only the quoted expression',()=>{
  for(const text of ['The Latin word "natura" means nature','The word "natura" is Latin for nature'])assert.equal(check(text).some(f=>f.original==='natura'&&f.applicable),false,text);
  assert.ok(check('The Latin word "natura" means teh natural world').some(f=>f.suggestions[0]==='the'));
  assert.ok(check('The English word "natual" is misspelled').some(f=>f.suggestions[0]==='natural'));
});

test('agreement does not turn Roman numeral labels into pronouns',()=>{
  for(const text of ['Chapter I has the introduction.','Model I works correctly.','Part I uses examples.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('I has a question.').some(f=>f.suggestions[0]==='I have'));
});

test('capitalized abbreviations after have are not malformed participles',()=>{
  for(const text of ['The clinic has DID support groups.','They had DID symptoms.','The network has RAN equipment.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('She has went home.').some(f=>f.suggestions[0]==='has gone'));
});

test('residence duration repairs consume ago rather than leaving it after for',()=>{
  const source='I live here since 2 years ago.',finding=check(source).find(f=>f.applicable);
  assert.ok(finding);
  assert.equal(source.slice(0,finding.from)+finding.suggestions[0]+source.slice(finding.to),'I have lived here for 2 years.');
});

test('past duration article insertion preserves the original capitalization',()=>{
  for(const [source,target] of [['In past 5 years, costs rose.','In the past 5 years'],['IN PAST 5 YEARS, COSTS ROSE.','IN THE PAST 5 YEARS'],['Costs rose in past 5 years.','in the past 5 years']])assert.ok(check(source).some(f=>f.suggestions[0]===target),source);
});

test('a transposed awesome adjective is repaired before a common noun',()=>{
  assert.equal(check('Hello Awseome People').find(f=>f.original==='Awseome')?.suggestions[0],'Awesome');
  assert.equal(englishGrammar('Awseome is a name.').length,0);
  assert.equal(englishGrammar('Hello Awesome People').length,0);
});

test('a misplaced doubled consonant in throttling retains its traffic object',()=>{
  assert.equal(check('It works by throtlling packets per second').find(f=>f.original==='throtlling')?.suggestions[0],'throttling');
  assert.equal(englishGrammar('throtlling is an identifier').length,0);
  assert.equal(englishGrammar('throttling network traffic').length,0);
});

test('being in a state construction is not accepted as bee plus ing',()=>{
  assert.equal(check('without beeing logged in').find(f=>f.original==='beeing')?.suggestions[0],'being');
  assert.equal(check('She was beeing ignored').find(f=>f.original==='beeing')?.suggestions[0],'being');
  for(const text of ['Beeing is a name.','I enjoy beekeeping.','without being logged in'])assert.equal(englishGrammar(text).length,0,text);
});

test('joined a bit before a degree adjective retains its meaning',()=>{
  for(const text of ['I am getting abit stressed','It is abit slow'])assert.equal(check(text).find(f=>f.original==='abit')?.suggestions[0],'a bit',text);
  for(const text of ['ABIT motherboard','It is ABIT hardware','I am getting a bit stressed'])assert.equal(englishGrammar(text).length,0,text);
});

test('ordinary verb constructions recover adjacent-key spelling without changing introduced names',()=>{
  for(const [text,original,target] of [
    ['it organzies your tabs','organzies','organizes'],
    ['and lookinf for micro tasks','lookinf','looking'],
    ['Wotked for years, then stopped','Wotked','Worked'],
    ['as soon as I movrd','movrd','moved'],
  ])assert.equal(check(text).find(f=>f.original===original)?.suggestions[0],target,text);
  for(const text of ['Organzies is a service.','a package called lookinf','Wotked is a name.','movrd is a key.'])assert.equal(englishGrammar(text).length,0,text);
});

test('adverb and adjective typos retain their grammatical forms in bounded contexts',()=>{
  for(const [text,original,target] of [['SaaS specificly.','specificly','specifically'],['find nornal to path length','nornal','normal']])assert.equal(check(text).find(f=>f.original===original)?.suggestions[0],target,text);
  for(const text of ['Specifically for you.','Specificly is a name.','Nornal is a town.','the normal line'])assert.equal(englishGrammar(text).length,0,text);
});

test('utility noun repairs preserve pricing and metering context',()=>{
  for(const [text,original,target] of [['the electiciry meter','electiciry','electricity'],['my fixed tarfiff ends soon','tarfiff','tariff']])assert.equal(check(text).find(f=>f.original===original)?.suggestions[0],target,text);
  for(const text of ['electiciry is a variable','Tarfiff is a name','a fixed tariff','an electricity meter'])assert.equal(englishGrammar(text).length,0,text);
});

test('contextual spelling repairs respect excluded spans and personal words',()=>{
  for(const text of ['it organzies your tabs','SaaS specificly.','find nornal to path length','lookinf for work','wotked for years','I movrd','the electiciry meter','a fixed tarfiff','Hello Awseome People','by throtlling packets','without beeing logged in','I am getting abit stressed']){
    const finding=englishGrammar(text)[0];
    assert.ok(finding,text);
    assert.equal(englishGrammar(text,[[finding.from,finding.to]]).length,0,text);
    assert.equal(englishGrammar(text,[],new Set([finding.original])).length,0,text);
    assert.equal(check(text,[finding.original]).some(f=>f.from===finding.from&&f.applicable),false,text);
  }
});

test('joined copulas retain the singular noun and a following subject clause',()=>{
  for(const [text,target] of [['the problemis it came without instructions','problem is'],['my issueis that they left','issue is'],['the reasonis we cannot leave','reason is']]){
    assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  }
  for(const text of ['the problem is it came late','problemis is an identifier','the problems are resolved'])assert.equal(englishGrammar(text).length,0,text);
  assert.equal(check('the problemis it came late',['problemis']).some(f=>f.original==='problemis'),false);
  assert.equal(check('`the problemis it came late`').some(f=>f.applicable),false);
});

test('the long story short idiom repairs its nouns without selecting an unrelated store',()=>{
  assert.equal(check('Long storu short, we left.').find(f=>f.original==='storu')?.suggestions[0],'story');
  const text='Lomng storu short, the line is closing.';
  for(const [original,target] of [['Lomng','Long'],['storu','story']]){
    assert.equal(check(text).find(f=>f.original===original)?.suggestions[0],target);
    assert.equal(check(text,[original]).some(f=>f.original===original&&f.applicable),false);
  }
  for(const source of ['Long story short, we left.','the storu short code'])assert.equal(englishGrammar(source).length,0,source);
});

test('a temporal until typo is not accepted merely because till has a dictionary entry',()=>{
  for(const text of ['waiting untill April 2026','stay untill the end','Untill tomorrow, goodbye.'])assert.ok(check(text).some(f=>f.suggestions[0].toLowerCase()==='until'),text);
  assert.equal(englishGrammar('untill is a variable').length,0);
  assert.equal(check('waiting untill April',['untill']).some(f=>f.original==='untill'),false);
  assert.equal(check('`waiting untill April`').some(f=>f.applicable),false);
});

test('service names and an explicitly named customer relationship retain their identity',()=>{
  for(const text of ['run canva and Instagram','Canva has tools','an email address on vinted','a zzoom customer for years','places like fiverr','Fiverr offers services'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('Please zzoom in.').some(f=>f.original==='zzoom'&&f.suggestions[0]==='zoom'));
  assert.ok(check('canva recieve').some(f=>f.suggestions[0]==='receive'));
});

test('reviewed lexical repairs preserve casing and community names',()=>{
  for(const [text,target]of [['Woudl','Would'],['Basiically','Basically'],['recommention','recommendation']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['thames','fondo','hallu'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('reviewed spelling and local grammar choose words over unrelated distance neighbors',()=>{
  for(const [text,target]of [['a shiney new boiler','shiny'],['fixed traffi ends today','tariff'],['the bill is gping from 126 to 140','going'],['monitized','monetized'],['succintly','succinctly'],['debarcle','debacle'],['jepardy','jeopardy']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.equal(check('gping').some(f=>f.suggestions[0]==='going'),false);
  assert.equal(check('traffi').some(f=>f.suggestions[0]==='tariff'),false);
});

test('object adjectives and unfinished noun phrases are not finite subject clauses',()=>{
  for(const text of ['How can I get it open','Keep it open.','They left it open.','running downstairs with it open','without it open','searching for child'])assert.equal(englishGrammar(text).length,0,text);
  assert.ok(englishGrammar('It open every day.').some(f=>f.suggestions[0]==='It opens'));
  assert.ok(englishGrammar('A ticket for child.').some(f=>f.suggestions[0]==='a child'));
  assert.equal(check('an agent which I call magent.').some(f=>f.original==='magent'&&f.applicable),false);
});

test('counted acronyms keep singular modifiers and HTTP status descriptions',()=>{
  for(const text of ['500 API Error','20 API requests','3 LLM providers','54 LLM-backed workflows','12 API-driven projects','3 PR-related changes','hundreds of LLM-based tools','OpenAI GPT-5 API is slower','version-12 PR','version 4.2 API'])assert.equal(englishGrammar(text).length,0,text);
  assert.ok(englishGrammar('We use 20 API.').some(f=>f.suggestions[0]==='20 APIs'));
});

test('version labels before numerals do not count acronym nouns',()=>{
  for(const text of ['We still support the version 2 API.','This is version 3 LLM.','It uses the generation 2 API.','We updated the model 3 LLM.','This is version 12 PR.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We use 2 API.').some(f=>f.suggestions[0]==='2 APIs'));
  assert.ok(check('I merged 10 PR yesterday.').some(f=>f.suggestions[0]==='10 PRs'));
});

test('gerund subjects keep the base verb governed by an inverted auxiliary',()=>{
  for(const text of ['Will using it make it faster?','Does tuning it make it unstable?','Could running it make the device faster?','How does using it make it faster?'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('Tuning it make it narrow.').some(f=>f.suggestions[0]==='Tuning it makes'));
});

test('one compounds retain their consonant sound while ordinary vowel nouns keep their article repair',()=>{
  for(const text of ['a oneoff payment','a onetime offer','a oneway trip','a onesided argument'])assert.equal(englishGrammar(text).length,0,text);
  assert.ok(englishGrammar('a onerous task').some(f=>f.suggestions[0]==='an onerous'));
});

test('a missing negative consonant in a past copula is restored before a predicate',()=>{
  for(const [text,target] of [["it was't ever clear","wasn't"],["They were't ready.","weren't"]]){
    const finding=englishGrammar(text)[0];
    assert.equal(finding?.suggestions[0],target,text);
    assert.equal(englishGrammar(text,[[finding.from,finding.to]]).length,0);
    assert.equal(englishGrammar(text,[],new Set([finding.original])).length,0);
  }
  assert.equal(englishGrammar("was't").length,0);
});

test('regional verbs and derived adjectives survive lexical correction with short-name boundaries',()=>{
  for(const text of ['synthesise','synthesising','bagless','saas','zell'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['alll','all'],['conming','coming'],['washine','washing'],['opnions','opinions'],['maube','maybe'],['extrem knowledgeable','extremely']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});
import {check} from '../../scripts/spelling-prototype.mjs';
import {createChecker} from '../../packages/editor/src/proofreading/engine.mjs';
import {englishGrammar} from '../../packages/editor/src/proofreading/english-grammar.mjs';

test('bare resource paths and introduced tool names retain spelling without hiding prose',()=>{
  const text='/api/memories contains teh results from a finance manager called procura.';
  const actionable=check(text).filter(f=>f.applicable);
  assert.deepEqual(actionable.map(f=>[f.original,f.suggestions[0]]),[['teh','the']]);
  assert.equal(check('testing utils').some(f=>f.applicable),false);
  assert.ok(check('teh API').some(f=>f.suggestions[0]==='the'));
});

test('a plural harness typo keeps its number across a bounded relative clause',()=>{
  for(const text of ['harnesss which I have previously used are reliable.','These harnesss work.','Harnesss were tested.']){
    assert.equal(check(text).find(f=>f.original.toLowerCase()==='harnesss')?.suggestions[0].toLowerCase(),'harnesses',text);
  }
  for(const text of ['The harness is reliable.','The harnesss which I have used is reliable.','harnesss which I know are popular','harnesses are reliable.'])assert.equal(englishGrammar(text).length,0,text);
  assert.equal(check('`these harnesss`').length,0);
});

test('bounded adjective and perception-verb typos restore their intended words',()=>{
  for(const [text,original,target] of [['do differents things','differents','different'],['Differents options exist.','Differents','Different'],['I notined that it grew.','notined','noticed'],['We recently notined the change.','notined','noticed']]){
    assert.equal(check(text).find(f=>f.original===original)?.suggestions[0],target,text);
  }
  for(const text of ['different things','The Differents performed.','Notined is a name.'])assert.equal(englishGrammar(text).length,0,text);
  for(const text of ['differents things','I notined that it grew.']){
    const finding=englishGrammar(text)[0];
    assert.equal(englishGrammar(text,[[finding.from,finding.to]]).length,0,text);
    assert.equal(englishGrammar(text,[],new Set([finding.original])).length,0,text);
  }
});

test('adverbs retain contraction context and required login actions use the phrasal verb',()=>{
  for(const [text,target] of [['Im mostly using it.',"I'm"],['Im currently working here.',"I'm"],['I have to login multiple times.','log in'],['She needs to login.','log in']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['IM protocol','Im mostly','Go to login settings.','I need a login page.'])assert.equal(englishGrammar(text).length,0,text);
});

test('leasing-person typo and comma-separated list abbreviation keep their intended nouns',()=>{
  for(const [text,target]of [['find a leasee for a domain','lessee'],['TerminalBench, SWE-bench, RepoBench, ect,','etc']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['a lease for a domain','ECT treatment','ect is a variable'])assert.equal(englishGrammar(text).length,0,text);
});

test('typing nouns and established internet names do not become nearby dictionary words',()=>{
  for(const text of ['a touch typer','fast typers','ublock origin','a faang company','Android app modding','insta messages','a modded Minecraft server','improve their skillset','different skillsets','yoga/pilates studios','make a choix'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('teh company').some(f=>f.suggestions[0]==='the'));
});

test('negative modal questions retain the bare verb after a singular subject',()=>{
  for(const modal of ["Wouldn't",'Wouldn’t',"Couldn't","Shouldn't","Can't","Won't","Mightn't","Mustn't","Shan't","Wouldnt","couldnt"]){
    for(const clause of ['it make sense?','he work here?','she often use it?'])assert.equal(englishGrammar(`${modal} ${clause}`).length,0,`${modal} ${clause}`);
  }
  assert.ok(englishGrammar('It make sense.').some(f=>f.suggestions[0]==='It makes'));
  assert.ok(englishGrammar('She often use it.').some(f=>f.suggestions[0]==='uses'));
});

test('unambiguous historical spelling losses retain their intended words',()=>{
  for(const [source,target] of [['anyboby','anybody'],['technicaians','technicians'],['lucious','luscious'],['spoofying','spoofing'],["I wante'd to evaluate it.",'wanted']])assert.ok(check(source).some(f=>f.suggestions[0]===target),source);
  for(const source of ['anybody','technicians','luscious','spoofing',"I'd wanted to evaluate it."])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('bare DOI identifiers retain their suffix while adjacent prose is checked',()=>{
  const text='DOI 10.5281/zenodo.17720830. i have read it.';
  assert.deepEqual(check(text).filter(f=>f.applicable).map(f=>[f.original,f.suggestions[0]]),[['i','I']]);
  assert.equal(check('10.12345/teh').length,0);
  assert.ok(check('teh result').some(f=>f.suggestions[0]==='the'));
});

test('relative that does not imply a singular antecedent',()=>{
  for(const text of ["family forums that don't show on Google", "programs that don't work", "devices that dont run"])assert.equal(check(text).some(f=>f.suggestions[0].includes("doesn't")),false,text);
  for(const text of ["That don't work.","It don't work."])assert.ok(check(text).some(f=>f.suggestions[0]==="doesn't work"),text);
});

test('ordinary contractions and first-person predicates retain narrow clause contexts',()=>{
  for(const [text,target] of [['Im split from my wife.',"I'm"],['Whats the cheapest way to travel?',"What's"],['I understands the problem.','I understand'],['which i wiped clean','I']]){
    assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  }
  for(const text of ['IM protocol','Whats is a label','She understands the problem.','`which i wiped`'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('list abbreviation and coordinated duration clauses repair specific letter errors',()=>{
  for(const [text,target] of [['clean and nice area ect is basic','etc'],['in 2 weeks ant i wanted to book','and']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['ECT is a treatment.','medication, ect','an ant I wanted to draw','ASAB travel insurance'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('complete duration and calendar phrases preserve count modifiers and ordinary adjectives',()=>{
  for(const [text,target] of [['in a few weeks time.',"weeks' time"],['at the end of august for a holiday','August'],['for a 3 days with my son','']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.equal(englishGrammar('for\ta  3 days with my son')[0]?.original,'a  ');
  for(const text of ['in three weeks time zones will change','for a 3 days pass','for a 1 days with my son','the end of august ceremonies'])assert.equal(englishGrammar(text).length,0,text);
});

test('explicit singular noun phrases recover articles and possessives without changing modifiers',()=>{
  for(const [text,target] of [['recommend a travel insurance that covers illness','travel insurance'],['a travelling companions Father',"companion's"],['a toy for child.','a child'],['this is red flag:','a red flag']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['a travel insurance policy','travelling companions arrived','for child care','this is red flag territory'])assert.equal(englishGrammar(text).length,0,text);
});

test('a parenthetical family count does not duplicate the copula',()=>{
  assert.ok(check("We're (2 adults, 2 children) are off to Bali.").some(f=>f.original==="We're"&&f.suggestions[0]==='We'));
  assert.equal(englishGrammar("We're (2 adults, 2 children) off to Bali.").length,0);
  assert.equal(englishGrammar("We're (the adults are ready) going.").length,0);
});

test('new clause repairs respect excluded ranges and personal entries',()=>{
  for(const text of ['Whats the cheapest way?','in a few weeks time.','a travelling companions Father','for a 3 days with my son']){
    const finding=englishGrammar(text)[0];
    assert.ok(finding,text);
    assert.equal(englishGrammar(text,[[finding.from,finding.to]]).length,0,text);
    assert.equal(englishGrammar(text,[],new Set([finding.original])).length,0,text);
  }
});

test('ordinary household clauses recover clear spelling and auxiliary errors',()=>{
  for(const [text,original,target]of [
    ["leaking from it's connection with the pipe","it's",'its'],
    ['We live here since 10 years','We live here since 10 years','We have lived here for 10 years'],
    ['the whol process','whol','whole'],
    ['Laminate is new. Thankd','Thankd','Thanks'],
    ['Does it tries to make a call','tries','try'],
  ])assert.ok(check(text).some(f=>f.original===original&&f.suggestions[0]===target),text);
  for(const text of ["it's connection that matters",'we have to go','we live here','the whole process','Thankd is a name'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.equal(check('`had to got`').some(f=>f.applicable),false);
});

test('first-person pronoun recovery covers complete ordinary verb contexts',()=>{
  for(const text of ['i got this','i wait a week','i send a message','when i doodle'])assert.ok(check(text).some(f=>f.original==='i'&&f.suggestions[0]==='I'),text);
  for(const text of ['i = 2','`i wait`'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('TeX commands and cron preserve identifiers while nearby prose is checked',()=>{
  const text=String.raw`cron jobs use \infty and \frac{recieve}{x}`;
  const findings=check(text);
  assert.equal(findings.some(f=>['cron','infty','frac'].includes(f.original)&&f.applicable),false);
  assert.ok(findings.some(f=>f.original==='recieve'&&f.suggestions[0]==='receive'));
  assert.ok(check('cron recieve').some(f=>f.suggestions[0]==='receive'));
});

test('attested participles and complete clause repairs remain available',()=>{
  assert.equal(check('I am a 23 years old car owner').some(f=>f.original==='a '),false);
  for(const [text,original,target]of [
    ['controling the light','controling','controlling'],
    ["We've build a prototype",'build','built'],
    ['have it setup','setup','set up'],
    ['its obvious that this works','its',"it's"],
    ['I am a 23 years old trying to learn','a ',''],
    ['It seems me that this works','me','to me'],
    ['wrap my mind about the tools','about','around'],
  ])assert.ok(check(text).some(f=>f.original===original&&f.suggestions[0]===target),text);
  for(const text of ['I have build scripts','its obvious features','diffing','vibing'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('reviewed names, identifiers and super compounds preserve their words',()=>{
  for(const text of ['marie curie','typst','args','superfun','superfast'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('superfun recieve').some(f=>f.suggestions[0]==='receive'));
  assert.ok(check('im doing this').some(f=>f.suggestions[0]==="I'm"));
  assert.equal(check('IM protocol').some(f=>f.applicable),false);
});

test('bounded missing function words repair ordinary questions and count phrases',()=>{
  for(const [text,original,target]of [
    ['I am doing a right choice','doing','making'],
    ['There is small amount of loose stitching','small','a small'],
    ['it is quite old project - our goal','old','an old'],
    ['foundations for new type of medical device','new type','a new type'],
    ['thousands test cases','thousands','thousands of'],
    ['too much an angle','an','of an'],
    ['of any beneficial to add','beneficial','benefit'],
    ['There exists pure technical solutions like this','exists','exist'],
    ['Im a junior developer','Im',"I'm"],
  ])assert.ok(check(text).some(f=>f.original===original&&f.suggestions[0]===target),text);
});

test('complete function-word constructions and coordinated subjects stay unchanged',()=>{
  for(const text of ['allow users to disable features','There is a small amount of loose stitching','it is quite an old project','foundations for a new type of device','thousands of test cases','too much of an angle','of any beneficial effect','There exists a technical solution','models and AI tooling are making progress','There exists technical solutions company','gamified learning'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.equal(check('`allow users disable features`').some(f=>f.applicable),false);
});

test('unfamiliar consonant neighbors stay reviewable while attested participles survive',()=>{
  for(const text of ['monoflo','propostas','somfy','lally','proxify','graphene','clojure','booch','larman','muslim','diffing','vibing'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['writting','writing'],['remeber','remember'],['suger','sugar'],['recieve','receive'],['anegdote','anecdote'],['sudpanel','subpanel'],['dimentions','dimensions'],['nothwithstanding','notwithstanding'],['ecoysystem','ecosystem'],['immigrantion','immigration']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('short unknown strings need a grammatical target rather than a rare swapped word',()=>{
  for(const text of ['des','sto','espagnole sauce','foie gras'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['teh','the'],['adn','and']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('foreign parenthetical names are reviewed without English word substitutions',()=>{
  assert.equal(check('milk (leche de chocho), with my indian passport').some(f=>f.applicable),false);
  assert.ok(check('milk (leche de chocho), recieve it').some(f=>f.suggestions[0]==='receive'));
  assert.ok(check('(teh milk)').some(f=>f.suggestions[0]==='the'));
});

test('cultural words stay intact and explicit container and pronoun clauses are repaired',()=>{
  for(const text of ['perform umrah','pani puri','its nothing-to-lose attitude','go out if the fridge fails'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [["its something you can do","it's"],['It it possible to make this','Is it'],['a lot of recipe for pork','recipes']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('technical nouns, acronyms and names retain their identity in lowercase prose',()=>{
  for(const text of ['serializer','serializers','ctypes','oss','india','clodex agents'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check("wev'e been getting").some(f=>f.suggestions[0]==="we've"));
  assert.equal(check('weave been getting').some(f=>f.suggestions[0]==="we've"),false);
});

test('reviewed R67 English misses use local context instead of broad name substitutions',()=>{
  assert.equal(check('We are loking for insurance').find(f=>f.original==='loking')?.suggestions[0],'looking');
  assert.equal(check('I am a helpdeks engineer').find(f=>f.original==='helpdeks')?.suggestions[0],'helpdesk');
  assert.equal(check('Economy 7 Tarriffs').find(f=>f.original==='Tarriffs')?.suggestions[0],'Tariffs');
  assert.equal(check("the one that don't have a turntable").find(f=>f.original==="don't have")?.suggestions[0],"doesn't have");
  assert.equal(englishGrammar('a helpdeks is a name.').length,0);
  assert.equal(englishGrammar('the one that do have is plural.').length,0);
});

test('possessive objects and degree phrases keep their clause meaning',()=>{
  for(const [text,target]of [["rate it's work",'its'],['I’m bit concerned','a bit'],['i decided','I']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ["It's work that matters",'I bit the apple','synology photos'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('known regular inflections and explicitly linked project names keep their identity',()=>{
  for(const text of ['smartphones','gmail','clippy','composable','larkos https://github.com/Okerew/larkos'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('smartphones recieve').some(f=>f.suggestions[0]==='receive'));
});

test('first-person actions and negative modals retain their words',()=>{
  for(const [text,target]of [['i kept updating','I'],['i first read','I'],['i comment here','I'],['i look at it','I'],['wouldnt have',"wouldn't"],['couldnt work',"couldn't"]])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('joined letter labels are not articles and explicit count phrases retain their grammar',()=>{
  for(const text of ['Q&A indicates the answer','A/B equipment','Those where the door opens'])assert.equal(check(text).some(f=>f.type==='grammar'),false,text);
  for(const [text,target]of [['upto 46C','up to'],['a two power strips','two power strips'],['A apple','An apple']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('uppercase entity labels do not become indefinite articles',()=>{
  for(const text of ['Agent A infers the answer','Group A improves','Grade A eggs'])assert.equal(englishGrammar(text).length,0,text);
  for(const text of ['A apple fell.','I bought a apple.'])assert.ok(englishGrammar(text).some(f=>f.suggestions[0].toLowerCase()==='an apple'),text);
});

test('first-person household predicates and negative noun phrases recover contractions',()=>{
  for(const text of ['Im planning a trip','im painting the wall','im replacing some hinges','Im keen to eat chickpeas','im stuck between options','im concerned about it','Im after some help','Im at a dead end','Im the 3rd','im new so bear with me'])assert.ok(englishGrammar(text).some(f=>f.suggestions[0]==="I'm"),text);
  assert.ok(englishGrammar('Ive no idea who designed it').some(f=>f.suggestions[0]==="I've"));
  for(const text of ['IM planning module','Im is a surname','Im painting supplies'])assert.equal(englishGrammar(text).some(f=>["I'm","I've"].includes(f.suggestions[0])),false,text);
});

test('elliptical negative clauses keep the omitted predicate',()=>{
  assert.ok(englishGrammar('I called but he didnt').some(f=>f.suggestions[0]==="didn't"));
  assert.equal(englishGrammar('a label called didnt').length,0);
});

test('passive setup predicates preserve attributive setup nouns',()=>{
  for(const text of ['the clothes airer is setup.','the device was setup in the room'])assert.ok(englishGrammar(text).some(f=>f.suggestions[0]==='set up'),text);
  for(const text of ['This is setup.','This is setup time.','It is setup for the room that takes longest.','the setup is simple'])assert.equal(englishGrammar(text).some(f=>f.suggestions[0]==='set up'),false,text);
});

test('modal advice is repaired only in verb contexts',()=>{
  for(const text of ['if anyone could advice.','Can you advice me?'])assert.ok(englishGrammar(text).some(f=>f.suggestions[0]==='advise'),text);
  for(const text of ['Could advice help?','Could advice on this help?','this is advice for me'])assert.equal(englishGrammar(text).length,0,text);
});

test('singular indefinite perfect clauses preserve inverted questions and mandatives',()=>{
  assert.ok(englishGrammar('if anyone else have had issues').some(f=>f.suggestions[0]==='has'));
  for(const text of ['Could anyone else have had issues?','I require that someone have had experience.'])assert.equal(englishGrammar(text).some(f=>f.suggestions[0]==='has'),false,text);
});

test('singular holiday durations retain their possessive boundary',()=>{
  assert.ok(englishGrammar('on a weeks holiday').some(f=>f.suggestions[0]==="week's"));
  for(const text of ["a week's holiday",'two weeks holiday','the Weeks holiday home'])assert.equal(englishGrammar(text).length,0,text);
});

test('close spelling candidates preserve more of the original prefix',()=>{
  for(const [text,target]of [['suger','sugar'],['colleg','college'],['subtley','subtly'],['continous','continuous'],['unbereable','unbearable']])assert.equal(check(text)[0].suggestions[0],target);
});

test('bounded household clauses recover missing auxiliaries and contextual spellings',()=>{
  for(const [text,target]of [['I a visiting a home','I am'],['panner tikka','paneer'],['the terms contains this part','contain']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['I threw a coffee pot','the panner is ready','the term contains this','I am visiting'])assert.equal(check(text).some(f=>f.type==='grammar'),false,text);
});

test('Latin accents retain the whole token while nearby ASCII typos are checked',()=>{
  for(const text of ["my fiancée's",'café','fiance\u0301e','élève']){
    assert.equal(check(text).some(f=>f.applicable),false,text);
    for(const f of check(text))assert.equal(text.slice(f.from,f.to),f.original);
  }
  assert.ok(check('fiancée recieve').some(f=>f.original==='recieve'&&f.suggestions[0]==='receive'));
});

test('letter labels and construction material names preserve their meaning',()=>{
  for(const text of ['City A and City B','Option A is ready','blueboard and hebel', 'matcha'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('a off brand').some(f=>f.suggestions[0]==='an off'));
});

test('first-person clauses and apostrophes work with intervening adverbs',()=>{
  for(const [text,target]of [['i still use it','I'],['i bought milk','I'],['i just had lunch','I'],['Id like to learn',"I'd"],['I`m sorry',"I'm"],['it wont let me',"won't"],['its broken.',"it's"]])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['its broken arm','as is their wont','`i bought`'])assert.equal(check(text).some(f=>f.type==='grammar'),false,text);
});

test('infinitives retain their grammatical construction',()=>{
  for(const [text,target]of [['I am trying to setup a router','set up'],['I have to spent time','spend']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['access to setup','I used to write C apps',"I'm used to work",'We are used to write reports for the manager','I want to set up a router'])assert.equal(check(text).some(f=>f.type==='grammar'),false,text);
});

test('count expressions and mass nouns retain number and articles',()=>{
  for(const [text,target]of [['I have had couple of bottles','had a couple'],['There has been a few posts','have'],['a 10 yrs old son','10-year-old']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['There has been a few-post increase','There has been a problem','my son is 10 years old','a 10-year-old son'])assert.equal(check(text).some(f=>f.type==='grammar'),false,text);
});

test('explicit foreign sayings keep their quoted language and common nouns survive',()=>{
  for(const text of ["In Tamil, there is a casual saying 'nee kodu potta avan rodu poduvan'.",'an influencer on linux','de facto components','agents with decispher'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check("In English, a phrase 'teh cat'.").some(f=>f.suggestions[0]==='the'));
});

test('common company abbreviation and lexical compound retain meaning',()=>{
  assert.equal(check('a big corp.').some(f=>f.applicable),false);
  assert.ok(check('a house in the country-side').some(f=>f.suggestions[0]==='countryside'));
  assert.ok(check('i knew the answer').some(f=>f.suggestions[0]==='I'));
});

test('CSS resource functions and established computing words stay intact',()=>{
  for(const text of ['background: url("triangle.svg");','model params','hardcode the value'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('graudate student').some(f=>f.suggestions[0]==='graduate'));
});

test('compound hyphens and computing words preserve their identity',()=>{
  for(const text of ['a to-do list','I uninstalled Pi-hole.','control diff inline','an old subdirectory','subnetwork routing'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('models are increasingly stucking in thought').some(f=>f.suggestions[0]==='stuck'));
});

test('relative that preserves agreement with its plural antecedent',()=>{
  for(const text of ['a multitude of concepts that have been created','The tools that have changed','devices that usually have batteries'])assert.equal(check(text).some(f=>f.suggestions[0]==='has'),false,text);
  assert.ok(check('That have changed.').some(f=>f.suggestions[0]==='has'));
  assert.ok(check('It have changed.').some(f=>f.suggestions[0]==='has'));
});

test('complete mass noun phrases and singular clauses retain grammatical context',()=>{
  for(const [text,target]of [['I need a feedback.','feedback'],['Need a genuine advice.','genuine advice'],['much false positives','many'],['it just try to connect','tries'],['that i reached the end','I']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['a feedback loop','a software company','much false information','Does it just try to connect?','They demand that he often work late.'])assert.equal(check(text).some(f=>f.type==='grammar'),false,text);
});

test('relative request targets keep paths and query keys intact',()=>{
  const text='replace /url?q=<encoded url> with /goto?url=<internal identifier>';
  assert.equal(check(text).some(f=>f.applicable),false);
  assert.equal(check('regex patterns').some(f=>f.applicable),false);
  assert.ok(check('teh path').some(f=>f.suggestions[0]==='the'));
});

test('provider names before interface acronyms retain repeated letters',()=>{
  for(const text of ['a Taalas API','the Veera SDK','agentic coding on replit','Marsa Alam','on Qantas','a Taalas service'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('a Taalas API').some(f=>f.original==='Taalas'&&f.type==='unknown'));
  assert.ok(check('Excelllent example').some(f=>f.suggestions[0]==='Excellent'));
  assert.equal(check('a Taalas API',['Taalas']).some(f=>f.original==='Taalas'),false);
});

test('prepositional gerunds and singular count nouns retain their surrounding meaning',()=>{
  for(const [text,target]of [['I look forward to write code.','writing'],['She looks forward to hear it.','hearing'],["I'm newbie here.",'a newbie'],['an new browser tab','a new'],["i couldn't use it.",'I'],["What's your favorite parts of Cocoa?",'What are']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['I look forward to work.','I look forward to travel.','I look forward to play.','I am newbie friendly.',"What's your favorite parts store?"]){
    assert.equal(check(text).some(f=>f.type==='grammar'),false,text);
  }
  assert.equal(check('`I look forward to write code.`').some(f=>f.applicable),false);
});

test('first-person contractions preserve their word and use participle context',()=>{
  for(const [text,target] of [["i'd picked it","I'd"],["i'll go","I'll"],['ive been working',"I've"],['Im having trouble',"I'm"]]){
    const finding=check(text).find(f=>f.from===0);
    assert.deepEqual(finding?.suggestions,[target],text);
    assert.equal(check(text,[finding.original]).some(f=>f.from===0),false);
  }
  assert.equal(check('Ive concert tickets').some(f=>f.suggestions.includes("I've")),false);
});

test('short consonant codes and mixed-case identifiers do not become nearby words',()=>{
  for(const text of ['lvp flooring','SSD NVMe Gen4','aorus motherboard','single atm']){
    assert.equal(check(text).some(f=>f.suggestions.length),false,text);
  }
  for(const [text,target] of [['slighly','slightly'],['teh','the'],['recieve','receive']])assert.ok(check(text).some(f=>f.suggestions.includes(target)),text);
});

test('English grammar candidates repair attested constructions without changing nearby normal prose',()=>{
  for(const [source,target] of [
    ['i am here','I'],['Its fun :D',"It's"],['We can built it','can build'],
    ['Do you have audience?','have an audience'],
    ['Im back at work.',"I'm"],
    ['You can bank couple of those.','bank a couple'],
    ['It wasnt on DOS.',"wasn't"],
    ['It connects to a A/B switched CRT.','an A/B'],
    ['We have a XP box.','an XP'],
    ['These special equipments are old.','equipment'],
    ['It worked perfectly seamless.','seamlessly'],
    ['Few years ago I saw one.','A few years ago'],
    ['We discovered couple of machines.','discovered a couple of'],
    ["There's a few car dealerships here.",'There are a few'],
    ['Instruments that only runs on DOS.','Instruments that only run'],
    ['thats not true',"that's"],
    ['Theres a problem',"There's"],
    ['The service doesnt start.',"doesn't"],
    ['Doesnt this work?',"Doesn't"],
    ['The effort was oaid for.','paid'],
    ['A natual channel.','natural'],
    ['The chinnese government','Chinese'],
    ['They publish news everyday.','news every day'],
    ['I am not devops person.','I am not a devops person'],
    ['There were no firewall.','There was no firewall'],
    ['How did they workout the answer?','did they work out'],
    ["No its not.","No it's not"],
    ['They got access into the system.','got access to'],
    ['The box is a sandbox but agent can send requests.','but an agent'],
    ['If i consider this, it changes.','I'],
    ['That is a dumping grounds.','a dumping ground'],
    ["It let's me choose.",'It lets'],
    ['It happens most of time.','most of the time'],
    ['The agent get tools.','The agent gets'],
    ['Review it before and agent attempts the work.','before an agent'],
    ['It missed lots of important bit.','lots of important bits'],
    ['I merged 10 PR yesterday.','10 PRs'],
    ["It don't need plan mode.","doesn't need"],
    ['I found a implemention.','an implementation'],
    ['It ranks the the values.','the'],
    ["It a paradox.","It's a"],
    ["Its so cheap.","It's so"],
    ['Tuning it make it narrow.','Tuning it makes'],
    ['As i mentioned earlier.', 'I'],
    ['I hope to join in upcoming project.', 'an upcoming project'],
    ['They had to deal with enormous flood of people.', 'an enormous flood'],
    ['I need to get more clarify from the manager.', 'more clarification'],
    ['A error occurred during setup.', 'An error'],
    ['An clearer message would help.', 'A clearer'],
    ['We was linking the project.', 'We were'],
    ['They was ready.', 'They were'],
    ['All the steps has been done.', 'have been done'],
    ['All the files has been saved.', 'have been saved'],
    ["It don't login to the service.","doesn't log in"],
    ["It don't work on Linux.","doesn't work"],
    ['It will breaked at startup.', 'will break'],
    ["It's happens often.",'It happens'],
    ['It only have one option.', 'has'],
    ['She herself have watched it.', 'has'],
    ["She doesn't has a book.","doesn't have"],
    ['Did she has a big family?', 'have'],
    ['The page loads millions of URL each day.', 'millions of URLs'],
    ['He thinks he is a expert.', 'an expert'],
    ['The service includes an "takeout" feature.', 'a "takeout'],
    ["Its a paid add-on.","It's"],
    ["I think its been useful.","it's"],
    ['This will make it sounds better.','make it sound'],
    ['This has changed in past 10 years.','in the past 10 years'],
    ['There is several users online.','There are'],
    ['They seems ready.','They seem'],
    ['You needs more space.','You need'],
    ['It switch off automatically.','It switches off'],
    ['She work on Tuesdays.','She works on'],
    ['They will came tomorrow.','will come'],
    ["It didn't worked.","didn't work"],
    ['We checked every devices.','every device'],
    ['I have went back.','have gone'],
    ['She has wrote a guide.','has written'],
    ['Its reached the limit.',"It's reached"],
    ['Its changed the status.',"It's changed"],
  ])assert.ok(check(source).some(f=>f.type===(['paid','natural','Chinese'].includes(target)?'spelling':'grammar')&&f.suggestions.includes(target)),source);
  for(const source of [
    'I am here. We can build it.', 'I wonder what you will do next.',
    'Its fun factor is high.', 'She has hundreds of users.',
    'The girl who is primary on the team arrived.',
    "It's important to protect its account. Your going to school helped.",
    'She reigned in France. I have a couple of those.',
    '`i can built` is a code sample.',
    'Few years passed before I saw one.',
    "There's a few minutes left.",
    'She is imminently leaving. The reign of a king ended.',
    'They shipped a few pieces of equipment.',
    "I trust the AI's work. Everyday problems need solutions.",
    'A physical workout is useful. They will work out the details.',
    "It's a useful tool. Its tool use is restricted.",
    'He has an absolute love of music. The grounds are large.',
    "The LLM's output is useful. It's basically useless otherwise.",
    'Should we be worried? I mentioned it. Two URLs were saved.',
    'An expert built a takeout feature. The team finished the task.',
    "It's a useful addition. Its benefits have been clear in the past 10 years.",
    "The service doesn't start. Doesn't this work?",
    'Can I get a technical report? In an upcoming project, we will travel.',
    'They had to deal with an enormous flood of people. This luggage contains spare clothes.',
    'I am interested in upcoming project management roles.',
    'Please clarify more details with the manager.',
    'An error occurred. A clearer message would help.',
    'A European user left a comment. A one-time code is valid.',
    'An hour passed. An MBA graduate answered.',
    'We were linking the project. They were ready.',
    'All the steps of the process have been done.',
    'All the steps of the process that he has been reviewing are clear.',
    "It doesn't log in. It doesn't work on Linux.",
    'Our app will break at startup. Our app has broken before.',
    "It's displayed on screen. It's happened before. It displays release notes.",
    'It only has one option. The app has many options.',
    'Did she have a big family? Can she have a book? Does she have the book?',
    'Did she herself have a chance? She herself has watched it.',
    "She doesn't have a book. Did she have a big family?",
    'He is one of my friends. One of his notable works is on display.',
    'One of the work emails is missing. One of the best university students won.',
    'There is many a reason to wait. There are several users online.',
    'They seem ready. You need more space. She works on Tuesdays.',
    'Did it work? Make it work. I saw it switch on. The IT switch works.',
    'Tuning it makes it narrow. This work matters.',
    'Does API really use this format? The app did not work.',
    'One question remains. Every device runs. Every two devices share a bus. We are one people.',
    'I have gone back. She has written a guide.',
    'Its reached limit is documented. Its changed settings are saved.',
  ])assert.equal(check(source).filter(f=>f.type==='grammar').length,0,source);
});

test('reviewed English words and names are recognized without granting arbitrary unknown words',()=>{
  for(const word of ['minecraft','railgun','randomisation','etc','NDAs','cm','dxf','Pareto','decompiled','subfunctions','Voxile','non-technical','internet','runtime','schelling','Ayn','re-add','re-use','carry-on','systemd','RSS','woulda','dem','non-programmers','SPSS','numpy','coursework','xlookup','multivalue','scrollbars','normalisation','rtmp','config','restreaming','DuckDNS','ints','initializers','png','sudo','pkg','yaml']){
    assert.equal(check(word).some(f=>f.applicable),false,word);
  }
  assert.equal(check('custome languages').find(f=>f.original==='custome')?.suggestions[0],'custom');
  assert.ok(check('recieve the file').some(f=>f.suggestions.includes('receive')));
  assert.ok(check('quorkle').some(f=>f.type==='unknown'));
  for(const source of ['Claude models','Norway','Stephen','Astra','LLMs','APIs','non-obvious','Re-stating'])assert.ok(!check(source).some(f=>f.applicable),source);
  assert.equal(check('re-recieve')[0]?.type,'unknown');
});

test('English agreement repairs first-person predicates and preserves licensed base forms',()=>{
  for(const [source,target] of [
    ['i connects to the network.','I connect'],
    ['I has a spare cable.','I have'],
    ['They connects two devices.','They connect'],
    ['She work at home.','She works'],
    ['It still have a chance.','has'],
  ])assert.ok(check(source).some(f=>f.type==='grammar'&&f.suggestions.includes(target)),source);
  for(const source of [
    'Let it have a chance. Make it have the same color.',
    "Don't let it have access. I watched it have trouble.",
    'I suggest that she work at home. We recommend he have a spare cable.',
    'I insisted that he have a chance. They requested that she open the door.',
    'It is essential that it have enough space. The requirement that it work remains.',
    'Can she herself have a chance? Does it still have a chance?',
  ])assert.equal(check(source).filter(f=>f.type==='grammar').length,0,source);
});

test('English predicate context distinguishes its and setup from valid noun phrases',()=>{
  for(const [source,target] of [
    ["If its possible.","it's"],
    ["Its available.","It's"],
    ['Then I setup the server.','set up'],
    ['I will setup the server.','set up'],
  ])assert.ok(check(source).some(f=>f.type==='grammar'&&f.suggestions.includes(target)),source);
  for(const source of [
    'Its possible uses are varied. Its available space is limited.',
    'Its ready meals are popular. If it is possible, call me.',
    'My setup works. The setup process is quick. Go to setup.',
    'The I setup is ready. We set up the server. I need a setup guide.',
  ])assert.equal(check(source).filter(f=>f.type==='grammar').length,0,source);
  // Tense is unresolved after a bare singular subject, so do not offer a
  // partial repair that leaves present-tense subject agreement wrong.
  for(const source of ['She setup the server every day.','She setup the server yesterday.']){
    assert.equal(check(source).some(f=>f.suggestions.includes('set up')),false,source);
  }
});

test('singular agreement requires a subject boundary across direct adverb and have paths',()=>{
  for(const text of ['We call it work.','We deem it work.','We stipulated he often work remotely.','We stipulated she have a backup.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target] of [['It work.','It works'],['She often work remotely.','works'],['She have a backup.','has']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('Id contractions require a first-person preference clause',()=>{
  for(const text of ['Use an Id like 1234 for this record.','Choose the Id rather than the name.','Id like 1234 identifies the record.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const text of ['Id like to learn.','Id prefer to wait.', 'Id rather stay.'])assert.ok(check(text).some(f=>f.suggestions[0]==="I'd"),text);
});

test('month capitalization preserves may and march as words and commands',()=>{
  for(const text of ['Compare the start of may and must clauses.','Compare the end of march and halt commands.','Compare the beginning of may with must.','Compare the middle of march with halt.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('At the end of february.').some(f=>f.suggestions[0]==='February'));
});

test('bare domains, email addresses and identifiers protect only their own spans',()=>{
  const source='recieve at scratch.mit.edu then recieve from didnt+recieve@exampl.net; didnt_count is a key.';
  const findings=check(source).filter(f=>f.applicable);
  assert.deepEqual(findings.map(f=>f.original),['recieve','recieve']);
  assert.ok(findings.every(f=>f.suggestions[0]==='receive'));
});

test('productive English prefixes retain known bases without accepting misspelled bases',()=>{
  for(const source of ['unspaced text','micropip','nonspatial','precompiled','co-parenting','gemini','todo lists']){
    assert.equal(check(source).some(f=>f.applicable),false,source);
  }
  assert.equal(check('re-recieve')[0]?.type,'unknown');
  for(const [source,target] of [['tommorow','tomorrow'],['accomodation','accommodation'],['definitly','definitely'],['custome','custom']]){
    assert.equal(check(source)[0]?.suggestions[0],target,source);
  }
});

test('an explicit cultural gloss preserves the unfamiliar term and nearby typo checks',()=>{
  const source='My nani (maternal grandmother) will recieve the file.';
  assert.deepEqual(check(source).find(f=>f.original==='nani')?.suggestions,[]);
  assert.equal(check(source).find(f=>f.original==='recieve')?.suggestions[0],'receive');
  assert.equal(check('Please recieve (the file).').find(f=>f.original==='recieve')?.suggestions[0],'receive');
});

test('missing negative apostrophes need verb context and never become unrelated dictionary words',()=>{
  for(const [source,target] of [['I didnt read it.',"didn't"],['They didnt really want it.',"didn't"],['Didnt she see it?',"Didn't"]]){
    assert.equal(check(source).find(f=>f.original.toLowerCase()==='didnt')?.suggestions[0],target,source);
  }
  assert.deepEqual(check('didnt')[0]?.suggestions,[]);
  assert.equal(check('didnt_count').some(f=>f.applicable),false);
});

test('a perfect auxiliary distinguishes a mistyped done from negative dont',()=>{
  for(const text of ['what have i dont and what','I have dont it','what has she already dont?'])assert.equal(check(text).find(f=>f.original==='dont')?.suggestions[0],'done',text);
  for(const text of ['I dont know','They dont have it'])assert.equal(check(text).find(f=>f.original==='dont')?.suggestions[0],"don't",text);
  assert.equal(check('I have dont it',['dont']).some(f=>f.original==='dont'),false);
});

test('weak nearby words need stronger evidence than short or two-substitution distance alone',()=>{
  const smallCheck=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['microbic','cat','eth','the','tomorrow','tommyrot']});
  for(const source of ['micropip','cato'])assert.deepEqual(smallCheck(source)[0]?.suggestions,[],source);
  assert.equal(smallCheck('teh')[0]?.suggestions[0],'the');
  assert.equal(smallCheck('tommorow')[0]?.suggestions[0],'tomorrow');
});


test('own after it is can begin a cleft focus rather than establish possession',()=>{
  for(const text of ["It's own goals that decide close matches.","It's own brands that the retailer promotes."])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('numbered classifications require quantity evidence before pluralizing acronyms',()=>{
  for(const text of ['The service is a Level 2 API.','The model is a Tier 3 LLM.','This is a Level 2 PR.','We use a Category 4 URL.','We expose the Level 2 API.','We expose Level 2 API.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target] of [['We use 2 API.','2 APIs'],['I merged 10 PR yesterday.','10 PRs']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('an ing form after I a may modify a noun rather than form a progressive predicate',()=>{
  for(const text of ['I a visiting professor at university.','I a working parent.','I a planning engineer.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('I a visiting a home.').some(f=>f.suggestions[0]==='I am'));
});

test('this and that after an auxiliary can be determiners before plural modifiers',()=>{
  for(const text of ['Does this works council meet monthly?','Does that needs assessment cover costs?','Did this works council meet yesterday?'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('Did she went home?').some(f=>f.suggestions[0]==='go'));
});

test('country abbreviations can jointly modify a later head noun',()=>{
  for(const text of ['It applies in UK and EU law.','It applies in UK and EU markets.','They operate in UK, EU and US markets.','It applies in UK (and EU) law.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We live in UK.').some(f=>f.suggestions[0]==='the UK'));
});

test('count article removal preserves capitalized titles and following noun heads',()=>{
  for(const text of ['We watched a Two Doors Down episode.','We discussed a Three Windows project.','We watched a two doors down episode.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('I bought a two power strips.').some(f=>f.suggestions[0]==='two power strips'));
});

test('prepositional i identifiers are preserved by token and phrase capitalization paths',()=>{
  for(const text of ['Values of i find applications in signal processing.','The value of i works in this equation.','Expressions with i have several uses.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('i find this useful.').some(f=>f.original==='i'&&f.suggestions[0]==='I'));
});

test('time of can be a technical phrase rather than a missing temporal article',()=>{
  for(const text of ['The discussion revolves around time of flight.','The report is organized around time of arrival.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('you before an apparent finite verb can be an indirect object before a plural noun',()=>{
  for(const text of ['The museum shows you works from its collection.','The guide gives you examples and shows you works.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('You needs more space.').some(f=>f.suggestions[0]==='You need'));
});

test('implementation repairs retain article casing',()=>{
  for(const [text,target] of [['A implemention failed.','An implementation'],['A IMPLEMENTION FAILED.','AN IMPLEMENTATION'],['I found a implemention.','an implementation']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('softwares is only singularized after a compatible noun quantifier',()=>{
  for(const text of ['The vendor softwares each device before shipping.','That company softwares the equipment.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const text of ['We need some softwares.','We tried all the softwares.'])assert.ok(check(text).some(f=>f.suggestions[0]==='software'),text);
});

test('need of repairs preserve an inverted question subject',()=>{
  for(const text of ['Is it need of maintenance?','Was it need of repair?','Why is it need of repair?'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('The device is it need of repair.').some(f=>f.original==='it'&&f.suggestions[0]==='in'));
});

test('coordinated pronouns retain plural agreement across singular repair paths',()=>{
  for(const text of ['He and she work remotely.','He and she often work remotely.','He and she have arrived.',"He and she don't work remotely.",'Alice and he work remotely.','He and only she have arrived.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('She work remotely.').some(f=>f.suggestions[0]==='She works'));
});

test('terms in a prepositional modifier does not control the main predicate',()=>{
  for(const text of ['A glossary of terms contains this definition.','A list of terms contains the answer.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('The terms contains this part.').some(f=>f.suggestions[0]==='contain'));
});

test('that clauses preserve possible mandative base verbs without listing governors',()=>{
  for(const text of ['It is imperative that he work remotely.','The policy asks that she use encryption.','We stipulated that it have a backup.','It is crucial that he often work remotely.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('He work remotely.').some(f=>f.suggestions[0]==='He works'));
});

test('all the head agreement does not cross a zero-relative clause inside a modifier',()=>{
  for(const text of ['All the tests for the software Alice has been developing have been completed.','All the files for the application Bob has been testing are ready.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('All the tests has been completed.').some(f=>f.suggestions[0]==='have been completed'));
});

test('OAID capitalization preserves an acronym rather than a paid typo',()=>{
  for(const text of ['OAID is used as an advertising identifier.','The OAID value is stored.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('The effort was oaid for.').some(f=>f.suggestions[0]==='paid'));
});

test('warrantee remains a recipient noun in prepositional phrases',()=>{
  for(const text of ['The asset remains under warrantee control.','We keep it in warrantee custody.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('The car is under warantee.').some(f=>f.suggestions[0]==='warranty'));
});

test('a noun phrase ending in can is not proof of a modal construction',()=>{
  for(const text of ['The trash can broke yesterday.','The metal can was empty.','Our trash can came apart.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We can built it.').some(f=>f.suggestions[0]==='can build'));
});

test('have can take objects with noun and adjective forms that resemble past verbs',()=>{
  for(const text of ['We have saw blades and drill bits.','The shop has saw blades on sale.','We have spoke wheels in stock.','We have broke friends.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('She has wrote a guide.').some(f=>f.suggestions[0]==='has written'));
});

test('do support does not leave mismatched subject and auxiliary agreement',()=>{
  for(const text of ['Do it works?','Does they works?','Does I works?',"He don't works.",'Do the agent works?','Does the users works?','Do API uses this format?','Do John works?','Do the child works?'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('Did she went home?').some(f=>f.suggestions[0]==='go'));
});

test('every does not singularize an attributive plural',()=>{
  for(const text of ['Every systems engineer must attend.','Every accounts manager must attend.','Every systems-related request matters.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We checked every devices.').some(f=>f.suggestions[0]==='every device'));
});

test('open and close can be object predicates after varied governing verbs',()=>{
  for(const text of ['I found it open.','We prefer it open.','I found it close to the house.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It open every day.').some(f=>f.suggestions[0]==='It opens'));
});

test('uppercase IT is a noun modifier rather than the object pronoun it',()=>{
  for(const text of ['We have IT setup guides.','They had IT setup fees.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We have it setup.').some(f=>f.suggestions[0]==='set up'));
});

test('it is can introduce cleft clauses before apparent possessive nouns',()=>{
  for(const text of ["It's account settings that cause the problem.","It's users who need help."])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('acronym possessives can refer to an omitted plural head',()=>{
  for(const text of ["The human's answers are detailed, but the AI's are terse.","Our processors have failed, but the GPU's have survived.","My copies exist, but the LLM's exist only online."])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('special article repairs respect labels and uppercase acronyms',()=>{
  for(const text of ['We requested a Model A expert review.','We use the AN tool.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('He is a expert.').some(f=>f.suggestions[0]==='an expert'));
  assert.ok(check('An tool is ready.').some(f=>f.suggestions[0]==='A tool'));
});

test('made can end a relative clause before the finite verb threw',()=>{
  assert.equal(check('The robot he made threw a coffee pot at the wall.').some(f=>f.applicable),false);
});

test('everyday can modify the subject of a following relative clause',()=>{
  for(const text of ['We publish news everyday people can use.','We publish news everyday readers enjoy.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('They publish news everyday.').some(f=>f.suggestions[0]==='news every day'));
});

test('loose can describe releasing minds rather than losing them',()=>{
  assert.equal(check('The sorcerers loose their minds into the network.').some(f=>f.applicable),false);
});

test('it a can be an object complement rather than a clause missing is',()=>{
  for(const text of ['We call it a model.','They consider it a problem.','They call it a (useful) model.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It a paradox.').some(f=>f.suggestions[0]==="It's a"));
});

test('Agent casing can identify a proper name after but',()=>{
  for(const text of ['The desktop is stable, but Agent can still crash.','It works, but Agent has limits.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It works, but agent can send requests.').some(f=>f.suggestions[0]==='but an agent'));
});

test('child can modify a shared head after coordination or parentheses',()=>{
  for(const text of ['This guidance is intended for child, adolescent, and adult readers.','This is for child (and adult) readers.','This is for child-friendly readers.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('A ticket for child.').some(f=>f.suggestions[0]==='a child'));
});

test('marginal amount can modify a following head noun',()=>{
  for(const text of ['We use marginal amount calculations.','The model can provide marginal amount estimates.','We use marginal amount (rather than total amount) calculations.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We need marginal amount.').some(f=>f.suggestions[0]==='need a marginal amount'));
});

test('plural grounds can modify a compound noun',()=>{
  for(const text of ['The campus hired a training grounds manager.','It is a testing grounds-related role.','They need a training grounds (and facilities) manager.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('That is a dumping grounds.').some(f=>f.suggestions[0]==='a dumping ground'));
});

test('if retains conditional meaning across punctuation and parenthetical phrases',()=>{
  for(const text of ['Take it out if the fridge, which is old, starts leaking.','Pull it out if the freezer (the old one) stops working.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('existential agreement requires a completed plural head rather than a quantifier-like modifier',()=>{
  for(const text of ['There is multiple sclerosis in the family history.','There is many-valued logic here.','There is multiple (rather than single) inheritance here.','There is several users documentation here.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('There is several users online.').some(f=>f.suggestions[0]==='There are'));
});

test('seamless can modify a following noun instead of the preceding verb',()=>{
  for(const text of ['It runs perfectly seamless animations.','They run perfectly seamless transitions.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,original,target] of [['It runs perfectly seamless.','seamless','seamlessly'],['It WORKS perfectly SEAMLESS.','SEAMLESS','SEAMLESSLY'],['It worked perfectly Seamless.','Seamless','Seamlessly']]){
    const finding=check(text).find(f=>f.original===original);
    assert.equal(finding?.suggestions[0],target,text);
    assert.equal(finding?.from,text.indexOf(original),text);
    assert.equal(finding?.to,text.indexOf(original)+original.length,text);
  }
});

test('declared identifiers retain lowercase i across capitalization paths',()=>{
  for(const text of ['The variable i got incremented on every iteration.','The counter i should remain constant.','The index i got reset.','The parameter i may be negative.','The variable named i got incremented.','The counter called i should remain constant.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('i got the message.').some(f=>f.original==='i'&&f.suggestions[0]==='I'));
});

test('Time can be a proper name after most of',()=>{
  assert.equal(check("Most of Time magazine's archive is online.").some(f=>f.applicable),false);
  assert.ok(check('It happens most of time.').some(f=>f.suggestions[0]==='most of the time'));
});

test('bit can modify the head noun of a plural quantity phrase',()=>{
  for(const text of ['lots of important bit fields','lots of important bit flags'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It missed lots of important bit.').some(f=>f.suggestions[0]==='lots of important bits'));
});

test('cant can be a transitive verb even after a subject pronoun',()=>{
  for(const text of ['They cant work surfaces by five degrees.','We cant work tables toward the drain.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('in same price does not establish a complete preposition and article repair',()=>{
  for(const text of ['Both stores sell it in same price.','They compete in same price range.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It sold for same price.').some(f=>f.suggestions[0]==='the same price'));
});

test('to treated can describe a transition between states',()=>{
  assert.equal(check('The status changed from untreated to treated as therapy progressed.').some(f=>f.applicable),false);
});

test('who is before primary does not establish possession',()=>{
  for(const text of ["Who's primary contributors to this project?","Who's primary role in the production?"])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('imminently retains temporal meaning before degree expressions',()=>{
  for(const text of ['The issue will become imminently more important.','The task will be imminently less important.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('sophisticated to we does not establish an inverted question',()=>{
  assert.equal(check('It looks sophisticated to we beginners.').some(f=>f.applicable),false);
});

test('coordinated tooling noun phrases retain plural agreement through modifiers',()=>{
  for(const text of ['Our compilers and all of the developer tooling are making builds faster.','The servers and our software tooling are getting faster.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('a one-word feedback verb is not normalized solely from modal context',()=>{
  for(const text of ['Participants can feedback observations to the facilitator.','They could feedback results to the group.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('large quantities do not pluralize acronym modifiers',()=>{
  for(const text of ['hundreds of API requests','thousands of URL links','millions of LLM tokens','hundreds of API gateways','20 API gateways'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We use hundreds of API.').some(f=>f.suggestions[0]==='hundreds of APIs'));
});

test('do support requires an identified subject in positive and negative clauses',()=>{
  for(const text of ['Did works by Monet sell at auction?','Do works by Monet sell well?','Does work interest you?',"Don't works by Monet sell at auction?","Why don't works by Monet sell?"])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target] of [['Did she went home?','go'],["She doesn't has a book.","doesn't have"]])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('got after have to does not determine get or go',()=>{
  for(const text of ['You have to got access first.','We had to got permission.','They have to got to the station.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('a participle after a modal does not determine an omitted copula',()=>{
  for(const text of ['Should we prepared the report?','Could they prepared dinner?','Can we ready the room?'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('a repeated article spelling can instead name an uppercase acronym',()=>{
  for(const text of ['We implemented the THE protocol.','We selected an AN module.','We selected a A label.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It ranks the the values.').some(f=>f.suggestions[0]==='the'));
});

test('once can introduce a temporal clause before a noun modifier',()=>{
  for(const text of ['Once case review begins, no edits are allowed.','Once case selection finishes, work begins.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('through can end a relative clause before a main predicate',()=>{
  for(const text of ['The tunnel we drove through is many miles long.','The road we passed through is many years old.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('an article before LLMs output does not establish the number of owners',()=>{
  assert.equal(check('an LLMs output synthesized from all three systems').some(f=>f.applicable),false);
});

test('inverted auxiliary questions can refer to the variable i',()=>{
  for(const text of ['Does i denote the row index?','Can i be negative in this equation?','Does i mean the index?','Can i have a negative value?'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('i bought milk.').some(f=>f.original==='i'&&f.suggestions[0]==='I'));
});

test('reigned retains a figurative subject and location meaning',()=>{
  for(const text of ['Fear reigned in her emotions.','Chaos reigned in their behavior.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('rather can qualify a statement without expressing would rather preference',()=>{
  for(const text of ['I rather have the impression that the result is wrong.','I rather think the answer is clear.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('allow can take a noun object without a to infinitive',()=>{
  for(const text of ['The policy allows users access to their records.','The library allows us use of its records.','They allow users change without penalty.','The policy allows users delete permissions.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('such does not require another article after a determiner',()=>{
  for(const text of ['There is no such tool.','I have never seen any such tool.','We need one such feature.','We want another such app.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('one can be a pronoun followed by a finite verb',()=>{
  for(const text of ['One questions the premise.','One reports the result.','One models the process.','One answers the questions.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('We checked every devices.').some(f=>f.suggestions[0]==='every device'));
});

test('mass noun subjects retain licensed base verbs and other nouns need not be subjects',()=>{
  for(const text of ['It is essential that this equipment have a backup.','We require that this information have a source.','Does this luggage have a tag?','The students in Mathematics have a project.','The records for this equipment have serial numbers.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('have can introduce setup as a noun modifier',()=>{
  for(const text of ['I have setup experience.','We have setup instructions.','They have setup fees.','She had setup costs.','I have setup this week.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('hundreds can be countable scores or banknotes',()=>{
  for(const text of ['He scored a few hundreds.','The wallet contained a few hundreds.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('cants can be plural structural nouns rather than a negative contraction',()=>{
  for(const text of ['The cants go along the roof edges.','These cants work as braces.','How does cant work?' ])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('their can determine a noun with a been compound modifier',()=>{
  for(const text of ['They have their been-there-done-that stories.','Those experiences have their been-there-before quality.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('advices can name commercial notices',()=>{
  assert.equal(check('The bank sent three remittance advices.').some(f=>f.applicable),false);
});

test('one of can refer to a singular collective noun',()=>{
  for(const text of ['One of the team is absent.','She is one of the team who handles support.','He is one of the company.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('firewall agreement requires a completed noun phrase and preserves casing',()=>{
  for(const text of ['There were no firewall rules configured.','There were no firewall exceptions.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('There were no firewall.').some(f=>f.suggestions[0]==='There was no firewall'));
});

test('counted PR modifiers stay singular before their head nouns',()=>{
  for(const text of ['We completed 2 PR reviews.','We received 2 PR approvals.','We completed 2 PR checks.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('I merged 10 PR yesterday.').some(f=>f.suggestions[0]==='10 PRs'));
});

test('would rather licenses a bare verb after its subordinate subject',()=>{
  for(const text of ["I'd rather it work offline.",'I would rather it have a blue border.','She would rather he take the train.',"We’d rather she run the tests."])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It work offline.').some(f=>f.suggestions[0]==='It works'));
});

test('a plural question object does not control does agreement',()=>{
  for(const text of ['Which models does the API support?','What exceptions does it allow?','Which users does she know?'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('agent predicates retain licensed bare infinitives',()=>{
  for(const text of ['Does the agent get tools?','Can an agent get access?','I watched the agent get tools.',"I'd rather the agent get access."])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('The agent get tools.').some(f=>f.suggestions[0]==='The agent gets'));
});

test('worst retains superlative compound and object meanings',()=>{
  for(const text of ['These servers get worst-case latency under load.','These jobs get worst-case performance.','They get worst results at night.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('short time can modify a plural head rather than complete a duration phrase',()=>{
  for(const text of ['The jobs complete in short time intervals.','The jobs run in short time windows.','They run in short time periods.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('It finished in short time.').some(f=>f.suggestions[0]==='in a short time'));
});

test('modal spelling repairs require a subject before the modal rather than a possible name',()=>{
  for(const text of ['Will went home yesterday.','May came with us.','Will broke the record.','May built the house.','Our friend Will went home.','Her friend May came with us.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target] of [['We can built it.','can build'],['She will went home.','will go']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('where can introduce a relative clause after those',()=>{
  assert.equal(check('Those where the plastic kind and the metal kind were separated were cheaper.').some(f=>f.applicable),false);
});

test('using can refer to a relative clause antecedent without an extra object',()=>{
  for(const text of ['The technique I tried using to generate images worked.','This is the model we tried using to generate text.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('chip and board can begin article-free technical phrases',()=>{
  for(const text of ['We transitioned into chip and PIN in 2006.','The system moved into board to board communication.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('a plural noun in a modifier does not control the main auxiliary',()=>{
  for(const text of ['A report on devices has arrived.','The quality of results has improved.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('a past participle can introduce a reduced relative clause',()=>{
  for(const text of ['Battles in history won by smaller armies are fascinating.','Games in history won by our team are memorable.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('sue retains its legal meaning before model names',()=>{
  assert.equal(check('The plaintiffs may sue GPT models as defendants.').some(f=>f.applicable),false);
});

test('a final question mark does not make an earlier nominal clause a direct question',()=>{
  assert.equal(check("What you will do next is up to you, isn't it?").some(f=>f.applicable),false);
});

test('ambiguous noun and verb forms do not determine an it contraction repair',()=>{
  for(const text of ["It's displays are bright.","It's loads are heavy.","It's starts are slow."])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target] of [["It's happens often.",'It happens'],["It's seems fine.",'It seems'],["It's appears on screen.",'It appears']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

test('lifes does not force a plural when a possessive could be intended',()=>{
  assert.equal(check('His lifes work changed the field.').some(f=>f.applicable),false);
});

test('around can be an adverb followed by a separate approximate-time preposition',()=>{
  for(const text of ['We drove around around noon.','They looked around around lunchtime.','We walked around around the time the shop closed.'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('possessive determiners retain participial modifiers and gerund clauses',()=>{
  for(const text of ['We inspect its running code.','Its working well surprised me.','Your going to be late worries me.','I resent your going to be late.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('Its broken.').some(f=>f.suggestions[0]==="It's"));
});

test('ate keeps noun objects whose spelling ends in ing',()=>{
  for(const text of ['They ate pudding.','They ate something.','They ate walking tacos.'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('They was eating pudding.').some(f=>f.suggestions[0]==='They were'));
});

test('historical prose restores bounded contractions, repeated words and function words',()=>{
  for(const [text,target]of [['i ever made it','I'],['i own it','I'],['Im creating a tool',"I'm"],['Im Looking for ideas',"I'm"],['I an seeing it','I am'],['a AI tool','an'],['a ML team','an'],['an year','a'],['an YC company','a'],['how to setup','set up'],['asked Google to backup my photos','back up'],['a fortnights time',"fortnight's"],['Whats the legal status?',"What's"],['Lets say',"Let's"],['looking advice','for advice'],['I have have an answer',''],["we've book flights",'booked'],['for same price','the same price']])assert.ok(englishGrammar(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['Agent A AI model','a SQL query','a UK company','an API tool','want access to setup','their children have been here','looking advice up online','we have book covers','a spyware detector','cant is a word','the setup process']){
    assert.equal(englishGrammar(text).length,0,text);
  }
});

test('complete noun phrases recover articles while noun modifiers keep their structure',()=>{
  for(const [text,target]of [['I am fresh graduate working here','a fresh graduate'],['with separate answer to each question','a separate answer'],['survived test of time','the test of time'],['here in UK.','the UK']])assert.ok(englishGrammar(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['we are fresh graduate recruiters','with separate answer sheets','will be default settings','in UK law','in UK schools'])assert.equal(englishGrammar(text).length,0,text);
  const text='a AI tool';assert.equal(englishGrammar(text,[[0,text.length]]).length,0);assert.equal(englishGrammar(text,[],new Set(['a'])).length,0);
});


test('need of after a copula repairs the preposition while finite need still agrees',()=>{
  for(const text of ["It's it need of repair.",'They are it need of help.','It is IT  need of help.']){
    const finding=englishGrammar(text).find(f=>f.suggestions[0]==='in');
    assert.ok(finding,text);
    assert.equal(text.slice(finding.from,finding.to).toLowerCase(),'it');
    assert.equal(englishGrammar(text).some(f=>f.suggestions[0].includes('needs')),false,text);
  }
  assert.ok(englishGrammar('It need tools.').some(f=>f.suggestions[0]==='It needs'));
  assert.equal(englishGrammar("It's in need of repair.").length,0);
});


test('context chooses warranty and finite forms before lexical neighbors',()=>{
  for(const [text,target]of [['I have showin it.','shown'],['The car is under warantee.','warranty'],['It is in warentee.','warranty'],['a van thats now sits parked','that'],['I belive this works.','believe']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  for(const text of ['That is a warrantee.','I have shown it.','a van that now sits parked'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.ok(check('Thats a nice car.').some(f=>f.suggestions[0]==="That's"));
});

test('progressive colloquial endings and attested terms preserve their meaning',()=>{
  for(const text of ['I am givin it.','she aint givin me Da remote.','overspeeding','from carsa'])assert.equal(check(text).some(f=>f.applicable),false,text);
  for(const [text,target]of [['I was readin about it.','reading'],['I am lookin for it.','looking'],['moral comapss','compass'],['an optitician','optician'],['I proofreaded it.','proofread']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
});

const applicable=text=>check(text).filter(f=>f.applicable);
const byOriginal=(text,original)=>applicable(text).find(f=>f.original===original);

test('check-in terminal noun is not changed into a progressive verb',()=>{
  assert.equal(byOriginal('self checkin terminals','checkin'),undefined);
  assert.equal(byOriginal('self checkin terminals','checking'),undefined);
  assert.equal(applicable('self checkin terminals; teh sign is broken').find(f=>f.original==='teh')?.suggestions[0],'the');
  assert.equal(applicable('I am checking the terminals.').some(f=>f.original==='checking'),false);
});

test('the intended participle outranks an unrelated weekend candidate',()=>{
  assert.equal(byOriginal('corroded but not seriusly weakend','weakend')?.suggestions[0],'weakened');
  assert.equal(byOriginal('The metal was seriously weakend.','weakend')?.suggestions[0],'weakened');
  assert.equal(byOriginal('We had a great weakend.','weakend')?.suggestions[0],'weekend');
  assert.equal(applicable('The weekend was quiet.').some(f=>f.original==='weekend'),false);
  assert.equal(byOriginal('The rail is seriously weakened.','weakened'),undefined);
});

test('sound-making context selects noises over notices',()=>{
  assert.equal(byOriginal('making these noices','noices')?.suggestions[0],'noises');
  assert.equal(byOriginal('making these noises','noises'),undefined);
  assert.equal(byOriginal('making these notices available','notices'),undefined);
});

test('French idiom is protected by phrase context while English errors nearby remain actionable',()=>{
  const text='homme des lettres and teh letters';
  assert.equal(applicable(text).some(f=>['homme','des','lettres'].includes(f.original)),false);
  assert.equal(applicable(text).find(f=>f.original==='teh')?.suggestions[0],'the');
  assert.equal(applicable('The letters are in the envelope.').some(f=>f.original==='letters'),false);
});

test('through is restored in the history-of-attempts context, without touching valid forms',()=>{
  assert.deepEqual(byOriginal('attempts throught history to generate code','throught')?.suggestions,['through','throughout']);
  for(const text of ['attempts through history to generate code','attempts throughout history to generate code','I thought about history.'])
    assert.equal(applicable(text).length,0,text);
});

test('an article before terminal software stays reviewable as an open modifier',()=>{
  assert.equal(englishGrammar('operating a software').length,0);
  assert.equal(englishGrammar('operating a software product').length,0);
  assert.equal(englishGrammar('Operating a software.')[0]?.suggestions[0],'software');
  assert.equal(englishGrammar('Operating a software, which is expensive.')[0]?.suggestions[0],'software');
  assert.equal(englishGrammar('I need a feedback')[0]?.suggestions[0],'feedback');
});


test('less common but attested spelling losses recover their intended words',()=>{
  assert.equal(byOriginal('who is losing breathble air','breathble')?.suggestions[0],'breathable');
  assert.equal(byOriginal('considering using insectasides','insectasides')?.suggestions[0],'insecticides');
  assert.equal(byOriginal('with Celular Number or IMEI','Celular')?.suggestions[0],'Cellular');
  assert.equal(byOriginal('Celular Systems are proprietary.','Celular'),undefined);
  assert.equal(byOriginal('The air is breathable.','breathable'),undefined);
  assert.equal(byOriginal('Use insecticides carefully.','insecticides'),undefined);
});
