<!-- 装修用户组件：用户卡片 -->
<template>
  <view class="ss-user-info-wrap ss-p-t-50" :style="[bgStyle, { marginLeft: `${data.space}px` }]">
    <view class="ss-flex ss-col-center ss-row-between ss-m-b-20">
      <!-- #ifdef MP-WEIXIN -->
      <button
        v-if="!isLogin"
        class="ss-reset-button left-box profile-auth-btn ss-flex ss-col-center ss-m-l-36"
        open-type="getPhoneNumber"
        :disabled="isAuthorizing"
        @getphonenumber="onPhoneAuthorization"
      >
        <view class="avatar-box ss-m-r-24">
          <image
            class="avatar-img"
            :src="sheep.$url.static('/static/img/shop/default_avatar.png')"
            mode="aspectFill"
          />
        </view>
        <view class="nickname-box ss-flex ss-col-center">
          <view class="nick-name ss-m-r-20">请先登录</view>
        </view>
      </button>
      <view v-else class="left-box ss-flex ss-col-center ss-m-l-36">
        <view class="avatar-box ss-m-r-24">
          <image
            class="avatar-img"
            :src="
              userInfo.avatar
                ? sheep.$url.cdn(userInfo.avatar)
                : sheep.$url.static('/static/img/shop/default_avatar.png')
            "
            mode="aspectFill"
            @tap="sheep.$router.go('/pages/user/info')"
          />
        </view>
        <view class="nickname-box ss-flex ss-col-center">
          <view class="nick-name ss-m-r-20">{{ userInfo?.nickname || nickname }}</view>
        </view>
      </view>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <view class="left-box ss-flex ss-col-center ss-m-l-36">
        <view class="avatar-box ss-m-r-24">
          <image
            class="avatar-img"
            :src="
              isLogin && userInfo.avatar
                ? sheep.$url.cdn(userInfo.avatar)
                : sheep.$url.static('/static/img/shop/default_avatar.png')
            "
            mode="aspectFill"
            @tap="sheep.$router.go('/pages/user/info')"
          >
          </image>
        </view>
        <view>
          <view class="nickname-box ss-flex ss-col-center">
            <view class="nick-name ss-m-r-20">{{ userInfo?.nickname || nickname }}</view>
          </view>
        </view>
      </view>
      <!-- #endif -->
      <view class="right-box ss-m-r-52">
        <button class="ss-reset-button" @tap="showShareModal">
          <text class="sicon-qrcode"></text>
        </button>
      </view>
    </view>

    <!-- 提示绑定手机号 先隐藏 yudao 需要再修改 -->
    <view
      class="bind-mobile-box ss-flex ss-row-between ss-col-center"
      v-if="isLogin && !userInfo.mobile"
    >
      <view class="ss-flex">
        <text class="cicon-mobile-o" />
        <view class="mobile-title ss-m-l-20"> 点击绑定手机号确保账户安全</view>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <button
        class="ss-reset-button bind-btn"
        open-type="getPhoneNumber"
        :disabled="isAuthorizing"
        @getphonenumber="onPhoneAuthorization"
      >
        去绑定
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="ss-reset-button bind-btn" @tap="onBind">去绑定</button>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup>
  /**
   * 用户卡片
   *
   * @property {Number} leftSpace                  - 容器左间距
   * @property {Number} rightSpace                  - 容器右间距
   *
   * @property {String} avatar          - 头像
   * @property {String} nickname          - 昵称
   * @property {String} vip              - 等级
   * @property {String} collectNum        - 收藏数
   * @property {String} likeNum          - 点赞数
   *
   *
   */
  import { computed, ref } from 'vue';
  import sheep from '@/sheep';
  import { showShareModal, showAuthModal } from '@/sheep/hooks/useModal';
  import { authorizePhoneNumber } from '@/sheep/hooks/usePhoneAuthorization';

  // 用户信息
  const userInfo = computed(() => sheep.$store('user').userInfo);

  // 是否登录
  const isLogin = computed(() => sheep.$store('user').isLogin);
  const isAuthorizing = ref(false);
  // 接收参数
  const props = defineProps({
    // 装修数据
    data: {
      type: Object,
      default: () => ({}),
    },
    // 装修样式
    styles: {
      type: Object,
      default: () => ({}),
    },
    // 头像
    avatar: {
      type: String,
      default: '',
    },
    nickname: {
      type: String,
      default: '请先登录',
    },
    vip: {
      type: [String, Number],
      default: '1',
    },
    collectNum: {
      type: [String, Number],
      default: '1',
    },
    likeNum: {
      type: [String, Number],
      default: '1',
    },
  });

  // 设置背景样式
  const bgStyle = computed(() => {
    // 直接从 props.styles 解构
    const { bgType, bgImg, bgColor } = props.styles;

    // 根据 bgType 返回相应的样式
    return {
      background: bgType === 'img' ? `url(${bgImg}) no-repeat top center / 100% 100%` : bgColor,
    };
  });

  // 绑定手机号
  function onBind() {
    showAuthModal('changeMobile');
  }

  async function onPhoneAuthorization(event) {
    if (isAuthorizing.value) {
      return;
    }
    isAuthorizing.value = true;
    try {
      await authorizePhoneNumber(event.detail);
    } finally {
      isAuthorizing.value = false;
    }
  }
</script>

<style lang="scss" scoped>
  .ss-user-info-wrap {
    box-sizing: border-box;

    .avatar-box {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      overflow: hidden;

      .avatar-img {
        width: 100%;
        height: 100%;
      }
    }

    .nick-name {
      font-size: 34rpx;
      font-weight: 400;
      color: #333333;
      line-height: normal;
    }

    .vip-img {
      width: 30rpx;
      height: 30rpx;
    }

    .sicon-qrcode {
      font-size: 40rpx;
    }
  }

  .profile-auth-btn {
    min-width: 0;
    padding: 0;
    text-align: left;

    &[disabled] {
      opacity: 0.65;
    }
  }

  .bind-mobile-box {
    width: 100%;
    height: 84rpx;
    padding: 0 34rpx 0 44rpx;
    box-sizing: border-box;
    background: #ffffff;
    box-shadow: 0px -8rpx 9rpx 0px rgba(#e0e0e0, 0.3);

    .cicon-mobile-o {
      font-size: 30rpx;
      color: #ff690d;
    }

    .mobile-title {
      font-size: 24rpx;
      font-weight: 500;
      color: #ff690d;
    }

    .bind-btn {
      width: 100rpx;
      height: 50rpx;
      background: #ff6100;
      border-radius: 25rpx;
      font-size: 24rpx;
      font-weight: 500;
      color: #ffffff;
    }
  }
</style>
