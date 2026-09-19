<template>
  <s-layout
    navbar="normal"
    :title="pageTitle"
    :leftWidth="0"
    :rightWidth="0"
    tools="search"
    :defaultSearch="state.keyword"
    :onShareAppMessage="shareInfo"
    @search="onSearch"
  >
    <view class="group-filter">
      <view class="group-filter__heading">
        <text>{{ selectedGroupNames || '分组商品' }}</text>
        <button class="group-filter__button ss-reset-button" @tap="openFilter">筛选分组</button>
      </view>
      <view v-if="state.filterOpen">
        <uni-search-bar
          v-model="state.groupKeyword"
          placeholder="搜索分组名称"
          cancelButton="none"
        />
        <view class="group-filter__hint">可选 1–15 个分组，展示任一所选分组中的商品</view>
        <view v-if="state.groupsLoading" class="group-filter__hint">正在加载分组…</view>
        <button
          v-else-if="state.groupsFailed"
          class="group-filter__button ss-reset-button"
          @tap="loadGroups"
        >
          加载失败，点击重试
        </button>
        <view v-else class="group-filter__options">
          <button
            v-for="group in filteredGroups"
            :key="group.id"
            :class="[
              'group-filter__chip',
              'ss-reset-button',
              { selected: state.draftIds.includes(Number(group.id)) },
            ]"
            @tap="toggleGroup(group.id)"
            >{{ group.name }}</button
          >
          <text v-if="!filteredGroups.length" class="group-filter__hint">暂无匹配分组</text>
        </view>
        <view class="group-filter__actions">
          <button class="group-filter__button ss-reset-button" @tap="state.filterOpen = false"
            >取消</button
          >
          <button class="group-filter__apply ss-reset-button" @tap="applyFilter"
            >确认（{{ state.draftIds.length }}/15）</button
          >
        </view>
      </view>
    </view>
    <su-sticky bgColor="#fff">
      <su-tabs :list="sortTabs" :current="currentTab" :scrollable="true" @change="onSortChange" />
    </su-sticky>

    <view v-if="pagerState.list.length" class="group-goods-list">
      <view v-for="item in pagerState.list" :key="item.id" class="group-goods-item">
        <s-goods-column
          size="md"
          :data="item"
          :topRadius="10"
          :bottomRadius="10"
          @click="sheep.$router.go('/pages/goods/index', { id: item.id })"
        />
      </view>
    </view>
    <s-empty
      v-if="pagerState.error && !pagerState.list.length"
      icon="/static/internet-empty.png"
      text="分组商品加载失败，请重试"
      showAction
      actionText="重新加载"
      @clickAction="pager.retry"
    />
    <button v-else-if="pagerState.error" class="group-retry ss-reset-button" @tap="pager.retry"
      >加载失败，点击重试本页</button
    >
    <s-empty
      v-else-if="pagerState.loaded && !pagerState.list.length"
      icon="/static/soldout-empty.png"
      :text="
        pagerState.unavailable
          ? '所选分组已不可用'
          : state.keyword
          ? '该分组没有匹配的商品'
          : '该分组暂无商品'
      "
      :showAction="pagerState.unavailable"
      actionText="浏览其他分组"
      actionUrl="/pages/goods/group-index"
    />
    <uni-load-more
      v-if="!pagerState.error && (pagerState.loading || pagerState.list.length)"
      :status="pagerState.loading ? 'loading' : pagerState.hasMore ? 'more' : 'noMore'"
      :content-text="{ contentdown: '上拉加载更多' }"
      @tap="pager.loadMore"
    />
  </s-layout>
</template>

