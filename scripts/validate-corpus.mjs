import {readFile,writeFile,readdir,lstat,realpath,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join,relative,basename,sep} from 'node:path';

const project=fileURLToPath(new URL('../',import.meta.url));
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const partition=hash=>parseInt(hash.slice(0,8),16)%5===0?'holdout':'development';
const fail=()=>{throw Error('VALIDATION_FAILED');};

export function goldReport(cases,check){
  if(!Array.isArray(cases)||!cases.length)fail();
  const totals={cases:cases.length,expected:{spelling:0,spacing:0,unknown:0},detected:{spelling:0,spacing:0,unknown:0},top3:{spelling:0,spacing:0},unexpectedRecommendations:0,unexpectedUnknown:0};
  for(const c of cases){
    if(typeof c.text!=='string'||c.complete!==true||!Array.isArray(c.expected))fail();
    let end=0;
    for(const e of c.expected){
      if(!['spelling','spacing','unknown'].includes(e.type)||!Number.isInteger(e.from)||!Number.isInteger(e.to)||e.from<end||e.to<=e.from||e.to>c.text.length)fail();
      if(e.type!=='unknown'&&(!Array.isArray(e.suggestions)||!e.suggestions.length||e.suggestions.some(s=>typeof s!=='string')))fail();
      end=e.to;
    }
    if(c.personal!==undefined&&(!Array.isArray(c.personal)||c.personal.some(w=>typeof w!=='string'||!w.length)))fail();
    const findings=check(c.text,c.personal??[]);
    for(const e of c.expected){
      totals.expected[e.type]++;
      const matches=findings.filter(f=>f.type===e.type&&f.from===e.from&&f.to===e.to);
      if(matches.length)totals.detected[e.type]++;
      if(e.type!=='unknown'&&matches.some(f=>f.suggestions.slice(0,3).some(s=>e.suggestions.includes(s))))totals.top3[e.type]++;
    }
    for(const f of findings){
      const expected=c.expected.find(e=>e.type===f.type&&e.from===f.from&&e.to===f.to);
      if(f.type==='unknown'){if(!expected)totals.unexpectedUnknown++;}
      else totals.unexpectedRecommendations+=f.suggestions.filter(s=>!expected?.suggestions?.includes(s)).length;
    }
  }
  const missed=Object.fromEntries(Object.keys(totals.expected).map(type=>[type,totals.expected[type]-totals.detected[type]]));
  return {mode:'annotated',labelQuality:'Caller-supplied; annotation correctness and independence are not verified by this tool.',rangePolicy:'exact UTF-16 ranges; annotations must cover every reviewable expression',...totals,missed};
}

export function validDocument(doc){
  return doc&&typeof doc.id==='string'&&Array.isArray(doc.utterance)&&doc.utterance.every(u=>u&&typeof u.id==='string'&&typeof u.form==='string'&&typeof u.original_form==='string');
}

