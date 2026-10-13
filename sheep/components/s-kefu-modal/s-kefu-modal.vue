<!-- 全局客服弹窗：优先展示后台配置的企微图片，失败时回退在线客服页 -->
<template>
  <su-popup
    :show="show"
    type="center"
    round="16"
    :showClose="true"
    :isMaskClick="false"
    @close="closeKefuModal"
  >
    <view class="kefu-modal" @tap.stop>
      <view class="kefu-title">联系专属客服</view>
      <image
        v-if="imageUrl"
        class="kefu-image"
        :src="imageUrl"
        mode="widthFix"
        show-menu-by-longpress
        @error="onImageError"
      />
      <view v-else class="kefu-fallback" @tap="fallbackToChat">
        客服二维码暂不可用，点击在线咨询
      </view>
      <view v-if="imageUrl" class="kefu-tip">长按图片识别企微二维码</view>
      <button class="ss-reset-button kefu-close" @tap="closeKefuModal">关闭</button>
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
    width: 600rpx;
    padding: 38rpx 30rpx 30rpx;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fff;
  }

  .kefu-title {
    color: #333;
    font-size: 34rpx;
    font-weight: 600;
    line-height: 48rpx;
  }

  .kefu-image {
    display: block;
    width: 480rpx;
    max-height: 660rpx;
    margin-top: 28rpx;
  }

  .kefu-tip {
    margin-top: 20rpx;
    color: #999;
    font-size: 26rpx;
    line-height: 36rpx;
  }

  .kefu-fallback {
    margin: 50rpx 0;
    color: var(--ui-BG-Main);
    font-size: 28rpx;
  }

  .kefu-close {
    width: 100%;
    height: 76rpx;
    margin-top: 26rpx;
    color: #666;
    font-size: 28rpx;
    line-height: 76rpx;
    border-top: 1rpx solid #f0f0f0;
  }
</style>
