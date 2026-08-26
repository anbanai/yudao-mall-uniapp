<template>
  <view class="goods-group">
    <view v-if="showTabs" class="goods-group__tabs-shell">
      <su-sticky v-if="data.sticky" bgColor="#fff" :z-index="20">
        <view class="goods-group__tabs">
          <su-tabs
            :list="tabs"
            :current="activeIndex"
            :item-style="tabItemStyle"
            :active-style="tabActiveStyle"
            :inactive-style="tabInactiveStyle"
            line-color="#222"
            line-width="36"
            line-height="5"
            @change="handleTabChange"
          />
        </view>
      </su-sticky>
      <view v-else class="goods-group__tabs">
        <su-tabs
          :list="tabs"
          :current="activeIndex"
          :item-style="tabItemStyle"
          :active-style="tabActiveStyle"
          :inactive-style="tabInactiveStyle"
          line-color="#222"
          line-width="36"
          line-height="5"
          @change="handleTabChange"
        />
      </view>
    </view>
    <view v-if="isLoading" class="goods-group__loading" aria-label="加载中">
      <view v-for="item in loadingItems" :key="item" class="goods-group__skeleton">
        <view class="goods-group__skeleton-image" />
        <view class="goods-group__skeleton-line goods-group__skeleton-line--long" />
        <view class="goods-group__skeleton-line" />
      </view>
    </view>
    <s-empty
      v-else-if="hasLoaded && (!tabs.length || !goodsList.length)"
      icon="/static/data-empty.png"
      :text="tabs.length ? '该分类暂无商品' : '暂无可用分类'"
      padding-top="80"
    />
    <s-goods-shelves
      v-else
      :data="data"
      :styles="styles"
      :goods-list="goodsList"
      variant="productGroup"
    />
  </view>
</template>

<script setup>
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
  import CategoryApi from '@/sheep/api/product/category';
  import SpuApi from '@/sheep/api/product/spu';
  import {
    buildProductGroupQuery,
    createProductGroupLoader,
    normalizeCategoryIds,
    orderSelectedCategories,
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

  const categories = ref([]);
  const activeIndex = ref(0);
  const goodsList = ref([]);
  const isLoading = ref(false);
  const hasLoaded = ref(false);
  const loadingItems = [1, 2, 3, 4, 5, 6];
  const tabItemStyle = { height: '88rpx', padding: '0 24rpx' };
  const tabActiveStyle = { color: '#202124', fontWeight: '600' };
  const tabInactiveStyle = { color: '#7b8088', fontWeight: '400' };
  let mounted = true;
  let refreshGeneration = 0;

  const selectedCategoryIds = computed(() => normalizeCategoryIds(props.data.categoryIds));
  const tabs = computed(() => [
    ...(props.data.showAll && categories.value.length ? [{ key: 'all', name: '全部' }] : []),
    ...categories.value.map((category) => ({ key: String(category.id), name: category.name })),
  ]);
  const showTabs = computed(() => tabs.value.length > 1);
  const queryData = computed(() => ({
    ...props.data,
    categoryIds: categories.value.map((category) => Number(category.id)),
  }));

  const loader = createProductGroupLoader(async (query) => {
    const response = await SpuApi.getSpuPage(query);
    return response?.code === 0 ? response.data?.list || [] : [];
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
  }

  function handleTabChange(tab) {
    activeIndex.value = tab.index;
    void loadActiveTab();
  }

  async function refresh() {
    const generation = ++refreshGeneration;
    loader.clear();
    categories.value = [];
    goodsList.value = [];
    isLoading.value = false;
    hasLoaded.value = false;
    activeIndex.value = 0;
    try {
      const categoryIds = selectedCategoryIds.value;
      if (!categoryIds.length) {
        hasLoaded.value = true;
        return;
      }
      const response = await CategoryApi.getCategoryListByIds(categoryIds.join(','));
      if (!mounted || generation !== refreshGeneration) return;
      if (response?.code !== 0) {
        categories.value = [];
        hasLoaded.value = true;
        return;
      }
      categories.value = orderSelectedCategories(categoryIds, response.data || []);
      await loadActiveTab(generation);
    } catch {
      if (mounted && generation === refreshGeneration) {
        categories.value = [];
        goodsList.value = [];
        isLoading.value = false;
        hasLoaded.value = true;
      }
    }
  }

  watch(
    () => props.refreshKey,
    () => void refresh(),
  );

  watch(
    () => [props.data.categoryIds, props.data.pageSize, props.data.showAll, props.data.sortType],
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

  .goods-group__tabs-shell {
    position: relative;
    z-index: 10;
    background: #fff;
    border-bottom: 1rpx solid #edf0f2;
    box-shadow: 0 4rpx 14rpx rgba(31, 35, 41, 0.04);
  }

  .goods-group__tabs {
    padding: 0 16rpx;
    background: #fff;
  }

  .goods-group__loading {
    display: flex;
    flex-wrap: wrap;
    padding: 20rpx 16rpx;
    background: #f7f8fa;
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
    0% { background-position: 100% 0; }
    100% { background-position: 0 0; }
  }
</style>
