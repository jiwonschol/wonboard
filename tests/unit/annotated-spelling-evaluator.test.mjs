import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAnnotatedRows,prepareAnnotatedCases} from '../../scripts/eval-annotated-spelling.mjs';

const row=(text,more={})=>({key:'a',text,classification:'errors',ranges:[],optional:[],protectedRanges:[],normalSentenceEligible:false,completeGold:true,adjudicationRequired:false,...more});
const range=(from,original,type,suggestions=[])=>({from,to:from+original.length,original,type,suggestions});

test('unfinished rows and conflicting duplicates reject before any predictions',async()=>{
  let calls=0; const check=()=>{calls++;return [];};
  await assert.rejects(evaluateAnnotatedRows([row('x',{completeGold:false})],check));
  await assert.rejects(evaluateAnnotatedRows([row('x',{classification:'unresolved'})],check));
  await assert.rejects(evaluateAnnotatedRows([row('x',{classification:'normal'}),row('x',{key:'b',ranges:[range(0,'x','spelling',['y'])]})],check),/Conflicting duplicate/);
  assert.equal(calls,0);
});

test('two disjoint corrections and overlapping unknown review remain separately measurable',async()=>{
  const r=row('ab cd',{ranges:[range(0,'ab','spelling',['ax']),range(3,'cd','spacing',['c d']),range(0,'ab','unknown')]});
  const report=await evaluateAnnotatedRows([r],()=>[range(0,'ab','spelling',['ax']),range(3,'cd','spacing',['c d']),range(0,'ab','unknown')]);
  assert.equal(report.firstSuggestionPrecision,1);assert.equal(report.unknownRecall,1);
  assert.equal(report.correctionMetrics['all/ko/combined'].exact,1);
  assert.equal(report.correctionMetrics['all/ko/combined'].top3,2);
  assert.equal(JSON.stringify(report).includes('ab cd'),false);
  assert.deepEqual(report.annotationDetection.spelling,{expected:1,detected:1,missed:0});
  assert.deepEqual(report.annotationDetection.spacing,{expected:1,detected:1,missed:0});
});

test('typed detection retains misses and excludes optional edits and unknown notices',async()=>{
  const r=row('ab cd ef gh',{ranges:[range(0,'ab','spelling',['ax']),range(3,'cd','spacing',['c d']),range(6,'ef','combined',['e z'])],optional:[range(9,'gh','spacing',['g h'])]});
  const report=await evaluateAnnotatedRows([r,{...r,key:'duplicate'}],()=>[range(0,'ab','unknown'),range(3,'cd','spelling',['wrong']),range(9,'gh','spacing',['g h'])]);
  assert.deepEqual(report.annotationDetection,{
    spelling:{expected:1,detected:0,missed:1},
    spacing:{expected:1,detected:1,missed:0},
    combined:{expected:1,detected:0,missed:1},
  });
  assert.equal(report.repeatedRows,1);
  assert.ok(report.firstSuggestionPrecision<1);
});

test('typed correction counts complete local repairs, not mutually exclusive partial options',async()=>{
  const r=row('잇',{ranges:[range(0,'잇','combined',[' 있'])]});
  for(const findings of [
    [range(0,'잇','spelling',[' 잇','있'])],
    [range(0,'잇','spelling',['있']),range(0,'잇','spacing',[' 잇'])],
  ]){
    const report=await evaluateAnnotatedRows([r],()=>findings);
    assert.deepEqual(report.annotationCorrection.combined,{expected:1,top1:0,top3:0});
  }
  const report=await evaluateAnnotatedRows([r],()=>[range(0,'잇','spelling',['잊',' 있'])]);
  assert.deepEqual(report.annotationCorrection.combined,{expected:1,top1:0,top3:1});
});

test('typed correction handles wider suggestions and nonoverlapping separate repairs',async()=>{
  const r=row('😀 ab cd',{ranges:[range(3,'ab','spelling',['ax']),range(6,'cd','spacing',['c d'])]});
  const report=await evaluateAnnotatedRows([r],()=>[range(3,'ab cd','spelling',['ax c d'])]);
  assert.deepEqual(report.annotationCorrection.spelling,{expected:1,top1:1,top3:1});
  assert.deepEqual(report.annotationCorrection.spacing,{expected:1,top1:1,top3:1});
  const combined=row('ab cd',{ranges:[range(0,'ab cd','combined',['ax c d'])]});
  const separate=await evaluateAnnotatedRows([combined],()=>[range(0,'ab','spelling',['ax']),range(3,'cd','spacing',['c d'])]);
  assert.deepEqual(separate.annotationCorrection.combined,{expected:1,top1:1,top3:1});
});

