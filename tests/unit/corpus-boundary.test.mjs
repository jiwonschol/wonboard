import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'vite';

test('Vite cannot serve private corpus files through either file route',async()=>{
  await mkdir(resolve('local-corpora'),{recursive:true});
  const dir=await mkdtemp(resolve('local-corpora/boundary-test-'));
  const file=join(dir,'probe.txt');let server;
  try{
    await writeFile(file,'SYNTHETIC_CORPUS_SENTINEL');
    server=await createServer({configFile:resolve('vite.config.ts'),logLevel:'silent',server:{host:'127.0.0.1',port:0,open:false}});
    await server.listen();
    const base=`http://127.0.0.1:${server.httpServer.address().port}`;
    for(const route of [`/local-corpora/${dir.split('/').at(-1)}/probe.txt`,`/@fs${file}`]){
      const response=await fetch(base+route);
      assert.equal(response.status,403);assert.equal((await response.text()).includes('SYNTHETIC_CORPUS_SENTINEL'),false);
    }
  }finally{await server?.close();await rm(dir,{recursive:true,force:true});}
});
