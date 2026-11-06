<template>
  <view class="category-section">
    <image
      v-if="category?.picUrl"
      class="category-banner"
      :src="sheep.$url.cdn(category.picUrl)"
      mode="aspectFill"
      lazy-load
      @tap="openCategory"
    />
    <view class="category-title" @tap="openCategory">{{ category?.name }}</view>

    <view v-if="loading" class="section-state">加载中...</view>
    <view v-else-if="error" class="section-state">加载失败</view>
    <view v-else-if="!products.length" class="section-state">暂无商品</view>
    <view v-else class="product-grid">
      <view
        v-for="product in products"
        :key="product.id"
        class="product-item"
        @tap="openProduct(product.id)"
      >
        <image
          class="product-image"
          :src="sheep.$url.cdn(product.image || product.picUrl)"
          mode="aspectFit"
          lazy-load
        />
        <view class="product-name ss-line-2">{{ product.name || product.title }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
  import sheep from '@/sheep';

  const props = defineProps({
    category: {
      type: Object,
      default: () => ({}),
    },
    products: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: Boolean,
      default: false,
    },
  });

  function openProduct(id) {
    if (!id) {
      return;
    }
    sheep.$router.go('/pages/goods/index', { id });
  }

  function openCategory() {
    if (!props.category?.id) {
      return;
    }
    sheep.$router.go('/pages/goods/list', { categoryId: props.category.id });
  }
</script>

<style lang="scss" scoped>
  .category-section {
    margin-bottom: 32rpx;
  }

  .category-banner {
    width: 100%;
    height: 220rpx;
    border-radius: 20rpx;
    background: #f5f5f5;
  }

  .category-title {
    margin: 24rpx 12rpx 20rpx;
    color: #222;
    font-size: 34rpx;
    font-weight: 600;
    line-height: 1.35;
  }

  .product-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .product-item {
    width: calc((100% - 32rpx) / 3);
    margin-bottom: 28rpx;
    text-align: center;
  }

  .product-image {
    display: block;
    width: 100%;
    height: 190rpx;
    background: #fff;
  }

  .product-name {
    margin: 14rpx 4rpx 0;
    color: #222;
    font-size: 28rpx;
    line-height: 1.35;
  }

  .section-state {
    padding: 56rpx 0;
    color: #999;
    font-size: 26rpx;
    text-align: center;
  }
</style>
