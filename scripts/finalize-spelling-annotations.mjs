import {createHash} from 'node:crypto';
import {prepareAnnotatedCases} from './eval-annotated-spelling.mjs';

// Bookkeeping for a completed linguistic review, not a substitute for one.
// No engine call, file mutation, row sampling, or automatic approval occurs here.
export function finalizeReviewedAnnotations(snapshotBytes, review) {
  const digest=createHash('sha256').update(snapshotBytes).digest('hex');
  if(review?.snapshotSha256!==digest)throw Error('Review does not match annotation snapshot');
  const snapshot=JSON.parse(snapshotBytes.toString());
  if(snapshot.predictionsRun!==false||review.predictionsConsulted!==false)throw Error('Blind review status missing or invalid');
  const nonempty=value=>typeof value==='string'&&value.trim().length>0;
  if(!nonempty(review.reviewer)||!nonempty(review.method)||!Array.isArray(review.decisions))throw Error('Missing review provenance');
  if(!Array.isArray(snapshot.rows)||!snapshot.rows.length)throw Error('No annotation rows');
  const decisions=new Map();
  for(const decision of review.decisions){
    if(!nonempty(decision.key)||decisions.has(decision.key)||!nonempty(decision.reason)||!['accept','exclude'].includes(decision.outcome))throw Error('Invalid or duplicate review decision');
    decisions.set(decision.key,decision);
  }
  if(decisions.size!==snapshot.rows.length)throw Error('Review must cover every source row');
  const rows=[],excluded=[],seen=new Set();
  for(const row of snapshot.rows){
    if(seen.has(row.key))throw Error('Duplicate source key');
    seen.add(row.key);
    const decision=decisions.get(row.key);
    if(!decision)throw Error('Review must cover every source row');
    if(row.classification==='unresolved'||row.adjudicationRequired!==false)throw Error('Unresolved row cannot be finalized or silently excluded');
    if(row.classification==='excluded'){
      if(decision.outcome!=='exclude')throw Error('Excluded row needs explicit exclusion decision');
      excluded.push({key:row.key,reason:decision.reason});
    }else{
      if(decision.outcome!=='accept')throw Error('Review cannot discard an evaluable row');
      rows.push({...row,completeGold:true});
    }
  }
  // Validate the entire accepted set, including conflicts and protected spans.
  // This function does not certify that these judgments are linguistically true.
  const prepared=prepareAnnotatedCases(rows);
  return {status:'review-recorded; linguistic correctness not certified',snapshotSha256:digest,
    reviewer:review.reviewer,method:review.method,predictionsConsulted:false,
    sourceRows:snapshot.rows.length,evaluationRows:rows.length,repeatedRows:prepared.repeatedRows,
    excluded,decisions:review.decisions,rows};
}
