<!-- 装修图文组件：图片展示 -->
<template>
  <view @tap="sheep.$router.go(data?.url)">
    <su-image
      :src="sheep.$url.thumb(data.imgUrl, { width: 750, quality: 82, format: 'webp' })"
      mode="widthFix"
      lazy-load
    />
  </view>
</template>

<script setup>
  /**
   * 图片组件
   */
  import sheep from '@/sheep';

  // 接收参数
  const props = defineProps({
    data: {
      type: Object,
      default: () => ({}),
    },
    styles: {
      type: Object,
      default: () => ({}),
    },
  });
</script>

<style lang="scss" scoped></style>
