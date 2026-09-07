<template>
  <!-- 规格弹窗 -->
  <su-popup :show="authType !== ''" round="10" :showClose="true" @close="handlePopupClose">
    <view class="login-wrap">
      <!-- #ifdef MP-WEIXIN -->
      <view v-if="authType === 'wechatLogin'" class="login-mode-head quick-login-head">
        <view class="quick-login-title">快捷登录</view>
        <view class="login-mode-subtitle">授权当前手机号后快速登录</view>
      </view>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <view v-if="loginTypes.includes(authType)" class="login-mode-head">
        <view class="login-tabs">
          <button
            class="ss-reset-button login-tab"
            :class="{ 'login-tab-active': authType === 'wechatLogin' }"
            @tap="showAuthModal('wechatLogin')"
          >
            快捷登录
          </button>
          <button
            class="ss-reset-button login-tab"
            :class="{ 'login-tab-active': authType === 'smsLogin' }"
            @tap="showAuthModal('smsLogin')"
          >
            短信登录
          </button>
          <button
            class="ss-reset-button login-tab"
            :class="{ 'login-tab-active': authType === 'accountLogin' }"
            @tap="showAuthModal('accountLogin')"
          >
            账号登录
          </button>
        </view>
        <view class="login-mode-subtitle">{{ loginModeSubtitle }}</view>
      </view>
      <!-- #endif -->

      <!-- 1. 账号密码登录 accountLogin -->
      <account-login
        v-if="authType === 'accountLogin'"
        :agreeStatus="state.protocol"
        :showHeader="sheep.$platform.name !== 'WechatMiniProgram'"
      />

      <!-- 2. 短信登录  smsLogin -->
      <sms-login
        v-if="authType === 'smsLogin'"
        :agreeStatus="state.protocol"
        :showHeader="sheep.$platform.name !== 'WechatMiniProgram'"
      />

      <!-- #ifdef MP-WEIXIN -->
      <!-- 3. 微信小程序手机号快捷登录 -->
      <view v-if="authType === 'wechatLogin'" class="quick-login-box">
        <button
          class="ss-reset-button quick-login-btn"
          open-type="getPhoneNumber"
          :disabled="!state.protocol"
          @getphonenumber="getPhoneNumber"
        >
          快捷登录
        </button>
      </view>
      <!-- #endif -->

      <!-- 4. 忘记密码 resetPassword-->
      <reset-password v-if="authType === 'resetPassword'" />

      <!-- 5. 绑定手机号 changeMobile -->
      <change-mobile v-if="authType === 'changeMobile'" />

      <!-- 6. 修改密码 changePassword-->
      <changePassword v-if="authType === 'changePassword'" />

      <!-- 7. 微信小程序授权 -->
      <mp-authorization v-if="authType === 'mpAuthorization'" />

      <!-- 8. 其它平台的第三方登录 -->
      <view
        v-if="
          ['accountLogin', 'smsLogin'].includes(authType) &&
          sheep.$platform.name !== 'WechatMiniProgram'
        "
        class="auto-login-box ss-flex ss-flex-col ss-row-center ss-col-center"
      >
        <!-- 8.1 微信公众号、App 的登录，基于 openid + code -->
        <button
          v-if="
            ['WechatOfficialAccount', 'App'].includes(sheep.$platform.name) &&
            sheep.$platform.isWechatInstalled
          "
          @tap="thirdLogin('wechat')"
          :disabled="!state.protocol"
          class="ss-reset-button auto-login-btn"
        >
          <image
            class="auto-login-img"
            :src="sheep.$url.static('/static/img/shop/platform/wechat.png')"
          />
        </button>

        <!-- 8.2 iOS 登录 TODO 芋艿：等后面搞 App 再弄 -->
        <button
          v-if="sheep.$platform.os === 'ios' && sheep.$platform.name === 'App'"
          @tap="thirdLogin('apple')"
          :disabled="!state.protocol"
          class="ss-reset-button auto-login-btn"
        >
          <image
            class="auto-login-img"
            :src="sheep.$url.static('/static/img/shop/platform/apple.png')"
          />
        </button>

        <!-- 8.3 支付宝小程序登录 -->
        <button
          v-if="sheep.$platform.name === 'alipayMiniProgram'"
          @tap="thirdLogin('alipay')"
          :disabled="!state.protocol"
          class="ss-reset-button auto-login-btn"
        >
          <image
            class="auto-login-img"
            :src="sheep.$url.static('/static/img/shop/pay/alipay.png')"
          />
        </button>
      </view>

      <!-- 用户协议的勾选 -->
      <view v-if="loginTypes.includes(authType)" class="agreement-box ss-flex ss-col-center">
        <view class="agreement-option ss-flex ss-col-center" @tap="toggleAgreement">
          <checkbox
            :checked="state.protocol"
            color="var(--ui-BG-Main)"
            style="transform: scale(0.8)"
            @tap.stop="toggleAgreement"
          />
          <view class="agreement-text ss-flex ss-col-center ss-flex-wrap ss-m-l-8">
            <text>我已阅读并同意</text>
            <text class="tcp-text" @tap.stop="onProtocol('用户协议')">《用户协议》</text>
            <text>和</text>
            <text class="tcp-text" @tap.stop="onProtocol('隐私协议')">《隐私协议》</text>
          </view>
        </view>
      </view>
      <view class="safe-box" />
    </view>
  </su-popup>
