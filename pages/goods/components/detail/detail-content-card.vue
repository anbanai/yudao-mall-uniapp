<template>
  <view class="detail-content-card bg-white ss-m-x-20 ss-p-t-20">
    <view class="card-header ss-flex ss-col-center ss-m-b-30 ss-m-l-20">
      <view class="line"></view>
      <view class="title ss-m-l-20 ss-m-r-20">详情</view>
    </view>
    <view class="card-content">
      <mp-html :content="optimizedContent"></mp-html>
    </view>
  </view>
</template>

<script setup>
  import { computed } from 'vue';
  import sheep from '@/sheep';

  const props = defineProps({
    content: {
      type: String,
      default: '',
    },
  });

  // Detail descriptions commonly contain original-size uploaded images.
  // Rewrite only image sources so the rich-text structure remains unchanged.
  const optimizedContent = computed(() =>
    props.content.replace(
      /(<img\b[^>]*?\bsrc=["'])([^"']+)(["'])/gi,
      (_, prefix, src, suffix) => {
        if (!src || /^data:/i.test(src) || sheep.$url.isSigned?.(src)) {
          return `${prefix}${src}${suffix}`;
        }
        return `${prefix}${sheep.$url.thumb(src, { width: 750, quality: 82, format: 'webp' })}${suffix}`;
      },
    ),
  );
</script>

<style lang="scss" scoped>
  .detail-content-card {
    .card-header {
      .line {
        width: 6rpx;
        height: 30rpx;
        background: linear-gradient(180deg, var(--ui-BG-Main) 0%, var(--ui-BG-Main-gradient) 100%);
        border-radius: 3rpx;
      }

      .title {
        font-size: 30rpx;
        font-weight: bold;
      }

      .des {
        font-size: 24rpx;
        color: $dark-9;
      }

      .more-btn {
        font-size: 24rpx;
        color: var(--ui-BG-Main);
      }
    }
  }

  :deep() {
    image {
      display: block;
    }
  }
</style>
