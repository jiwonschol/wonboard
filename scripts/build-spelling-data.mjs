// Own MIT extraction code. Never downloads or executes upstream code.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {stageWordnikCandidate} from './stage-wordnik-candidate.mjs';
await readFile('third_party/spelling/open-korean-text/LICENSE');
const sources=[];
async function get(repo,rev,path) {
  const url=`https://raw.githubusercontent.com/${repo}/${rev}/${path}`;
  const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  sources.push({url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  return bytes.toString('utf8');
}
const ko={};
for(const [pos,path] of Object.entries({noun:'noun/nouns.txt',adverb:'adverb/adverb.txt',verb:'verb/verb.txt',adjective:'adjective/adjective.txt',josa:'josa/josa.txt',ending:'verb/eomi.txt',preEnding:'verb/pre_eomi.txt'})) {
  const raw=await get('open-korean-text/open-korean-text','74cc4ae7d3dab232747cd5ddb723e4b73c476e4f',`src/main/resources/org/openkoreantext/processor/util/${path}`);
  ko[pos]=[...new Set(raw.split(/\r?\n/).map(s=>s.trim()).filter(s=>/^[가-힣]+$/.test(s)))].sort();
}
const english=await stageWordnikCandidate();
const {en}=JSON.parse(await readFile(english.directory+'/english-with-basics.json'));
sources.push(...english.sources);
const payload=JSON.stringify({notice:'Modified by Wonboard: selected Open Korean Text lists (Apache-2.0), Wordnik wordlist (MIT), and original basic forms (MIT). Original licenses in third_party/spelling.',ko,en})+'\n';
const gzipBytes=gzipSync(payload).length;
const combinedGzipBytes=gzipBytes+gzipSync(await readFile('third_party/spelling/generated/morphology.json')).length;
if(combinedGzipBytes>2_000_000)throw Error(`Data hard cap exceeded: ${combinedGzipBytes}`);
await mkdir('third_party/spelling/generated',{recursive:true});
await mkdir('third_party/spelling/wordnik',{recursive:true});
await writeFile('third_party/spelling/wordnik/LICENSE',await readFile(english.directory+'/LICENSE'));
await writeFile('third_party/spelling/generated/lexicon.json',payload);
const manifest={acquired:new Date().toISOString(),sources,bytes:Buffer.byteLength(payload),gzipBytes,combinedGzipBytes,sha256:createHash('sha256').update(payload).digest('hex'),koCounts:Object.fromEntries(Object.entries(ko).map(([p,v])=>[p,v.length])),englishWords:en.length,englishSupplement:{...english.supplement,notice:{...english.supplement.notice,file:"LICENSE"}},limitations:'Experimental spelling data; word-game vocabulary is not a grammar model. Proper names and candidate ranking remain incomplete.'};
await writeFile('third_party/spelling/generated/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
