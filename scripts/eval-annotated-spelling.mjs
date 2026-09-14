import {edits, evaluate, canProduceAnswer} from './eval-spelling.mjs';

// Accepts adjudicated rows, not corpus files. Does not certify the caller's
// linguistic judgments or independence, and never returns source text.
const signature = row => JSON.stringify({
  classification: row.classification,
  ranges: [...row.ranges].map(r => ({...r, suggestions: [...r.suggestions].sort()})).sort((a,b) => a.from-b.from || a.to-b.to),
  optional: [...row.optional].map(r => ({...r, suggestions: [...r.suggestions].sort()})).sort((a,b) => a.from-b.from || a.to-b.to),
  protectedRanges: [...row.protectedRanges].sort((a,b) => a.from-b.from || a.to-b.to),
  normalSentenceEligible: row.normalSentenceEligible,
});
const editKey = e => JSON.stringify([e.from,e.to,e.text]);
const fail = message => { throw Error(message); };
const touchesProtected = (range,suggestion,protectedRanges) => edits(range.original,suggestion,false).some(e => protectedRanges.some(p => {
  const from=range.from+e.from, to=range.from+e.to;
  return from===to ? p.from<from && from<p.to : from<p.to && to>p.from;
}));

function validateRange(text, range, suggestions = true) {
  if (!Number.isInteger(range.from) || !Number.isInteger(range.to) || range.from < 0 || range.to <= range.from || range.to > text.length || range.original !== text.slice(range.from,range.to)) fail('Invalid annotation range');
  if (suggestions && (!Array.isArray(range.suggestions) || range.suggestions.some(s => typeof s !== 'string' || s === range.original))) fail('Invalid annotation suggestions');
}

function rejectDuplicateEvents(events) {
  const seen = new Set();
  for (const event of events) {
    const key = JSON.stringify([event.from,event.to,event.type]);
    if (seen.has(key)) fail('Duplicate event range');
    seen.add(key);
  }
}

// Shared by provisional annotation compilation and final evaluation. This
// checks already parsed ranges only; it never certifies finality or runs a model.
export function validateAnnotationConsistency(row) {
  if (row.classification === 'errors' && !row.ranges.some(r => r.type !== 'unknown')) fail('Error annotation has no required correction');
  const changes=[...row.ranges.filter(r => r.type !== 'unknown'),...row.optional].sort((a,b)=>a.from-b.from);
  let end=0;
  for (const range of changes) {
    if (range.from<end) fail('Overlapping correction annotations');
    end=range.to;
    for (const suggestion of range.suggestions) {
      if (touchesProtected(range,suggestion,row.protectedRanges)) fail('Annotation changes protected text');
    }
  }
}

export function prepareAnnotatedCases(rows) {
  if (!Array.isArray(rows) || !rows.length) fail('No annotations');
  const groups = new Map(), keys = new Set();
  for (const row of rows) {
    if (typeof row.key !== 'string' || keys.has(row.key)) fail('Duplicate or invalid annotation key');
    keys.add(row.key);
    if (typeof row.text !== 'string' || !Array.isArray(row.ranges) || !Array.isArray(row.optional) || !Array.isArray(row.protectedRanges)) fail('Invalid annotation row');
    if (!['normal','errors','review','mixed','names','unresolved','excluded'].includes(row.classification)) fail('Invalid classification');
    // Reject the entire input before calling the engine: silent filtering would
    // let the easiest final rows determine the reported quality.
    if (row.completeGold !== true || row.adjudicationRequired !== false || ['unresolved','excluded'].includes(row.classification)) fail('Unfinished annotations cannot be evaluated');
    if (typeof row.normalSentenceEligible !== 'boolean' || row.normalSentenceEligible && row.classification !== 'normal') fail('Invalid normal sentence eligibility');
    for (const range of row.ranges) {
      validateRange(row.text,range);
      if (!['spelling','spacing','combined','unknown'].includes(range.type) || (range.type === 'unknown' ? range.suggestions.length !== 0 : range.suggestions.length === 0)) fail('Invalid annotation event');
    }
    // A correction and an unknown notice may overlap, but the same event must
    // never increase a denominator or precision numerator twice.
    rejectDuplicateEvents(row.ranges);
    for (const range of row.optional) {
      validateRange(row.text,range);
      if (!range.suggestions.length) fail('Empty optional annotation');
    }
    for (const range of row.protectedRanges) validateRange(row.text,range,false);
    if (row.classification === 'normal' && (row.ranges.length || row.protectedRanges.length)) fail('Normal annotation contains required or protected ranges');
    validateAnnotationConsistency(row);
    const group = groups.get(row.text) ?? [];
    group.push(row); groups.set(row.text,group);
  }
  const cases = [], selected = [];
  for (const group of groups.values()) {
    if (new Set(group.map(signature)).size > 1) fail('Conflicting duplicate annotations');
    const row = group[0];
    const required = row.ranges.filter(r => r.type !== 'unknown');
    const changes = [...required.map(r => ({...r, choices:r.suggestions})), ...row.optional.map(r => ({...r, choices:[r.original,...r.suggestions]}))].sort((a,b) => a.from-b.from);
    let end = 0, targets = [''];
    for (const range of changes) {
      if (range.from < end) fail('Overlapping correction annotations');
      // Never truncate acceptable answers to make evaluation faster.
      if (targets.length * range.choices.length > 256) fail('Too many annotation alternatives');
      targets = targets.flatMap(prefix => range.choices.map(choice => prefix + row.text.slice(end,range.from) + choice));
      end = range.to;
    }
    const allowed = changes.length ? [...new Set(targets.map(prefix => prefix + row.text.slice(end)))] : [];
    selected.push(row);
    cases.push({id:row.key,text:row.text,language:'ko',split:'holdout',type:required.length?'combined':changes.length?'optional':'normal',allowed});
  }
  return {cases, rows:selected, inputRows:rows.length, repeatedRows:rows.length-cases.length};
}

