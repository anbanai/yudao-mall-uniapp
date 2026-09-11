<!-- 售后申请 -->
<template>
  <s-layout title="申请售后">
    <!-- 售后商品 -->
    <view class="goods-box">
      <s-goods-item
        :img="state.item.picUrl"
        :title="state.item.spuName"
        :skuText="state.item.properties?.map((property) => property.valueName).join(' ')"
        :price="state.item.price"
        :num="state.item.count"
      />
    </view>

    <uni-forms ref="form" v-model="formData" :rules="rules" label-position="top">
      <!-- 售后类型 -->
      <view class="refund-item">
        <view class="item-title ss-m-b-20">售后类型</view>
        <view class="ss-flex-col">
          <view
            v-for="(item, index) in state.wayList"
            :key="index"
            class="ss-flex ss-col-center ss-p-y-10"
            :data-way="item.value"
            @tap="onRefundTypeTap"
          >
            <radio
              :checked="formData.way === item.value"
              color="var(--ui-BG-Main)"
              style="transform: scale(0.8)"
            />
            <view class="item-value ss-m-l-8">{{ item.text }}</view>
          </view>
        </view>
      </view>
      <!-- 退款金额 -->
      <view class="refund-item ss-flex ss-col-center ss-row-between">
        <text class="item-title">退款金额</text>
        <view class="ss-flex refund-cause ss-col-center">
          <text class="ss-m-r-20">￥{{ fen2yuan(state.item.payPrice) }}</text>
        </view>
      </view>
      <!-- 申请原因 -->
      <view class="refund-item ss-flex ss-col-center ss-row-between" @tap="openReasonModal">
        <text class="item-title">申请原因</text>
        <view class="ss-flex refund-cause ss-col-center">
          <text class="ss-m-r-20" v-if="formData.applyReason">{{ formData.applyReason }}</text>
          <text class="ss-m-r-20" v-else>请选择申请原因~</text>
          <text class="cicon-forward" style="height: 28rpx"></text>
        </view>
      </view>

      <!-- 留言 -->
      <view class="refund-item">
        <view class="item-title ss-m-b-20">相关描述</view>
        <view class="describe-box">
          <uni-easyinput
            :inputBorder="false"
            class="describe-content"
            type="textarea"
            maxlength="120"
            autoHeight
            v-model="formData.applyDescription"
            placeholder="客官~请描述您遇到的问题，建议上传照片"
          />
          <view class="upload-img">
            <s-uploader
              v-model:url="formData.applyPicUrls"
              fileMediatype="image"
              limit="9"
              mode="grid"
              :imageStyles="{ width: '168rpx', height: '168rpx' }"
            />
          </view>
        </view>
      </view>
    </uni-forms>

    <!-- 底部按钮 -->
    <su-fixed bottom placeholder>
      <view class="foot-wrap">
        <view class="foot_box ss-flex ss-col-center ss-row-between ss-p-x-30">
          <button class="ss-reset-button contcat-btn" @tap="sheep.$router.go('/pages/chat/index')">
            联系客服
          </button>
          <button class="ss-reset-button ui-BG-Main-Gradient sub-btn" @tap="submit">提交</button>
        </view>
      </view>
    </su-fixed>

    <!-- 申请原因弹窗 -->
    <su-popup :show="state.showModal" round="10" :showClose="true" @close="state.showModal = false">
      <view class="modal-box page_box">
        <view class="modal-head item-title head_box ss-flex ss-row-center ss-col-center">
          申请原因
        </view>
        <view class="modal-content content_box">
          <view
            class="radio ss-flex ss-col-center"
            v-for="item in selectionState.reasonList"
            :key="item"
            :data-reason="item"
            @tap="onReasonSelect"
          >
            <view class="ss-flex-1 ss-p-20">{{ item }}</view>
            <radio
              :value="item"
              color="var(--ui-BG-Main)"
              :checked="item === selectionState.currentValue"
            />
          </view>
        </view>
        <view class="modal-foot foot_box ss-flex ss-row-center ss-col-center">
          <button class="ss-reset-button close-btn ui-BG-Main-Gradient" @tap="onReason">
            确定
          </button>
        </view>
      </view>
    </su-popup>
  </s-layout>
</template>

