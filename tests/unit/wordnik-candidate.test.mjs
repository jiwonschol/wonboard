import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWordnikWords,stageWordnikCandidate} from '../../scripts/stage-wordnik-candidate.mjs';
import {englishBasicForms} from '../../scripts/english-basic-forms.mjs';
import {createChecker} from '../../packages/editor/src/proofreading/engine.mjs';

test('candidate parser preserves words and rejects unreviewed formats',()=>{
  assert.deepEqual(parseWordnikWords('"apple"\n"pear"\n'),['apple','pear']);
  for(const text of ['', 'apple', '"Apple"', '"apple"\n"apple"', '"a-b"'])assert.throws(()=>parseWordnikWords(text));
});
test('candidate acquisition rejects changed source bytes before staging',async()=>{
  let calls=0;
  await assert.rejects(stageWordnikCandidate(async()=>{calls++;return new Response('changed');}),/Source changed/);
  assert.equal(calls,1);
});

test('authored basic forms cover contractions and retain intentional capitalization',()=>{
  const words=englishBasicForms();
  for(const word of ['I','a',"I'm","they're","isn't",'Wednesday','September','CSS'])assert.ok(words.includes(word));
  assert.equal(new Set(words).size,words.length);
  assert.ok(!words.includes('wednesday'));
  assert.ok(!words.includes("he're"));
});

test('authored macro acronym prevents unrelated word candidates without suppressing typos',()=>{
  const check=createChecker({ko:{noun:[],verb:[],adjective:[],adverb:[],josa:[],ending:[]},en:[...englishBasicForms(),'aha','ark','ask','the']});
  assert.deepEqual(check('ahk')[0].suggestions,['AHK']);
  assert.deepEqual(check('AHK'),[]);
  assert.deepEqual(check('ahk',['ahk']),[]);
  assert.ok(check('teh')[0].suggestions.includes('the'));
  assert.equal(check('ZZQ')[0].type,'unknown');
});
