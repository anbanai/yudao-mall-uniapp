<!-- 个人中心：支持装修 -->
<template>
  <s-layout
    title="会员中心"
    tabbar="/pages/index/user"
    navbar="custom"
    :bgStyle="template.page"
    :navbarStyle="template.navigationBar"
    onShareAppMessage
    sharePage="user"
  >
    <view class="member-hero">
      <view class="profile-row">
        <view class="profile-main" @tap="openProfile">
          <image class="avatar" :src="avatarUrl" mode="aspectFill" />
          <text class="nickname">{{ nickname }}</text>
        </view>
        <button class="checkin-button" @tap="openCheckin">
          <uni-icons type="heart-filled" size="18" color="#ffd4a3" />
          <text>签到</text>
        </button>
      </view>
      <view class="member-promo" @tap="openMembership">
        <view class="promo-copy">
          <text class="promo-title">注册会员 尊享权益</text>
          <text class="promo-subtitle">限时专属新人礼 | 新人专属积分 | 15项会员权益</text>
        </view>
        <view class="promo-action">
          <text>去注册</text>
          <view class="promo-arrow"><uni-icons type="arrowright" size="15" color="#fff" /></view>
        </view>
      </view>
    </view>
    <view class="orders-panel">
      <view class="orders-heading" @tap="openOrders(0)">
        <text>我的订单</text>
        <text class="all-orders">全部 ›</text>
      </view>
      <view class="order-grid">
        <view
          v-for="item in orderShortcuts"
          :key="item.title"
          class="order-item"
          @tap="openOrderShortcut(item)"
        >
          <uni-icons class="account-icon" :type="item.glyph" size="31" color="#201915" />
          <text>{{ item.title }}</text>
        </view>
        <view
          v-for="item in accountShortcuts"
          :key="item.title"
          class="order-item"
          @tap="openShortcut(item)"
        >
          <uni-icons class="account-icon" :type="item.glyph" size="31" color="#201915" />
          <text>{{ item.title }}</text>
        </view>
      </view>
    </view>
    <s-member-center :key="isFormalLogin ? userInfo.id : 'guest'" />
    <s-block
      v-for="(item, index) in remainingComponents"
      :key="index"
      :styles="item.property.style"
      :allow-overflow="
        (item.id === 'ProductGroup' || item.id === 'ProductCategory') && item.property.sticky
      "
    >
      <s-block-item
        :type="item.id"
        :data="item.property"
        :styles="item.property.style"
        :refresh-key="productGroupRefreshKey"
      />
    </s-block>
    <s-empty
      v-if="userDataError"
      icon="/static/internet-empty.png"
      :text="userDataError"
      showAction
      actionText="重新加载"
      @clickAction="refreshUserData"
    />
  </s-layout>
</template>

