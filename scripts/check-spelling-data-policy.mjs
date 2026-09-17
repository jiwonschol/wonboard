import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Records the data audit in third_party/spelling/README.md. These are reviewed
// bytes, not licenses inferred from an npm package or a repository badge.
// A regenerated asset needs a fresh provenance review before updating its hash.
export const reviewedAssets = [
  {
    file:'third_party/spelling/generated/lexicon.json',
    sha256:'582a81dcf351da3b369eb4d7cb4b8f3410612dadf60ded14f35af74ffd8000cc',
    licenses:['Apache-2.0','MIT'],
    notices:[
      {file:'third_party/spelling/open-korean-text/LICENSE',sha256:'cb5e8e7e5f4a3988e1063c142c60dc2df75605f4c46515e776e3aca6df976e14'},
      {file:'third_party/spelling/wordnik/LICENSE',sha256:'a568f0ac4c7ad5248ff748387d41e39519811b4a3e07d7438c9d1465dd4c9339'},
      {file:'LICENSE',sha256:'83fb8204af826845bbb3e6c01e3d73c97b58a2e79e95616624b090a83ad01d5f'},
    ],
  },
  {
    file:'third_party/spelling/generated/morphology.json',
    sha256:'38a8386eace92d1e1ecff9c9a2f2c40989c851651305511f537314885d9f257a',
    licenses:['Apache-2.0'],
    notices:[{file:'third_party/spelling/mecab-ko-dic/COPYING',sha256:'c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4'}],
  },
];

export async function checkSpellingDataPolicy(read, records=reviewedAssets) {
  const problems=[];
  async function verify(record) {
    let bytes;
    try {bytes=await read(record.file);} catch {problems.push({file:record.file,reason:'missing-or-unreadable'});return;}
    if(createHash('sha256').update(bytes).digest('hex')!==record.sha256) problems.push({file:record.file,reason:'changed-since-review'});
  }
  for(const record of records) {
    await verify(record);
    for(const notice of record.notices) await verify(notice);
    const disallowed=record.licenses.filter(id=>!['MIT','Apache-2.0'].includes(id));
    if(!record.licenses.length || disallowed.length) problems.push({file:record.file,reason:'outside-license-allowlist',licenses:disallowed});
  }
  if(!records.length) problems.push({reason:'empty-audit'});
  return {
    passed:problems.length===0,
    scope:'Two current proofreading data payloads and their retained original notices; not all application dependencies or linguistic quality',
    problems,
  };
}

// Verify the reviewed payloads and notices, then hand back the exact bytes that passed.
// A consumer must not be able to ship different bytes than the ones it verified, so the
// returned buffers come from the cache this check already filled and every reviewed file
// is read exactly once. Callers that only need the verdict keep using
// checkSpellingDataPolicy; this helper is for consumers that also use the bytes.
export async function readReviewedAssets(read, records=reviewedAssets) {
  const cache=new Map();
  const cached=async file=>{
    if(!cache.has(file)) cache.set(file,await read(file));
    return cache.get(file);
  };
  const report=await checkSpellingDataPolicy(cached,records);
  if(!report.passed) {
    const error=Error(`Spelling data policy check failed: ${JSON.stringify(report.problems)}`);
    error.report=report;
    throw error;
  }
  const assets=new Map();
  for(const record of records) {
    for(const file of [record.file,...record.notices.map(notice=>notice.file)]) {
      if(!cache.has(file)) throw Error(`Reviewed file was not verified: ${file}`);
      assets.set(file,cache.get(file));
    }
  }
  return {report,assets};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=fileURLToPath(new URL('../',import.meta.url));
  const report=await checkSpellingDataPolicy(file=>readFile(path.join(root,file)));
  console.log(JSON.stringify(report,null,2));
  if(!report.passed) process.exitCode=1;
}
