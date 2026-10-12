<!-- 个人中心：支持装修 -->
<template>
  <s-layout
    title="我的"
    tabbar="/pages/index/user"
    navbar="custom"
    :bgStyle="template.page"
    :navbarStyle="template.navigationBar"
    onShareAppMessage
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
    <s-empty
      v-if="userDataError"
      icon="/static/internet-empty.png"
      :text="userDataError"
      showAction
      actionText="重新加载"
      @clickAction="refreshUserData"
    />
    <view class="ss-p-30 bg-white">
      <button @tap="sheep.$router.go('/pages/user/benefits/index')">会员权益中心</button>
    </view>
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

<style></style>