<script setup>
  import { computed, ref } from 'vue';
  import { onShow, onPageScroll, onPullDownRefresh } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import { showAuthModal } from '@/sheep/hooks/useModal';

  // 隐藏原生tabBar
  uni.hideTabBar({
    fail: () => {},
  });

  const template = computed(() => sheep.$store('app').template.user);
  const userStore = sheep.$store('user');
  const productGroupRefreshKey = ref(0);
  const userDataError = ref('');
  const isFormalLogin = computed(() => userStore.isFormalLogin);
  const userInfo = computed(() => userStore.userInfo);
  const nickname = computed(() => userInfo.value?.nickname || '游客1782886...');
  const avatarUrl = computed(() =>
    userInfo.value?.avatar
      ? sheep.$url.cdn(userInfo.value.avatar)
      : sheep.$url.static('/static/member-center/guest.webp'),
  );
  const remainingComponents = computed(() =>
    (template.value?.components || []).filter(
      (item) => !['UserCard', 'UserWallet', 'UserOrder', 'Divider'].includes(item.id),
    ),
  );
  const orderShortcuts = [
    { title: '待付款', value: 1, glyph: 'wallet' },
    { title: '待发货', value: 2, glyph: 'shop' },
    { title: '待收货', value: 3, glyph: 'navigate' },
    { title: '待/已评价', value: 4, glyph: 'compose' },
    { title: '退款/售后', path: '/pages/order/aftersale/list', glyph: 'undo' },
  ];
  const accountShortcuts = [
    { title: '我的团购', glyph: 'shop', path: '/pages/activity/groupon/order' },
    { title: '我的足迹', glyph: 'eye', path: '/pages/user/goods-log' },
    { title: '我的积分', glyph: 'wallet', path: '/pages/user/wallet/score' },
    { title: '收货地址', glyph: 'location', path: '/pages/user/address/list' },
    { title: '个人信息', glyph: 'person', path: '/pages/user/info' },
  ];
  let hasShown = false;

  function getUserDataErrorMessage(error) {
    return (
      error?.data?.msg ||
      error?.response?.data?.msg ||
      error?.response?.msg ||
      error?.message ||
      '用户信息加载失败，请重试'
    );
  }

  function openProfile() {
    sheep.$router.go('/pages/user/info');
  }

  function openCheckin() {
    sheep.$router.go('/pages/app/sign');
  }

  function openMembership() {
    if (userStore.isFormalLogin) sheep.$router.go('/pages/user/benefits/index');
    else showAuthModal();
  }

  function openOrders(value) {
    sheep.$router.go('/pages/order/list', { type: value });
  }

  function openOrderShortcut(item) {
    if (item.path) sheep.$router.go(item.path);
    else openOrders(item.value);
  }

  function openShortcut(item) {
    sheep.$router.go(item.path);
  }

  async function refreshUserData() {
    try {
      userDataError.value = '';
      await userStore.updateUserData({ force: true });
    } catch (error) {
      userDataError.value = getUserDataErrorMessage(error);
      console.error('[用户中心] 用户信息加载失败', error);
    }
  }

  onShow(() => {
    if (hasShown) {
      productGroupRefreshKey.value += 1;
    } else {
      hasShown = true;
    }
    void refreshUserData();
  });

  onPullDownRefresh(() => {
    void refreshUserData().finally(() => {
      uni.stopPullDownRefresh();
    });
  });

  onPageScroll(() => {});
</script>

<style lang="scss" scoped>
  .member-hero {
    height: 304rpx;
    padding: 12rpx 30rpx 0;
    box-sizing: border-box;
    background: #faf5e9 url('/static/member-center/header.webp') no-repeat top center / 100% 100%;
  }

  .profile-row {
    height: 104rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .profile-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 28rpx;
  }
  .avatar {
    width: 104rpx;
    height: 104rpx;
    flex: none;
    border-radius: 50%;
  }
  .nickname {
    max-width: 460rpx;
    overflow: hidden;
    color: #171513;
    font-size: 34rpx;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .checkin-button {
    width: 150rpx;
    height: 54rpx;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    border: 0;
    border-radius: 40rpx;
    background: #765035;
    color: #fff;
    font-size: 26rpx;
  }
  .checkin-button::after {
    border: 0;
  }
  .member-promo {
    height: 108rpx;
    margin: 14rpx 38rpx 0;
    padding: 0 22rpx 0 30rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    border-radius: 20rpx;
    overflow: hidden;
    background: #f8bd82 url('/static/member-center/card.webp') no-repeat center / 100% 100%;
    color: #765035;
  }
  .promo-copy {
    min-width: 0;
  }
  .promo-title,
  .promo-subtitle {
    display: block;
    white-space: nowrap;
  }
  .promo-title {
    font-size: 30rpx;
    font-weight: 700;
  }
  .promo-subtitle {
    margin-top: 10rpx;
    font-size: 20rpx;
  }
  .promo-action {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 25rpx;
  }
  .promo-arrow {
    width: 28rpx;
    height: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #765035;
  }
  .orders-panel {
    position: relative;
    z-index: 1;
    margin: -5rpx 30rpx 0;
    padding: 22rpx 24rpx 14rpx;
    border-radius: 28rpx;
    background: #fff;
    box-shadow: 0 5rpx 12rpx rgba(63, 48, 29, 0.09);
  }
  .orders-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12rpx 14rpx;
    font-size: 31rpx;
    color: #111;
  }
  .all-orders {
    color: #999;
    font-size: 23rpx;
  }
  .order-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    row-gap: 18rpx;
  }
  .order-item {
    min-width: 0;
    height: 104rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    color: #111;
    font-size: 20rpx;
    white-space: nowrap;
  }
  .account-icon {
    width: 62rpx;
    height: 62rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
