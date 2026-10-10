import { sessionEpoch, isCurrentSession, invalidateSession } from '@/sheep/helper/sessionEpoch.mjs';
import { defineStore } from 'pinia';
import $share from '@/sheep/platform/share';
import { clone, cloneDeep } from 'lodash-es';
import cart from './cart';
import app from './app';
import { showAuthModal } from '@/sheep/hooks/useModal';
import UserApi from '@/sheep/api/member/user';
import SocialApi from '@/sheep/api/member/social';
import PayWalletApi from '@/sheep/api/pay/wallet';
import OrderApi from '@/sheep/api/trade/order';
import CouponApi from '@/sheep/api/promotion/coupon';
import { isFormalLogin, isPhoneAuthorized } from '@/sheep/helper/authState.mjs';
import { createDefaultOrderCount, normalizeOrderCount } from '@/sheep/helper/orderStatus.mjs';

let latestOrderCountRequest = 0;
let latestUserInfoRequest = 0;
let userInfoPromise;

// 默认用户信息
const defaultUserInfo = {
  avatar: '', // 头像
  nickname: '', // 昵称
  gender: 0, // 性别
  mobile: '', // 手机号
  point: 0, // 积分
};

// 默认钱包信息
const defaultUserWallet = {
  balance: 0, // 余额
};

// 默认订单、优惠券等其他资产信息
const defaultNumData = {
  unusedCouponCount: 0,
  orderCount: {
    ...createDefaultOrderCount(),
  },
};

