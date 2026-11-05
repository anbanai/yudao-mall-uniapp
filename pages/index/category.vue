<!-- 商品分类列表 -->
<template>
  <s-layout :bgStyle="{ color: '#fff' }" tabbar="/pages/index/category" title="找茶">
    <view class="category-page">
      <view class="search-wrap">
        <uni-search-bar
          v-model="state.keyword"
          class="category-search"
          radius="8"
          placeholder="搜索商品"
          cancelButton="none"
          @confirm="onSearch"
        />
      </view>

      <view class="category-body ss-flex ss-col-top">
        <view class="side-menu-wrap" :style="[{ top: sideMenuTop }]">
          <scroll-view scroll-y :style="[{ height: pageHeight + 'px' }]">
            <view
              v-for="(item, index) in state.categoryList"
              :key="item.id"
              class="menu-item ss-flex"
              :class="[{ 'menu-item-active': index === state.activeMenu }]"
              @tap="onMenu(index)"
            >
              <view class="menu-title ss-line-1">{{ item.name }}</view>
            </view>
          </scroll-view>
        </view>

        <view class="goods-list-box">
          <scroll-view scroll-y :style="[{ height: pageHeight + 'px' }]">
            <template v-if="activeCategory">
              <category-section
                v-for="child in activeChildren"
                :key="child.id"
                :category="child"
                :products="state.sections[child.id]?.products || []"
                :loading="state.sections[child.id]?.loading"
                :error="state.sections[child.id]?.error"
              />
              <view v-if="!activeChildren.length" class="page-state">暂无子分类</view>
            </template>
            <view v-else class="page-state">暂无分类</view>
          </scroll-view>
        </view>
      </view>
    </view>
  </s-layout>
</template>

<script setup>
  import { computed, reactive } from 'vue';
  import { onShow } from '@dcloudio/uni-app';

  import sheep from '@/sheep';
  import CategoryApi from '@/sheep/api/product/category';
  import SpuApi from '@/sheep/api/product/spu';

  import CategorySection from './components/category-section.vue';
  import { buildCategoryProductQuery, buildCategoryTree } from './category-page.mjs';

  const state = reactive({
    categoryList: [],
    activeMenu: 0,
    sections: {},
    keyword: '',
  });

  const { safeArea } = sheep.$platform.device;
  const pageHeight = computed(() => safeArea.height - 44 - 50 - 48);
  const statusBarHeight = sheep.$platform.device.statusBarHeight * 2;
  const sideMenuTop = computed(() => `${Number(statusBarHeight + 180)}rpx`);
  const activeCategory = computed(() => state.categoryList[state.activeMenu]);
  const activeChildren = computed(() => activeCategory.value?.children || []);

  let requestToken = 0;

  async function loadCategoryProducts(category, token) {
    const children = Array.isArray(category?.children) ? category.children : [];
    const sections = {};
    children.forEach((child) => {
      sections[child.id] = {
        products: [],
        loading: true,
        error: false,
      };
    });
    state.sections = sections;

    await Promise.all(
      children.map(async (child) => {
        const section = sections[child.id];
        try {
          const response = await SpuApi.getSpuPage(buildCategoryProductQuery(child));
          if (token !== requestToken) {
            return;
          }
          if (response?.code !== 0) {
            section.error = true;
            section.loading = false;
            return;
          }
          section.products = Array.isArray(response.data?.list) ? response.data.list : [];
          section.loading = false;
        } catch {
          if (token !== requestToken) {
            return;
          }
          section.error = true;
          section.loading = false;
        }
      }),
    );
  }

  function onMenu(index) {
    if (!state.categoryList[index]) {
      return;
    }
    state.activeMenu = index;
    const token = ++requestToken;
    void loadCategoryProducts(state.categoryList[index], token);
  }

  function initMenuIndex() {
    const appStore = sheep.$store('app');
    const tabbarParams = appStore.paramsForTabbar || {};
    const requestedId = Number(tabbarParams.id);
    appStore.clearParamsForTabbar();

    const selectedIndex = state.categoryList.findIndex(
      (category) => Number(category.id) === requestedId,
    );
    onMenu(selectedIndex >= 0 ? selectedIndex : 0);
  }

  async function getList() {
    const token = ++requestToken;
    try {
      const response = await CategoryApi.getCategoryList();
      if (token !== requestToken || response?.code !== 0) {
        return;
      }
      state.categoryList = buildCategoryTree(response.data);
      initMenuIndex();
    } catch {
      if (token === requestToken) {
        state.categoryList = [];
        state.sections = {};
      }
    }
  }

  function onSearch(event) {
    const keyword = typeof event === 'string' ? event : event?.value || state.keyword;
    if (!keyword?.trim()) {
      return;
    }
    sheep.$router.go('/pages/goods/list', { keyword: keyword.trim() });
  }

  onShow(() => {
    void getList();
  });
</script>

<style lang="scss" scoped>
  .category-page {
    background: #fff;
  }

  .search-wrap {
    padding: 12rpx 24rpx 20rpx;
    background: #f7f7f7;
  }

  .category-search {
    margin: 0;
    padding: 0;
    background: #fff;
  }

  .category-body {
    position: relative;
  }

  .side-menu-wrap {
    position: fixed;
    left: 0;
    width: 200rpx;
    height: 100%;
    padding-left: 12rpx;
    background: #f6f6f6;
    box-sizing: border-box;
    z-index: 2;
  }

  .menu-item {
    position: relative;
    width: 100%;
    height: 88rpx;
    transition: all linear 0.2s;
  }

  .menu-title {
    position: relative;
    z-index: 0;
    margin-left: 28rpx;
    color: #333;
    font-size: 30rpx;
    font-weight: 400;
    line-height: 32rpx;
  }

  .menu-title::before {
    content: '';
    position: absolute;
    left: -64rpx;
    bottom: 0;
    z-index: -1;
    width: 64rpx;
    height: 12rpx;
    background: var(--ui-BG-Main-gradient);
  }

  .menu-item-active {
    background: #fff;
    border-radius: 20rpx 0 0 20rpx;
  }

  .menu-item-active .menu-title {
    font-weight: 600;
  }

  .menu-item-active .menu-title::before {
    left: 0;
  }

  .goods-list-box {
    width: calc(100vw - 200rpx);
    min-height: 100%;
    margin-left: 200rpx;
    padding: 20rpx 20rpx 40rpx;
    box-sizing: border-box;
    background: #fff;
  }

  .page-state {
    padding: 120rpx 0;
    color: #999;
    font-size: 26rpx;
    text-align: center;
  }
</style>
