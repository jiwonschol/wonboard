// Own MIT extraction code. Never downloads or executes upstream code.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
await readFile('third_party/spelling/open-korean-text/LICENSE');
await readFile('third_party/spelling/scowl/Copyright');
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
const raw=await get('en-wl/wordlist','1e5b7d3a72f47a71da5d28686c1dd4b397178485','data/scowl-pre.txt');
const en=new Set();
// Union US/UK variants, size <=60 lines. Omit annotations and phrases.
for(const line of raw.split('\n')) {
  if(!/^\d/.test(line)||Number.parseInt(line)>60)continue;
  const lexical=line.slice(line.indexOf(':')+1).replace(/<[^>]*>/g,'').replace(/(^|[|(])\s*(?:[A-Z]+|@)\s*:/g,'$1');
  for(const item of lexical.split(/[,|():]/)) {
    const word=item.trim();if(/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(word))en.add(word);
  }
}
const payload=JSON.stringify({notice:'Modified by Wonboard: selected lists, filtered fields, deduplicated and sorted. Original licenses in third_party/spelling.',ko,en:[...en].sort()})+'\n';
const gzipBytes=gzipSync(payload).length;
if(gzipBytes>2_000_000)throw Error(`Data hard cap exceeded: ${gzipBytes}`);
await mkdir('third_party/spelling/generated',{recursive:true});
await writeFile('third_party/spelling/generated/lexicon.json',payload);
const manifest={acquired:new Date().toISOString(),sources,bytes:Buffer.byteLength(payload),gzipBytes,koCounts:Object.fromEntries(Object.entries(ko).map(([p,v])=>[p,v.length])),englishWords:en.size,limitations:'Prototype extraction, not upstream speller generation. Parenthesized alternatives and dialect labels are handled; unsupported markup and phrases are omitted. Proper names are not lowercased.'};
await writeFile('third_party/spelling/generated/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
