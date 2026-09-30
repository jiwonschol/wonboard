import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest,partition,validDocument,goldReport,survey,engineFingerprints} from '../../scripts/validate-corpus.mjs';
import {check} from '../../scripts/spelling-prototype.mjs';

test('internet expression contract measures notices, registration and surrounding spacing',()=>{
  // Independently specified product expectations, not copied corpus text.
  // These are regression examples, not an independent language accuracy set.
  const cases=[];
  for(const word of ['ㅋㅋ','ㅎㅎ','ㄱㄱ','ㅇㅇ']){
    cases.push({text:word,complete:true,expected:[{from:0,to:2,type:'unknown'}]});
    cases.push({text:word,personal:[word],complete:true,expected:[]});
  }
  cases.push(
    {text:'질게에서',complete:true,expected:[{from:0,to:2,type:'unknown'}]},
    {text:'질게에서',personal:['질게'],complete:true,expected:[]},
    {text:'질게에서답변하시는걸',personal:['질게'],complete:true,expected:[{from:0,to:10,type:'spacing',suggestions:['질게에서 답변하시는 걸']}]},
    {text:'😀 ㅋㅋ',complete:true,expected:[{from:3,to:5,type:'unknown'}]}
  );
  const r=goldReport(cases,check);
  assert.equal(r.cases,12);assert.equal(r.detected.unknown,6);
  assert.deepEqual(r.missed,{spelling:0,spacing:0,grammar:0,unknown:0});
  assert.equal(r.top3.spacing,1);assert.equal(r.unexpectedRecommendations,0);assert.equal(r.unexpectedUnknown,0);
  assert.throws(()=>goldReport([{text:'ㅋㅋ',complete:true,personal:'ㅋㅋ',expected:[]}],check));
});

test('unknown recall and wrong recommendations are separate',()=>{
  const cases=[{text:'ㅋㅋ',complete:true,expected:[{from:0,to:2,type:'unknown'}]}];
  const missing=goldReport(cases,()=>[]);assert.equal(missing.expected.unknown,1);assert.equal(missing.detected.unknown,0);
  const found=goldReport(cases,()=>[{from:0,to:2,type:'unknown',suggestions:[]}]);assert.equal(found.detected.unknown,1);assert.equal(found.unexpectedRecommendations,0);
  assert.throws(()=>goldReport([{...cases[0],complete:false}],()=>[]));
});
test('gold correction metrics do not accept a missing or different suggestion',()=>{
  const cases=[{text:'ab',complete:true,expected:[{from:0,to:2,type:'spelling',suggestions:['ac']}]}];
  const r=goldReport(cases,()=>[{from:0,to:2,type:'spelling',suggestions:['ad','ac']}]);
  assert.equal(r.top3.spelling,1);assert.equal(r.unexpectedRecommendations,1);
});
test('grammar gold labels measure exact type, range, misses and ranked repairs',()=>{
  const cases=[{text:'He go.',complete:true,expected:[{from:3,to:5,type:'grammar',suggestions:['goes']}]}];
  const found=goldReport(cases,()=>[{from:3,to:5,type:'grammar',suggestions:['went','goes']}]);
  assert.equal(found.expected.grammar,1);assert.equal(found.detected.grammar,1);
  assert.equal(found.top3.grammar,1);assert.equal(found.missed.grammar,0);
  assert.equal(found.unexpectedRecommendations,1);
  for(const findings of [[],[{from:3,to:5,type:'spelling',suggestions:['goes']}], [{from:0,to:5,type:'grammar',suggestions:['He goes']}]] ){
    const missed=goldReport(cases,()=>findings);
    assert.equal(missed.detected.grammar,0);assert.equal(missed.top3.grammar,0);assert.equal(missed.missed.grammar,1);
  }
  assert.throws(()=>goldReport([{...cases[0],expected:[{...cases[0].expected[0],suggestions:[]}]}],()=>[]));
});
test('engine provenance hashes every transitive checker module and rule-data input',async()=>{
  const fingerprints=await engineFingerprints(),root=new URL('../../',import.meta.url),dependencies=new Set();
  async function visit(url){
    const file=relative(fileURLToPath(root),fileURLToPath(url));
    if(dependencies.has(file))return;
    dependencies.add(file);
    const bytes=await readFile(url);
    assert.equal(fingerprints[file],digest(bytes),`Missing or stale checker fingerprint: ${file}`);
    if(!file.endsWith('.mjs'))return;
    const source=bytes.toString('utf8');
    for(const match of source.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]|\bnew URL\(['"](\.[^'"]+)['"],import\.meta\.url\)/g))await visit(new URL(match[1]??match[2],url));
  }
  await visit(new URL('scripts/spelling-prototype.mjs',root));
  assert.deepEqual(Object.keys(fingerprints).sort(),[...dependencies].sort());
  for(const name of ['english-grammar.mjs','english-usage.mjs'])assert.ok(dependencies.has(`packages/editor/src/proofreading/${name}`));
});
test('schema and partition are deterministic',()=>{
  assert.equal(validDocument({id:'x',utterance:[{id:'a',form:'x',original_form:'x'}]}),true);
  assert.equal(validDocument({id:'x',utterance:[{id:'a',form:'x'}]}),false);
  assert.equal(partition(digest('conversation')),partition(digest('conversation')));
});
test('survey stays aggregate-only, samples conversations and never claims accuracy',async()=>{
  const root=await mkdtemp(join(tmpdir(),'wonboard-corpus-test-'));
  try{
    for(const name of ['메신저','온라인대화']){
      await mkdir(join(root,name));
      await writeFile(join(root,name,'synthetic.json'),JSON.stringify({document:[{id:'one',utterance:[{id:'u',form:'PRIVATE_SENTINEL',original_form:'PRIVATE_SENTINEL'}]}]}));
    }
    const split=partition(digest(JSON.stringify(['PRIVATE_SENTINEL'])));
    const r=await survey(root,{documents:1,split,field:'original_form'},()=>[{type:'unknown',suggestions:[]},{type:'grammar',suggestions:['SAFE_SYNTHETIC_REPAIR']}]);
    assert.equal(r.accuracy,null);assert.equal(r.datasets[0].checkedUtterances,1);
    assert.equal(r.datasets[0].unknownFindings,1);assert.equal(JSON.stringify(r).includes('PRIVATE_SENTINEL'),false);
    assert.equal(r.datasets[0].grammarFindings,1);assert.equal(r.datasets[1].grammarFindings,1);
    assert.equal(r.datasets[0].withRecommendations,1);
    assert.equal(r.datasets[0].selectionSha256,r.datasets[1].selectionSha256);
    await writeFile(join(root,'메신저','broken.json'),'not json');
    const broken=await survey(root,{documents:1,split},()=>{throw Error('must not run on invalid input');});
    assert.equal(broken.datasets[0].structurallyValid,false);assert.equal(broken.datasets[0].checkedUtterances,0);
  }finally{await rm(root,{recursive:true,force:true});}
});
