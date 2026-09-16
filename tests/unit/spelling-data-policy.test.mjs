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

// ---------------------------------------------------------------------------
// Single source for the reviewed hashes.
//
// stage-proofreading-bundle.mjs used to pin its own copies of the payload and
// notice digests. When morphology.json was regenerated the policy record moved
// and the staging copy did not, so the Worker qualification command threw on
// main while the build gate passed. Nothing called it and there is no CI, so
// the drift was invisible. These tests keep the hashes in one place and require
// a failed review to stop before any network acquisition or artifact write.
// ---------------------------------------------------------------------------
import {mkdtempSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {readReviewedAssets,reviewedAssets} from '../../scripts/check-spelling-data-policy.mjs';
import {stageProofreadingBundle} from '../../scripts/stage-proofreading-bundle.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const LEXICON='third_party/spelling/generated/lexicon.json';
const MORPHOLOGY='third_party/spelling/generated/morphology.json';
const OKT='third_party/spelling/open-korean-text/LICENSE';
const MECAB='third_party/spelling/mecab-ko-dic/COPYING';
const tree={
  [LEXICON]:Buffer.from(JSON.stringify({ko:{noun:['책']},en:['a']})+'\n'),
  [MORPHOLOGY]:Buffer.from(JSON.stringify({forms:[]})+'\n'),
  [OKT]:Buffer.from('Apache-2.0 fixture notice\n'),
  [MECAB]:Buffer.from('Apache-2.0 fixture copying\n'),
  LICENSE:Buffer.from('MIT fixture license\n'),
};
const records=[
  {file:LEXICON,sha256:sha(tree[LEXICON]),licenses:['Apache-2.0','MIT'],
    notices:[{file:OKT,sha256:sha(tree[OKT])},{file:'LICENSE',sha256:sha(tree.LICENSE)}]},
  {file:MORPHOLOGY,sha256:sha(tree[MORPHOLOGY]),licenses:['Apache-2.0'],
    notices:[{file:MECAB,sha256:sha(tree[MECAB])}]},
];
// In-memory reviewed inputs; only the candidate directory touches the filesystem.
function harness({tamper={},omit=[],counts}={}) {
  const directory=mkdtempSync(join(tmpdir(),'wonboard-wordnik-fake-'));
  writeFileSync(join(directory,'english-with-basics.json'),JSON.stringify({en:['a','b']})+'\n');
  let calls=0;
  const read=async file=>{
    if(counts)counts[file]=(counts[file]??0)+1;
    if(omit.includes(file))throw Object.assign(Error(`missing ${file}`),{code:'ENOENT'});
    if(file in tamper)return tamper[file];
    if(!(file in tree))throw Error(`unexpected read ${file}`);
    return tree[file];
  };
  const stageCandidate=async()=>{calls++;return {directory,revision:'fake-revision'};};
  return {directory,read,stageCandidate,calls:()=>calls};
}
const written=directory=>Object.fromEntries(readdirSync(directory)
  .filter(name=>name!=='english-with-basics.json').map(name=>[name,readFileSync(join(directory,name))]));

test('readReviewedAssets returns the verified bytes and reads each file once',async()=>{
  const counts={};
  const {report,assets}=await readReviewedAssets(harness({counts}).read,records);
  assert.equal(report.passed,true);
  // Same buffer identity: the consumer stages exactly what the check hashed.
  assert.equal(assets.get(LEXICON),tree[LEXICON]);
  assert.equal(assets.get(MORPHOLOGY),tree[MORPHOLOGY]);
  assert.equal(assets.get(MECAB),tree[MECAB]);
  assert.equal(assets.get('LICENSE'),tree.LICENSE);
  assert.deepEqual(assets.size,Object.keys(tree).length);
  for(const file of Object.keys(tree))assert.equal(counts[file],1,`read exactly once: ${file}`);
});

test('staging succeeds from the shared records and writes the verified bytes',async()=>{
  const h=harness();
  const result=await stageProofreadingBundle({read:h.read,records,stageCandidate:h.stageCandidate});
  assert.equal(h.calls(),1);
  assert.equal(result.status,'isolated qualification bundle; not release approval');
  const out=written(h.directory);
  assert.deepEqual(Object.keys(out).sort(),['MECAB-COPYING','OPEN-KOREAN-TEXT-LICENSE','bundle-manifest.json','lexicon.json','morphology.json']);
  assert.deepEqual(out['morphology.json'],tree[MORPHOLOGY],'staged bytes are the verified bytes');
  assert.deepEqual(out['OPEN-KOREAN-TEXT-LICENSE'],tree[OKT]);
  assert.deepEqual(out['MECAB-COPYING'],tree[MECAB]);
  const manifest=JSON.parse(out['bundle-manifest.json']);
  assert.equal(manifest.sourceLexiconSha256,sha(tree[LEXICON]),'equals the reviewed hash');
  assert.deepEqual(manifest.licenses,['MIT','Apache-2.0']);
  assert.ok(manifest.combinedGzipBytes<=2_000_000);
  const combined=JSON.parse(out['lexicon.json']);
  assert.deepEqual(combined.en,['a','b'],'the staged English list comes from the candidate');
  assert.deepEqual(combined.ko,{noun:['책']},'the reviewed Korean lists pass through unchanged');
});

test('a failed review stops before network acquisition and before any artifact write',async()=>{
  const cases=[
    ['changed payload',{tamper:{[MORPHOLOGY]:Buffer.from('{"forms":[1]}\n')}},/changed-since-review/],
    ['changed payload hash mismatch',{tamper:{[LEXICON]:Buffer.from('{"ko":{},"en":[]}\n')}},/changed-since-review/],
    ['missing notice',{omit:[MECAB]},/missing-or-unreadable/],
    ['missing payload',{omit:[MORPHOLOGY]},/missing-or-unreadable/],
    ['outside license allowlist',{licenses:['Apache-2.0','LicenseRef-ESDB']},/outside-license-allowlist/],
    ['empty audit',{records:[]},/empty-audit/],
  ];
  for(const [name,options,pattern] of cases){
    const h=harness(options);
    const useRecords=options.records??(options.licenses?[{...records[0],licenses:options.licenses},records[1]]:records);
    await assert.rejects(stageProofreadingBundle({read:h.read,records:useRecords,stageCandidate:h.stageCandidate}),pattern,name);
    assert.equal(h.calls(),0,`${name}: the English candidate must not be acquired`);
    assert.deepEqual(readdirSync(h.directory),['english-with-basics.json'],`${name}: no artifact was written`);
  }
});

test('the combined gzip cap still stops before writing the bundle',async()=>{
  const big=Buffer.from(JSON.stringify({forms:[randomBytes(2_500_000).toString('base64')]})+'\n');
  const h=harness({tamper:{[MORPHOLOGY]:big}});
  const bigRecords=[records[0],{...records[1],sha256:sha(big)}];
  await assert.rejects(stageProofreadingBundle({read:h.read,records:bigRecords,stageCandidate:h.stageCandidate}),/Combined data budget exceeded/);
  assert.equal(h.calls(),1,'the cap needs the staged English list, so acquisition happens first');
  assert.deepEqual(readdirSync(h.directory),['english-with-basics.json'],'no bundle artifact was written');
});

test('the repository payloads stage with no second copy of the reviewed hashes',async()=>{
  const source=await readFile(new URL('../../scripts/stage-proofreading-bundle.mjs',import.meta.url),'utf8');
  assert.deepEqual(source.match(/\b[0-9a-f]{64}\b/g)??[],[],'no hardcoded sha256 constant may come back');
  // Default read and default records: the real reviewed assets. This is the case that threw on
  // main while the build gate passed, because only this file held a stale digest.
  const directory=mkdtempSync(join(tmpdir(),'wonboard-wordnik-real-'));
  writeFileSync(join(directory,'english-with-basics.json'),JSON.stringify({en:['a']})+'\n');
  await stageProofreadingBundle({stageCandidate:async()=>({directory,revision:'fake-revision'})});
  const manifest=JSON.parse(readFileSync(join(directory,'bundle-manifest.json'),'utf8'));
  const lexicon=reviewedAssets.find(record=>record.file.endsWith('generated/lexicon.json'));
  const morphology=reviewedAssets.find(record=>record.file.endsWith('generated/morphology.json'));
  assert.equal(manifest.sourceLexiconSha256,lexicon.sha256);
  const out=written(directory);
  assert.equal(sha(out['morphology.json']),morphology.sha256);
  for(const notice of morphology.notices)assert.equal(sha(out['MECAB-COPYING']),notice.sha256);
  assert.ok(manifest.combinedGzipBytes<=2_000_000,`under the hard cap: ${manifest.combinedGzipBytes}`);
});
