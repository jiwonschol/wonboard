import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {checkSpellingDataPolicy} from '../../scripts/check-spelling-data-policy.mjs';

const bytes=Buffer.from('synthetic test data');
const digest=createHash('sha256').update(bytes).digest('hex');
const record={file:'asset',sha256:digest,licenses:['MIT'],notices:[{file:'notice',sha256:digest}]};

test('all documented application builds run the data policy before compilation',async()=>{
  const {scripts}=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8'));
  for(const name of ['build','build:sites','build:desktop']) {
    assert.ok(scripts[name].startsWith('node scripts/check-spelling-data-policy.mjs && '),name);
  }
});

test('reviewed bytes under the explicit allowlist pass, custom terms do not',async()=>{
  assert.equal((await checkSpellingDataPolicy(async()=>bytes,[record])).passed,true);
  const result=await checkSpellingDataPolicy(async()=>bytes,[{...record,licenses:['Apache-2.0','LicenseRef-ESDB']}]);
  assert.equal(result.passed,false);
  assert.deepEqual(result.problems[0],{file:'asset',reason:'outside-license-allowlist',licenses:['LicenseRef-ESDB']});
});

test('changed payloads, changed notices and missing files require a new review',async()=>{
  for(const file of ['asset','notice']) {
    const changed=await checkSpellingDataPolicy(async name=>name===file?Buffer.from('changed'):bytes,[record]);
    assert.deepEqual(changed.problems,[{file,reason:'changed-since-review'}]);
    const missing=await checkSpellingDataPolicy(async name=>{if(name===file)throw Error('missing');return bytes;},[record]);
    assert.deepEqual(missing.problems,[{file,reason:'missing-or-unreadable'}]);
  }
  assert.equal((await checkSpellingDataPolicy(async()=>bytes,[])).passed,false);
});
