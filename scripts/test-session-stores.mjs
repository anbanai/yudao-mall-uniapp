import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import * as session from '../sheep/helper/sessionEpoch.mjs';
const defer=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}};
function loadStore(file,bindings) {
  const source=readFileSync(new URL(file,import.meta.url),'utf8').replace(/^import [\s\S]*?;\n/gm,'').replace(/export default \w+;/,'return store;');
  let store;
  const defineStore=(_,options)=>{store={...options.state()};for(const [name,action] of Object.entries(options.actions))store[name]=action.bind(store);return store};
  const deps={...session,defineStore,...bindings};
  // The replacement returns the captured store through this wrapper binding.
  const result=new Function(...Object.keys(deps),source.replace('return store;','return '+(file.includes('cart.js')?'cart':'user')+';'))(...Object.values(deps));
  return result;
}
const uni={getStorageSync:()=>'',removeStorageSync(){},setStorageSync(){}};
test('old user profile, wallet and coupon completions cannot repopulate a cleared account',async()=>{
  const info=defer(),wallet=defer(),coupon=defer();
  const store=loadStore('../sheep/store/user.js',{
    uni,clone:obj=>({...obj}),cloneDeep:structuredClone,
    createDefaultOrderCount:()=>({}),normalizeOrderCount:value=>value,
    cart:()=>({emptyList(){}}),app:()=>({}),showAuthModal(){},$share:{},
    isFormalLogin:()=>false,isPhoneAuthorized:()=>false,
    UserApi:{getUserInfo:()=>info.promise},PayWalletApi:{getPayWallet:()=>wallet.promise},
    OrderApi:{getOrderCount:async()=>({code:1})},CouponApi:{getUnusedCouponCount:()=>coupon.promise},
  });
  const oldInfo=store.getInfo(),oldWallet=store.getWallet();store.getNumData();
  store.resetUserData();
  info.resolve({code:0,data:{mobile:'old-private'}});wallet.resolve({code:0,data:{balance:999}});coupon.resolve({code:0,data:99});
  await Promise.all([oldInfo,oldWallet]);await Promise.resolve();
  assert.equal(store.userInfo.mobile,'');assert.equal(store.userWallet.balance,0);assert.equal(store.numData.unusedCouponCount,0);
});
test('cart clearing includes all rendered lists, and an old response stays discarded',async()=>{
  const response=defer();
  const store=loadStore('../sheep/store/cart.js',{uni,CartApi:{getCartList:()=>response.promise}});
  store.newList=[{id:'old-item'}];const pending=store.getList();
  session.invalidateSession();store.emptyList();
  response.resolve({code:0,data:{validList:[{id:'old-item'}],invalidList:[]}});await pending;
  assert.deepEqual(store.newList,[]);assert.deepEqual(store.list,[]);
});

