<template>
  <view :class="['goods-group', { 'goods-group--vertical': isVerticalMenu }]">
    <view v-if="showTabs && !isVerticalMenu" class="goods-group__menu-shell">
      <su-sticky v-if="data.sticky" :bg-color="menu.backgroundColor" :z-index="20">
        <scroll-view
          class="goods-group__menu goods-group__menu--horizontal"
          scroll-x
          enable-flex
          :show-scrollbar="false"
          :style="menuContainerStyle"
        >
          <view class="goods-group__menu-row">
            <view
              v-for="(tab, index) in tabs"
              :key="tab.key"
              class="goods-group__menu-item goods-group__menu-item--horizontal"
              :style="getMenuItemStyle(index)"
              @tap="handleTabChange(index)"
            >
              <text>{{ tab.name }}</text>
            </view>
          </view>
        </scroll-view>
      </su-sticky>
      <scroll-view
        v-else
        class="goods-group__menu goods-group__menu--horizontal"
        scroll-x
        enable-flex
        :show-scrollbar="false"
        :style="menuContainerStyle"
      >
        <view class="goods-group__menu-row">
          <view
            v-for="(tab, index) in tabs"
            :key="tab.key"
            class="goods-group__menu-item goods-group__menu-item--horizontal"
            :style="getMenuItemStyle(index)"
            @tap="handleTabChange(index)"
          >
            <text>{{ tab.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    <view :class="['goods-group__body', { 'goods-group__body--vertical': isVerticalMenu }]">
      <su-sticky
        v-if="isVerticalMenu && data.sticky"
        class="goods-group__vertical-sticky"
        :bg-color="menu.backgroundColor"
        :z-index="20"
      >
        <scroll-view
          class="goods-group__menu goods-group__menu--vertical"
          scroll-y
          :show-scrollbar="false"
          :style="[menuContainerStyle, { height: menuHeight }]"
        >
          <view
            v-for="(tab, index) in tabs"
            :key="tab.key"
            class="goods-group__menu-item goods-group__menu-item--vertical"
            :style="getMenuItemStyle(index)"
            @tap="handleTabChange(index)"
          >
            <text>{{ tab.name }}</text>
          </view>
        </scroll-view>
      </su-sticky>
      <scroll-view
        v-else-if="isVerticalMenu"
        class="goods-group__menu goods-group__menu--vertical"
        scroll-y
        :show-scrollbar="false"
        :style="[menuContainerStyle, { height: menuHeight }]"
      >
        <view
          v-for="(tab, index) in tabs"
          :key="tab.key"
          class="goods-group__menu-item goods-group__menu-item--vertical"
          :style="getMenuItemStyle(index)"
          @tap="handleTabChange(index)"
        >
          <text>{{ tab.name }}</text>
        </view>
      </scroll-view>
      <view class="goods-group__content">
        <view v-if="isLoading" class="goods-group__loading" aria-label="加载中">
          <view v-for="item in loadingItems" :key="item" class="goods-group__skeleton">
            <view class="goods-group__skeleton-image" />
            <view class="goods-group__skeleton-line goods-group__skeleton-line--long" />
            <view class="goods-group__skeleton-line" />
          </view>
        </view>
        <s-empty
          v-else-if="loadError"
          icon="/static/internet-empty.png"
          text="商品加载失败，请重试"
          showAction
          actionText="重新加载"
          buttonColor="#ff3000"
          padding-top="80"
          @clickAction="retry"
        />
        <s-empty
          v-else-if="hasLoaded && (!tabs.length || !goodsList.length)"
          icon="/static/data-empty.png"
          :text="tabs.length ? '该分组暂无商品' : '暂无可用分组'"
          padding-top="80"
        />
        <s-goods-shelves
          v-else
          :data="data"
          :styles="styles"
          :goods-list="goodsList"
          variant="productGroup"
        />
        <view v-if="hasLoaded && goodsList.length" class="goods-group__more" @tap="handleMore">
          <text>查看更多</text>
          <text class="sicon-forward" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
  import sheep from '@/sheep';
  import GroupApi from '@/sheep/api/product/group';
  import {
    buildProductGroupQuery,
    buildProductGroupRouteQuery,
    createProductGroupLoader,
    getProductGroupResponseData,
    getProductGroupMenuHeight,
    getProductGroupMenuItemStyle,
    normalizeGroupIds,
    orderSelectedGroups,
    resolveProductGroupMenu,
  } from './product-group.mjs';

  const props = defineProps({
    data: {
      type: Object,
      default: () => ({}),
    },
    styles: {
      type: Object,
      default: () => ({}),
    },
    refreshKey: {
      type: Number,
      default: 0,
    },
  });

  const groups = ref([]);
  const activeIndex = ref(0);
  const goodsList = ref([]);
  const isLoading = ref(false);
  const hasLoaded = ref(false);
  const loadError = ref(false);
  const loadingItems = [1, 2, 3, 4, 5, 6];
  let mounted = true;
  let refreshGeneration = 0;

  const selectedGroupIds = computed(() => normalizeGroupIds(props.data.groupIds));
  const tabs = computed(() => [
    ...(props.data.showAll && groups.value.length ? [{ key: 'all', name: '全部' }] : []),
    ...groups.value.map((group) => ({ key: String(group.id), name: group.name })),
  ]);
  const showTabs = computed(() => tabs.value.length > 1);
  const menu = computed(() => resolveProductGroupMenu(props.data.menu));
  const isVerticalMenu = computed(() => showTabs.value && menu.value.layout === 'vertical');
  const menuContainerStyle = computed(() => ({ backgroundColor: menu.value.backgroundColor }));
  const menuHeight = computed(() => getProductGroupMenuHeight(tabs.value.length));
  const queryData = computed(() => ({
    ...props.data,
    groupIds: groups.value.map((group) => Number(group.id)),
  }));

  const loader = createProductGroupLoader(async (query) => {
    const response = await GroupApi.getGroupSpuPage(query);
    return getProductGroupResponseData(response)?.list || [];
  });

  async function loadActiveTab(generation = refreshGeneration) {
    const tab = tabs.value[activeIndex.value];
    if (!tab) {
      goodsList.value = [];
      hasLoaded.value = true;
      return;
    }
    isLoading.value = true;
    hasLoaded.value = false;
    loadError.value = false;
    try {
      const result = await loader.load(
        tab.key,
        buildProductGroupQuery(queryData.value, tab.key === 'all' ? 'all' : Number(tab.key)),
      );
      if (
        result.accepted &&
        mounted &&
        generation === refreshGeneration &&
        tabs.value[activeIndex.value]?.key === tab.key
      ) {
        goodsList.value = result.list;
        isLoading.value = false;
        hasLoaded.value = true;
      }
    } catch {
      if (
        mounted &&
        generation === refreshGeneration &&
        tabs.value[activeIndex.value]?.key === tab.key
      ) {
        goodsList.value = [];
        isLoading.value = false;
        hasLoaded.value = false;
        loadError.value = true;
      }
    }
  }

  function getMenuItemStyle(index) {
    return getProductGroupMenuItemStyle(menu.value, activeIndex.value === index);
  }

  function handleTabChange(index) {
    activeIndex.value = index;
    void loadActiveTab();
  }

  function retry() {
    if (tabs.value.length) {
      void loadActiveTab();
    } else {
      void refresh();
    }
  }

  function handleMore() {
    const tab = tabs.value[activeIndex.value];
    if (!tab) return;
    sheep.$router.go(
      '/pages/goods/group-list',
      buildProductGroupRouteQuery(
        queryData.value,
        tab.key === 'all' ? 'all' : Number(tab.key),
        tab.name,
      ),
    );
  }

  async function refresh() {
    const generation = ++refreshGeneration;
    loader.clear();
    groups.value = [];
    goodsList.value = [];
    isLoading.value = false;
    hasLoaded.value = false;
    loadError.value = false;
    activeIndex.value = 0;
    try {
      const groupIds = selectedGroupIds.value;
      if (!groupIds.length) {
        hasLoaded.value = true;
        return;
      }
      const response = await GroupApi.getGroupListByIds(groupIds.join(','));
      if (!mounted || generation !== refreshGeneration) return;
      groups.value = orderSelectedGroups(groupIds, getProductGroupResponseData(response) || []);
      await loadActiveTab(generation);
    } catch {
      if (mounted && generation === refreshGeneration) {
        groups.value = [];
        goodsList.value = [];
        isLoading.value = false;
        hasLoaded.value = false;
        loadError.value = true;
      }
    }
  }

  watch(
    () => props.refreshKey,
    () => void refresh(),
  );

  watch(
    () => [props.data.groupIds, props.data.pageSize, props.data.showAll, props.data.sortType],
    () => void refresh(),
    { deep: true },
  );

  onMounted(() => {
    void refresh();
  });

  onUnmounted(() => {
    mounted = false;
    refreshGeneration += 1;
    loader.clear();
  });
</script>

<style lang="scss" scoped>
  .goods-group {
    width: 100%;
    background: #f7f8fa;
  }

  .goods-group__menu-shell {
    position: relative;
    z-index: 10;
    border-bottom: 1rpx solid #edf0f2;
    box-shadow: 0 4rpx 14rpx rgba(31, 35, 41, 0.04);
  }

  .goods-group__menu--horizontal {
    width: 100%;
    white-space: nowrap;
  }

  .goods-group__menu-row {
    display: flex;
    width: max-content;
  }

  .goods-group__menu-item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    line-height: 40rpx;
  }

  .goods-group__menu-item--horizontal {
    flex-shrink: 0;
    min-height: 88rpx;
    padding: 16rpx 28rpx;
  }

  .goods-group__body--vertical {
    display: flex;
    align-items: flex-start;
    width: 100%;
  }

  .goods-group__menu--vertical {
    flex-shrink: 0;
    width: 176rpx;
  }

  .goods-group__vertical-sticky {
    flex-shrink: 0;
    width: 176rpx;
  }

  .goods-group__menu-item--vertical {
    width: 100%;
    min-height: 88rpx;
    padding: 16rpx;
    text-align: center;
    word-break: break-all;
  }

  .goods-group__content {
    min-width: 0;
    flex: 1;
  }

  .goods-group__loading {
    display: flex;
    flex-wrap: wrap;
    padding: 20rpx 16rpx;
    background: #f7f8fa;
  }

  .goods-group__more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    min-height: 76rpx;
    color: #60646c;
    font-size: 26rpx;
    background: #fff;
    border-top: 1rpx solid #edf0f2;
  }

  .goods-group__skeleton {
    box-sizing: border-box;
    width: calc(33.333% - 16rpx);
    margin: 0 8rpx 16rpx;
    overflow: hidden;
    border-radius: 10rpx;
    background: #fff;
    padding-bottom: 20rpx;
  }

  .goods-group--vertical .goods-group__skeleton {
    width: calc(50% - 16rpx);
  }

  .goods-group__skeleton-image,
  .goods-group__skeleton-line {
    background: linear-gradient(90deg, #f1f3f5 25%, #e8ebee 37%, #f1f3f5 63%);
    background-size: 400% 100%;
    animation: goods-group-shimmer 1.4s ease infinite;
  }

  .goods-group__skeleton-image {
    width: 100%;
    height: 216rpx;
  }

  .goods-group__skeleton-line {
    width: 68%;
    height: 20rpx;
    margin: 16rpx 16rpx 0;
    border-radius: 10rpx;
  }

  .goods-group__skeleton-line--long {
    width: calc(100% - 32rpx);
    margin-top: 18rpx;
  }

  @keyframes goods-group-shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: 0 0;
    }
  }
</style>
