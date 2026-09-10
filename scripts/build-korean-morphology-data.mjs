import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
await readFile('third_party/spelling/mecab-ko-dic/COPYING');
const revision='12439fb32808b9244ded56d7dfed96e4b8d76869',sources=[],forms=new Map(),adverbs=new Set(),recognizedNouns=new Set();
for(const file of ['Inflect.csv','MAG.csv','NNG.csv']){
  const url=`https://raw.githubusercontent.com/lindera/mecab-ko-dic/${revision}/${file}`;
  const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${url}`);
  const bytes=Buffer.from(await r.arrayBuffer());sources.push({url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  for(const line of bytes.toString('utf8').split('\n')){
    const f=line.split(',');
    // Only simple Hangul surfaces with the exact unquoted 12-field layout.
    // No runtime CSV parser or upstream source code is imported.
    if(f.length!==12||!/^([가-힣]+)$/.test(f[0]))continue;
    if(file==='NNG.csv'){if(f[0].length>=2&&f[0].length<=20)recognizedNouns.add(f[0]);continue;}
    if(file==='MAG.csv'){adverbs.add(f[0]);continue;}
    if(!/^(VV|VA|VX|VCP|XSV|XSA)(\+|$)/.test(f[4]))continue;
    const ending=f[4].split('+').at(-1),root=f[11].split('/')[0];
    if(!/^[가-힣]+$/.test(root))continue;
    const key=[f[0],ending,root].join('|');forms.set(key,[f[0],ending,root]);
  }
}
const payload=JSON.stringify({notice:'Modified by Wonboard: selected Hangul verb inflections, adverbs and recognition-only common nouns; stripped engine costs/IDs. Original Apache-2.0 terms: ../mecab-ko-dic/COPYING.',forms:[...forms.values()],adverbs:[...adverbs].sort(),recognizedNouns:[...recognizedNouns].sort()})+'\n';
const gzipBytes=gzipSync(payload).length,existing=gzipSync(await readFile('third_party/spelling/generated/lexicon.json')).length;
if(gzipBytes+existing>2_000_000)throw Error(`Combined data budget exceeded: ${gzipBytes+existing}`);
await writeFile('third_party/spelling/generated/morphology.json',payload);
const manifest={revision,sources,acquired:new Date().toISOString(),bytes:Buffer.byteLength(payload),gzipBytes,combinedGzipBytes:gzipBytes+existing,forms:forms.size,adverbs:adverbs.size,recognizedNouns:recognizedNouns.size};
await writeFile('third_party/spelling/generated/morphology-manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
