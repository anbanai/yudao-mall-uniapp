<template>
  <view v-if="tabs.length" class="goods-group">
    <su-sticky v-if="data.sticky" bgColor="#fff">
      <su-tabs :list="tabs" :current="activeIndex" @change="handleTabChange" />
    </su-sticky>
    <view v-else class="goods-group__tabs">
      <su-tabs :list="tabs" :current="activeIndex" @change="handleTabChange" />
    </view>
    <s-goods-shelves :data="data" :styles="styles" :goods-list="goodsList" />
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
  let mounted = true;
  let refreshGeneration = 0;

  const selectedCategoryIds = computed(() => normalizeCategoryIds(props.data.categoryIds));
  const tabs = computed(() => [
    ...(props.data.showAll && categories.value.length ? [{ key: 'all', name: '全部' }] : []),
    ...categories.value.map((category) => ({ key: String(category.id), name: category.name })),
  ]);
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
      return;
    }
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
    activeIndex.value = 0;
    try {
      const categoryIds = selectedCategoryIds.value;
      if (!categoryIds.length) return;
      const response = await CategoryApi.getCategoryListByIds(categoryIds.join(','));
      if (!mounted || generation !== refreshGeneration || response?.code !== 0) return;
      categories.value = orderSelectedCategories(categoryIds, response.data || []);
      await loadActiveTab(generation);
    } catch {
      if (mounted && generation === refreshGeneration) {
        categories.value = [];
        goodsList.value = [];
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
  .goods-group__tabs {
    background: #fff;
  }
</style>
