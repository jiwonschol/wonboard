import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createChecker} from '../../packages/editor/src/proofreading/engine.mjs';

test('reviewed levy and subscription misspellings survive sparse usage and edit limits',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['levies','subscription','unfortunately']});
  for(const [source,target] of [['levvies','levies'],['subscribition','subscription'],['unfortuantly','unfortunately']]){
    assert.equal(check(source)[0]?.suggestions[0],target,source);
    assert.equal(check(source,[source]).length,0,source);
  }
  const withoutTargets=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:[]});
  assert.equal(withoutTargets('levvies').some(f=>f.applicable),false);
});

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
  assert.equal(check('Tommorow')[0]?.suggestions[0],'Tomorrow');
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


test('stable spelling and observed use outrank accidental rare letter deletions',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['little','lite','sensor','sense','address','ideogram','sentences','wondering','omeprazole','olde','macros','cars']});
  for(const [source,target]of [['litte','little'],['sensoe','sensor'],['Adress','Address'],['idiogram','ideogram'],['sentenses','sentences'],['wonderning','wondering'],['omeprazol','omeprazole']])assert.equal(check(source)[0]?.suggestions[0],target,source);
  for(const source of ['litte','sensoe'])assert.equal(check(source,[source]).length,0);
  for(const source of ['macos','oled','cras','Amature','Tommorow'])assert.equal(check(source).some(f=>f.applicable),false,source);
});

test('community service and institution names survive nearby dictionary targets',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['axioms','was','aims','the']});
  for(const source of ['axios','aws','aiims'])assert.equal(check(source).some(f=>f.applicable),false,source);
  assert.equal(check('teh')[0]?.suggestions[0],'the');
});

test('short doubled-letter omission and reviewed adjective spelling remain repairable',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['still','antagonistic','stile']});
  for(const [source,target] of [['stil','still'],['antogonistic','antagonistic']])assert.equal(check(source)[0]?.suggestions[0],target,source);
  assert.equal(check('stil',['stil']).length,0);
  assert.equal(check('Hyenna').some(f=>f.applicable),false);
});

test('preserved letter sequence and internal omissions recover attested spellings',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['speculations','superbly','superb','supplier','supper','tariff','custom','customer']});
  for(const [source,target] of [['especulations','speculations'],['supebly','superbly'],['suppier','supplier'],['Tarrif','Tariff'],['custome','custom']]){
    assert.equal(check(source)[0]?.suggestions[0],target,source);
    assert.equal(check(source,[source]).length,0,source);
  }
  for(const text of ['Amature','Hyenna','puters'])assert.equal(check(text).some(f=>f.applicable),false,text);
});

test('electronic prefixes and product names do not lose their leading vowel',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['commerce','message','messaging','business','speculation','speculations']});
  for(const source of ['ecommerce','imessage','imessaging','ebusiness'])assert.equal(check(source).some(f=>f.applicable),false,source);
  for(const [source,target] of [['especulation','speculation'],['especulations','speculations']])assert.equal(check(source)[0]?.suggestions[0],target,source);
});

test('proper names and established broadband shorthand stay out of spelling candidates',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['deeply','band']});
  for(const text of ['DeepL','deepl','bband','Bband'])assert.deepEqual(check(text),[],text);
});

test('a neighboring first-key typo uses the common exact-suffix word, not a rare neighbor',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['rather','tether','founder','BTS']});
  assert.equal(check('tather')[0]?.suggestions[0],'rather');
  // First-letter guesses without neighboring-key evidence stay conservative.
  assert.equal(check('wounder')[0]?.suggestions.includes('founder'),false);
  assert.equal(check('RTS')[0]?.suggestions.includes('BTS'),false);
});

test('a long word plus a stray final i remains reviewable instead of being shortened',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['develop','developing']});
  const finding=check('developi')[0];
  assert.equal(finding?.type,'unknown');
  assert.deepEqual(finding?.suggestions,[]);
  assert.deepEqual(check('developing'),[]);
  assert.deepEqual(check('developi',['developi']),[]);
  assert.deepEqual(check('unprecented',['unprecented']),[]);
});


test('acronym casing preserves a lowercase file extension',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:['PDF']});
  assert.equal(check('a pdf document').find(f=>f.original==='pdf')?.suggestions[0],'PDF');
  for(const text of ['Full.pdf','a .pdf file'])assert.equal(check(text).some(f=>f.suggestions[0]==='PDF'),false);
});
