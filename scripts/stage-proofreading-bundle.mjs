import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageWordnikCandidate} from './stage-wordnik-candidate.mjs';
import {readReviewedAssets,reviewedAssets} from './check-spelling-data-policy.mjs';

// Build an isolated complete data pair for Worker qualification. No product
// imports, checked-in payloads or release notices are changed by this command.
//
// The reviewed payload and notice hashes live only in check-spelling-data-policy.mjs.
// This command consumes them through readReviewedAssets, so the bytes it verifies and
// the bytes it stages are the same buffers and a data revision cannot leave a second,
// stale copy of a hash behind here. Verification runs before any network acquisition
// and before any artifact write.
export async function stageProofreadingBundle({read,records=reviewedAssets,stageCandidate=stageWordnikCandidate}={}) {
  const root=new URL('../',import.meta.url);
  const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
  const {report,assets}=await readReviewedAssets(read??(file=>readFile(new URL(file,root))),records);
  const onlyRecord=suffix=>{
    const found=records.filter(record=>record.file.endsWith(suffix));
    if(found.length!==1)throw Error(`Expected exactly one reviewed record for ${suffix}, found ${found.length}`);
    return found[0];
  };
  const onlyNotice=(record,suffix)=>{
    const found=record.notices.filter(notice=>notice.file.endsWith(suffix));
    if(found.length!==1)throw Error(`Expected exactly one reviewed notice for ${suffix} in ${record.file}, found ${found.length}`);
    return assets.get(found[0].file);
  };
  const lexiconRecord=onlyRecord('generated/lexicon.json');
  const morphologyRecord=onlyRecord('generated/morphology.json');
  const source=assets.get(lexiconRecord.file),morphology=assets.get(morphologyRecord.file);
  // The Wonboard own-license notice is reviewed as a root LICENSE entry. Looked up by exact path
  // across every record, so moving it between records cannot silently drop the link, and handed
  // to the sub-generator so it ships the verified buffer instead of re-reading the file after
  // verification. Standalone `stage-wordnik-candidate.mjs` runs pass nothing and read it locally.
  const ownNotice='LICENSE';
  const owners=records.flatMap(record=>record.notices.filter(notice=>notice.file===ownNotice).map(()=>record.file));
  if(owners.length!==1)throw Error(`Expected exactly one reviewed notice ${ownNotice}, found ${owners.length}`);
  const ownLicense=assets.get(ownNotice);
  if(!ownLicense)throw Error(`Reviewed file was not verified: ${ownNotice}`);
  const candidate=await stageCandidate({ownLicense});
  const english=JSON.parse(await readFile(path.join(candidate.directory,'english-with-basics.json')));
  const combined=Buffer.from(JSON.stringify({notice:'Candidate only: selected Open Korean Text (Apache-2.0), Wordnik wordlist (MIT), and Wonboard original basic forms (MIT).',ko:JSON.parse(source).ko,en:english.en})+'\n');
  const gzipBytes=gzipSync(combined).length+gzipSync(morphology).length;
  if(gzipBytes>2_000_000)throw Error(`Combined data budget exceeded: ${gzipBytes}`);
  const files=[['lexicon.json',combined],['morphology.json',morphology]];
  // Notice composition is unchanged: the Korean sources' own retained notices. Their hashes
  // are verified by the shared policy check above, not re-pinned here.
  for(const [name,record,suffix] of [
    ['OPEN-KOREAN-TEXT-LICENSE',lexiconRecord,'open-korean-text/LICENSE'],
    ['MECAB-COPYING',morphologyRecord,'mecab-ko-dic/COPYING'],
  ]) files.push([name,onlyNotice(record,suffix)]);
  const manifest={status:'isolated qualification bundle; not release approval',englishRevision:candidate.revision,
    sourceLexiconSha256:digest(source),combinedGzipBytes:gzipBytes,
    licenses:['MIT','Apache-2.0'],englishEntries:english.en.length,
    policyScope:report.scope,
    files:files.map(([file,bytes])=>({file,sha256:digest(bytes),bytes:bytes.length})),
    englishProvenance:'manifest.json contains pinned Wordnik inputs, original MIT notices and complete authored supplement',
  };
  files.push(['bundle-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n')]);
  for(const [file,bytes] of files)await writeFile(path.join(candidate.directory,file),bytes,{flag:'wx',mode:0o600});
  return {directory:candidate.directory,...manifest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await stageProofreadingBundle(),null,2));
