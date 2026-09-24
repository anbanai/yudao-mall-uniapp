import { reactive } from 'vue';
import $store from '@/sheep/store';
import request from '@/sheep/request';
import $router from '@/sheep/router';
import { closeAuthModal } from '@/sheep/hooks/useModal';
import { createIdentityCoordinator, identityCatalogDestination } from '@/sheep/helper/identityBridge.mjs';
import { setIdentityPhase, sessionEpoch, isCurrentSession, isIdentityBlocked } from '@/sheep/helper/identitySession.mjs';

export const identityBridgeState = reactive({ phase: 'idle', masked: false, failure: '' });
let initialize = async () => {};
let resetPage = false;
let destination = '/pages/index/index';
let navigationFailed = false;
let foregroundRun;
function recreatePage() {
  const epoch = sessionEpoch();
  navigationFailed = false;
  uni.reLaunch({
    url: destination,
    success: () => {
      if (!isCurrentSession(epoch)) return;
      setIdentityPhase('ready');
      identityBridgeState.phase = 'ready';
      identityBridgeState.masked = false;
    },
    fail: () => {
      if (!isCurrentSession(epoch)) return;
      navigationFailed = true;
      setIdentityPhase('failed');
      identityBridgeState.phase = 'failed';
      identityBridgeState.failure = '商城页面暂未加载完成，请重试或继续浏览。';
    },
  });
}
async function loginCode() {
  const result = await uni.login({ provider: 'weixin' });
  if (!result.code) throw new Error('LOGIN_UNAVAILABLE');
  return result.code;
}
const coordinator = createIdentityCoordinator({
  initialize: () => initialize(),
  clearSession() {
    resetPage = true;
    identityBridgeState.masked = true;
    $store('user').resetUserData();
    closeAuthModal();
    $router.cancelFormalAuthNavigation();
  },
  async exchange(handoff, current) {
    const code = await loginCode();
    if (!current()) return null;
    const result = await request({
      url: '/member/auth/bridge-login', method: 'POST',
      data: { ...handoff, loginCode: code },
      custom: { managedSession: true, isToken: false, showError: false, showLoading: false },
    });
    if (result?.code !== 0 || !result.data?.accessToken || !result.data?.openid) {
      throw new Error('BRIDGE_UNAVAILABLE');
    }
    return result.data;
  },
  async silentLogin(current) {
    const epoch = sessionEpoch();
    const stillCurrent = () => current() && isCurrentSession(epoch);
    // #ifdef MP-WEIXIN
    if ($store('user').isLogin) {
      if (uni.getStorageSync('openid')) return null;
      // An existing SMS/account session may not belong to this WeChat identity.
      // Only fill its already-bound OpenID; never silently replace that member.
      const info = await request({
        url: '/member/social-user/get', params: { type: 34 },
        custom: { managedSession: true, showLoading: false, showError: false, noRefresh: true },
      });
      if (stillCurrent() && info?.code === 0 && info.data?.openid) return {
        identitySessionEpoch: epoch,
        accessToken: uni.getStorageSync('token'), refreshToken: uni.getStorageSync('refresh-token'), openid: info.data.openid,
      };
      return null;
    }
    const code = await loginCode();
    if (!stillCurrent()) return null;
    const result = await request({
      url: '/member/auth/social-login', method: 'POST',
      data: { type: 34, code, state: 'default' },
      custom: { managedSession: true, isToken: false, showLoading: false, showError: false, sessionEpoch: epoch },
    });
    if (stillCurrent() && result?.code === 0 && result.data?.accessToken) return { ...result.data, identitySessionEpoch: epoch };
    // #endif
    return null;
  },
  install(session, current) {
    if (!current() || (session.identitySessionEpoch !== undefined && !isCurrentSession(session.identitySessionEpoch))) return;
    // Install OpenID before starting any payment/profile consumers.
    uni.removeStorageSync('openid');
    if (session.openid) uni.setStorageSync('openid', session.openid);
    $store('user').setToken(session.accessToken, session.refreshToken, { load: false });
  },
  phase(phase) {
    setIdentityPhase(phase);
    identityBridgeState.phase = phase;
    if (phase !== 'ready') return;
    if (resetPage) {
      resetPage = false;
      // Recreate pages as well as stores: page-local order/address data must be discarded.
      recreatePage();
    } else identityBridgeState.masked = false;
    if ($store('user').isLogin) void $store('user').loginAfter();
  },
  failure() { identityBridgeState.failure = '关联未完成。请重试；若账户已有关联，请使用原手机号登录并联系商城客服核实。系统不会自动合并账户。'; },
});
export function startIdentitySession(options, initializer) {
  if (initializer) initialize = initializer;
  if (coordinator.capture(options)) {
    destination = identityCatalogDestination(options);
    return coordinator.run();
  }
  if (isIdentityBlocked()) return coordinator.run();
  if (foregroundRun) return foregroundRun;
  // Persisted profile flags describe an earlier foreground visit, not current sharing consent.
  // Invalidate before any page can use a cached mobile to pass the purchase/login gate.
  if ($store('user').isLogin) $store('user').invalidateUserInfo();
  foregroundRun = coordinator.run().then(async () => {
    if (!isIdentityBlocked() && $store('user').isLogin) await $store('user').ensureUserInfo();
  }).finally(() => { foregroundRun = undefined; });
  return foregroundRun;
}
export const retryIdentityBridge = () => navigationFailed ? recreatePage() : coordinator.retry();
export const browseWithoutIdentityBridge = () => coordinator.browse();