<script setup>
  import sheep from '@/sheep';
  import { onLoad } from '@dcloudio/uni-app';
  import { reactive, ref } from 'vue';
  import OrderApi from '@/sheep/api/trade/order';
  import TradeConfigApi from '@/sheep/api/trade/config';
  import { fen2yuan } from '@/sheep/hooks/useGoods';
  import AfterSaleApi from '@/sheep/api/trade/afterSale';
  import {
    createAfterSaleSelectionState,
    setAfterSaleConfig,
    toggleAfterSaleWay,
    selectAfterSaleReason,
  } from '@/sheep/helper/afterSaleSelection.mjs';

  const form = ref(null);
  const state = reactive({
    orderId: 0, // 订单编号
    itemId: 0, // 订单项编号
    order: {}, // 订单
    item: {}, // 订单项
    // 售后类型
    wayList: [
      {
        text: '仅退款',
        value: '10',
      },
      {
        text: '退款退货',
        value: '20',
      },
    ],
    showModal: false, // 是否显示申请原因弹窗
  });
  const selectionState = reactive(createAfterSaleSelectionState());
  const formData = reactive({
    way: '',
    applyReason: '',
    applyDescription: '',
    applyPicUrls: [],
  });
  const rules = reactive({});

  // 提交表单
  async function submit() {
    if (!formData.way) {
      sheep.$helper.toast('请选择售后类型');
      return;
    }
    let data = {
      orderItemId: state.itemId,
      refundPrice: state.item.payPrice,
      ...formData,
    };
    const { code } = await AfterSaleApi.createAfterSale(data);
    if (code === 0) {
      uni.showToast({
        title: '申请成功',
      });
      sheep.$router.redirect('/pages/order/aftersale/list');
    }
  }

  // 选择售后类型；原生 radio 不支持取消已选项，因此这里显式处理切换和取消。
  function onRefundTypeTap(event) {
    const way = event.currentTarget?.dataset?.way;
    if (!way) {
      return;
    }
    toggleAfterSaleWay(selectionState, way);
    formData.way = selectionState.way;
    formData.applyReason = '';
  }

  function openReasonModal() {
    if (!formData.way) {
      sheep.$helper.toast('请先选择售后类型');
      return;
    }
    if (selectionState.reasonList.length === 0) {
      sheep.$helper.toast('暂无可选申请原因');
      return;
    }
    state.showModal = true;
  }

  // 选择申请原因
  function onReasonSelect(event) {
    const reason = event.currentTarget?.dataset?.reason;
    if (reason == null) {
      return;
    }
    selectAfterSaleReason(selectionState, reason);
  }

  // 确定
  function onReason() {
    formData.applyReason = selectionState.currentValue;
    state.showModal = false;
  }

  onLoad(async (options) => {
    // 解析参数
    if (!options.orderId || !options.itemId) {
      sheep.$helper.toast(`缺少订单信息，请检查`);
      return;
    }
    state.orderId = options.orderId;
    state.itemId = parseInt(options.itemId);

    // 读取订单信息
    const { code, data } = await OrderApi.getOrderDetail(state.orderId);
    if (code !== 0) {
      return;
    }
    state.order = data;
    state.item = data.items.find((item) => item.id === state.itemId) || {};

    // 设置选项
    if (state.order.status === 10) {
      state.wayList.splice(1, 1);
    }

    // 读取配置
    setAfterSaleConfig(selectionState, (await TradeConfigApi.getTradeConfig()).data);
  });
</script>

<style lang="scss" scoped>
  .item-title {
    font-size: 30rpx;
    font-weight: bold;
    color: rgba(51, 51, 51, 1);
    // margin-bottom: 20rpx;
  }

  // 售后项目
  .refund-item {
    background-color: #fff;
    border-bottom: 1rpx solid #f5f5f5;
    padding: 30rpx;

    &:last-child {
      border: none;
    }

    // 留言
    .describe-box {
      width: 690rpx;
      background: rgba(249, 250, 251, 1);
      padding: 30rpx;
      box-sizing: border-box;
      border-radius: 20rpx;

      .describe-content {
        height: 200rpx;
        font-size: 24rpx;
        font-weight: 400;
        color: #333;
      }
    }

    // 联系方式
    .input-box {
      height: 84rpx;
      background: rgba(249, 250, 251, 1);
      border-radius: 20rpx;
    }
  }

  .goods-box {
    background: #fff;
    padding: 20rpx;
    margin-bottom: 20rpx;
  }

  .foot-wrap {
    height: 100rpx;
    width: 100%;
  }

  .foot_box {
    height: 100rpx;
    background-color: #fff;

    .sub-btn {
      width: 336rpx;
      line-height: 74rpx;
      border-radius: 38rpx;
      color: rgba(#fff, 0.9);
      font-size: 28rpx;
    }

    .contcat-btn {
      width: 336rpx;
      line-height: 74rpx;
      background: rgba(238, 238, 238, 1);
      border-radius: 38rpx;
      font-size: 28rpx;
      font-weight: 400;
      color: rgba(51, 51, 51, 1);
    }
  }

  .modal-box {
    width: 750rpx;
    // height: 680rpx;
    border-radius: 30rpx 30rpx 0 0;
    background: #fff;

    .modal-head {
      height: 100rpx;
      font-size: 30rpx;
    }

    .modal-content {
      font-size: 28rpx;
    }

    .modal-foot {
      .close-btn {
        width: 710rpx;
        line-height: 80rpx;
        border-radius: 40rpx;
        color: rgba(#fff, 0.9);
      }
    }
  }

  .success-box {
    width: 600rpx;
    padding: 90rpx 0 64rpx 0;

    .cicon-check-round {
      font-size: 96rpx;
      color: #04b750;
    }

    .success-title {
      font-weight: 500;
      color: #333333;
      font-size: 32rpx;
    }

    .success-btn {
      width: 492rpx;
      height: 70rpx;
      background: linear-gradient(90deg, var(--ui-BG-Main-gradient), var(--ui-BG-Main));
      border-radius: 35rpx;
    }
  }
</style>