async function filesBelow(root){
  const files=[];
  async function walk(p){
    for(const e of (await readdir(p,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      const q=join(p,e.name);
      if(e.isSymbolicLink())fail();
      if(e.isDirectory())await walk(q);
      else if(e.isFile()&&e.name.endsWith('.json'))files.push(q);
    }
  }
  await walk(root);return files;
}

export async function survey(root,{documents=100,split='development',field='original_form'},check){
  if(!Number.isInteger(documents)||documents<1||documents>10000||!['development','holdout'].includes(split)||!['original_form','form'].includes(field))fail();
  const datasets=[];
  for(const [name,dirName] of [['messenger','메신저'],['online','온라인대화']]){
    const dirs=(await readdir(root,{withFileTypes:true})).filter(d=>d.name.normalize('NFC')===dirName);
    if(dirs.length!==1||!dirs[0].isDirectory())fail();
    const files=await filesBelow(join(root,dirs[0].name));
    if(!files.length)fail();
    const inventory=createHash('sha256'),seenIds=new Set(),seenContent=new Set(),selected=[];
    const stats={dataset:name,files:files.length,bytes:0,parseFailures:0,invalidDocuments:0,duplicateDocuments:0,duplicateContent:0,duplicateUtteranceIds:0,documents:0,eligibleDocuments:0,utterances:0,emptyUtterances:0,fieldDifferences:0};
    for(const file of files){
      const bytes=await readFile(file);stats.bytes+=bytes.length;
      inventory.update(relative(root,file));inventory.update(digest(bytes));
      let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{stats.parseFailures++;continue;}
      if(!data||!Array.isArray(data.document)){stats.invalidDocuments++;continue;}
      for(const doc of data.document){
        if(!validDocument(doc)){stats.invalidDocuments++;continue;}
        stats.documents++;
        const id=digest(doc.id);
        if(seenIds.has(id)){stats.duplicateDocuments++;continue;}seenIds.add(id);
        const ids=new Set();let duplicate=false;
        for(const u of doc.utterance){
          stats.utterances++;if(!u[field].trim())stats.emptyUtterances++;
          if(u.form!==u.original_form)stats.fieldDifferences++;
          if(ids.has(u.id)){stats.duplicateUtteranceIds++;duplicate=true;}ids.add(u.id);
        }
        if(duplicate)continue;
        // Group identical conversations before assigning a split. Do not split
        // utterances from one conversation between development and holdout.
        const key=digest(JSON.stringify(doc.utterance.map(u=>u.original_form)));
        if(seenContent.has(key)){stats.duplicateContent++;continue;}seenContent.add(key);
        if(partition(key)!==split)continue;stats.eligibleDocuments++;
        if(selected.length<documents||key<selected.at(-1).key){
          selected.push({key,texts:doc.utterance.map(u=>u[field])});
          selected.sort((a,b)=>a.key.localeCompare(b.key));if(selected.length>documents)selected.pop();
        }
      }
    }
    const observations={sampledDocuments:selected.length,checkedUtterances:0,emptySkipped:0,characters:0,withRecommendations:0,withUnknown:0,spellingFindings:0,spacingFindings:0,unknownFindings:0,analysisLimits:0,checkerFailures:0,medianMs:0,p95Ms:0,maxMs:0};
    const times=[];
    const structurallyValid=stats.parseFailures+stats.invalidDocuments+stats.duplicateDocuments+stats.duplicateUtteranceIds===0;
    if(structurallyValid)for(const doc of selected)for(const text of doc.texts){
      if(!text.trim()){observations.emptySkipped++;continue;}
      observations.checkedUtterances++;observations.characters+=text.length;
      const start=performance.now();let findings;
      try{findings=check(text);}catch{observations.checkerFailures++;continue;}
      times.push(performance.now()-start);
      if(findings.some(f=>f.suggestions.length))observations.withRecommendations++;
      if(findings.some(f=>f.type==='unknown'))observations.withUnknown++;
      for(const f of findings){
        if(f.type==='spelling')observations.spellingFindings++;
        if(f.type==='spacing')observations.spacingFindings++;
        if(f.type==='unknown')observations.unknownFindings++;
        if(f.reason?.includes('longer than 64'))observations.analysisLimits++;
      }
    }
    times.sort((a,b)=>a-b);
    if(times.length){observations.medianMs=times[Math.floor(times.length*.5)];observations.p95Ms=times[Math.min(times.length-1,Math.floor(times.length*.95))];observations.maxMs=times.at(-1);}
    const denominator=observations.checkedUtterances;
    datasets.push({...stats,structurallyValid,inventorySha256:inventory.digest('hex'),selectionSha256:digest(selected.map(s=>s.key).join('\n')),...observations,recommendationRate:denominator?observations.withRecommendations/denominator:null,unknownNoticeRate:denominator?observations.withUnknown/denominator:null});
  }
  return {mode:'unlabelled-survey',accuracy:null,falsePositiveRate:null,unknownRecall:null,reason:'No adjudicated gold labels. Source form is not assumed to be correct spelling.',split,field,documentsPerDataset:documents,datasets};
}

async function main(){
  const args=process.argv.slice(2),opts={};
  for(let i=0;i<args.length;i+=2){if(!['--documents','--split','--field','--labels','--output'].includes(args[i])||!args[i+1]||opts[args[i]]!==undefined)fail();opts[args[i]]=args[i+1];}
  const local=join(project,'local-corpora');
  if((await lstat(local)).isSymbolicLink()||await realpath(local)!==local)fail();
  const root=join(local,'nikl');if(await realpath(root)!==root)fail();
  const {check}=await import('./spelling-prototype.mjs');
  const fingerprints={};
  for(const file of ['scripts/spelling-prototype.mjs','packages/editor/src/proofreading/engine.mjs','packages/editor/src/proofreading/korean-morphology.mjs','packages/editor/src/proofreading/korean-orthography.mjs','packages/editor/src/proofreading/korean-context.mjs','third_party/spelling/generated/lexicon.json','third_party/spelling/generated/morphology.json'])fingerprints[file]=digest(await readFile(join(project,file)));
  let report;
  if(opts['--labels']){
    const file=await realpath(resolve(local,opts['--labels']));if(!file.startsWith(local+sep))fail();
    const bytes=await readFile(file);report={...goldReport(JSON.parse(bytes.toString('utf8')).cases,check),labelsSha256:digest(bytes)};
  }else report=await survey(root,{documents:Number(opts['--documents']??100),split:opts['--split']??'development',field:opts['--field']??'original_form'},check);
  report.engineFiles=fingerprints;report.validatorSha256=digest(await readFile(fileURLToPath(import.meta.url)));
  report.runtime=process.version;report.generatedAt=new Date().toISOString();
  const name=opts['--output']??`report-${Date.now()}.json`;
  if(name!==basename(name)||!name.endsWith('.json'))fail();
  const out=join(local,'reports');await mkdir(out,{recursive:true});if(await realpath(out)!==out)fail();
  await writeFile(join(out,name),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  // Only aggregate counts leave the process. Never print parsed records/errors.
  console.log(JSON.stringify(report,null,2));
  if(report.datasets?.some(d=>!d.structurallyValid||d.checkerFailures))process.exitCode=2;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(()=>{console.error('CORPUS_VALIDATION_FAILED: no source text or exception details emitted.');process.exitCode=1;});
