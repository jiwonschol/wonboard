import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';
import {createChecker} from '../../packages/editor/src/proofreading/engine.mjs';

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
  for(const text of ['a to-do list','I uninstalled Pi-hole.','control diff inline'])assert.equal(check(text).some(f=>f.applicable),false,text);
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
    ['We are a few hundreds','a few hundred'],
    ['The project is cool, but what you will do with it?','what will you do'],
    ['Do you have audience?','have an audience'],
    ["projects who's primary contributors are AI",'whose primary'],
    ["You can't trust it's account.",'its'],
    ["Your going to be sorry.","You're going"],
    ['It is loud because its summarizing noise.',"it's"],
    ['Im back at work.',"I'm"],
    ['I should have reigned in my emotions.','reined in'],
    ['You sue Claude model in an IDE.','use Claude'],
    ['I have such hook.','such a hook'],
    ['You can bank couple of those.','bank a couple'],
    ['I rather have this version.',"I'd rather"],
    ['It wasnt on DOS.',"wasn't"],
    ['It connects to a A/B switched CRT.','an A/B'],
    ['We have a XP box.','an XP'],
    ['They built it into chip.','into a chip'],
    ['It is imminently more capable.','eminently'],
    ['These special equipments are old.','equipment'],
    ['It worked perfectly seamless with DOS.','seamlessly'],
    ['Few years ago I saw one.','A few years ago'],
    ['We discovered couple of machines.','discovered a couple of'],
    ["There's a few car dealerships here.",'There are a few'],
    ['Instruments that only runs on DOS.','Instruments that only run'],
    ['thats not true',"that's"],
    ['Theres a problem',"There's"],
    ['The service doesnt start.',"doesn't"],
    ['Doesnt this work?',"Doesn't"],
    ['They ate pushing the update.','They are'],
    ['The effort was oaid for.','paid'],
    ['A natual channel.','natural'],
    ['The chinnese government','Chinese'],
    ['They publish news everyday.','news every day'],
    ['They would loose their minds.','lose their minds'],
    ["I read an LLMs output.","an LLM's output"],
    ["The AI's are doing this.",'AIs are'],
    ['Most wars in history won by armies.','wars in history were won'],
    ['There will be once case.','one case'],
    ['How sophisticated to we need to be?','sophisticated do we'],
    ['I am not devops person.','I am not a devops person'],
    ['There were no firewall.','there was no firewall'],
    ['How did they workout the answer?','did they work out'],
    ["No its not.","No it's not"],
    ['They got access into the system.','got access to'],
    ['The box is a sandbox but agent can send requests.','but an agent'],
    ['It happened around time of the event.','around the time of'],
    ['If i consider this, it changes.','I'],
    ['That is a dumping grounds.','a dumping ground'],
    ["It let's me choose.",'It lets'],
    ['These exceptions does not apply.','exceptions do'],
    ['It happens most of time.','most of the time'],
    ["It chased it's tail.",'its'],
    ['The agent get tools.','The agent gets'],
    ['Review it before and agent attempts the work.','before an agent'],
    ['We tried using to generate diagrams.','tried using it to generate'],
    ['It missed lots of important bit.','lots of important bits'],
    ['I merged 10 PR yesterday.','10 PRs'],
    ["It don't need plan mode.","doesn't need"],
    ['Read epic1 through is many epics as needed.','through as many'],
    ['I found a implemention.','an implementation'],
    ["LLM's exist today.",'LLMs'],
    ['It ranks the the values.','the'],
    ["It a paradox.","It's a"],
    ["Its so cheap.","It's so"],
    ['Tuning it make it narrow.','Tuning it makes'],
    ['Should we worried about this?', 'Should we be worried'],
    ['As i mentioned earlier.', 'I'],
    ['Can i get a technical report?', 'I'],
    ['I hope to join in upcoming project.', 'an upcoming project'],
    ['They had to deal with enormous flood of people.', 'an enormous flood'],
    ['This luggage contain spare clothes.', 'contains'],
    ['I need to get more clarify from the manager.', 'more clarification'],
    ['A error occurred during setup.', 'An error'],
    ['An clearer message would help.', 'A clearer'],
    ['We was linking the project.', 'We were'],
    ['They was ready.', 'They were'],
    ['All the steps of the sign in and sign out has been done.', 'have been done'],
    ['All the files of the project has been saved.', 'have been saved'],
    ["It don't login to the service.","doesn't log in"],
    ["It don't work on Linux.","doesn't work"],
    ['Our app will breaked at startup.', 'will break'],
    ["It's displays release notes.",'It displays'],
    ["It's happens often.",'It happens'],
    ['It only have one option.', 'has'],
    ['She herself have watched it.', 'has'],
    ["She doesn't has a book.","doesn't have"],
    ['Did she has a big family?', 'have'],
    ['He is one of my friend.', 'friends'],
    ['One of his notable work', 'works'],
    ['She studied at one of the best university in the world.', 'universities'],
    ['The page loads millions of URL each day.', 'millions of URLs'],
    ['He thinks he is a expert.', 'an expert'],
    ['The service includes an "takeout" feature.', 'a "takeout'],
    ["Its a paid add-on.","It's"],
    ["I think its been useful.","it's"],
    ['Nobody wants to treated as a fool.','to be treated as'],
    ['This will make it sounds better.','make it sound'],
    ['This has changed in past 10 years.','in the past 10 years'],
    ['There is several users online.','There are'],
    ['They seems ready.','They seem'],
    ['You needs more space.','You need'],
    ['It switch off automatically.','It switches off'],
    ['She work on Tuesdays.','She works on'],
    ['They will came tomorrow.','will come'],
    ["The app didn't worked.","didn't work"],
    ['Does API really uses this format?','use'],
    ['I have one questions.','one question'],
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
    ['If i connects to the network, it fails.','I connect'],
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
    ['We have setup the server.','set up'],
    ['She has setup the server.','set up'],
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

test('weak nearby words need stronger evidence than short or two-substitution distance alone',()=>{
  const smallCheck=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['microbic','cat','eth','the','tomorrow','tommyrot']});
  for(const source of ['micropip','cato'])assert.deepEqual(smallCheck(source)[0]?.suggestions,[],source);
  assert.equal(smallCheck('teh')[0]?.suggestions[0],'the');
  assert.equal(smallCheck('tommorow')[0]?.suggestions[0],'tomorrow');
});