test('local correction success does not excuse damage outside that annotation',async()=>{
  const r=row('ab cd',{ranges:[range(0,'ab','spelling',['ax'])]});
  const report=await evaluateAnnotatedRows([r],()=>[range(0,'ab cd','spelling',['ax zz'])]);
  assert.equal(report.annotationCorrection.spelling.top1,1);
  assert.equal(report.firstSuggestionPrecision,0);
});

test('optional variants do not become required errors; repeated normal sentences count once',async()=>{
  const normal=row('A sentence.',{classification:'normal',normalSentenceEligible:true});
  const optional=row('pq',{key:'b',classification:'review',optional:[range(0,'pq','spacing',['p q'])]});
  const report=await evaluateAnnotatedRows([normal,{...normal,key:'c'},optional],()=>[]);
  assert.equal(report.repeatedRows,1);assert.equal(report.metrics.normalSentences,1);
  assert.equal(report.correctionMetrics['all/ko/optional'].events,0);
  assert.equal(report.firstSuggestionPrecision,null);
  assert.equal(report.normalFalseSuggestionRate,0);
});

test('wrong first choice is not rescued by a good second choice',async()=>{
  const report=await evaluateAnnotatedRows([row('ab',{ranges:[range(0,'ab','spelling',['ac'])]})],()=>[range(0,'ab','spelling',['az','ac'])]);
  assert.equal(report.firstSuggestionPrecision,0);
  assert.equal(report.correctionMetrics['all/ko/combined'].top3,1);
  assert.equal(report.correctionMetrics['all/ko/combined'].top1,0);
});

test('normal sentence notices have a separate denominator from corrections and expected reviews',async()=>{
  const normal=row('ab cd',{classification:'normal',normalSentenceEligible:true});
  const rows=[normal,{...normal,key:'duplicate'},
    row('ef gh',{key:'clean',classification:'normal',normalSentenceEligible:true}),
    row('fragment',{key:'fragment',classification:'normal'}),
    row('slang',{key:'review',classification:'review',ranges:[range(0,'slang','unknown')]}),
  ];
  const report=await evaluateAnnotatedRows(rows,text=>text==='ab cd'
    ?[range(0,'ab','unknown'),range(3,'cd','unknown')]
    :text==='ef gh'?[]:[range(0,text,'unknown')]);
  assert.equal(report.metrics.normalSentences,2);
  assert.equal(report.metrics.normalSentencesWithUnknownNotices,1);
  assert.equal(report.metrics.normalUnknownNotices,2);
  assert.equal(report.normalUnknownNoticeRate,0.5);
  assert.equal(report.normalFalseSuggestionRate,0);
  assert.equal(report.unknownRecall,1);
  assert.equal(report.metrics.unexpectedUnknown,3);
  const noSentences=await evaluateAnnotatedRows([rows[3]],()=>[]);
  assert.equal(noSentences.normalUnknownNoticeRate,null);
});

test('a complete alternative answer is counted even when its edits differ from the first gold answer',async()=>{
  const r=row('ab',{ranges:[range(0,'ab','spelling',['cd','ef'])]});
  for (const suggestions of [['ef'],['zz','ef']]) {
    const report=await evaluateAnnotatedRows([r],()=>[range(0,'ab','spelling',suggestions)]);
    const metrics=report.correctionMetrics['all/ko/combined'];
    assert.equal(metrics.top1,suggestions.length===1?1:0);
    assert.equal(metrics.top3,1);
    assert.equal(report.firstSuggestionPrecision,suggestions.length===1?1:0);
  }
});

test('separate buttons can produce an alternative answer without combining overlapping ranges',async()=>{
  const r=row('ab cd',{ranges:[range(0,'ab','spelling',['xy','ef']),range(3,'cd','spelling',['uv','gh'])]});
  for(const first of [true,false]) {
    const report=await evaluateAnnotatedRows([r],()=>[
      range(0,'ab','spelling',first?['ef']:['zz','ef']),
      range(3,'cd','spelling',first?['gh']:['zz','gh']),
    ]);
    const t=report.correctionMetrics['all/ko/combined'];
    assert.equal(t.top1,first?t.events:0);
    assert.equal(t.top3,t.events);
  }
  const overlap=row('ab',{ranges:[range(0,'ab','spelling',['xy','ef'])]});
  const report=await evaluateAnnotatedRows([overlap],()=>[
    range(0,'ab','spelling',['eb']),range(1,'b','spelling',['f']),
  ]);
  assert.equal(report.correctionMetrics['all/ko/combined'].top3,0);
});

test('a review notice cannot satisfy a correction, and wrong normal-text choices count',async()=>{
  const error=row('ab',{ranges:[range(0,'ab','spelling',['ac'])]});
  const normal=row('xy',{key:'b',classification:'normal',normalSentenceEligible:true});
  const report=await evaluateAnnotatedRows([error,normal],text=>text==='ab'?[range(0,'ab','unknown')]:[range(0,'xy','spelling',['xz'])]);
  assert.equal(report.correctionMetrics['all/ko/combined'].top3,0);
  assert.equal(report.metrics.unexpectedUnknown,1);
  assert.equal(report.normalFalseSuggestionRate,1);
});