export async function evaluateAnnotatedRows(rows, check) {
  const prepared = prepareAnnotatedCases(rows);
  const findingsByText = new Map();
  const report = await evaluate(prepared.cases, async text => {
    const findings = await check(text, []);
    if (!Array.isArray(findings)) fail('Invalid checker result');
    for (const f of findings) {
      validateRange(text,f);
      if (!['spelling','spacing','unknown'].includes(f.type) || (f.type === 'unknown' ? f.suggestions.length !== 0 : f.suggestions.length === 0)) fail('Invalid checker event');
    }
    rejectDuplicateEvents(findings);
    findingsByText.set(text,findings);
    return findings;
  });
  const metrics = {firstSuggestions:0, correctFirstSuggestions:0, normalSentences:0, normalSentencesWithWrongSuggestions:0, normalSentencesWithUnknownNotices:0, normalUnknownNotices:0, expectedUnknown:0, detectedUnknown:0, unexpectedUnknown:0, protectedRows:0, protectedRowsWithWrongSuggestions:0};
  // Keep adjudicated event types separate from character-edit denominators.
  // Overlap measures detection only; it does not establish a correct repair.
  const annotationDetection=Object.fromEntries(['spelling','spacing','combined'].map(type=>[type,{expected:0,detected:0,missed:0}]));
  const annotationCorrection=Object.fromEntries(['spelling','spacing','combined'].map(type=>[type,{expected:0,top1:0,top3:0}]));
  const correctionFailures=new Set(report.failures.map(f=>f.id)), reviewFailures=new Set();
  for (let i=0;i<prepared.rows.length;i++) {
    const row=prepared.rows[i], c=prepared.cases[i], findings=findingsByText.get(row.text);
    for(const event of row.ranges.filter(r=>r.type!=='unknown')){
      const counts=annotationDetection[event.type];
      counts.expected++;
      const detected=findings.some(f=>f.type!=='unknown'&&f.from<event.to&&f.to>event.from);
      counts[detected?'detected':'missed']++;
      const correction=annotationCorrection[event.type];
      correction.expected++;
      const local=findings.filter(f=>f.type!=='unknown'&&f.from<event.to&&f.to>event.from).map(f=>{
        const from=Math.max(f.from,event.from),to=Math.min(f.to,event.to);
        const original=row.text.slice(from,to);
        return {from:from-event.from,to:to-event.from,suggestions:f.suggestions.map(s=>{
          const changes=edits(f.original,s).map(e=>({...e,from:e.from+f.from,to:e.to+f.from}));
          // A change crossing the annotated boundary cannot be attributed
          // safely. Preserve its rank as a no-op, never promote later options.
          if(changes.some(e=>e.from<from&&e.to>from||e.from<to&&e.to>to))return original;
          let replacement=original;
          for(const e of changes.filter(e=>e.from>=from&&e.to<=to).reverse())replacement=replacement.slice(0,e.from-from)+e.text+replacement.slice(e.to-from);
          return replacement;
        })};
      });
      for(const k of [1,3])if(event.suggestions.some(target=>canProduceAnswer(event.original,target,local,k)))correction['top'+k]++;
    }
    if (row.protectedRanges.length) {
      metrics.protectedRows++;
      metrics.protectedRowsWithWrongSuggestions+=Number(findings.some(f => f.suggestions.some(s => touchesProtected(f,s,row.protectedRanges))));
    }
    const alternatives=c.allowed.map(target => new Set(edits(row.text,target,false).map(editKey)));
    let wrong=false;
    for (const f of findings.filter(f => f.type !== 'unknown')) {
      metrics.firstSuggestions++;
      const changes=edits(row.text,row.text.slice(0,f.from)+f.suggestions[0]+row.text.slice(f.to),false);
      if (changes.length && alternatives.some(a => changes.every(e => a.has(editKey(e))))) metrics.correctFirstSuggestions++;
      // A permitted alternative is still normal. Check every displayed choice,
      // including later choices that would damage an otherwise correct sentence.
      if (f.suggestions.some(s => {
        const candidateEdits=edits(row.text,row.text.slice(0,f.from)+s+row.text.slice(f.to),false);
        return candidateEdits.length && !alternatives.some(a => candidateEdits.every(e => a.has(editKey(e))));
      })) wrong=true;
    }
    if (row.normalSentenceEligible) {
      metrics.normalSentences++;
      metrics.normalSentencesWithWrongSuggestions+=Number(wrong);
    }
    const expected=row.ranges.filter(r => r.type === 'unknown');
    const actual=findings.filter(f => f.type === 'unknown');
    if (row.normalSentenceEligible) {
      metrics.normalSentencesWithUnknownNotices+=Number(actual.length>0);
      metrics.normalUnknownNotices+=actual.length;
    }
    const same=(a,b)=>a.from===b.from && a.to===b.to;
    metrics.expectedUnknown+=expected.length;
    metrics.detectedUnknown+=expected.filter(e => actual.some(a => same(a,e))).length;
    metrics.unexpectedUnknown+=actual.filter(a => !expected.some(e => same(a,e))).length;
    if(expected.some(e=>!actual.some(a=>same(a,e)))||actual.some(a=>!expected.some(e=>same(a,e))))reviewFailures.add(row.key);
  }
  const ratio=(n,d)=>d?n/d:null;
  return {
    status:'Caller-supplied final annotations; correctness and independence not certified',
    inputRows:prepared.inputRows, uniqueRows:prepared.cases.length, repeatedRows:prepared.repeatedRows,
    metrics, firstSuggestionPrecision:ratio(metrics.correctFirstSuggestions,metrics.firstSuggestions),
    normalFalseSuggestionRate:ratio(metrics.normalSentencesWithWrongSuggestions,metrics.normalSentences),
    normalUnknownNoticeRate:ratio(metrics.normalSentencesWithUnknownNotices,metrics.normalSentences),
    unknownRecall:ratio(metrics.detectedUnknown,metrics.expectedUnknown),
    annotationDetection, annotationCorrection, correctionMetrics:report.totals,
    correctionFailureCount:correctionFailures.size, reviewFailureCount:reviewFailures.size,
    failureCount:new Set([...correctionFailures,...reviewFailures]).size,
    failureCountDefinition:'Unique rows with a correction failure, missing expected review notice, or unexpected review notice; overlapping failure types count once.',
    annotationCorrectionLimitations:['Scores complete repairs within each gold span independently, not safe whole-sentence correction.', 'Changes crossing a gold boundary are not attributed; deterministic edit alignment can undercount equivalent repairs.', 'No source text is returned; global first-suggestion precision still counts changes outside the target span.'],
    limitations:['Correction coverage counts edit events, not utterances.', 'Edit-event denominators use a stable minimum-change accepted answer, not all linguistic errors.', 'Annotation detection counts overlapping actionable findings by gold type; it does not measure correct repairs.', 'Unknown notices require exact UTF-16 ranges.', 'Exact-text duplicates count once; this does not prove sampling independence.'],
  };
}
