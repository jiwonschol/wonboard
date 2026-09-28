import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createChecker} from '../../packages/editor/src/proofreading/engine.mjs';

test('attested usage resolves rare neighbors without blocking strong two-edit repairs',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['capot','carpet','armature','amateur','simplist','simplest','flattering','faltering','custom','customer']});
  for(const [source,target]of [['capet','carpet'],['amature','amateur'],['simpliest','simplest'],['falttering','flattering'],['custome','custom']])assert.equal(check(source)[0]?.suggestions[0],target,source);
  assert.equal(check('capet',['capet']).length,0);
  assert.equal(check('Amature').some(f=>f.applicable),false);
});

test('explicit foreign translation quotes preserve their spelling and surrounding prose stays checkable',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['diss','the','phrase','works']});
  const text='The phrase "O Gemini disse" (Portuguese for "Gemini Said") works teh';
  assert.equal(check(text).some(f=>f.original==='disse'&&f.applicable),false);
  assert.ok(check(text).some(f=>f.original==='teh'&&f.suggestions[0]==='the'));
});

test('reviewed spelling and grammatical context outrank unrelated lexical neighbors',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['avoid','vapid','ceiling','ceilinged','havoc','possibilities','blacklisting','flex']});
  for(const [text,word,target]of [['trying to avpid an app','avpid','avoid'],['painting wall and ceilingd','ceilingd','ceiling'],['havock','havock','havoc'],['possiblilties','possiblilties','possibilities']])assert.ok(check(text).some(f=>f.original===word&&f.suggestions[0]===target),text);
  for(const text of ['blocklisting','flexi'])assert.equal(check(text).some(f=>f.applicable),false,text);
  assert.equal(check('trying to avpid an app',['avpid']).some(f=>f.original==='avpid'),false);
});

test('typographic apostrophes use canonical lookup without accepting misspelled contractions',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:["you're","don't","we've","John"]});
  assert.deepEqual(check("You're You’re don't don’t we’ve John's John’s"),[]);
  assert.deepEqual(check('Zed’s',["Zed's"]),[]);
  const text='😀 you’re don’t zzz’z';
  const findings=check(text);
  assert.equal(findings.length,1);
  assert.equal(findings[0].original,'zzz’z');
  assert.equal(text.slice(findings[0].from,findings[0].to),'zzz’z');
});

test('known acronym casing precedes unrelated edit-distance candidates',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['API','USB','AI','apiary','ape','app','sub','use','am','an','the']});
  for(const word of ['api','usb','ai'])assert.deepEqual(check(word)[0].suggestions,[word.toUpperCase()]);
  assert.equal(check('API USB AI').length,0);
  assert.equal(check('api',['api']).length,0);
  assert.ok(check('teh')[0].suggestions.includes('the'));
  assert.equal(check('ZZQ')[0].type,'unknown');
});

test('misplaced letter doubling ranks the preserved letter sequence before substitutions',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['tommyrot','tomorrow','committee','committed']});
  assert.equal(check('tommorow')[0].suggestions[0],'tomorrow');
  assert.deepEqual(check('Tommorow'),[]); // A capitalized unknown may be a name.
  assert.deepEqual(check('TOMMOROW')[0].suggestions,[]); // Existing acronym review policy.
  assert.equal(check('committe')[0].suggestions[0],'committee');
  assert.deepEqual(check('tommyrot tomorrow committee committed'),[]);
  assert.deepEqual(check('tommorow',['tommorow']),[]);
});

test('versus abbreviation is recognized without accepting arbitrary short identifiers',()=>{
  const ko={noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]};
  const check=createChecker({ko,en:['versus','as','is','the']});
  assert.deepEqual(check('vs vs. VS Vs.'),[]);
  assert.ok(check('ahk').length>0);
  assert.ok(check('teh')[0].suggestions.includes('the'));
  assert.ok(createChecker({ko,en:['as','is']})('vs').length>0);
});


test('productive initialism plurals, actor nouns and hesitation sounds retain their meaning',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['API','GPU','obfuscate','obfuscatory','um','uh','hmm','mumm','pais','there','tehr','enough','boiler','tasteless','behemoth','floor','plan','the']});
  for(const word of ['apis','gpus','obfuscator','obfuscators','ummm','uhhh','hmmmm'])assert.equal(check(word).some(f=>f.applicable),false,word);
  for(const [text,target]of [['hi ther.','there'],['enought time','enough'],['combi boioer','boiler'],['tasteledss food','tasteless'],['a behemonth','behemoth'],['the flooplan','floor plan'],['teh','the']])assert.ok(check(text).some(f=>f.suggestions[0]===target),text);
  assert.equal(check('obfuscatr').some(f=>f.type==='unknown'),true);
  assert.equal(check('hi ther.',['ther']).some(f=>f.original==='ther'),false);
});
