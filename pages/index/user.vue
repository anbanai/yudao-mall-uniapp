<!-- 个人中心：支持装修 -->
<template>
  <s-layout
    title="我的"
    tabbar="/pages/index/user"
    navbar="custom"
    :bgStyle="template.page"
    :navbarStyle="template.navigationBar"
    onShareAppMessage
    sharePage="user"
  >
    <s-block
      v-for="(item, index) in template.components"
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
    <view class="benefits-entry" @tap="openBenefits">
      <view>
        <text class="benefits-entry-title">会员权益中心</text>
        <text class="benefits-entry-desc">查看当前等级、升级条件和专属权益</text>
      </view>
      <text class="sicon-forward benefits-entry-arrow" />
    </view>
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

  // 隐藏原生tabBar
  uni.hideTabBar({
    fail: () => {},
  });

  const template = computed(() => sheep.$store('app').template.user);
  const userStore = sheep.$store('user');
  const productGroupRefreshKey = ref(0);
  const userDataError = ref('');
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

  function openBenefits() {
    sheep.$router.go('/pages/user/benefits/index');
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
  .benefits-entry {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 24rpx 24rpx 0;
    padding: 26rpx 28rpx;
    border-radius: 12rpx;
    background: #fff;
    box-shadow: 0 8rpx 24rpx rgba(28, 54, 40, 0.06);
  }

  .benefits-entry-title,
  .benefits-entry-desc {
    display: block;
  }

  .benefits-entry-title {
    color: #1f4a38;
    font-size: 28rpx;
    font-weight: 600;
  }

  .benefits-entry-desc {
    margin-top: 8rpx;
    color: #7a847d;
    font-size: 22rpx;
  }

  .benefits-entry-arrow {
    color: #1f4a38;
    font-size: 28rpx;
  }
</style>
