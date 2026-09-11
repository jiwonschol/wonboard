import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {finalizeReviewedAnnotations} from '../../scripts/finalize-spelling-annotations.mjs';

const normal={key:'a',text:'오늘입니다.',classification:'normal',ranges:[],optional:[],protectedRanges:[],normalSentenceEligible:true,adjudicationRequired:false,completeGold:false};
function fixture(rows=[normal]){
  const bytes=Buffer.from(JSON.stringify({predictionsRun:false,rows}));
  return {bytes,review:{snapshotSha256:createHash('sha256').update(bytes).digest('hex'),reviewer:'test reviewer',method:'synthetic fixture only',predictionsConsulted:false,decisions:rows.map(row=>({key:row.key,outcome:row.classification==='excluded'?'exclude':'accept',reason:'Synthetic decision for structural test'}))}};
}
test('finalization retains source coverage and exclusions without changing input',()=>{
  const {bytes,review}=fixture([normal,{...normal,key:'b',classification:'excluded',normalSentenceEligible:false}]);
  const result=finalizeReviewedAnnotations(bytes,review);
  assert.equal(result.sourceRows,2);assert.equal(result.evaluationRows,1);assert.equal(result.excluded.length,1);
  assert.equal(result.rows[0].completeGold,true);assert.equal(JSON.parse(bytes).rows[0].completeGold,false);
  assert.deepEqual(result.decisions,review.decisions);
});
test('stale snapshot, exposed predictions, or missing row review reject',()=>{
  const {bytes,review}=fixture();
  assert.throws(()=>finalizeReviewedAnnotations(Buffer.concat([bytes,Buffer.from(' ')]),review),/snapshot/);
  assert.throws(()=>finalizeReviewedAnnotations(bytes,{...review,predictionsConsulted:true}),/Blind/);
  assert.throws(()=>finalizeReviewedAnnotations(bytes,{...review,decisions:[]}),/every/);
  assert.throws(()=>finalizeReviewedAnnotations(bytes,{...review,reviewer:''}),/provenance/);
});
test('unresolved rows and convenient exclusion cannot bypass review',()=>{
  let {bytes,review}=fixture([{...normal,classification:'unresolved',adjudicationRequired:true}]);
  assert.throws(()=>finalizeReviewedAnnotations(bytes,review),/Unresolved/);
  review.decisions[0].outcome='exclude';
  assert.throws(()=>finalizeReviewedAnnotations(bytes,review),/Unresolved/);
  ({bytes,review}=fixture());review.decisions[0].outcome='exclude';
  assert.throws(()=>finalizeReviewedAnnotations(bytes,review),/discard/);
});
test('duplicate or substituted decision keys and invalid annotations reject',()=>{
  let {bytes,review}=fixture([normal,{...normal,key:'b'}]);
  review.decisions[1].key='a';assert.throws(()=>finalizeReviewedAnnotations(bytes,review),/duplicate/);
  review.decisions[1].key='other';assert.throws(()=>finalizeReviewedAnnotations(bytes,review),/every/);
  ({bytes,review}=fixture([{...normal,ranges:[{from:0,to:1,original:'x',type:'unknown',suggestions:[]}]}]));
  assert.throws(()=>finalizeReviewedAnnotations(bytes,review),/range/);
});
