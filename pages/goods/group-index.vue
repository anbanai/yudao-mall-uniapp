<template>
  <s-layout title="商品分组" navbar="normal" :onShareAppMessage="shareInfo">
    <view class="group-index">
      <uni-search-bar v-model="keyword" placeholder="搜索分组名称" cancelButton="none" />
      <view class="group-index__hint">按主题发现好物</view>
      <view v-if="loading" class="group-index__hint">正在加载分组…</view>
      <s-empty
        v-else-if="failed"
        text="分组加载失败，请重试"
        icon="/static/internet-empty.png"
        showAction
        actionText="重新加载"
        @clickAction="refresh"
      />
      <view v-else-if="visibleGroups.length" class="group-index__grid">
        <button
          v-for="group in visibleGroups"
          :key="group.id"
          class="group-index__item ss-reset-button"
          @tap="sheep.$router.go('/pages/goods/group-list', { groupIds: group.id })"
        >
          <text>{{ group.name }}</text>
          <text class="sicon-forward" />
        </button>
      </view>
      <s-empty
        v-else
        :text="keyword.trim() ? '没有匹配的分组' : '暂无可浏览的分组'"
        icon="/static/data-empty.png"
      />
    </view>
  </s-layout>
</template>

<script setup>
  import { computed, onUnmounted, ref } from 'vue';
  import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import GroupApi from '@/sheep/api/product/group';
  import {
    getProductGroupResponseData,
    publicProductGroups,
  } from '@/sheep/components/s-goods-group/product-group.mjs';
  import { buildProductGroupShare } from './group-share.mjs';

  const keyword = ref('');
  const shareInfo = computed(() =>
    buildProductGroupShare({
      linkAddress: sheep.$store('app').platform.share.linkAddress,
      image: sheep.$url.cdn(sheep.$store('app').info.logo),
    }),
  );
  const groups = ref([]);
  const loading = ref(false);
  const failed = ref(false);
  let generation = 0;
  let firstShow = true;
  const visibleGroups = computed(() =>
    groups.value.filter((group) =>
      String(group.name || '')
        .toLowerCase()
        .includes(keyword.value.trim().toLowerCase()),
    ),
  );

  async function refresh() {
    const token = ++generation;
    loading.value = true;
    failed.value = false;
    groups.value = [];
    try {
      const data = getProductGroupResponseData(await GroupApi.getGroupList());
      if (token !== generation) return;
      groups.value = publicProductGroups(data);
    } catch {
      if (token === generation) failed.value = true;
    } finally {
      if (token === generation) {
        loading.value = false;
        uni.stopPullDownRefresh();
      }
    }
  }
  onLoad(() => void refresh());
  onShow(() => {
    sheep.$platform.share.updateShareInfo(shareInfo.value);
    if (firstShow) {
      firstShow = false;
      return;
    }
    void refresh();
  });
  onPullDownRefresh(refresh);
  onUnmounted(() => {
    generation += 1;
  });
</script>

<style lang="scss" scoped>
  .group-index {
    padding: 20rpx;
  }
  .group-index__hint {
    padding: 16rpx 8rpx 28rpx;
    color: #777;
    font-size: 26rpx;
  }
  .group-index__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
  }
  .group-index__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: calc(50% - 10rpx);
    padding: 28rpx 24rpx;
    background: #fff;
    border-radius: 12rpx;
    font-size: 28rpx;
    text-align: left;
    word-break: break-all;
  }
  .sicon-forward {
    margin-left: 12rpx;
    color: #aaa;
  }
</style>
