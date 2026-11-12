// Service-worker update regression. A hung optional model request must not
// prevent installation of a new version (especially installed iOS PWA).
// This is a deterministic unit test of the real SW template; no browser cache
// cleanup or persistent save mutation occurs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const raw=fs.readFileSync(new URL('../src/pwa/sw.js',import.meta.url),'utf8')
  .replace("'__VER__'","'test-new'")
  .replace('__SHELL__','{}')
  .replace('__ASSETS__',JSON.stringify(['assets/models/duncan.test.dgm','assets/models/worm.test.dgm']))
  .replace('__LAZY__','[]');
const handlers={};
const store=new Map();
const caches={
  async keys(){return ['dune-goh-old',...store.keys()];},
  async open(name){
    if(!store.has(name))store.set(name,new Map());
    const map=store.get(name);
    return {
      async match(url){return map.get(url)||null;},
      async put(url,r){map.set(url,r);},
      async keys(){return [...map.keys()].map(url=>({url}));},
      async delete(url){return map.delete(url);}
    };
  },
  async match(){return null;}
};
let hung=0, fetched=0, aborts=0;
function fetchFake(url,{signal}={}){
  if(String(url).includes('duncan.test.dgm')){
    hung++;
    return new Promise((resolve,reject)=>{
      const abort=()=>{aborts++;reject(new Error('aborted'));};
      if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    });
  }
  fetched++;
  return Promise.resolve({ok:true,clone(){return this;},headers:{},status:200});
}
let install;
const context={
  console, caches, fetch:fetchFake, Map, Set, JSON, URL, Promise, Response,
  crypto:globalThis.crypto,
  self:{
    registration:{scope:'https://example.test/game/'},
    addEventListener(k,fn){handlers[k]=fn;},
    skipWaiting(){return Promise.resolve();}
  },
  setTimeout(fn,ms){return globalThis.setTimeout(fn,ms===12000?35:ms);},
  clearTimeout:globalThis.clearTimeout,
};
vm.runInNewContext(raw,context,{filename:'sw.js'});
handlers.install({waitUntil(p){install=p;}});
const completed=await Promise.race([install.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),1000))]);
assert.equal(completed,true,'service worker install cannot wait for hung DGM');
assert.equal(hung,1,'hung asset actually requested');
assert.ok(aborts>=1,'stalled asset fetch aborted at bounded deadline');
assert.ok(fetched>=1,'other optional assets had opportunity to prefetch');
console.log('PASS SW update survives stalled 3D model, aborted='+aborts);
