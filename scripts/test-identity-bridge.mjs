import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createIdentityCoordinator,readIdentityHandoff} from '../sheep/helper/identityBridge.mjs';
const options = (id='request-one') => ({scene:1037,referrerInfo:{appId:'wx1234567890abcdef',extraData:{identity_bridge:{version:1,code:'x'.repeat(43),request_id:id}}}});
const defer=()=>{let resolve; const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
function setup(deps={}) {const installed=[];const phases=[];let cleared=0,exchanged=0,silent=0;const coordinator=createIdentityCoordinator({initialize:async()=>{},clearSession:()=>{cleared++},exchange:async()=>{exchanged++;return {accessToken:'b-token',openid:'b-openid'}},silentLogin:async()=>{silent++;return null},install:async value=>{installed.push(value)},phase:state=>{phases.push(state)},...deps});return {coordinator,installed,phases,get counts(){return {cleared,exchanged,silent}}};}
test('cold-launch and onShow duplicate only exchange once',async()=>{const f=setup();f.coordinator.capture(options());f.coordinator.capture(options());await Promise.all([f.coordinator.run(),f.coordinator.run()]);assert.equal(f.counts.exchanged,1);assert.equal(f.counts.silent,0);assert.equal(f.installed.length,1);f.coordinator.capture(options());await f.coordinator.run();assert.equal(f.counts.exchanged,1)});
test('capture clears previous private session before initialization resolves',async()=>{const gate=defer();const f=setup({initialize:()=>gate.promise});f.coordinator.capture(options());assert.equal(f.counts.cleared,1);const running=f.coordinator.run();assert.equal(f.installed.length,0);gate.resolve();await running;assert.equal(f.installed.length,1)});
test('later launch cannot be overwritten by slow earlier exchange',async()=>{const gate=defer();let count=0;const f=setup({exchange:async()=>{count++;if(count===1){await gate.promise;return {accessToken:'old'}}return {accessToken:'new'}}});f.coordinator.capture(options());const running=f.coordinator.run();await new Promise(setImmediate);f.coordinator.capture(options('request-two'));gate.resolve();await running;assert.deepEqual(f.installed,[{accessToken:'new'}]);});
test('failed exchange stays suspended, explicit retry recovers without silent-login race',async()=>{let count=0;const f=setup({exchange:async()=>{if(++count===1)throw new Error('timeout');return {accessToken:'recovered'}}});f.coordinator.capture(options());await f.coordinator.run();assert.equal(f.phases.at(-1),'failed');assert.equal(f.counts.silent,0);await f.coordinator.retry();assert.equal(f.installed[0].accessToken,'recovered');assert.equal(f.phases.at(-1),'ready')});
test('continue browsing discards credential and resolves own normal session',async()=>{const f=setup({exchange:async()=>{throw new Error('conflict')}});f.coordinator.capture(options());await f.coordinator.run();await f.coordinator.browse();assert.equal(f.counts.silent,1);assert.equal(f.phases.at(-1),'ready')});
test('late silent login cannot replace a new bridge session',async()=>{const gate=defer();const f=setup({silentLogin:async()=>{await gate.promise;return {accessToken:'silent'}}});const running=f.coordinator.run();await new Promise(setImmediate);f.coordinator.capture(options());gate.resolve();await running;assert.deepEqual(f.installed,[{accessToken:'b-token',openid:'b-openid'}])});
test('share URLs and malformed/unsupported referrer payloads are ignored',()=>{assert.equal(readIdentityHandoff({query:{code:'x'}}),null);assert.equal(readIdentityHandoff({...options(),scene:1001}),null);const bad=options();bad.referrerInfo.extraData.identity_bridge.version=2;assert.equal(readIdentityHandoff(bad),null);});
test('failed initialization can retry without losing its handoff', async () => {
  let attempts=0;
  const f=setup({initialize:async()=>{if(++attempts===1)throw new Error('offline')}});
  f.coordinator.capture(options());
  await f.coordinator.run();
  assert.equal(f.counts.exchanged,0);
  assert.equal(f.phases.at(-1),'failed');
  await f.coordinator.retry();
  assert.equal(f.counts.exchanged,1);
});
test('browsing while an exchange is in flight discards its late successful credentials',async()=>{
  const gate=defer();const f=setup({exchange:()=>gate.promise});
  f.coordinator.capture(options());const running=f.coordinator.run();
  await new Promise(setImmediate);
  const browsing=f.coordinator.browse();
  gate.resolve({accessToken:'discard'});
  await Promise.all([running,browsing]);
  assert.deepEqual(f.installed,[]);
  assert.equal(f.counts.silent,1);
});
test('failed launch/show duplicate never retries implicitly',async()=>{
  let count=0;const f=setup({exchange:async()=>{count++;throw new Error('unavailable')}});
  f.coordinator.capture(options());await f.coordinator.run();
  f.coordinator.capture(options());await f.coordinator.run();
  assert.equal(count,1);
  assert.equal(f.phases.at(-1),'failed');
});
test('public destination keeps category/product parameters without credentials or private IDs',async()=>{
  const {identityCatalogDestination}=await import('../sheep/helper/identityBridge.mjs');
  assert.equal(identityCatalogDestination({path:'pages/goods/list',query:{categoryId:'9',handoffCode:'secret',token:'secret'}}),'/pages/goods/list?categoryId=9');
  assert.equal(identityCatalogDestination({path:'pages/order/detail',query:{id:'old-order'}}),'/pages/index/index');
  assert.equal(identityCatalogDestination({path:'pages/goods/index',query:{id:'4'}}),'/pages/goods/index?id=4');
});
test('existing public group, promotion and activity landings preserve their supported inputs', async () => {
  const { identityCatalogDestination } = await import('../sheep/helper/identityBridge.mjs');
  const cases = [
    ['pages/goods/group-index', {}, '/pages/goods/group-index'],
    ['pages/goods/group-list', {groupIds:'7,9',keyword:'红茶',sortType:'priceAsc'}, '/pages/goods/group-list?groupIds=7%2C9&keyword=%E7%BA%A2%E8%8C%B6&sortType=priceAsc'],
    ['pages/goods/seckill', {id:'12'}, '/pages/goods/seckill?id=12'],
    ['pages/goods/groupon', {id:'13'}, '/pages/goods/groupon?id=13'],
    ['pages/goods/point', {id:'14'}, '/pages/goods/point?id=14'],
    ['pages/activity/index', {activityId:'16'}, '/pages/activity/index?activityId=16'],
    ['pages/activity/groupon/detail', {id:'17'}, '/pages/activity/groupon/detail?id=17'],
    ['pages/activity/groupon/list', {}, '/pages/activity/groupon/list'],
    ['pages/activity/seckill/list', {}, '/pages/activity/seckill/list'],
    ['pages/activity/point/list', {}, '/pages/activity/point/list'],
  ];
  for (const [path,query,expected] of cases) {
    assert.equal(identityCatalogDestination({path,query:{...query,token:'secret',code:'secret',orderId:'old-order'}}),expected);
  }
  assert.equal(identityCatalogDestination({path:'pages/activity/groupon/order',query:{type:'1',id:'private'}}),'/pages/index/index');
});
