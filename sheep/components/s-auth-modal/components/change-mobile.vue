<!-- 绑定/更换手机号 changeMobile  -->
<template>
  <view>
    <!-- 标题栏 -->
    <view class="head-box ss-m-b-40">
      <view class="head-title">
        {{ userInfo.mobile ? '更换手机号' : '绑定手机号' }}
      </view>
      <view v-if="'WechatMiniProgram' !== sheep.$platform.name" class="head-subtitle ss-m-t-20">
        为了您的账号安全，请使用本人手机号码
      </view>
    </view>

    <view v-if="'WechatMiniProgram' === sheep.$platform.name" class="bind-tabs">
      <button
        class="ss-reset-button bind-tab"
        :class="{ 'bind-tab-active': state.bindMode === 'wechat' }"
        :disabled="state.isSubmitting"
        @tap="setBindMode('wechat')"
      >
        快捷绑定
      </button>
      <button
        class="ss-reset-button bind-tab"
        :class="{ 'bind-tab-active': state.bindMode === 'sms' }"
        :disabled="state.isSubmitting"
        @tap="setBindMode('sms')"
      >
        短信验证
      </button>
    </view>
    <view v-if="'WechatMiniProgram' === sheep.$platform.name" class="bind-mode-subtitle">
      {{
        state.bindMode === 'wechat'
          ? '授权当前手机号后快速完成绑定'
          : '使用短信验证码绑定本人手机号'
      }}
    </view>

    <!-- 微信小程序优先使用微信授权 -->
    <button
      v-if="'WechatMiniProgram' === sheep.$platform.name && state.bindMode === 'wechat'"
      class="ss-reset-button wechat-phone-btn"
      open-type="getPhoneNumber"
      :disabled="state.isSubmitting"
      @getphonenumber="getPhoneNumber"
    >
      授权并绑定
    </button>

    <!-- 表单项 -->
    <uni-forms
      v-if="'WechatMiniProgram' !== sheep.$platform.name || state.bindMode === 'sms'"
      ref="changeMobileRef"
      v-model="state.model"
      :rules="state.rules"
      validateTrigger="bind"
      labelWidth="140"
      labelAlign="center"
    >
      <uni-forms-item name="mobile" label="手机号">
        <uni-easyinput
          placeholder="请输入手机号"
          v-model="state.model.mobile"
          :inputBorder="false"
          type="number"
        >
          <template v-slot:right>
            <button
              class="ss-reset-button code-btn-start"
              :disabled="state.isMobileEnd"
              :class="{ 'code-btn-end': state.isMobileEnd }"
              @tap="getSmsCode('changeMobile', state.model.mobile)"
            >
              {{ getSmsTimer('changeMobile') }}
            </button>
          </template>
        </uni-easyinput>
      </uni-forms-item>

      <uni-forms-item name="code" label="验证码">
        <uni-easyinput
          placeholder="请输入验证码"
          v-model="state.model.code"
          :inputBorder="false"
          type="number"
          maxlength="6"
        >
          <template v-slot:right>
            <button
              class="ss-reset-button login-btn-start"
              :disabled="state.isSubmitting"
              @tap="changeMobileSubmit"
            >
              确认
            </button>
          </template>
        </uni-easyinput>
      </uni-forms-item>
    </uni-forms>
  </view>
</template>

<script setup>
  import { offerPhoneSharing } from '@/sheep/hooks/useIdentityConsent';
  import { computed, onBeforeUnmount, reactive, ref, unref } from 'vue';
  import sheep from '@/sheep';
  import { code, mobile } from '@/sheep/validate/form';
  import { closeAuthModal, getSmsCode, getSmsTimer } from '@/sheep/hooks/useModal';
  import UserApi from '@/sheep/api/member/user';

  const changeMobileRef = ref(null);
  const userInfo = computed(() => sheep.$store('user').userInfo);
  const instanceState = { active: true };

  onBeforeUnmount(() => {
    instanceState.active = false;
  });

  // 数据
  const state = reactive({
    bindMode: 'wechat', // 微信小程序默认优先使用微信授权
    isMobileEnd: false, // 手机号输入完毕
    isSubmitting: false, // 手机号提交中，两种绑定方式共用
    model: {
      mobile: '', // 手机号
      code: '', // 验证码
    },
    rules: {
      code,
      mobile,
    },
  });

  function setBindMode(mode) {
    if (!state.isSubmitting) {
      state.bindMode = mode;
    }
  }

  // 绑定手机号
  async function changeMobileSubmit() {
    if (state.isSubmitting) {
      return;
    }
    state.isSubmitting = true;
    try {
      const validate = await unref(changeMobileRef)
        .validate()
        .catch((error) => {
          console.log('error: ', error);
        });
      if (!validate) {
        return;
      }
      const { code } = await UserApi.updateUserMobile(state.model);
      if (code !== 0) {
        return;
      }
      await sheep.$store('user').getInfo();
      if (instanceState.active) {
        closeAuthModal();
      void offerPhoneSharing();
      }
    } finally {
      state.isSubmitting = false;
    }
  }

  // 使用微信手机号
  async function getPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok' || state.isSubmitting) {
      return;
    }
    state.isSubmitting = true;
    try {
      const result = await sheep.$platform.useProvider().bindUserPhoneNumber(e.detail);
      if (!result) {
        return;
      }
      await sheep.$store('user').getInfo();
      if (instanceState.active) {
        closeAuthModal();
      void offerPhoneSharing();
      }
    } finally {
      state.isSubmitting = false;
    }
  }
</script>

<style lang="scss" scoped>
  @import '../index.scss';

  .wechat-phone-btn {
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

  .bind-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    height: 72rpx;
    border-bottom: 1rpx solid #eeeeee;
  }

  .bind-tab {
    position: relative;
    height: 72rpx;
    color: #999999;
    font-size: 30rpx;
    font-weight: 500;

    &.bind-tab-active {
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

  .bind-mode-subtitle {
    margin: 20rpx 0 44rpx;
    color: #afb6c0;
    font-size: 26rpx;
  }
</style>
