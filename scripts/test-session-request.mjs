import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import * as session from '../sheep/helper/sessionEpoch.mjs';
const source=readFileSync(new URL('../sheep/request/index.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\n/gm,'').replace(/^export const /gm,'const ').replace('export default request;','return { request, http };');
function setup() {
  let tokens=0,prompts=0,refreshes=0;
  const user={isLogin:true,isFormalLogin:true,ensureUserInfo:async()=>{},setToken:()=>tokens++,logout:()=>{}};
  const storage={token:'prior-token','refresh-token':'prior-refresh'};
  const uni={getStorageSync:key=>storage[key],setStorageSync:(key,value)=>{storage[key]=value},showLoading(){},hideLoading(){},showToast(){}};
  class Request {constructor(){this.interceptors={request:{use:(ok,fail)=>{this.before=ok;this.beforeFail=fail}},response:{use:(ok,fail)=>{this.after=ok;this.afterFail=fail}}};} middleware(config){return Promise.resolve(config)}}
  const names=['Request','apiPath','baseUrl','tenantId','$store','$platform','showAuthModal','AuthUtil','getTerminal','uni',...Object.keys(session)];
  const values=[Request,'/app-api','https://test.invalid',1,()=>user,{},()=>prompts++,{refreshToken:async()=>{refreshes++;return {code:1}}},()=>1,uni,...Object.values(session)];
  const {http}=new Function(...names,source)(...values);
  const config=url=>({url,header:{},custom:{isToken:true,showLoading:false,showError:false}});
  return {http,config,get counts(){return {tokens,prompts,refreshes}}};
}
test('old normal auth, refresh and private responses are discarded before side effects', async()=>{
  const f=setup();
  for (const url of ['/member/auth/sms-login','/member/auth/refresh-token','/member/user/get','/trade/order/page']) {
    const config=await f.http.before(f.config(url));
    session.invalidateSession();
    const result=await f.http.after({config,data:{code:0,data:{accessToken:'old',openid:'old'}}});
    assert.equal(result.code,'STALE_SESSION');
  }
  assert.deepEqual(f.counts,{tokens:0,prompts:0,refreshes:0});
});
test('stale queued request cannot be relabeled with a new epoch',async()=>{
  const f=setup(),config=await f.http.before(f.config('/trade/order/page'));
  session.invalidateSession();
  await assert.rejects(f.http.before(config),e=>e.code==='STALE_SESSION');
});
test('mini-program provider accepts the installed login epoch but refuses superseded completion', async () => {
  const providerSource=readFileSync(new URL('../sheep/platform/provider/wechat/miniProgram.js',import.meta.url),'utf8')
    .replace(/^import[\s\S]*?;\n/gm,'').replace('export default {','return {');
  for (const superseded of [false,true]) {
    const writes=[];
    const uni={login:async()=>({errMsg:'login:ok',code:'wx-code'}),setStorageSync:(key,value)=>writes.push([key,value])};
    const AuthUtil={socialLogin:async()=>{
      session.invalidateSession();
      const result={code:0,data:{openid:'new-openid'},sessionEpoch:session.sessionEpoch()};
      if (superseded) session.invalidateSession();
      return result;
    }};
    const bindings={...session,uni,AuthUtil};
    const provider=new Function(...Object.keys(bindings),providerSource)(...Object.values(bindings));
    assert.equal(await provider.login(),!superseded);
    assert.deepEqual(writes,superseded?[]:[['openid','new-openid']]);
  }
});
