<!-- 全局客服弹窗：优先展示后台配置的企微图片，失败时回退在线客服页 -->
<template>
  <su-popup
    :show="show"
    type="center"
    backgroundColor="none"
    round="0"
    :showClose="true"
    :isMaskClick="false"
    @close="closeKefuModal"
  >
    <view class="kefu-modal" @tap.stop>
      <image
        v-if="imageUrl"
        class="kefu-image"
        :src="imageUrl"
        mode="widthFix"
        show-menu-by-longpress
        @error="onImageError"
      />
    </view>
  </su-popup>
</template>

<script setup>
  import { computed, ref } from 'vue';
  import sheep from '@/sheep';
  import { navigateToKefuChat } from '@/sheep/helper/kefu.mjs';
  import { closeKefuModal } from '@/sheep/hooks/useModal';

  const modalStore = sheep.$store('modal');
  const tradeConfigStore = sheep.$store('tradeConfig');
  const show = computed(() => modalStore.kefu);
  const imageUrl = computed(() => {
    const url = tradeConfigStore.config?.kefuWechatQrCodeUrl;
    return url ? sheep.$url.cdn(url) : '';
  });
  const handlingError = ref(false);

  function fallbackToChat() {
    if (handlingError.value) return;
    handlingError.value = true;
    const options = { ...(modalStore.kefuOptions || {}) };
    closeKefuModal();
    navigateToKefuChat(sheep.$router, options);
    setTimeout(() => {
      handlingError.value = false;
    }, 0);
  }

  function onImageError() {
    fallbackToChat();
  }
</script>

<style lang="scss" scoped>
  .kefu-modal {
    width: 690rpx;
    max-width: calc(100vw - 32rpx);
  }

  .kefu-image {
    display: block;
    width: 100%;
    max-height: calc(100vh - 96rpx);
  }
</style>
