import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const file=p=>new URL('../../'+p,import.meta.url);
test('retired checker is neither a dependency nor a distributable dictionary',async()=>{
  const manifest=JSON.parse(await readFile(file('packages/editor/package.json'),'utf8'));
  assert.equal(manifest.dependencies['hunspell-asm'],undefined);
  assert.doesNotMatch(await readFile(file('pnpm-lock.yaml'),'utf8'),/hunspell-asm|emscripten-wasm-loader/);
  for(const path of ['public/spelling/ko/ko.aff','public/spelling/ko/ko.dic','packages/editor/src/spelling.worker.ts'])await assert.rejects(access(file(path)),{code:'ENOENT'});
});
