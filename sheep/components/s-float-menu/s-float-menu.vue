<!-- 装修基础组件：悬浮按钮 -->
<template>
  <!-- 模态背景：展开时显示，点击后折叠 -->
  <view class="float-mask" v-if="expanded" @click="collapseFab"></view>
  <!-- 悬浮按钮 -->
  <view class="float-menu" :class="['float-menu--' + (props.data.direction || 'vertical')]">
    <template v-if="expanded">
      <view
        v-for="(item, index) in menuItems"
        :key="index"
        class="float-item"
        @click.stop="onItemClick(item)"
      >
        <view v-if="item.iconPath && !iconError[index]" class="float-icon">
          <image
            class="float-icon-img"
            :src="item.iconPath"
            mode="aspectFit"
            @error="iconError[index] = true"
          />
        </view>
        <!-- 图标缺失或加载失败时展示兜底图标，避免菜单空白 -->
        <view v-else class="float-icon float-icon--fallback">
          <uni-icons type="headphones" color="#ffffff" size="20" />
        </view>
        <text
          v-if="props.data.showText && item.text"
          class="float-text"
          :style="{ color: item.textColor }"
          >{{ item.text }}</text
        >
      </view>
    </template>
    <!-- 主圆按钮 todo: @owen 使用APP主题色 -->
    <view class="float-circle" @click="toggleFab">
      <uni-icons
        class="float-circle-icon"
        :class="{ 'float-circle-icon--open': expanded }"
        type="plusempty"
        color="#ffffff"
        size="24"
      />
    </view>
  </view>
  <!-- 弹窗卡片 -->
  <su-popup :show="!!popupItem" type="center" round="12" :showClose="true" @close="closePopup">
    <view class="float-popup-card" @click.stop>
      <image
        v-if="popupItem && popupItem.popupImgUrl"
        class="float-popup-img"
        :src="popupItem.popupImgUrl"
        mode="widthFix"
        show-menu-by-longpress
      />
      <view v-if="popupItem && popupItem.popupTitle" class="float-popup-title">{{
        popupItem.popupTitle
      }}</view>
      <view v-if="popupItem && popupItem.popupContent" class="float-popup-content">{{
        popupItem.popupContent
      }}</view>
    </view>
  </su-popup>
</template>
<script setup>
  /**
   * 悬浮按钮
   * 支持两种动作类型：
   *  - link：点击后跳转链接
   *  - popup：点击后弹窗展示卡片（图片 + 标题 + 内容）
   */

  import sheep from '@/sheep';
  import { computed, reactive, ref } from 'vue';
  import { onBackPress } from '@dcloudio/uni-app';

  // 定义属性
  const props = defineProps({
    data: {
      type: Object,
      default() {},
    },
  });

  // 菜单项
  const menuItems = computed(() => {
    const list = props.data?.list || [];
    return list.map((item) => ({
      iconPath: sheep.$url.cdn(item.imgUrl),
      url: item.url || '',
      text: item.text || '',
      textColor: item.textColor || '#fff',
      type: item.type || 'link',
      popupTitle: item.popupTitle || item.text || '',
      popupContent: item.popupContent || '',
      popupImgUrl: sheep.$url.cdn(item.popupImgUrl),
    }));
  });

  // 是否展开菜单
  const expanded = ref(false);
  // 当前弹窗卡片项
  const popupItem = ref(null);
  // 图标加载失败记录（按索引记录，避免菜单空白）
  const iconError = reactive({});

  // 展开/折叠
  function toggleFab() {
    expanded.value = !expanded.value;
  }

  // 折叠
  function collapseFab() {
    expanded.value = false;
  }

  // 处理菜单项点击
  function onItemClick(item) {
    collapseFab();
    if (item.type === 'popup') {
      popupItem.value = item;
      return;
    }
    if (item.url) {
      sheep.$router.go(item.url);
    }
  }

  // 关闭弹窗卡片
  function closePopup() {
    popupItem.value = null;
  }

  // 按返回键后：优先关闭弹窗，其次折叠悬浮菜单
  onBackPress(() => {
    if (popupItem.value) {
      closePopup();
      return true;
    }
    if (expanded.value) {
      collapseFab();
      return true;
    }
    return false;
  });
</script>
<style lang="scss" scoped>
  /* 模态背景 */
  .float-mask {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 11;
    width: 100%;
    height: 100%;
    background-color: rgba(#000000, 0.4);
  }

  /* 悬浮按钮容器 */
  .float-menu {
    position: fixed;
    right: 24rpx;
    bottom: calc(100rpx + env(safe-area-inset-bottom));
    z-index: 12;
    display: flex;

    &--vertical {
      flex-direction: column;
      align-items: center;

      .float-item {
        margin-bottom: 20rpx;
      }
    }

    &--horizontal {
      flex-direction: row;
      align-items: center;

      .float-item {
        margin-right: 20rpx;
      }
    }
  }

  /* 菜单项 */
  .float-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* 图标 */
  .float-icon {
    width: 56rpx;
    height: 56rpx;
    overflow: hidden;
    border-radius: 50%;

    &--fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--ui-BG-Main);
    }
  }

  .float-icon-img {
    width: 100%;
    height: 100%;
  }

  /* 文字 */
  .float-text {
    margin-top: 6rpx;
    font-size: 24rpx;
    line-height: 32rpx;
    white-space: nowrap;
  }

  /* 主圆按钮 */
  .float-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64rpx;
    height: 64rpx;
    background-color: var(--ui-BG-Main);
    border-radius: 50%;
  }

  .float-circle-icon {
    transform: rotate(0deg);
    transition: transform 0.3s;
  }

  .float-circle-icon--open {
    transform: rotate(135deg);
  }

  /* 弹窗卡片 */
  .float-popup-card {
    width: 610rpx;
    padding: 24rpx;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .float-popup-img {
    width: 100%;
    border-radius: 8px;
  }

  .float-popup-title {
    margin-top: 20rpx;
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
  }

  .float-popup-content {
    margin-top: 12rpx;
    font-size: 28rpx;
    line-height: 44rpx;
    color: #666666;
    white-space: pre-wrap;
  }
</style>
