import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createChecker} from '../../packages/editor/src/proofreading/engine.mjs';

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
  assert.equal(check('Tommorow')[0].suggestions[0],'Tomorrow');
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
