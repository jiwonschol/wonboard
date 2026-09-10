import {readFile} from 'node:fs/promises';
import {createChecker} from '../packages/editor/src/proofreading/engine.mjs';
const data=JSON.parse(await readFile(new URL('../third_party/spelling/generated/lexicon.json',import.meta.url),'utf8'));
data.morphology=JSON.parse(await readFile(new URL('../third_party/spelling/generated/morphology.json',import.meta.url),'utf8'));
export const check=createChecker(data);
