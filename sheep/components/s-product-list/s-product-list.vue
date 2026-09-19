<!-- ProductList owns source loading; shelves receiving goodsList remain presentation-only. -->
<template>
  <view class="product-list">
    <view v-if="state.loading" class="product-list__status">商品加载中…</view>
    <s-empty
      v-else-if="state.error"
      icon="/static/internet-empty.png"
      text="商品加载失败，请重试"
      showAction
      actionText="重新加载"
      padding-top="60"
      @clickAction="refresh"
    />
    <s-empty
      v-else-if="state.loaded && isGroup && !state.list.length"
      icon="/static/data-empty.png"
      :text="state.unavailable ? '暂无可用分组' : '该分组暂无商品'"
      padding-top="60"
    />
    <s-goods-shelves v-else :data="data" :styles="styles" :goods-list="state.list" />
    <button
      v-if="isGroup && data.showMore && state.loaded && !state.error && state.groups.length"
      class="product-list__more ss-reset-button"
      @tap="showMore"
      >查看更多 <text class="sicon-forward"
    /></button>
  </view>
</template>

<script setup>
  import { computed, onUnmounted, reactive, watch } from 'vue';
  import sheep from '@/sheep';
  import GroupApi from '@/sheep/api/product/group';
  import SpuApi from '@/sheep/api/product/spu';
  import { buildProductGroupRouteQuery } from '@/sheep/components/s-goods-group/product-group.mjs';
  import {
    createProductListSource,
    createProductListState,
  } from '@/sheep/components/s-goods-group/group-source.mjs';

  const props = defineProps({
    data: { type: Object, default: () => ({}) },
    styles: { type: Object, default: () => ({}) },
    refreshKey: { type: Number, default: 0 },
  });
  const isGroup = computed(() => props.data.sourceType === 'group');
  const state = reactive(createProductListState());
  const source = createProductListSource(
    {
      getGroups: GroupApi.getGroupListByIds,
      getGroupPage: GroupApi.getGroupSpuPage,
      getSpus: SpuApi.getSpuListByIds,
    },
    state,
  );
  const refresh = () => source.load(props.data);

  function showMore() {
    if (!state.groups.length) return;
    sheep.$router.go(
      '/pages/goods/group-list',
      buildProductGroupRouteQuery(
        {
          ...props.data,
          groupIds: state.groups.map((group) => Number(group.id)),
        },
        'all',
      ),
    );
  }

  watch(
    () => [
      props.data.sourceType,
      props.data.spuIds,
      props.data.groupIds,
      props.data.pageSize,
      props.data.sortType,
      props.refreshKey,
    ],
    refresh,
    { deep: true, immediate: true },
  );
  onUnmounted(() => source.dispose());
</script>

<style lang="scss" scoped>
  .product-list__status {
    text-align: center;
    color: #999;
    padding: 60rpx 0;
    font-size: 26rpx;
  }
  .product-list__more {
    width: 100%;
    text-align: center;
    padding: 24rpx;
    font-size: 26rpx;
    color: #666;
  }
</style>