const user = defineStore('user', {
  state: () => ({
    userInfo: clone(defaultUserInfo), // 用户信息
    userInfoLoaded: false, // 用户信息是否已从服务端加载
    userWallet: clone(defaultUserWallet), // 用户钱包信息
    isLogin: !!uni.getStorageSync('token'), // 登录状态
    numData: cloneDeep(defaultNumData), // 用户其他数据
    lastUpdateTime: 0, // 上次更新时间
  }),

  getters: {
    // isLogin 表示技术会话；正式登录还必须完成手机号授权
    isPhoneAuthorized: (state) => isPhoneAuthorized(state.userInfo),
    isFormalLogin: (state) => state.userInfoLoaded && isFormalLogin(state.isLogin, state.userInfo),
  },

  actions: {
    // 获取用户信息
    async getInfo() {
      const epoch = sessionEpoch();
      const requestId = ++latestUserInfoRequest;
      const promise = UserApi.getUserInfo().then(({ code, data }) => {
        if (!isCurrentSession(epoch) || requestId !== latestUserInfoRequest || code !== 0) return;
        this.userInfo = data;
        this.userInfoLoaded = true;
        return data;
      });
      userInfoPromise = { epoch, requestId, promise };
      try {
        return await promise;
      } finally {
        if (userInfoPromise?.requestId === requestId) userInfoPromise = undefined;
      }
    },

    invalidateUserInfo() {
      latestUserInfoRequest += 1;
      userInfoPromise = undefined;
      this.userInfoLoaded = false;
      this.userInfo = { ...this.userInfo, mobile: '', phoneVerified: false };
    },

    async ensureUserInfo() {
      const epoch = sessionEpoch();
      while (isCurrentSession(epoch) && this.isLogin && !this.userInfoLoaded) {
        const promise = userInfoPromise?.epoch === epoch ? userInfoPromise.promise : this.getInfo();
        const requestId = latestUserInfoRequest;
        try {
          await promise;
        } catch (error) {
          if (!isCurrentSession(epoch)) return;
          // A superseded read cannot decide whether the current profile is available.
          if (requestId === latestUserInfoRequest) throw error;
        }
        if (!isCurrentSession(epoch)) return;
        // A completed current read (including an API failure) must not cause an endless retry.
        if (requestId === latestUserInfoRequest) return this.userInfo;
      }
      if (isCurrentSession(epoch)) return this.userInfo;
    },

    // 获得用户钱包
    async getWallet() {
      const epoch = sessionEpoch();
      const { code, data } = await PayWalletApi.getPayWallet();
      if (!isCurrentSession(epoch)) return;
      if (code !== 0) {
        return;
      }
      this.userWallet = data;
    },

    // 刷新订单数量；请求序号保证较早的响应不能覆盖较新的状态
    async refreshOrderCount() {
      const requestId = ++latestOrderCountRequest;
      const res = await OrderApi.getOrderCount();
      if (requestId !== latestOrderCountRequest) {
        return { stale: true };
      }
      if (res.code !== 0) {
        return { ok: false };
      }
      this.numData.orderCount = normalizeOrderCount(res.data);
      return { ok: true };
    },

    // 获取订单、优惠券等其他资产信息
    getNumData() {
      const epoch = sessionEpoch();
      this.refreshOrderCount();
      CouponApi.getUnusedCouponCount().then((res) => {
        if (isCurrentSession(epoch) && res.code === 0) {
          this.numData.unusedCouponCount = res.data;
        }
      });
    },

    // 设置 token
    setToken(token = '', refreshToken = '', { load = true, preserveInfo = false } = {}) {
      if (token === '') {
        this.isLogin = false;
        uni.removeStorageSync('token');
        uni.removeStorageSync('refresh-token');
      } else {
        this.isLogin = true;
        if (!preserveInfo) this.userInfoLoaded = false;
        uni.setStorageSync('token', token);
        uni.setStorageSync('refresh-token', refreshToken);
        if (load) void this.loginAfter();
      }
      return this.isLogin;
    },

    // A successful ordinary login creates a new account epoch, unlike token refresh.
    installLoginSession(session) {
      this.resetUserData();
      if (session.openid) uni.setStorageSync('openid', session.openid);
      this.setToken(session.accessToken, session.refreshToken, { load: false });
      const epoch = sessionEpoch();
      // #ifdef MP-WEIXIN
      if (!session.openid) void this.resolveLoginOpenid(epoch);
      // #endif
      void this.loginAfter();
      return epoch;
    },

    async resolveLoginOpenid(epoch) {
      try {
        // Existing app-scoped binding only; this endpoint cannot create/merge a member.
        const response = await SocialApi.getSocialUser(34, true);
        if (isCurrentSession(epoch) && response?.code === 0 && response.data?.openid) {
          uni.setStorageSync('openid', response.data.openid);
        }
      } catch {
        // Keep OpenID absent on failure. Never reuse the prior member's payment identity.
      }
    },

    // 更新用户相关信息 (手动限流，5 秒之内不刷新)
    async updateUserData({ force = false } = {}) {
      if (!this.isLogin) {
        this.resetUserData();
        return;
      }
      // 防抖，5 秒之内不刷新
      const nowTime = new Date().getTime();
      if (!force && this.lastUpdateTime + 5000 > nowTime) {
        return;
      }
      this.lastUpdateTime = nowTime;

      // 获取最新信息
      const epoch = sessionEpoch();
      await this.getInfo();
      if (!isCurrentSession(epoch)) return;
      if (!this.isFormalLogin) {
        return this.userInfo;
      }
      this.getWallet();
      this.getNumData();
      return this.userInfo;
    },

    // 重置用户默认数据
    resetUserData() {
      invalidateSession();
      this.invalidateUserInfo();
      uni.removeStorageSync('openid');
      this.lastUpdateTime = 0;
      // 使退出登录前发出的订单数量请求失效
      latestOrderCountRequest += 1;
      // 清空 token
      this.setToken();
      // 清空用户相关的缓存
      this.userInfo = clone(defaultUserInfo);
      this.userInfoLoaded = false;
      this.userWallet = clone(defaultUserWallet);
      this.numData = cloneDeep(defaultNumData);
      // 清空购物车的缓存
      cart().emptyList();
    },

    // 登录后，加载各种信息
    async loginAfter() {
      const epoch = sessionEpoch();
      await this.ensureUserInfo();
      if (!isCurrentSession(epoch)) return;

      if (!this.isFormalLogin) {
        return this.userInfo;
      }

      this.getWallet();
      this.getNumData();

      // 加载购物车
      cart().getList();
      // 登录后设置全局分享参数
      $share.getShareInfo();

      // 提醒绑定手机号
      // #ifndef MP-WEIXIN
      if (app().platform.bind_mobile && !this.userInfo.mobile) {
        showAuthModal('changeMobile');
      }
      // #endif

      // 绑定推广员
      $share.bindBrokerageUser();
    },

    // 登出系统
    async logout() {
      this.resetUserData();
      return !this.isLogin;
    },
  },
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'user-store',
      },
    ],
  },
});

export default user;
