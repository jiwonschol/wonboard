import {readFile,writeFile} from 'node:fs/promises';
const path='public/THIRD_PARTY_NOTICES.txt',marker='=== Wonboard proofreading data ===';
const original=(await readFile(path,'utf8')).split(marker)[0].trimEnd();
const components=[
  ['Open Korean Text data (Apache-2.0), revision 74cc4ae7d3dab232747cd5ddb723e4b73c476e4f','third_party/spelling/open-korean-text/LICENSE'],
  ['MeCab Ko Dic data only (Apache-2.0), revision 12439fb32808b9244ded56d7dfed96e4b8d76869','third_party/spelling/mecab-ko-dic/COPYING'],
  ['English Speller Database / SCOWL data, revision 1e5b7d3a72f47a71da5d28686c1dd4b397178485','third_party/spelling/scowl/Copyright'],
];
const sections=await Promise.all(components.map(async([name,file])=>`${name}\nModified by Wonboard: selected fields and generated word lists. Original terms retained.\n\n${await readFile(file,'utf8')}`));
// Original files remain byte-for-byte intact; normalize trailing whitespace
// only in this combined display copy.
await writeFile(path,`${original}\n\n${marker}\n\n${sections.join('\n\n').replace(/[ \t]+$/gm,'').trimEnd()}\n`);
