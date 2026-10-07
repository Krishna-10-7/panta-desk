import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadCache, createUpstreamBudget } from '../lib/read-controls.mjs';
import { createPantaClient } from '../lib/panta.mjs';
import { getListenOptions } from '../server.mjs';

test('local listening remains private and public hosting requires an explicit host', () => {
  assert.deepEqual(getListenOptions({}),{host:'127.0.0.1',port:4173});
  assert.deepEqual(getListenOptions({HOST:'0.0.0.0',PORT:'10000'}),{host:'0.0.0.0',port:10000});
  for(const env of [{HOST:''},{HOST:'evil.example'},{PORT:'-1'},{PORT:'not a port'}]) assert.throws(()=>getListenOptions(env));
});
test('shared budget bounds upstream starts and honors cooldown', () => {
  let time=0; const budget=createUpstreamBudget({clock:()=>time});
  for(let i=0;i<100;i++)budget.reserve();
  assert.throws(()=>budget.reserve(),error=>error.code==='DESK_RATE_LIMIT'&&error.retryAfter===60);
  time=60000;budget.reserve();
  assert.equal(budget.coolDown(90),90);
  time+=89000;assert.throws(()=>budget.reserve(),error=>error.code==='PANTA_RATE_LIMIT'&&error.retryAfter===1);
  time+=1000;budget.reserve();
});
test('cached reads coalesce, keep original retrieval time and isolate returned objects', async () => {
  let time=0,calls=0,release;
  const cache=createReadCache({clock:()=>time}),route={kind:'markets',query:{limit:'20',category:'science'}};
  const load=async()=>{calls++;await new Promise(resolve=>{release=resolve});return{data:{items:[]},meta:{retrievedAt:'original-time'}}};
  const one=cache.read(route,load),two=cache.read({...route,query:{category:'science',limit:'20'}},load);
  await Promise.resolve();release();
  const [a,b]=await Promise.all([one,two]);assert.equal(calls,1);a.meta.retrievedAt='changed';assert.equal(b.meta.retrievedAt,'original-time');
  time=29999;assert.equal((await cache.read(route,load)).meta.retrievedAt,'original-time');assert.equal(calls,1);
  time=30000;const fresh=await cache.read(route,async()=>{calls++;return{data:{items:[]},meta:{retrievedAt:'fresh-time'}}});
  assert.equal(fresh.meta.retrievedAt,'fresh-time');assert.equal(calls,2);
});
test('category TTL is five minutes, failed loads are retried and the cache is bounded', async () => {
  let time=0,calls=0;const cache=createReadCache({clock:()=>time});
  const route={kind:'categories',query:{}};const load=async()=>({number:++calls});
  await cache.read(route,load);time=299999;assert.equal((await cache.read(route,load)).number,1);
  time=300000;assert.equal((await cache.read(route,load)).number,2);
  const failed={kind:'market',id:'failed'};await assert.rejects(cache.read(failed,async()=>{throw new Error('offline')}));
  assert.equal((await cache.read(failed,async()=>({recovered:true}))).recovered,true);
  for(let i=0;i<101;i++)await cache.read({kind:'market',id:String(i)},load);
  let reloaded=false;await cache.read({kind:'market',id:'0'},async()=>{reloaded=true;return{}});assert.equal(reloaded,true);
});
test('a provider cooldown protects other clients while valid cached reads remain available', async () => {
  let time=0,calls=0;const budget=createUpstreamBudget({clock:()=>time});
  const options={apiKey:'fixture-live-key',mode:'configured',budget,clock:()=>time};
  const good=createPantaClient({...options,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({categories:['science']}))}});
  const limited=createPantaClient({...options,fetchImpl:async()=>new Response('{}',{status:429,headers:{'Retry-After':'90'}})});
  const route={kind:'categories',query:{}};await good.read(route);
  await assert.rejects(limited.read(route),error=>error.retryAfter===90);
  assert.equal((await good.read(route)).data.categories[0],'science');assert.equal(calls,1);
  const third=createPantaClient({...options,fetchImpl:async()=>{calls++;throw new Error('must not fetch')}});
  await assert.rejects(third.read(route),error=>error.code==='PANTA_RATE_LIMIT');assert.equal(calls,1);
});
