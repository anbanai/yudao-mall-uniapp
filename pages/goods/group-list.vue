<template>
  <s-layout
    navbar="normal"
    :title="state.groupName || '分组商品'"
    :leftWidth="0"
    :rightWidth="0"
    tools="search"
    :defaultSearch="state.keyword"
    @search="onSearch"
  >
    <su-sticky bgColor="#fff">
      <su-tabs
        :list="state.sortTabs"
        :current="state.currentTab"
        :scrollable="true"
        @change="onSortChange"
      />
    </su-sticky>

    <view v-if="state.pagination.list.length" class="group-goods-list">
      <view v-for="item in state.pagination.list" :key="item.id" class="group-goods-item">
        <s-goods-column
          size="md"
          :data="item"
          :topRadius="10"
          :bottomRadius="10"
          @click="sheep.$router.go('/pages/goods/index', { id: item.id })"
        />
      </view>
    </view>

    <uni-load-more
      v-if="state.pagination.total > 0"
      :status="state.loadStatus"
      :content-text="{ contentdown: '上拉加载更多' }"
      @tap="loadMore"
    />
    <s-empty
      v-if="state.loaded && state.pagination.total === 0"
      icon="/static/soldout-empty.png"
      :text="state.failed ? '分组商品加载失败，请稍后重试' : '该分组暂无商品'"
    />
  </s-layout>
</template>

<script setup>
  import { reactive } from 'vue';
  import { onLoad, onReachBottom } from '@dcloudio/uni-app';
  import { concat } from 'lodash-es';
  import sheep from '@/sheep';
  import GroupApi from '@/sheep/api/product/group';
  import OrderApi from '@/sheep/api/trade/order';
  import { appendSettlementProduct } from '@/sheep/hooks/useGoods';
  import { resetPagination } from '@/sheep/helper/utils';
  import {
    buildProductGroupQuery,
    normalizeGroupIds,
  } from '@/sheep/components/s-goods-group/product-group.mjs';

  const state = reactive({
    groupIds: [],
    groupName: '',
    keyword: '',
    sortType: 'default',
    currentTab: 0,
    loaded: false,
    failed: false,
    loadStatus: 'more',
    pagination: { list: [], total: 0, pageNo: 1, pageSize: 10 },
    sortTabs: [
      { name: '综合', sortType: 'default' },
      { name: '销量', sortType: 'sales' },
      { name: '新品', sortType: 'latest' },
      { name: '价格升序', sortType: 'priceAsc' },
      { name: '价格降序', sortType: 'priceDesc' },
    ],
  });

  function emptyList() {
    resetPagination(state.pagination);
    state.loaded = false;
    state.failed = false;
    state.loadStatus = 'more';
  }

  async function getList() {
    if (!state.groupIds.length || state.loadStatus === 'loading') return;
    state.loadStatus = 'loading';
    state.failed = false;
    try {
      const query = buildProductGroupQuery(
        { groupIds: state.groupIds, pageSize: state.pagination.pageSize, sortType: state.sortType },
        'all',
      );
      const response = await GroupApi.getGroupSpuPage({
        ...query,
        pageNo: state.pagination.pageNo,
        keyword: state.keyword,
      });
      if (response.code !== 0) throw new Error(response.msg || 'request failed');
      const list = response.data?.list || [];
      if (list.length) {
        const settlement = await OrderApi.getSettlementProduct(
          list.map((item) => item.id).join(','),
        );
        if (settlement.code === 0) appendSettlementProduct(list, settlement.data);
      }
      state.pagination.list = concat(state.pagination.list, list);
      state.pagination.total = response.data?.total || 0;
      state.loadStatus = state.pagination.list.length < state.pagination.total ? 'more' : 'noMore';
    } catch {
      state.failed = state.pagination.list.length === 0;
      state.loadStatus = 'noMore';
    } finally {
      state.loaded = true;
    }
  }

  function onSearch(keyword) {
    state.keyword = keyword || '';
    emptyList();
    void getList();
  }

  function onSortChange(tab) {
    if (state.currentTab === tab.index) return;
    state.currentTab = tab.index;
    state.sortType = state.sortTabs[tab.index].sortType;
    emptyList();
    void getList();
  }

  function loadMore() {
    if (state.loadStatus !== 'more') return;
    state.pagination.pageNo += 1;
    void getList();
  }

  onLoad((options) => {
    state.groupIds = normalizeGroupIds(String(options.groupIds || '').split(','));
    state.groupName = options.groupName ? decodeURIComponent(options.groupName) : '';
    state.sortType = options.sortType || 'default';
    const tabIndex = state.sortTabs.findIndex((item) => item.sortType === state.sortType);
    state.currentTab = tabIndex >= 0 ? tabIndex : 0;
    if (!state.groupIds.length) {
      state.loaded = true;
      return;
    }
    void getList();
  });

  onReachBottom(loadMore);
</script>

<style lang="scss" scoped>
  .group-goods-list {
    display: flex;
    flex-wrap: wrap;
    padding: 20rpx 10rpx 0;
  }

  .group-goods-item {
    box-sizing: border-box;
    width: 50%;
    padding: 0 10rpx 20rpx;
  }
</style>