<script setup>
  import { computed, onUnmounted, reactive } from 'vue';
  import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import GroupApi from '@/sheep/api/product/group';
  import OrderApi from '@/sheep/api/trade/order';
  import { appendSettlementProduct } from '@/sheep/hooks/useGoods';
  import {
    getProductGroupResponseData,
    normalizeGroupIds,
    normalizeGroupSort,
    publicProductGroups,
  } from '@/sheep/components/s-goods-group/product-group.mjs';
  import {
    createGroupPager,
    createGroupPageState,
  } from '@/sheep/components/s-goods-group/group-source.mjs';
  import { buildProductGroupShare, decodeGroupShareKeyword } from './group-share.mjs';

  const state = reactive({
    groupIds: [],
    keyword: '',
    sortType: 'default',
    filterOpen: false,
    draftIds: [],
    availableGroups: [],
    groupKeyword: '',
    groupsLoading: false,
    groupsFailed: false,
  });
  const sortTabs = [
    { name: '综合', sortType: 'default' },
    { name: '销量', sortType: 'sales' },
    { name: '新品', sortType: 'latest' },
    { name: '价格升序', sortType: 'priceAsc' },
    { name: '价格降序', sortType: 'priceDesc' },
  ];
  const currentTab = computed(() => sortTabs.findIndex((tab) => tab.sortType === state.sortType));
  const pagerState = reactive(createGroupPageState());
  const shareInfo = computed(() =>
    buildProductGroupShare({
      groups: pagerState.groups,
      keyword: state.keyword,
      sortType: state.sortType,
      linkAddress: sheep.$store('app').platform.share.linkAddress,
      image: sheep.$url.cdn(sheep.$store('app').info.logo),
    }),
  );
  const pageTitle = computed(() =>
    pagerState.groups.length === 1 ? pagerState.groups[0].name : '分组商品',
  );
  const selectedGroupNames = computed(() =>
    pagerState.groups.map((group) => group.name).join(' · '),
  );
  const filteredGroups = computed(() =>
    state.availableGroups.filter((group) =>
      String(group.name || '')
        .toLowerCase()
        .includes(state.groupKeyword.trim().toLowerCase()),
    ),
  );
  const pager = createGroupPager(
    {
      getGroups: GroupApi.getGroupListByIds,
      getPage: GroupApi.getGroupSpuPage,
      async decorate(list) {
        // Promotional display data is optional; keep the normal price if settlement is unavailable.
        try {
          const settlement = await OrderApi.getSettlementProduct(
            list.map((item) => item.id).join(','),
          );
          if (settlement.code === 0) appendSettlementProduct(list, settlement.data);
        } catch {
          /* Keep the original product prices. */
        }
        return list;
      },
    },
    pagerState,
  );
  let groupsGeneration = 0;
  let firstShow = true;

  async function refresh() {
    try {
      await pager.refresh({
        groupIds: state.groupIds,
        keyword: state.keyword,
        sortType: state.sortType,
        pageSize: 10,
      });
    } finally {
      uni.stopPullDownRefresh();
    }
  }

  async function loadGroups() {
    const token = ++groupsGeneration;
    state.groupsLoading = true;
    state.groupsFailed = false;
    state.availableGroups = [];
    try {
      const groups = getProductGroupResponseData(await GroupApi.getGroupList());
      if (token !== groupsGeneration) return;
      state.availableGroups = publicProductGroups(groups);
      const availableIds = new Set(state.availableGroups.map((group) => Number(group.id)));
      state.draftIds = state.draftIds.filter((id) => availableIds.has(id));
    } catch {
      if (token === groupsGeneration) state.groupsFailed = true;
    } finally {
      if (token === groupsGeneration) state.groupsLoading = false;
    }
  }

  function openFilter() {
    state.draftIds = pagerState.groups.map((group) => Number(group.id));
    state.filterOpen = true;
    void loadGroups();
  }

  function toggleGroup(groupId) {
    const id = Number(groupId);
    if (state.draftIds.includes(id)) {
      state.draftIds = state.draftIds.filter((item) => item !== id);
    } else if (state.draftIds.length < 15) {
      state.draftIds.push(id);
    } else {
      sheep.$helper.toast('最多选择 15 个分组');
    }
  }

  function applyFilter() {
    if (state.groupsLoading || state.groupsFailed) return;
    if (!state.draftIds.length) {
      sheep.$helper.toast('请至少选择一个分组');
      return;
    }
    state.groupIds = [...state.draftIds];
    state.filterOpen = false;
    void refresh();
  }

  function onSearch(keyword) {
    state.keyword = String(keyword || '').trim();
    void refresh();
  }

  function onSortChange(tab) {
    if (!sortTabs[tab.index] || currentTab.value === tab.index) return;
    state.sortType = sortTabs[tab.index].sortType;
    void refresh();
  }

  onLoad((options) => {
    state.groupIds = normalizeGroupIds(options.groupIds);
    state.keyword = String(options.keyword || '');
    // #ifndef H5
    state.keyword = decodeGroupShareKeyword(options.keyword);
    // #endif
    state.sortType = normalizeGroupSort(options.sortType);
    // Titles always come from public metadata; route-provided names are ignored.
    void refresh();
  });
  onShow(() => {
    sheep.$platform.share.updateShareInfo(shareInfo.value);
    if (firstShow) {
      firstShow = false;
      return;
    }
    state.filterOpen = false;
    void refresh();
  });
  onPullDownRefresh(refresh);
  onReachBottom(() => pager.loadMore());
  onUnmounted(() => {
    pager.dispose();
    groupsGeneration += 1;
  });
</script>

<style lang="scss" scoped>
  .group-filter {
    padding: 20rpx 24rpx;
    background: #fff;
  }
  .group-filter__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    font-size: 28rpx;
  }
  .group-filter__button {
    flex-shrink: 0;
    color: #666;
    font-size: 26rpx;
    padding: 12rpx;
  }
  .group-filter__hint {
    display: block;
    color: #999;
    font-size: 24rpx;
    padding: 16rpx 0;
  }
  .group-filter__options {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    max-height: 500rpx;
    overflow-y: auto;
  }
  .group-filter__chip {
    border-radius: 28rpx;
    padding: 12rpx 24rpx;
    background: #f5f6f8;
    font-size: 26rpx;
  }
  .group-filter__chip.selected {
    background: var(--ui-BG-Main);
    color: #fff;
  }
  .group-filter__actions {
    display: flex;
    justify-content: flex-end;
    gap: 20rpx;
    padding-top: 24rpx;
  }
  .group-filter__apply {
    padding: 12rpx 24rpx;
    border-radius: 30rpx;
    color: #fff;
    background: var(--ui-BG-Main);
    font-size: 26rpx;
  }
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
  .group-retry {
    margin: 20rpx auto;
    color: #666;
    font-size: 28rpx;
    padding: 24rpx;
  }
</style>
