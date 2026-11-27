<!-- 个人中心：支持装修 -->
<template>
  <s-layout
    title="会员中心"
    tabbar="/pages/index/user"
    navbar="custom"
    :bgStyle="template.page"
    :navbarStyle="memberNavbarStyle"
    :showLeftButton="true"
    onShareAppMessage
    sharePage="user"
  >
    <view class="member-hero">
      <image
        class="member-hero-background"
        :src="memberCenterAsset('profile-header.jpg')"
        mode="scaleToFill"
      />
      <view class="profile-row">
        <view class="profile-main" @tap="openProfile">
          <image class="avatar" :src="avatarUrl" mode="scaleToFill" @error="onAvatarError" />
          <text class="nickname">{{ nickname }}</text>
        </view>
      </view>
      <button class="checkin-hit-area ss-reset-button" aria-label="签到" @tap="openCheckin" />
    </view>
    <view
      class="member-promo"
      role="button"
      :aria-label="isFormalLogin ? '进入会员权益中心' : '注册会员 尊享权益，限时专属新人礼 | 新人专属积分 | 15项会员权益，去注册'"
      @tap="openMembership"
    >
      <image
        class="member-promo-background"
        :src="memberCenterAsset('member-promo.jpg')"
        mode="scaleToFill"
      />
      <view class="member-promo-action">
        <text>{{ isFormalLogin ? '查看权益' : '去注册' }}</text>
        <text class="member-promo-arrow">›</text>
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
          <image class="shortcut-icon" :src="item.icon" mode="aspectFit" />
          <text>{{ item.title }}</text>
        </view>
        <view
          v-for="item in accountShortcuts"
          :key="item.title"
          class="order-item"
          @tap="openShortcut(item)"
        >
          <image class="shortcut-icon" :src="item.icon" mode="aspectFit" />
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
  import { useUserAvatar } from '@/sheep/hooks/useUserAvatar';

  // 隐藏原生tabBar
  uni.hideTabBar({
    fail: () => {},
  });

  const template = computed(() => sheep.$store('app').template.user);
  const memberTitleCells = [
    { type: 'text', text: '会员中心', textColor: '#111111', width: 6, left: 1, borderRadius: 0 },
  ];
  const memberNavbarStyle = {
    styleType: 'normal',
    showType: 'always',
    alwaysShow: true,
    bgType: 'color',
    bgColor: '#ffffff',
    mpCells: memberTitleCells,
    otherCells: memberTitleCells,
  };
  const userStore = sheep.$store('user');
  const memberCenterAsset = (path) => sheep.$url.static(`/static/member-center/${path}`);
  const productGroupRefreshKey = ref(0);
  const userDataError = ref('');
  const isFormalLogin = computed(() => userStore.isFormalLogin);
  const userInfo = computed(() => userStore.userInfo);
  const nickname = computed(() => userInfo.value?.nickname || '游客1782886...');
  const { avatarUrl, onAvatarError, retryAvatar } = useUserAvatar(() => userInfo.value?.avatar);
  const remainingComponents = computed(() =>
    (template.value?.components || []).filter(
      (item) => !['UserCard', 'UserWallet', 'UserOrder', 'Divider'].includes(item.id),
    ),
  );
  const orderShortcuts = [
    { title: '待付款', value: 1, icon: memberCenterAsset('icons/waiting-payment.png') },
    { title: '待发货', value: 2, icon: memberCenterAsset('icons/waiting-shipment.png') },
    { title: '待收货', value: 3, icon: memberCenterAsset('icons/waiting-receipt.png') },
    { title: '待/已评价', value: 4, icon: memberCenterAsset('icons/review.png') },
    {
      title: '退款/售后',
      path: '/pages/order/aftersale/list',
      icon: memberCenterAsset('icons/refund.png'),
    },
  ];
  const accountShortcuts = [
    {
      title: '我的团购',
      icon: memberCenterAsset('icons/group-buy.png'),
      path: '/pages/activity/groupon/order',
    },
    {
      title: '我的足迹',
      icon: memberCenterAsset('icons/footprints.png'),
      path: '/pages/user/goods-log',
    },
    {
      title: '我的积分',
      icon: memberCenterAsset('icons/points.png'),
      path: '/pages/user/wallet/score',
    },
    {
      title: '收货地址',
      icon: memberCenterAsset('icons/address.png'),
      path: '/pages/user/address/list',
    },
    {
      title: '个人信息',
      icon: memberCenterAsset('icons/profile.png'),
      path: '/pages/user/info',
    },
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
      retryAvatar();
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
    position: relative;
    height: 183.33rpx;
    overflow: hidden;
  }
  .member-hero-background,
  .member-promo-background {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .profile-row {
    z-index: 1;
    position: absolute;
    top: 48rpx;
    left: 22rpx;
    right: 170rpx;
    height: 108rpx;
    display: flex;
    align-items: center;
  }
  .profile-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 22rpx;
  }
  .avatar {
    width: 108rpx;
    height: 108rpx;
    flex: none;
    border-radius: 50%;
  }
  .nickname {
    max-width: 400rpx;
    overflow: hidden;
    color: #171513;
    font-size: 40rpx;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .checkin-hit-area {
    position: absolute;
    z-index: 1;
    top: 58rpx;
    right: 0;
    width: 178rpx;
    height: 90rpx;
    background: transparent;
  }
  .member-promo {
    position: relative;
    height: 131.94rpx;
    overflow: hidden;
  }
  .member-promo-action {
    position: absolute;
    z-index: 1;
    top: 43%;
    right: 74rpx;
    display: flex;
    align-items: center;
    gap: 10rpx;
    transform: translateY(-50%);
    color: #765035;
    font-size: 24rpx;
  }
  .member-promo-arrow {
    display: flex;
    width: 25rpx;
    height: 25rpx;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #765035;
    color: #fff;
    font-size: 28rpx;
    line-height: 1;
  }
  .orders-panel {
    position: relative;
    z-index: 1;
    margin: 0 20rpx;
    padding: 20rpx 28rpx 24rpx;
    border-radius: 28rpx;
    background: #fff;
    box-shadow: 0 5rpx 12rpx rgba(63, 48, 29, 0.09);
  }
  .orders-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16rpx;
    font-size: 28rpx;
    color: #111;
  }
  .all-orders {
    color: #999;
    font-size: 23rpx;
  }
  .order-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    row-gap: 24rpx;
  }
  .order-item {
    min-width: 0;
    height: 104rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    color: #111;
    font-size: 24rpx;
    white-space: nowrap;
  }
  .shortcut-icon {
    width: 74rpx;
    height: 74rpx;
  }
  :deep(.nav-icon .icon-box) {
    width: 70rpx !important;
    height: 70rpx !important;
    border-radius: 50% !important;
  }
  :deep(.nav-icon .icon-button-left) {
    width: 70rpx !important;
    height: 70rpx !important;
  }
  :deep(.nav-icon .line),
  :deep(.nav-icon .icon-button-right) {
    display: none !important;
  }
</style>
