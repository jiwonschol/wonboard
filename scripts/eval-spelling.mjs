import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Own evaluator. No checker output contributes to expected answers.
export function compileCases(data) {
  return data.groups.flatMap((g, gi) => g.rows.map(([marked, ...allowed], i) => {
    const start = marked.indexOf('['), end = marked.indexOf(']');
    const erroneous = !['normal', 'protected'].includes(g.type);
    if (erroneous && (start < 0 || end < start || !allowed.length)) throw Error(`Invalid annotation ${gi}:${i}`);
    const text = erroneous ? marked.slice(0, start) + marked.slice(start + 1, end) + marked.slice(end + 1) : marked;
    return { id: `${g.language}-${g.type}-${i + 1}`, language: g.language, type: g.type,
      split: i < g.holdout ? 'holdout' : 'development', basis: g.basis,
      text, from: start, to: end - 1, allowed: allowed.map(s => text.slice(0, start) + s + text.slice(end - 1)) };
  }));
}

// Minimal character edit operations, with offsets in the unchanged UTF-16 source.
// Contiguous substitutions count as one event; missing spaces count per boundary.
export function edits(source, target) {
  const n = source.length, m = target.length;
  const dp = Array.from({length:n+1}, () => new Uint16Array(m+1));
  for (let i=0;i<=n;i++) dp[i][0]=i;
  for (let j=0;j<=m;j++) dp[0][j]=j;
  for(let i=1;i<=n;i++) for(let j=1;j<=m;j++) dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(source[i-1]===target[j-1]?0:1));
  let i=n,j=m; const raw=[];
  while(i||j) {
    if(i&&j&&source[i-1]===target[j-1]&&dp[i][j]===dp[i-1][j-1]) {i--;j--;}
    else if(i&&j&&dp[i][j]===dp[i-1][j-1]+1) {raw.push({from:i-1,to:i,text:target[j-1]});i--;j--;}
    else if(j&&dp[i][j]===dp[i][j-1]+1) {raw.push({from:i,to:i,text:target[j-1]});j--;}
    else {raw.push({from:i-1,to:i,text:''});i--;}
  }
  const merged=[];
  for(const e of raw.reverse()) {
    const p=merged.at(-1);
    if(p&&p.to===e.from) {p.to=e.to;p.text+=e.text;} else merged.push({...e});
  }
  return merged;
}
const key=e=>`${e.from}:${e.to}:${e.text}`;
const apply=(s,r,c)=>s.slice(0,r.from)+c+s.slice(r.to);
const fresh=()=>({cases:0,events:0,detected:0,top1:0,top3:0,exact:0,falseCases:0,falseSuggestions:0,unknown:0});

export async function evaluate(cases, check) {
  const totals=new Map(),failures=[];
  for(const c of cases) {
    const findings=await check(c.text, []);
    for(const f of findings) if(!Number.isInteger(f.from)||!Number.isInteger(f.to)||f.from<0||f.to>c.text.length||f.from>=f.to||f.original!==c.text.slice(f.from,f.to)||!Array.isArray(f.suggestions)) throw Error(`Invalid finding in ${c.id}`);
    const expected=c.allowed.length?edits(c.text,c.allowed[0]):[];
    const alternatives=c.allowed.map(s=>new Set(edits(c.text,s).map(key)));
    const actionable=findings.filter(f=>f.type!=='unknown');
    let detected=0,top1=0,top3=0;
    for(const e of expected) {
      const relevant=actionable.filter(f=>f.type===c.type&&f.from<=e.from&&f.to>=e.to);
      if(relevant.length) detected++;
      const correctAt=k=>relevant.some(f=>f.suggestions.slice(0,k).some(s=>{
        const changes=edits(c.text,apply(c.text,f,s));
        return changes.some(x=>key(x)===key(e))&&alternatives.some(a=>changes.every(x=>a.has(key(x))));
      }));
      if(correctAt(1)) top1++; if(correctAt(3)) top3++;
    }
    let revised=c.text,lastEnd=-1; const chosen=[];
    for(const f of [...actionable].sort((a,b)=>a.from-b.from)) if(f.suggestions.length&&f.from>=lastEnd){chosen.push(f);lastEnd=f.to;}
    for(const f of chosen.reverse()) revised=apply(revised,f,f.suggestions[0]);
    const exact=(c.allowed.length?c.allowed:[c.text]).includes(revised);
    const wrong=actionable.reduce((n,f)=>n+f.suggestions.filter(s=>{
      const changes=edits(c.text,apply(c.text,f,s));
      return changes.length&&!alternatives.some(a=>changes.every(e=>a.has(key(e))));
    }).length,0);
    const unknown=findings.filter(f=>f.type==='unknown').length;
    for(const split of ['all',c.split]) {
      const name=`${split}/${c.language}/${c.type}`;
      const t=totals.get(name)||fresh();
      t.cases++;t.events+=expected.length;t.detected+=detected;t.top1+=top1;t.top3+=top3;t.exact+=Number(exact);t.falseCases+=Number(wrong>0);t.falseSuggestions+=wrong;t.unknown+=unknown;totals.set(name,t);
    }
    if(!exact||wrong||detected<expected.length) failures.push({id:c.id,text:c.text,expected:c.allowed,detected,events:expected.length,findings,wrong});
  }
  return {totals:Object.fromEntries(totals),failures};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const args=process.argv.slice(2), option=name=>args[args.indexOf(name)+1];
  const data=JSON.parse(await readFile(args.includes('--cases')?option('--cases'):'tests/fixtures/spelling/cases.json','utf8'));
  const cases=compileCases(data);
  const checker=args.includes('--engine')?(await import(pathToFileURL(resolve(option('--engine'))))).check:async()=>[];
  const report=await evaluate(cases,checker);
  console.log(`Cases: ${cases.length}. Independent evaluation: ${data.independent}. Engine: ${args.includes('--engine')?option('--engine'):'empty baseline'}`);
  console.log('set | cases | detection | top1 | top3 | exact sentences | false-recommendation cases | wrong suggestions | unknown notices');
  for(const [name,t] of Object.entries(report.totals)) console.log(`${name} | ${t.cases} | ${t.detected}/${t.events} | ${t.top1}/${t.events} | ${t.top3}/${t.events} | ${t.exact}/${t.cases} | ${t.falseCases} | ${t.falseSuggestions} | ${t.unknown}`);
  const ko=Object.entries(report.totals).filter(([k])=>/^holdout\/ko\/(spelling|spacing)$/.test(k)).map(([,v])=>v);
  const count=ko.reduce((n,t)=>n+t.events,0), detected=ko.reduce((n,t)=>n+t.detected,0);
  const falseCases=report.totals['holdout/ko/normal']?.falseCases||0;
  console.log(`Early gate (holdout): Korean detection ${detected}/${count}; normal false-recommendation cases ${falseCases}; ${count&&detected/count>=.7&&falseCases<=3?'PASS':'FAIL'}`);
  console.log('Failures:'); console.log(JSON.stringify(report.failures,null,2));
}
