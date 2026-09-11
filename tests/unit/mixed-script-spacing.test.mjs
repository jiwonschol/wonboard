import {test} from 'node:test';
import assert from 'node:assert/strict';
import {check} from '../../scripts/spelling-prototype.mjs';

test('Latin-script name notice and particle spacing are separate edits',()=>{
  for(const particle of ['에','를','에서','은']){
    const source='Imgur '+particle,findings=check(source),spacing=findings.find(f=>f.type==='spacing');
    assert.ok(spacing);
    assert.equal(source.slice(0,spacing.from)+spacing.suggestions[0]+source.slice(spacing.to),'Imgur'+particle);
    assert.ok(findings.some(f=>f.original==='Imgur'&&f.to<=spacing.from));
    assert.ok(check(source,['Imgur']).some(f=>f.type==='spacing'));
  }
  for(const source of ['Imgur\n에','https://example.com 에','`Imgur` 에','image.png 에'])assert.equal(check(source).filter(f=>f.type==='spacing').length,0,source);
});
