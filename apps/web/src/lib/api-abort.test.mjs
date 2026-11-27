import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('API abort cancels a pending request and preserves AbortError rather than a network-error message', async () => {
 const originalFetch=globalThis.fetch;
 globalThis.__studioApiFixture={authStore:{token:'',isValid:false},buildURL:p=>p};
 const source=fs.readFileSync(new URL('./api.js',import.meta.url),'utf8').replace("import pb from './pb';",'const pb=globalThis.__studioApiFixture;');
 try {
  const {api,ApiError}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const ac=new AbortController();
  globalThis.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{
   assert.equal(signal,ac.signal);
   signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
  });
  const pending=api('studios/test/launch',{query:{mode:'guided'},signal:ac.signal});
  ac.abort();
  await assert.rejects(pending,e=>e.name==='AbortError'&&!(e instanceof ApiError));
  globalThis.fetch=async()=>{throw Error('offline');};
  await assert.rejects(api('studios'),e=>e instanceof ApiError&&e.status===0);
 } finally {globalThis.fetch=originalFetch;delete globalThis.__studioApiFixture;}
});
