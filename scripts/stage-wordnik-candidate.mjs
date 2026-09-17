import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {englishBasicForms} from './english-basic-forms.mjs';

// Isolated candidate preparation, never a production dictionary replacement.
const revision='46e6215d0f90356afe9c8ba4be347e7e98cb425c';
const sources=[
  {file:'wordlist-20210729.txt',sha256:'bfd1b4eb4ade1ba81e84c7e24248b9a1aecec9d9baa427453b367a83e30e0451'},
  {file:'LICENSE',sha256:'a568f0ac4c7ad5248ff748387d41e39519811b4a3e07d7438c9d1465dd4c9339'},
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function parseWordnikWords(text) {
  const lines=text.trimEnd().split(/\r?\n/);
  if(!lines.length||lines.some(line=>!/^"[a-z]+"$/.test(line)))throw Error('Unexpected word-list format');
  const words=lines.map(line=>line.slice(1,-1));
  if(new Set(words).size!==words.length)throw Error('Duplicate source words');
  return words;
}

// Resolve the Wonboard own-license notice bytes.
//
// Staging passes down the buffer the shared policy check already verified, so the notice this
// generator ships is byte-identical to the reviewed one. Reading ../LICENSE here instead meant a
// bundle verified one copy and shipped a second read taken after that verification: a file changed
// in between would reach the artifact while the policy report still said the reviewed bytes
// passed. Standalone runs have no caller, so the default reads the repository file and
// `node scripts/stage-wordnik-candidate.mjs` keeps its existing contract.
export async function resolveOwnLicense({ownLicense=null,read=null}={}) {
  return ownLicense??await (read??(()=>readFile(new URL('../LICENSE',import.meta.url))))();
}

export async function stageWordnikCandidate(fetchSource=fetch,options={}) {
  const acquired=[];
  for(const source of sources){
    const url=`https://raw.githubusercontent.com/wordnik/wordlist/${revision}/${source.file}`;
    const response=await fetchSource(url);
    if(!response.ok)throw Error(`Source fetch failed: ${source.file} (${response.status})`);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(hash(bytes)!==source.sha256)throw Error(`Source changed: ${source.file}`);
    acquired.push({...source,url,bytes});
  }
  const words=parseWordnikWords(acquired[0].bytes.toString('utf8'));
  const payload=Buffer.from(JSON.stringify({en:words})+'\n');
  const basics=englishBasicForms();
  const supplemented=[...new Set([...words,...basics])];
  const supplementedPayload=Buffer.from(JSON.stringify({en:supplemented})+'\n');
  const ownLicense=await resolveOwnLicense(options);
  const manifest={status:'candidate only; not approved for production',revision,license:'MIT',count:words.length,
    sources:acquired.map(({bytes,...source})=>({...source,size:bytes.length})),
    output:{file:'english.json',sha256:hash(payload),size:payload.length},
    supplement:{source:'Wonboard original enumeration; not SCOWL-derived',license:'MIT',forms:basics,
      count:supplemented.length,file:'english-with-basics.json',sha256:hash(supplementedPayload),
      notice:{file:'WONBOARD-LICENSE',sha256:hash(ownLicense)}},
    transformation:'Remove per-line quotation marks; preserve source word order. Separate supplemented payload appends original basic forms with exact deduplication. No frequency ranking.',
  };
  // mkdtemp gives a new private directory. Failed writes cannot overwrite any
  // prior candidate, source dictionary, user document, or production bundle.
  const directory=await mkdtemp(path.join(tmpdir(),'wonboard-wordnik-'));
  for(const [file,bytes] of [['english.json',payload],['english-with-basics.json',supplementedPayload],['LICENSE',acquired[1].bytes],['WONBOARD-LICENSE',ownLicense],['manifest.json',JSON.stringify(manifest,null,2)+'\n']]){
    await writeFile(path.join(directory,file),bytes,{flag:'wx',mode:0o600});
  }
  return {directory,...manifest};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log(JSON.stringify(await stageWordnikCandidate(),null,2));
}
