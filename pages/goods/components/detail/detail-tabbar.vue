<!-- 商品详情的底部导航 -->
<template>
  <su-fixed bottom placeholder bg="bg-white">
    <view class="ui-tabbar-box">
      <view class="ui-tabbar ss-flex ss-col-center ss-row-between">
        <view
          class="detail-tabbar-item ss-flex ss-flex-col ss-row-center ss-col-center"
          @tap="goHome"
        >
          <text class="cicon-home-o item-icon" />
          <view class="item-title">首页</view>
        </view>
        <view
          class="detail-tabbar-item ss-flex ss-flex-col ss-row-center ss-col-center"
          @tap="goCart"
        >
          <text class="cicon-cart-o item-icon" />
          <view class="item-title">购物车</view>
        </view>
        <view
          v-if="serviceIcon"
          class="detail-tabbar-item ss-flex ss-flex-col ss-row-center ss-col-center"
          @tap="onChat"
        >
          <image
            class="item-icon"
            :src="sheep.$url.static('/static/img/shop/goods/message.png')"
            mode="aspectFit"
          />
          <view class="item-title">客服</view>
        </view>
        <slot></slot>
      </view>
    </view>
  </su-fixed>
</template>

<script setup>
  /**
   *
   * 底部导航
   *
   * @property {String} bg 			 			- 背景颜色Class
   * @property {String} ui 			 			- 自定义样式Class
   * @property {Boolean} noFixed 		 			- 是否定位
   * @property {Boolean} topRadius 		 		- 上圆角
   */
  import { reactive } from 'vue';
  import sheep from '@/sheep';
  import { showKefuModal } from '@/sheep/hooks/useModal';

  // 数据
  const state = reactive({});

  // 接收参数
  const props = defineProps({
    modelValue: {
      type: Object,
      default() {},
    },
    bg: {
      type: String,
      default: 'bg-white',
    },
    bgStyles: {
      type: Object,
      default() {},
    },
    ui: {
      type: String,
      default: '',
    },

    noFixed: {
      type: Boolean,
      default: false,
    },
    topRadius: {
      type: Number,
      default: 0,
    },
    serviceIcon: {
      type: Boolean,
      default: true,
    },
  });

  const goHome = () => sheep.$router.go('/pages/index/index');
  const goCart = () => sheep.$router.go('/pages/index/cart');

  const onChat = () => {
    void showKefuModal(
      {
        id: props.modelValue.id,
      },
      sheep.$router,
    );
  };
</script>

<style lang="scss" scoped>
  .ui-tabbar-box {
    box-shadow: 0px -6px 10px 0px rgba(51, 51, 51, 0.2);
  }
  .ui-tabbar {
    display: flex;
    height: 50px;
    background: #fff;

    .detail-tabbar-item {
      width: 100rpx;

      .item-icon {
        width: 40rpx;
        height: 40rpx;
        font-size: 40rpx;
        line-height: 40rpx;
        color: #333;
      }

      .item-title {
        font-size: 20rpx;
        font-weight: 500;
        line-height: 20rpx;
        margin-top: 12rpx;
      }
    }
  }
</style>
