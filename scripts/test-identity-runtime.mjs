import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import * as bridge from '../sheep/helper/identityBridge.mjs';
import * as session from '../sheep/helper/identitySession.mjs';
const source=readFileSync(new URL('../sheep/hooks/useIdentityBridge.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export (const|function) /gm,'$1 ');
const options={scene:1037,path:'pages/goods/list',query:{categoryId:'12'},referrerInfo:{appId:'wx1234567890abcdef',extraData:{identity_bridge:{version:1,code:'x'.repeat(43),request_id:'request-one'}}}};
function setup({loggedIn=false,login=async()=>({code:"b-wx-code"}),profile=async()=>({mobile:"",phoneVerified:false}),network=async()=>({code:0,data:{accessToken:'new',refreshToken:'refresh',openid:'new-openid'}}),navigate=true}={}) {
  const storage=loggedIn?{token:'existing', 'refresh-token':'existing-refresh'}:{};
  const calls=[],destinations=[];
  const user={isLogin:loggedIn,userInfo:{mobile:"cached-phone",phoneVerified:true},userInfoLoaded:true,invalidateUserInfo(){this.userInfoLoaded=false;this.userInfo={...this.userInfo,mobile:"",phoneVerified:false}},async ensureUserInfo(){if(!this.isLogin||this.userInfoLoaded)return this.userInfo;calls.push(["profile"]);this.userInfo=await profile();this.userInfoLoaded=true;return this.userInfo},resetUserData(){session.invalidateSession();this.isLogin=false;for(const key of ['token','refresh-token','openid'])delete storage[key]},setToken(token,refresh,opts){calls.push(['install',token,storage.openid,opts.load]);this.isLogin=true;storage.token=token},loginAfter(){calls.push(['after'])}};
  const uni={login,getStorageSync:key=>storage[key],setStorageSync:(key,value)=>{storage[key]=value},removeStorageSync:key=>delete storage[key],reLaunch:({url,success,fail})=>{destinations.push(url);(navigate?success:fail)()}};
  const bindings={reactive:x=>x,$store:()=>user,$router:{cancelFormalAuthNavigation(){}},request:async config=>{calls.push(['request',config.url]);return network(config)},closeAuthModal(){},uni,...bridge,...session};
  const runtime=new Function(...Object.keys(bindings),source+'\nreturn {startIdentitySession,identityBridgeState,retryIdentityBridge,browseWithoutIdentityBridge};')(...Object.values(bindings));
  return {runtime,calls,storage,destinations,user};
}
test('existing session without openid only resolves its binding, never creates another account',async()=>{
  const f=setup({loggedIn:true,network:async config=>{assert.equal(config.url,'/member/social-user/get');return {code:0,data:{openid:'bound-openid'}}}});
  await f.runtime.startIdentitySession({},async()=>{});
  assert.equal(f.storage.token,'existing');assert.equal(f.storage.openid,'bound-openid');
});
test('runtime installs B tokens with B openid before loading private data and preserves public destination',async()=>{
  const f=setup({loggedIn:true,network:async config=>{assert.equal(config.custom.managedSession,true);assert.equal(config.custom.isToken,false);assert.equal(config.data.loginCode,'b-wx-code');return {code:0,data:{accessToken:'mall-token',openid:'mall-openid'}}}});
  const result=f.runtime.startIdentitySession(options,async()=>{});
  assert.equal(f.storage.token,undefined);assert.equal(f.runtime.identityBridgeState.masked,true);
  await result;
  assert.deepEqual(f.calls.find(call=>call[0]==='install'),['install','mall-token','mall-openid',false]);
  assert.deepEqual(f.destinations,['/pages/goods/list?categoryId=12']);assert.equal(f.runtime.identityBridgeState.masked,false);
});
test('failed navigation keeps the old page masked instead of exposing page-local data',async()=>{
  const f=setup({navigate:false});await f.runtime.startIdentitySession(options,async()=>{});
  assert.equal(f.runtime.identityBridgeState.masked,true);assert.equal(f.runtime.identityBridgeState.phase,'failed');
});

const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
test('pending cold-start WeChat code cannot replace a newer SMS member',async()=>{
  const pending=defer();let started;const entered=new Promise(r=>{started=r});
  const f=setup({login:()=>{started();return pending.promise}});
  const running=f.runtime.startIdentitySession({},async()=>{});await entered;
  session.invalidateSession();f.user.isLogin=true;f.storage.token='sms-member-y';f.storage.openid='openid-y';
  pending.resolve({code:'old-wechat-proof'});await running;
  assert.equal(f.storage.token,'sms-member-y');assert.equal(f.storage.openid,'openid-y');
  assert.equal(f.calls.filter(call=>call[0]==='request').length,0);
});
test('cold persisted profile is invalidated synchronously and reread before formal phone use',async()=>{
  const pending=defer();const f=setup({loggedIn:true,profile:()=>pending.promise});f.storage.openid='bound-openid';
  const running=f.runtime.startIdentitySession({},async()=>{});
  assert.equal(f.user.userInfoLoaded,false);assert.equal(f.user.userInfo.mobile,'');
  await new Promise(setImmediate);assert.equal(f.calls.filter(call=>call[0]==='profile').length,1);
  pending.resolve({mobile:'',phoneVerified:false});await running;
  assert.equal(f.user.userInfo.mobile,'');assert.equal(f.user.userInfoLoaded,true);
});
test('returning to foreground revalidates revoked phone without repeating login or bridge',async()=>{
  let revoked=false;
  const f=setup({loggedIn:true,profile:async()=>revoked?{mobile:'',phoneVerified:false}:{mobile:'verified',phoneVerified:true}});f.storage.openid='bound-openid';
  await f.runtime.startIdentitySession({},async()=>{});assert.equal(f.user.userInfo.mobile,'verified');
  revoked=true;await f.runtime.startIdentitySession({});
  assert.equal(f.user.userInfo.mobile,'');assert.equal(f.calls.filter(call=>call[0]==='profile').length,2);
  assert.equal(f.calls.filter(call=>call[0]==='request').length,0);
});
test('launch and immediate onShow share one profile revalidation',async()=>{
  const pending=defer();const f=setup({loggedIn:true,profile:()=>pending.promise});f.storage.openid='bound-openid';
  const a=f.runtime.startIdentitySession({},async()=>{}),b=f.runtime.startIdentitySession({});
  await new Promise(setImmediate);assert.equal(f.calls.filter(call=>call[0]==='profile').length,1);
  pending.resolve({mobile:'',phoneVerified:false});await Promise.all([a,b]);
});