</template>

<script setup>
  import { computed, reactive, watch } from 'vue';
  import sheep from '@/sheep';
  import accountLogin from './components/account-login.vue';
  import smsLogin from './components/sms-login.vue';
  import resetPassword from './components/reset-password.vue';
  import changeMobile from './components/change-mobile.vue';
  import changePassword from './components/change-password.vue';
  import mpAuthorization from './components/mp-authorization.vue';
  import { closeAuthModal, showAuthModal } from '@/sheep/hooks/useModal';

  const modalStore = sheep.$store('modal');
  const loginTypes = ['wechatLogin', 'smsLogin', 'accountLogin'];
  // 授权弹窗类型
  const authType = computed(() => modalStore.auth);
  const loginModeSubtitle = computed(
    () =>
      ({
        wechatLogin: '授权当前手机号后快速登录',
        smsLogin: '未注册的手机号，验证后自动注册账号',
        accountLogin: '如果未设置过密码，请点击忘记密码',
      }[authType.value] || ''),
  );

  const state = reactive({
    protocol: false,
  });

  function toggleAgreement() {
    state.protocol = !state.protocol;
  }

  function resetAgreementOnClose([type, authTransition]) {
    if (!type && !authTransition) {
      state.protocol = false;
    }
  }

  watch([authType, () => modalStore.authTransition], resetAgreementOnClose);

  function handlePopupClose() {
    if (
      modalStore.authTransition &&
      modalStore.authTransitionCloseId === modalStore.authTransitionId
    ) {
      modalStore.authTransitionCloseId = 0;
      return;
    }
    closeAuthModal();
  }

  // 查看协议
  function onProtocol(title) {
    closeAuthModal();
    sheep.$router.go('/pages/public/richtext', {
      title,
    });
  }

  // 第三方授权登陆（微信小程序、Apple）
  const thirdLogin = async (provider) => {
    if (state.protocol !== true) {
      return;
    }
    const loginRes = await sheep.$platform.useProvider(provider).login();
    if (loginRes) {
      const userInfo = await sheep.$store('user').getInfo();
      closeAuthModal();
      // 如果用户已经有头像和昵称，不需要再次授权
      if (userInfo.avatar && userInfo.nickname) {
        return;
      }

      // 触发小程序授权信息弹框
      // #ifdef MP-WEIXIN
      showAuthModal('mpAuthorization');
      // #endif
    }
  };

  // 微信小程序的“手机号快速验证”：https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html
  const getPhoneNumber = async (e) => {
    if (state.protocol !== true) {
      return;
    }
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      sheep.$helper.toast('快捷登录失败');
      return;
    }
    let result = await sheep.$platform.useProvider().mobileLogin(e.detail);
    if (result) {
      closeAuthModal();
    }
  };
</script>

<style lang="scss" scoped>
  @import './index.scss';

  .login-mode-head {
    margin-bottom: 60rpx;
  }

  .login-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    height: 72rpx;
    border-bottom: 1rpx solid #eeeeee;
  }

  .login-tab {
    position: relative;
    height: 72rpx;
    color: #999999;
    font-size: 30rpx;
    font-weight: 500;

    &.login-tab-active {
      color: #333333;
      font-weight: 600;

      &::after {
        position: absolute;
        bottom: -1rpx;
        left: 50%;
        width: 56rpx;
        height: 4rpx;
        border-radius: 2rpx;
        background-color: var(--ui-BG-Main);
        content: '';
        transform: translateX(-50%);
      }
    }
  }

  .quick-login-title {
    color: #333333;
    font-size: 36rpx;
    font-weight: 600;
    line-height: 72rpx;
    text-align: center;
  }

  .login-mode-subtitle {
    margin-top: 20rpx;
    color: #afb6c0;
    font-size: 26rpx;
  }

  .quick-login-box {
    width: 100%;
  }

  .quick-login-btn {
    width: 100%;
    height: 80rpx;
    background: linear-gradient(90deg, var(--ui-BG-Main), var(--ui-BG-Main-gradient));
    border-radius: 40rpx;
    color: #fff;
    font-size: 30rpx;
    font-weight: 500;

    &[disabled] {
      background: #e5e7eb;
      color: #a8adb5;
      opacity: 1;
    }
  }
  .safe-box {
    height: calc(constant(safe-area-inset-bottom) / 5 * 3);
    height: calc(env(safe-area-inset-bottom) / 5 * 3);
  }

  .tcp-text {
    color: var(--ui-BG-Main);
  }

  .agreement-text {
    color: $dark-9;
    font-size: 26rpx;
    line-height: 40rpx;
  }

  .agreement-option {
    justify-content: center;
    width: 100%;
  }
</style>
