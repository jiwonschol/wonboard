import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageWordnikCandidate} from './stage-wordnik-candidate.mjs';

// Build an isolated complete data pair for Worker qualification. No product
// imports, checked-in payloads or release notices are changed by this command.
export async function stageProofreadingBundle() {
  const root=new URL('../',import.meta.url);
  const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
  const source=await readFile(new URL('third_party/spelling/generated/lexicon.json',root));
  const morphology=await readFile(new URL('third_party/spelling/generated/morphology.json',root));
  if(digest(source)!=='582a81dcf351da3b369eb4d7cb4b8f3410612dadf60ded14f35af74ffd8000cc'||digest(morphology)!=='d6bc76d4a6cbcff44388fdd8c42677cdbb294927f416cfc2af883da20e3eaa23')throw Error('Current Korean data needs a fresh provenance review');
  const candidate=await stageWordnikCandidate();
  const english=JSON.parse(await readFile(path.join(candidate.directory,'english-with-basics.json')));
  const combined=Buffer.from(JSON.stringify({notice:'Candidate only: selected Open Korean Text (Apache-2.0), Wordnik wordlist (MIT), and Wonboard original basic forms (MIT).',ko:JSON.parse(source).ko,en:english.en})+'\n');
  const gzipBytes=gzipSync(combined).length+gzipSync(morphology).length;
  if(gzipBytes>2_000_000)throw Error(`Combined data budget exceeded: ${gzipBytes}`);
  const files=[['lexicon.json',combined],['morphology.json',morphology]];
  const notices=[
    ['OPEN-KOREAN-TEXT-LICENSE','third_party/spelling/open-korean-text/LICENSE','cb5e8e7e5f4a3988e1063c142c60dc2df75605f4c46515e776e3aca6df976e14'],
    ['MECAB-COPYING','third_party/spelling/mecab-ko-dic/COPYING','c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4'],
  ];
  for(const [name,file,sha] of notices){
    const bytes=await readFile(new URL(file,root));
    if(digest(bytes)!==sha)throw Error('Korean notice changed since review');
    files.push([name,bytes]);
  }
  const manifest={status:'isolated qualification bundle; not release approval',englishRevision:candidate.revision,
    sourceLexiconSha256:digest(source),combinedGzipBytes:gzipBytes,
    licenses:['MIT','Apache-2.0'],englishEntries:english.en.length,
    files:files.map(([file,bytes])=>({file,sha256:digest(bytes),bytes:bytes.length})),
    englishProvenance:'manifest.json contains pinned Wordnik inputs, original MIT notices and complete authored supplement',
  };
  files.push(['bundle-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n')]);
  for(const [file,bytes] of files)await writeFile(path.join(candidate.directory,file),bytes,{flag:'wx',mode:0o600});
  return {directory:candidate.directory,...manifest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await stageProofreadingBundle(),null,2));
