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
          <scroll-view
            scroll-y
            :scroll-into-view="state.menuScrollTarget"
            :style="[{ height: pageHeight + 'px' }]"
          >
            <view
              v-for="(item, index) in state.categoryList"
              :id="`menu-item-${item.id}`"
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
          <scroll-view
            class="goods-list-scroll"
            scroll-y
            :scroll-into-view="state.scrollTarget"
            :style="[{ height: pageHeight + 'px' }]"
            @scroll="onRightScroll"
            @touchmove="onRightTouchMove"
          >
            <template v-if="state.categoryList.length">
              <category-section
                v-for="(category, index) in state.categoryList"
                :id="`category-section-${category.id}`"
                :key="category.id"
                :category="category"
                :products="state.sections[category.id]?.products || []"
                :loading="state.sections[category.id]?.loading"
                :error="state.sections[category.id]?.error"
              />
            </template>
            <view v-else class="page-state">暂无分类</view>
          </scroll-view>
        </view>
      </view>
    </view>
  </s-layout>
</template>

<script setup>
  import { computed, getCurrentInstance, nextTick, reactive } from 'vue';
  import { onShow, onUnload } from '@dcloudio/uni-app';

  import sheep from '@/sheep';
  import CategoryApi from '@/sheep/api/product/category';
  import SpuApi from '@/sheep/api/product/spu';

  import CategorySection from './components/category-section.vue';
  import {
    buildCategoryProductQuery,
    createScrollIntentTracker,
    findActiveCategoryIndex,
    findInitialCategoryIndex,
    getSecondLevelCategories,
  } from './category-page.mjs';

  const state = reactive({
    categoryList: [],
    activeMenu: 0,
    sections: {},
    keyword: '',
    scrollTarget: '',
    menuScrollTarget: '',
  });

  const instance = getCurrentInstance();
  const { safeArea } = sheep.$platform.device;
  const pageHeight = computed(() => safeArea.height - 44 - 50 - 48);
  const statusBarHeight = sheep.$platform.device.statusBarHeight * 2;
  const sideMenuTop = computed(() => `${Number(statusBarHeight + 180)}rpx`);

  let requestToken = 0;
  let scrollSyncTimer;
  let scrollTargetTimer;
  let menuScrollTargetTimer;
  let rightScrollTop = 0;
  const scrollIntentTracker = createScrollIntentTracker();
  let pendingScrollIntent = null;

  async function loadCategoryProducts(categories, token) {
    const sections = {};
    categories.forEach((category) => {
      sections[category.id] = {
        products: [],
        loading: true,
        error: false,
      };
    });
    state.sections = sections;

    await Promise.all(
      categories.map(async (category) => {
        const section = sections[category.id];
        try {
          const response = await SpuApi.getSpuPage(buildCategoryProductQuery(category));
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

    if (token === requestToken && pendingScrollIntent) {
      const intent = pendingScrollIntent;
      pendingScrollIntent = null;
      if (scrollIntentTracker.isCurrent(intent.version)) {
        scrollToCategory(intent.index);
      }
    }
    if (token === requestToken) {
      nextTick(onRightScroll);
    }
  }

  function scrollToCategory(index, waitForProducts = false) {
    const category = state.categoryList[index];
    if (!category) {
      return;
    }
    const scrollVersion = scrollIntentTracker.capture();
    pendingScrollIntent = waitForProducts ? { index, version: scrollVersion } : null;
    syncActiveMenu(index);
    state.scrollTarget = '';
    clearTimeout(scrollTargetTimer);
    nextTick(() => {
      if (!scrollIntentTracker.isCurrent(scrollVersion)) {
        return;
      }
      state.scrollTarget = `category-section-${category.id}`;
      scrollTargetTimer = setTimeout(() => {
        state.scrollTarget = '';
      }, 500);
    });
  }

  function syncActiveMenu(index) {
    const category = state.categoryList[index];
    if (!category) {
      return;
    }
    state.activeMenu = index;
    state.menuScrollTarget = '';
    clearTimeout(menuScrollTargetTimer);
    nextTick(() => {
      state.menuScrollTarget = `menu-item-${category.id}`;
      menuScrollTargetTimer = setTimeout(() => {
        state.menuScrollTarget = '';
      }, 500);
    });
  }

  function onMenu(index) {
    scrollToCategory(index);
  }

  function onRightScroll(event) {
    const eventScrollTop = Number(event?.detail?.scrollTop);
    if (Number.isFinite(eventScrollTop)) {
      rightScrollTop = eventScrollTop;
    }
    clearTimeout(scrollSyncTimer);
    scrollSyncTimer = setTimeout(() => {
      const query = uni.createSelectorQuery().in(instance?.proxy);
      query.select('.goods-list-scroll').boundingClientRect();
      query.selectAll('.category-section').boundingClientRect();
      query.exec(([scrollRect, sectionRects]) => {
        if (!scrollRect || !Array.isArray(sectionRects)) {
          return;
        }
        const firstVisibleIndex = findActiveCategoryIndex(
          sectionRects,
          scrollRect,
          rightScrollTop,
        );
        if (firstVisibleIndex >= 0 && firstVisibleIndex !== state.activeMenu) {
          syncActiveMenu(firstVisibleIndex);
        }
      });
    }, 80);
  }

  function onRightTouchMove() {
    scrollIntentTracker.invalidate();
    pendingScrollIntent = null;
  }

  function initMenuIndex() {
    const appStore = sheep.$store('app');
    const tabbarParams = appStore.paramsForTabbar || {};
    const requestedId = Number(tabbarParams.id);
    appStore.clearParamsForTabbar();

    const selectedIndex = findInitialCategoryIndex(state.categoryList, requestedId);
    scrollToCategory(selectedIndex, true);
    void loadCategoryProducts(state.categoryList, requestToken);
  }

  async function getList() {
    const token = ++requestToken;
    rightScrollTop = 0;
    clearTimeout(scrollSyncTimer);
    clearTimeout(scrollTargetTimer);
    clearTimeout(menuScrollTargetTimer);
    scrollIntentTracker.invalidate();
    pendingScrollIntent = null;
    state.scrollTarget = '';
    state.menuScrollTarget = '';
    try {
      const response = await CategoryApi.getCategoryList();
      if (token !== requestToken || response?.code !== 0) {
        if (token === requestToken && response?.code !== 0) {
          state.categoryList = [];
          state.sections = {};
          state.activeMenu = 0;
          pendingScrollIntent = null;
        }
        return;
      }
      state.categoryList = getSecondLevelCategories(response.data);
      initMenuIndex();
    } catch {
      if (token === requestToken) {
        state.categoryList = [];
        state.sections = {};
        state.activeMenu = 0;
        pendingScrollIntent = null;
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

  onUnload(() => {
    clearTimeout(scrollSyncTimer);
    clearTimeout(scrollTargetTimer);
    clearTimeout(menuScrollTargetTimer);
    scrollIntentTracker.invalidate();
    pendingScrollIntent = null;
    requestToken += 1;
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