test('failure totals include missing and unexpected reviews without double counting rows',async()=>{
  const rows=[
    row('slang',{key:'missing',classification:'review',ranges:[range(0,'slang','unknown')]}),
    row('normal',{key:'unexpected',classification:'normal',normalSentenceEligible:true}),
    row('ab',{key:'both',ranges:[range(0,'ab','spelling',['ac']),range(0,'ab','unknown')]}),
  ];
  const report=await evaluateAnnotatedRows(rows,text=>text==='normal'?[range(0,text,'unknown')]:[]);
  assert.equal(report.correctionFailureCount,1);
  assert.equal(report.reviewFailureCount,3);
  assert.equal(report.failureCount,3);
  const reviewOnly=await evaluateAnnotatedRows([rows[0]],()=>[]);
  assert.equal(reviewOnly.correctionFailureCount,0);
  assert.equal(reviewOnly.failureCount,1);
  const pass=await evaluateAnnotatedRows([rows[0]],()=>[range(0,'slang','unknown')]);
  assert.equal(pass.reviewFailureCount,0);
  assert.equal(pass.failureCount,0);
});

test('invalid ranges, intersecting corrections and empty actionable results fail explicitly',async()=>{
  assert.throws(()=>prepareAnnotatedCases([row('abc',{ranges:[range(0,'ab','spelling',['xy']),range(1,'bc','spelling',['yz'])]})]));
  assert.throws(()=>prepareAnnotatedCases([row('abc',{ranges:[range(0,'wrong','spelling',['x'])]})]));
  await assert.rejects(evaluateAnnotatedRows([row('abc',{classification:'normal'})],()=>[range(0,'abc','spelling',[])]),/Invalid checker event/);
});

test('duplicate unknown annotations cannot inflate recall and reject before predictions',async()=>{
  let calls=0;
  const notice=range(0,'abc','unknown');
  await assert.rejects(evaluateAnnotatedRows([row('abc',{classification:'review',ranges:[notice,{...notice}]})],()=>{calls++;return [notice];}),/Duplicate event range/);
  assert.equal(calls,0);
});

test('duplicate checker events cannot inflate precision or unknown counts',async()=>{
  const correction=range(0,'ab','spelling',['ac']);
  const r=row('ab',{ranges:[correction]});
  for (const event of [correction,range(0,'ab','unknown')]) {
    await assert.rejects(evaluateAnnotatedRows([r],()=>[event,{...event}]),/Duplicate event range/);
  }
});

test('an error label without a required correction rejects before predictions',async()=>{
  let calls=0;
  for (const ranges of [[],[range(0,'abc','unknown')]]) {
    await assert.rejects(evaluateAnnotatedRows([row('abc',{ranges})],()=>{calls++;return [];}),/no required correction/);
  }
  assert.equal(calls,0);
});

test('required and optional answers cannot change protected name characters',()=>{
  const protectedRanges=[{from:0,to:2,original:'가나'}];
  for (const replacement of ['다나 는','가 나 는']) {
    assert.throws(()=>prepareAnnotatedCases([row('가나는',{protectedRanges,ranges:[range(0,'가나는','spacing',[replacement])]})]),/changes protected text/);
    assert.throws(()=>prepareAnnotatedCases([row('가나는',{classification:'names',protectedRanges,optional:[range(0,'가나는','spacing',[replacement])]})]),/changes protected text/);
  }
});

test('a correction around a protected name can retain it and change a boundary',()=>{
  const [c]=prepareAnnotatedCases([row('가나는',{protectedRanges:[{from:0,to:2,original:'가나'}],ranges:[range(0,'가나는','spacing',['가나 는'])]})]).cases;
  assert.deepEqual(c.allowed,['가나 는']);
});

test('protected text damage counts even in a secondary suggestion; unknown notices are allowed',async()=>{
  const r=row('가나는',{classification:'names',protectedRanges:[{from:0,to:2,original:'가나'}],optional:[range(0,'가나는','spacing',['가나 는'])]});
  const bad=await evaluateAnnotatedRows([r],()=>[range(0,'가나는','spacing',['가나 는','다나 는'])]);
  assert.equal(bad.metrics.protectedRows,1);
  assert.equal(bad.metrics.protectedRowsWithWrongSuggestions,1);
  const safe=await evaluateAnnotatedRows([r],()=>[range(0,'가나','unknown')]);
  assert.equal(safe.metrics.protectedRowsWithWrongSuggestions,0);
});
