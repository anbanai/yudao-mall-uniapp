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
  const productGroupRefreshKey = ref(0);
  let hasShown = false;

  onShow(() => {
    if (hasShown) {
      productGroupRefreshKey.value += 1;
    } else {
      hasShown = true;
    }
    sheep.$store('user').updateUserData({ force: true });
  });

  onPullDownRefresh(() => {
    sheep.$store('user').updateUserData({ force: true });
    setTimeout(function () {
      uni.stopPullDownRefresh();
    }, 800);
  });

  onPageScroll(() => {});
</script>

<style></style>
