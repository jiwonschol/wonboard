import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createChecker} from '../packages/editor/src/proofreading/engine.mjs';
import {compileCases,evaluate} from './eval-spelling.mjs';

// Development diagnostics only. Retain every existing English fixture,
// including disputed annotations; never consume the Korean private holdout.
export async function compareEnglishCandidate(candidatePath) {
  const load=async location=>{
    const bytes=await readFile(location);
    return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};
  };
  const baseline=await load(new URL('../third_party/spelling/generated/lexicon.json',import.meta.url));
  const candidate=await load(candidatePath);
  if(!Array.isArray(candidate.data.en)||!candidate.data.en.length||candidate.data.en.some(word=>typeof word!=='string'||!word.length))throw Error('Candidate must contain a nonempty en word array');
  const checks=[['existing',createChecker(baseline.data)],['candidate',createChecker({...baseline.data,en:candidate.data.en})]];
  const reports=[];
  for(const file of ['cases.json','fresh-v2.json','fresh-v4.json']){
    const fixture=await load(new URL('../tests/fixtures/spelling/'+file,import.meta.url));
    const cases=compileCases(fixture.data).filter(row=>row.language==='en');
    for(const [name,check] of checks){
      const result=await evaluate(cases,check);
      reports.push({file,fixtureSha256:fixture.sha256,name,count:cases.length,
        totals:Object.fromEntries(Object.entries(result.totals).filter(([key])=>key.startsWith('all/'))),failures:result.failures});
    }
  }
  return {diagnosticOnly:true,independentEvaluation:false,
    baselineSha256:baseline.sha256,candidateSha256:candidate.sha256,
    annotationCautions:[
      {original:'accidently',reason:'Dictionary-attested variant; mandatory correction annotation needs review.',source:'https://www.merriam-webster.com/dictionary/accidently'},
      {original:'calender',reason:'Existing word; Check your calender does not establish calendar as the only intended meaning.',source:'https://www.merriam-webster.com/dictionary/calender'},
    ],reports};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==3)throw Error('Usage: node scripts/compare-english-candidate.mjs /path/to/english-with-basics.json');
  console.log(JSON.stringify(await compareEnglishCandidate(resolve(process.argv[2])),null,2));
}