function loadInterceptor(store, uni, showAuthModal = () => {}) {
  class Request {
    constructor() {
      this.interceptors = {
        request: { use: (ok) => { this.before = ok; } },
        response: { use: (ok) => { this.after = ok; } },
      };
    }
  }
  const bindings = { ...session, Request, apiPath: '/app-api', baseUrl: 'https://test.invalid', tenantId: 1,
    $store: () => store, $platform: {}, showAuthModal, AuthUtil: {}, getTerminal: () => 1, uni };
  const code = readFileSync(new URL('../sheep/request/index.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?;\n/gm, '').replace(/^export const /gm, 'const ')
    .replace('export default request;', 'return http;');
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
for (const loginUrl of ['/member/auth/sms-login', '/member/auth/login']) {
  test(`${loginUrl} replaces all private state and only resolves the new member's OpenID`, async () => {
    const profile = defer(), boundOpenid = defer();
    const storage = { token: 'member-x', 'refresh-token': 'refresh-x', openid: 'openid-x' };
    const localUni = { getStorageSync: key => storage[key], setStorageSync: (key, value) => { storage[key] = value; }, removeStorageSync: key => { delete storage[key]; } };
    let cartCleared = false, lookupToken;
    const store = loadStore('../sheep/store/user.js', {
      uni: localUni, clone: obj => ({...obj}), cloneDeep: structuredClone,
      createDefaultOrderCount: () => ({}), normalizeOrderCount: value => value,
      cart: () => ({emptyList() { cartCleared = true; }}), app: () => ({}), showAuthModal() {}, $share: {},
      isFormalLogin: () => false, isPhoneAuthorized: () => false,
      UserApi: {getUserInfo: () => profile.promise}, PayWalletApi: {}, OrderApi: {}, CouponApi: {},
      SocialApi: {getSocialUser(type) { assert.equal(type, 34); lookupToken = storage.token; return boundOpenid.promise; }},
    });
    store.loginAfter = async () => {};
    store.userInfo = { mobile: 'private-x' }; store.userWallet = { balance: 999 };
    const oldProfile = store.getInfo();
    const oldEpoch = session.sessionEpoch();
    const http = loadInterceptor(store, localUni);
    const config = await http.before({ url: loginUrl, header: {}, custom: {isToken: false, showLoading: false, showError: false} });
    await http.after({config, data: {code: 0, data: {accessToken: 'member-y', refreshToken: 'refresh-y', openid: null}}});
    assert.ok(session.sessionEpoch() > oldEpoch);
    assert.equal(storage.token, 'member-y'); assert.equal(storage.openid, undefined);
    assert.equal(lookupToken, 'member-y'); assert.equal(cartCleared, true);
    assert.equal(store.userInfo.mobile, ''); assert.equal(store.userWallet.balance, 0);
    profile.resolve({code: 0, data: {mobile: 'late-private-x'}}); await oldProfile;
    assert.equal(store.userInfo.mobile, '');
    boundOpenid.resolve({code: 0, data: {openid: 'openid-y'}}); await Promise.resolve();
    assert.equal(storage.openid, 'openid-y');
    const currentEpoch = session.sessionEpoch();
    store.userInfo = {mobile: 'private-y'}; store.userInfoLoaded = true;
    const refreshConfig = await http.before({ url: '/member/auth/refresh-token', header: {}, custom: {showLoading: false, showError: false} });
    await http.after({config: refreshConfig, data: {code: 0, data: {accessToken: 'member-y-refreshed', refreshToken: 'refresh-y2'}}});
    assert.equal(session.sessionEpoch(), currentEpoch); assert.equal(storage.openid, 'openid-y');
    assert.equal(store.userInfo.mobile, 'private-y'); assert.equal(store.userInfoLoaded, true);
  });
}

test('invalidating profile removes cached phone proof and a late old fetch cannot restore it',async()=>{
  const old=defer();let reads=0;
  const store=loadStore('../sheep/store/user.js',{
    uni,clone:obj=>({...obj}),cloneDeep:structuredClone,
    createDefaultOrderCount:()=>({}),normalizeOrderCount:value=>value,
    cart:()=>({emptyList(){}}),app:()=>({}),showAuthModal(){},$share:{},
    isFormalLogin:()=>false,isPhoneAuthorized:()=>false,
    UserApi:{getUserInfo:()=>++reads===1?old.promise:Promise.resolve({code:0,data:{mobile:'',phoneVerified:false}})},
    PayWalletApi:{},OrderApi:{},CouponApi:{},
  });
  store.isLogin=true;store.userInfo={mobile:'cached',phoneVerified:true};store.userInfoLoaded=true;
  const late=store.getInfo();store.invalidateUserInfo();
  assert.equal(store.userInfoLoaded,false);assert.equal(store.userInfo.mobile,'');
  await store.ensureUserInfo();old.resolve({code:0,data:{mobile:'revoked',phoneVerified:true}});await late;
  assert.equal(store.userInfo.mobile,'');assert.equal(store.userInfo.phoneVerified,false);
});

function profileStore(responses) {
  let reads = 0;
  const store = loadStore('../sheep/store/user.js', {
    uni, clone: obj => ({...obj}), cloneDeep: structuredClone,
    createDefaultOrderCount: () => ({}), normalizeOrderCount: value => value,
    cart: () => ({emptyList() {}}), app: () => ({}), showAuthModal() {}, $share: {},
    isFormalLogin: () => false, isPhoneAuthorized: () => false,
    UserApi: {getUserInfo: () => responses[reads++].promise},
    PayWalletApi: {}, OrderApi: {}, CouponApi: {},
  });
  store.isLogin = true;
  Object.defineProperty(store, 'isFormalLogin', {
    get: () => store.userInfoLoaded && !!store.userInfo.mobile && store.userInfo.phoneVerified,
  });
  return {store, reads: () => reads};
}

for (const oldResult of ['success', 'failure']) {
  test(`formal request waits for the latest profile after a superseded ${oldResult}`, async () => {
    const old = defer(), latest = defer();
    const {store, reads} = profileStore([old, latest]);
    const first = store.getInfo().catch(() => {});
    let authPrompts = 0, settled = false;
    const http = loadInterceptor(store, uni, () => authPrompts++);
    const gate = http.before({url: '/trade/order/create', header: {}, custom: {formalAuth: true}})
      .then(value => {settled = true; return value;}, error => {settled = true; return {error};});
    const refresh = store.getInfo();
    if (oldResult === 'failure') old.reject(new Error('superseded network failure'));
    else old.resolve({code: 0, data: {mobile: '13800000000', phoneVerified: true}});
    await first;
    await new Promise(setImmediate);
    assert.equal(settled, false, 'formal guard must remain pending for the latest profile');
    assert.equal(authPrompts, 0);
    latest.resolve({code: 0, data: {mobile: '13800000000', phoneVerified: true}});
    await refresh;
    assert.equal((await gate).url, '/trade/order/create');
    assert.equal(authPrompts, 0);
    assert.equal(reads(), 2);
  });
}

test('profile waiter stops at a genuine latest failure instead of retrying indefinitely', async () => {
  const latest = defer();
  const {store, reads} = profileStore([latest]);
  const gate = store.ensureUserInfo();
  const rejected = assert.rejects(gate, /current network failure/);
  latest.reject(new Error('current network failure'));
  await rejected;
  assert.equal(reads(), 1);
  assert.equal(store.userInfoLoaded, false);
});

test('profile waiter never follows or returns a replacement session profile', async () => {
  const old = defer(), replacement = defer();
  const {store, reads} = profileStore([old, replacement]);
  const gate = store.ensureUserInfo();
  store.resetUserData();
  store.isLogin = true;
  const newRead = store.getInfo();
  replacement.resolve({code: 0, data: {mobile: '13900000000', phoneVerified: true}});
  await newRead;
  old.resolve({code: 0, data: {mobile: '13800000000', phoneVerified: true}});
  assert.equal(await gate, undefined);
  assert.equal(store.userInfo.mobile, '13900000000');
  assert.equal(reads(), 2);
});
