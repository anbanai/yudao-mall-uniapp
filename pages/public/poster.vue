<template>
  <view class="poster-page">
    <canvas-poster ref="posterRef" :show="true" :shareInfo="shareInfo" @close="closePoster" />
  </view>
</template>

<script setup>
  import { nextTick, ref } from 'vue';
  import { onReady } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import canvasPoster from './components/canvas-poster/index.vue';

  const modalStore = sheep.$store('modal');
  const shareInfo = modalStore.consumePosterShareInfo();
  const posterRef = ref();

  const closePoster = () => {
    if (sheep.$router.hasHistory()) {
      sheep.$router.back();
      return;
    }
    sheep.$router.go('/');
  };

  onReady(async () => {
    if (!shareInfo?.poster?.type) {
      sheep.$helper.toast('海报信息已失效，请重新生成');
      closePoster();
      return;
    }

    try {
      await nextTick();
      await posterRef.value.getPoster();
    } catch (error) {
      console.error('海报生成失败:', error);
      sheep.$helper.toast('海报生成失败，请稍后重试');
      closePoster();
    }
  });
</script>

<style lang="scss" scoped>
  .poster-page {
    min-height: 100vh;
    background: $gray-f;
  }
</style>
