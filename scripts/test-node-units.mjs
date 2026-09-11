import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

// Expand filenames without shell globbing so npm test also covers Node's
// .mjs suites on Windows. Vitest owns the neighboring .test.ts suites.
const directory=new URL('../tests/unit/',import.meta.url);
const files=readdirSync(directory).filter(name=>name.endsWith('.test.mjs')).sort()
  .map(name=>fileURLToPath(new URL(name,directory)));
if(!files.length)throw Error('No Node unit tests found');
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
