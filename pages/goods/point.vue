<!-- 积分商品详情 -->
<template>
  <s-layout :onShareAppMessage="shareInfo" navbar="goods">
    <!-- 标题栏 -->
    <detailNavbar />
    <!-- 骨架屏 -->
    <detailSkeleton v-if="state.skeletonLoading" />
    <!-- 下架/售罄提醒 -->
    <s-empty
      v-else-if="
        state.goodsInfo === null ||
        state.goodsInfo.activity_type !== PromotionActivityTypeEnum.POINT.type
      "
      :text="state.activityError || '活动不存在或已结束'"
      icon="/static/soldout-empty.png"
      showAction
      actionText="再逛逛"
      actionUrl="/pages/goods/list"
    />
    <block v-else>
      <view class="detail-swiper-selector">
        <!-- 商品图轮播 -->
        <su-swiper
          class="ss-m-b-14"
          isPreview
          :list="state.goodsSwiper"
          dotStyle="tag"
          imageMode="widthFix"
          dotCur="bg-mask-40"
          :seizeHeight="750"
        />
        <view class="detail-count-row ss-flex ss-row-between">
          <text>已兑换 {{ redeemedCount }}</text>
          <text>剩余库存 {{ remainingStock }}</text>
        </view>

        <!-- 价格+标题 -->
        <view class="title-card detail-card ss-p-y-40 ss-p-x-20">
          <view class="ss-flex ss-row-between ss-col-center ss-m-b-18">
            <view class="price-box ss-flex ss-col-bottom">
              <image
                :src="sheep.$url.static('/static/img/shop/goods/score1.svg')"
                class="point-img"
              ></image>
              <text class="point-text ss-m-r-16">
                {{ getShowPrice.point }}
                {{
                  !getShowPrice.price || getShowPrice.price === 0 ? '' : `+￥${getShowPrice.price}`
                }}
              </text>
            </view>
          </view>
          <view class="origin-price-text ss-m-b-60" v-if="state.goodsInfo.marketPrice">
            原价：￥{{ fen2yuan(state.selectedSku.marketPrice || state.goodsInfo.marketPrice) }}
          </view>
          <view v-if="preSaleLabel" class="presale-label">{{ preSaleLabel }}</view>
          <view class="title-text ss-line-2 ss-m-b-6">{{ state.goodsInfo.name || '' }}</view>
          <view class="subtitle-text ss-line-1">{{ state.goodsInfo.introduction }}</view>
        </view>

        <view class="detail-info-card detail-card ss-flex-col">
          <view class="detail-info-row" @tap="onChooseDeliveryAddress">
            <text class="detail-info-label">配送</text>
            <view class="detail-info-content delivery-content">
              <view class="delivery-address-line">
                <text class="cicon-place-o delivery-icon" />
                <text class="delivery-address">
                  {{ state.deliveryAddress ? `${state.deliveryAddress.areaName} ${state.deliveryAddress.detailAddress}` : '请选择收货地址' }}
                </text>
              </view>
              <text class="delivery-shipping">快递包邮</text>
            </view>
            <text class="_icon-forward detail-info-arrow" />
          </view>
          <view class="detail-info-row">
            <text class="detail-info-label">服务</text>
            <text class="detail-info-content">退货包运费 · 自动退款 · 7天无理由退货</text>
          </view>
          <detail-cell-sku
            v-model="state.selectedSku.goods_sku_text"
            :sku="state.selectedSku"
            label="规格"
            @tap="state.showSelectSku = true"
          />
        </view>

        <!-- 规格与数量弹框 -->
        <s-select-seckill-sku
          v-model="state.goodsInfo"
          :show="state.showSelectSku"
          :single-limit-count="activity.singleLimitCount"
          :point-balance="pointBalance"
          @buy="onBuy"
          @change="onSkuChange"
          @close="state.showSelectSku = false"
        />
      </view>

      <!-- 评价 -->
      <detail-comment-card class="detail-comment-selector" :goodsId="state.goodsInfo.id" />
      <!-- 详情 -->
      <detail-content-card class="detail-content-selector" :content="state.goodsInfo.description" />

      <!-- 详情tabbar -->
      <detail-tabbar v-model="state.goodsInfo" commerce-nav>
        <view class="buy-box ss-flex ss-col-center ss-p-r-20">
          <button
            class="ss-reset-button origin-price-btn ss-flex-col"
            v-if="state.goodsInfo.marketPrice"
            @tap="sheep.$router.go('/pages/goods/index', { id: state.goodsInfo.id })"
          >
            <view>
              <view class="btn-price">{{ fen2yuan(state.goodsInfo.marketPrice) }}</view>
              <view>原价购买</view>
            </view>
          </button>
          <button
            class="ss-reset-button btn-box ss-flex-col"
            @tap="state.showSelectSku = true"
            :class="isExchangeDisabled ? 'disabled-btn-box' : 'check-btn-box'"
            :disabled="isExchangeDisabled"
          >
            <view class="price-box ss-flex">
              <image
                :src="sheep.$url.static('/static/img/shop/goods/score1.svg')"
                style="width: 36rpx; height: 36rpx; margin: 0 4rpx"
              ></image>
              <text class="point-text ss-m-r-16">
                {{ getShowPrice.point }}
                {{
                  !getShowPrice.price || getShowPrice.price === 0 ? '' : `+￥${getShowPrice.price}`
                }}
              </text>
            </view>
            <view v-if="state.selectedSku.id && selectedPointStatus.shortfall > 0">
              还差 {{ selectedPointStatus.shortfall }} 积分
            </view>
            <view v-if="state.goodsInfo.stock === 0">已售罄</view>
            <view v-else>立即兑换</view>
          </button>
        </view>
      </detail-tabbar>
    </block>
  </s-layout>
</template>

<script setup>
  import { computed, reactive, ref } from 'vue';
  import { onLoad, onPageScroll } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import { isEmpty } from '@/sheep/helper/lodash';
  import { fen2yuan, formatGoodsSwiper } from '@/sheep/hooks/useGoods';
  import detailNavbar from './components/detail/detail-navbar.vue';
  import SSelectSeckillSku from './components/s-select-seckill-sku.vue';
  import detailCellSku from './components/detail/detail-cell-sku.vue';
  import detailTabbar from './components/detail/detail-tabbar.vue';
  import detailSkeleton from './components/detail/detail-skeleton.vue';
  import detailCommentCard from './components/detail/detail-comment-card.vue';
  import detailContentCard from './components/detail/detail-content-card.vue';
  import SpuApi from '@/sheep/api/product/spu';
  import { PromotionActivityTypeEnum, SharePageEnum } from '@/sheep/helper/const';
  import PointApi from '@/sheep/api/promotion/point';
  import AddressApi from '@/sheep/api/member/address';
  import { getPointExchangeStatus, getPreSaleLabel, getRedeemedCount, getRemainingStock } from '@/sheep/helper/productDetail.mjs';
  import { showAuthModal } from '@/sheep/hooks/useModal';

  const headerBg = sheep.$url.css('/static/img/shop/goods/score-bg.png');
  const btnBg = sheep.$url.css('/static/img/shop/goods/seckill-btn.png');
  const disabledBtnBg = sheep.$url.css('/static/img/shop/goods/activity-btn-disabled.png');
  const seckillBg = sheep.$url.css('/static/img/shop/goods/seckill-tip-bg.png');
  const grouponBg = sheep.$url.css('/static/img/shop/goods/groupon-tip-bg.png');

  onPageScroll(() => {});
  const state = reactive({
    skeletonLoading: true,
    goodsInfo: null,
    showSelectSku: false,
    goodsSwiper: [],
    selectedSku: {},
    showModel: false,
    total: 0,
    price: '',
    activityError: '',
    deliveryAddress: null,
    deliveryAddressLoaded: false,
  });

  // 规格变更
  function onSkuChange(e) {
    state.selectedSku = e;
  }

  // 立即购买
  async function onBuy(sku) {
    if (!sku?.id) {
      sheep.$helper.toast('请选择规格');
      return;
    }
    if (sku.stock <= 0) {
      sheep.$helper.toast('库存不足');
      return;
    }
    if (!getPointExchangeStatus(pointBalance.value, sku.point, sku.count || 1).canExchange) {
      sheep.$helper.toast('积分不足');
      return;
    }
    await loadDeliveryAddress();
    sheep.$router.go('/pages/order/confirm', {
      data: JSON.stringify({
        order_type: 'goods',
        buy_type: 'point',
        pointActivityId: activity.value.id,
        items: [
          {
            skuId: sku.id,
            count: sku.count,
          },
        ],
        addressInfo: state.deliveryAddress || undefined,
      }),
    });
  }

  const isLogin = computed(() => sheep.$store('user').isLogin);
  const pointBalance = computed(() => Number(sheep.$store('user').userInfo.point) || 0);
  const selectedPointStatus = computed(() =>
    getPointExchangeStatus(pointBalance.value, state.selectedSku.point, state.selectedSku.count || 1),
  );
  const isExchangeDisabled = computed(
    () => state.goodsInfo.stock === 0 || (state.selectedSku.id && !selectedPointStatus.value.canExchange),
  );
  const redeemedCount = computed(() => getRedeemedCount(activity.value));
  const remainingStock = computed(() => getRemainingStock(state.selectedSku, state.goodsInfo));
  const preSaleLabel = computed(() => getPreSaleLabel(state.goodsInfo));

  async function loadDeliveryAddress() {
    if (!isLogin.value || state.deliveryAddressLoaded) return;
    try {
      const { code, data } = await AddressApi.getAddressList();
      if (code === 0 && Array.isArray(data)) {
        state.deliveryAddress = data.find((item) => item.defaultStatus) || data[0] || null;
      }
    } catch (error) {
      state.deliveryAddress = null;
    } finally {
      state.deliveryAddressLoaded = true;
    }
  }

  function onChooseDeliveryAddress() {
    if (!isLogin.value) {
      showAuthModal();
      return;
    }
    uni.$once('SELECT_ADDRESS', ({ addressInfo } = {}) => {
      if (addressInfo) {
        state.deliveryAddress = addressInfo;
        state.deliveryAddressLoaded = true;
      }
    });
    sheep.$router.go('/pages/user/address/list', { type: 'select' });
  }

  // 分享信息
  const shareInfo = computed(() => {
    if (!activity.value || !state.goodsInfo) return {};
    return sheep.$platform.share.getShareInfo(
      {
        title: state.goodsInfo.name,
        image: sheep.$url.cdn(state.goodsInfo.picUrl),
        params: {
          page: SharePageEnum.POINT.value,
          query: activity.value.id,
        },
      },
      {
        type: 'goods', // 商品海报
        title: state.goodsInfo.name, // 商品标题
        image: sheep.$url.cdn(state.goodsInfo.picUrl), // 商品主图
        price: (getShowPrice.value.price || 0) + ` + ${getShowPrice.value.point} 积分`, // 积分价格
        marketPrice: fen2yuan(state.goodsInfo.marketPrice), // 商品原价
      },
    );
  });

  const activity = ref();

  const getShowPrice = computed(() => {
    if (!isEmpty(state.selectedSku)) {
      const sku = state.selectedSku;
      return {
        point: sku.point,
        price: !sku.pointPrice ? '' : fen2yuan(sku.pointPrice),
      };
    }
    return {
      point: activity.value.point,
      price: !activity.value.price ? '' : fen2yuan(activity.value.price),
    };
  });

  // 查询活动
  const getActivity = async (id) => {
    let data;
    try {
      ({ data } = await PointApi.getPointActivity(id));
    } catch (error) {
      state.activityError = '活动信息暂不可用';
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }
    if (!data) {
      state.activityError = '活动不存在或已结束';
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }
    activity.value = data;
    // 查询商品
    await getSpu(data.spuId);
  };

  // 查询商品
  const getSpu = async (id) => {
    let data;
    try {
      ({ data } = await SpuApi.getSpuDetail(id));
    } catch (error) {
      state.activityError = '商品不存在或已下架';
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }
    if (!data) {
      state.activityError = '商品不存在或已下架';
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }
    data.activity_type = PromotionActivityTypeEnum.POINT.type;
    // 处理轮播图
    state.goodsSwiper = formatGoodsSwiper(data.sliderPicUrls);
    if (!state.goodsSwiper.length) {
      state.goodsSwiper = formatGoodsSwiper([data.picUrl]);
    }

    // 价格、库存使用活动的
    const stockLimit = Math.min(data.stock, activity.value.stock);
    let exchangeStock = 0;
    data.skus.forEach((sku) => {
      const product = activity.value.products.find((product) => product.skuId === sku.id);
      if (product) {
        sku.point = product.point;
        sku.pointPrice = product.price;
        sku.stock = Math.min(sku.stock, product.stock, stockLimit);
        exchangeStock += sku.stock;
        // 设置限购数量
        sku.limitCount = product.count;
      } else {
        // 找不到可能是没配置
        sku.stock = 0;
      }
    });
    data.stock = Math.min(exchangeStock, stockLimit);
    state.goodsInfo = data;
    state.skeletonLoading = false;
  };

  onLoad((options) => {
    // 非法参数
    if (!options.id) {
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }

    loadDeliveryAddress();
    // 查询活动
    getActivity(options.id);
  });
</script>

<style lang="scss" scoped>
  .detail-count-row {
    margin: 0 24rpx 14rpx;
    color: $dark-9;
    font-size: 24rpx;
    line-height: 36rpx;
  }

  .presale-label {
    display: inline-flex;
    margin-bottom: 10rpx;
    padding: 4rpx 10rpx;
    border-radius: 4rpx;
    background: var(--ui-BG-Main-tag);
    color: var(--ui-BG-Main);
    font-size: 22rpx;
    line-height: 30rpx;
  }

  .detail-info-card {
    padding: 0 20rpx;
  }

  .detail-info-row {
    display: flex;
    min-height: 82rpx;
    align-items: center;
    gap: 20rpx;
    border-bottom: 1rpx solid $gray-e;
    font-size: 24rpx;
  }

  .detail-info-row:last-child {
    border-bottom: 0;
  }

  .detail-info-label {
    flex: 0 0 72rpx;
    color: $dark-9;
  }

  .detail-info-content {
    flex: 1;
    min-width: 0;
    color: $dark-3;
  }

  .delivery-content {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  .delivery-address-line {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 8rpx;
  }

  .delivery-icon {
    flex: 0 0 auto;
    color: $dark-9;
  }

  .delivery-address {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delivery-shipping {
    flex: 0 0 auto;
    color: var(--ui-BG-Main);
  }

  .detail-info-arrow {
    flex: 0 0 auto;
    color: $dark-9;
  }

  .disabled-btn-box[disabled] {
    background-color: transparent;
  }

  .detail-card {
    background-color: $white;
    margin: 14rpx 20rpx;
    border-radius: 10rpx;
    overflow: hidden;
  }

  // 价格标题卡片
  .title-card {
    width: 710rpx;
    box-sizing: border-box;
    background-size: 100% 100%;
    border-radius: 10rpx;
    background-image: v-bind(headerBg);
    background-repeat: no-repeat;

    .price-box {
      .point-img {
        width: 36rpx;
        height: 36rpx;
        margin: 0 4rpx;
      }

      .point-text {
        font-size: 42rpx;
        font-weight: 500;
        color: #ff3000;
        line-height: 36rpx;
        font-family: OPPOSANS;
      }

      .price-text {
        font-size: 42rpx;
        font-weight: 500;
        color: #ff3000;
        line-height: 36rpx;
        font-family: OPPOSANS;
      }
    }

    .origin-price-text {
      font-size: 26rpx;
      font-weight: 400;
      text-decoration: line-through;
      color: $gray-c;
      font-family: OPPOSANS;
    }

    .discounts-box {
      .discounts-tag {
        padding: 4rpx 10rpx;
        font-size: 24rpx;
        font-weight: 500;
        border-radius: 4rpx;
        color: var(--ui-BG-Main);
        // background: rgba(#2aae67, 0.05);
        background: var(--ui-BG-Main-tag);
      }

      .discounts-title {
        font-size: 24rpx;
        font-weight: 500;
        color: var(--ui-BG-Main);
        line-height: normal;
      }

      .cicon-forward {
        color: var(--ui-BG-Main);
        font-size: 24rpx;
        line-height: normal;
        margin-top: 4rpx;
      }
    }

    .title-text {
      font-size: 30rpx;
      font-weight: bold;
      line-height: 42rpx;
    }

    .subtitle-text {
      font-size: 26rpx;
      font-weight: 400;
      color: $dark-9;
      line-height: 42rpx;
    }
  }

  // 购买
  .buy-box {
    .check-btn-box {
      width: 248rpx;
      height: 80rpx;
      font-size: 24rpx;
      font-weight: 600;
      margin-left: -36rpx;
      background-image: v-bind(btnBg);
      background-repeat: no-repeat;
      background-size: 100% 100%;
      color: #ffffff;
      line-height: normal;
      border-radius: 0px 40rpx 40rpx 0px;
    }

    .disabled-btn-box {
      width: 248rpx;
      height: 80rpx;
      font-size: 24rpx;
      font-weight: 600;
      margin-left: -36rpx;
      background-image: v-bind(disabledBtnBg);
      background-repeat: no-repeat;
      background-size: 100% 100%;
      color: #999999;
      line-height: normal;
      border-radius: 0px 40rpx 40rpx 0px;
    }

    .btn-price {
      font-family: OPPOSANS;

      &::before {
        content: '￥';
      }
    }

    .origin-price-btn {
      width: 236rpx;
      height: 80rpx;
      background: rgba(#ff5651, 0.1);
      color: #ff6000;
      border-radius: 40rpx 0px 0px 40rpx;
      line-height: normal;
      font-size: 24rpx;
      font-weight: 500;

      .no-original {
        font-size: 28rpx;
      }

      .btn-title {
        font-size: 28rpx;
      }
    }
  }

  //秒杀卡片
  .seckill-box {
    background: v-bind(seckillBg) no-repeat;
    background-size: 100% 100%;
  }

  .groupon-box {
    background: v-bind(grouponBg) no-repeat;
    background-size: 100% 100%;
  }

  //活动卡片
  .activity-box {
    width: 100%;
    height: 80rpx;
    box-sizing: border-box;
    margin-bottom: 10rpx;

    .activity-title {
      font-size: 26rpx;
      font-weight: 500;
      color: #ffffff;
      line-height: 42rpx;

      .activity-icon {
        width: 38rpx;
        height: 38rpx;
      }
    }

    .activity-go {
      width: 70rpx;
      height: 32rpx;
      background: #ffffff;
      border-radius: 16rpx;
      font-weight: 500;
      color: #ff6000;
      font-size: 24rpx;
      line-height: normal;
    }
  }

  .model-box {
    .title {
      font-size: 36rpx;
      font-weight: bold;
      color: #333333;
    }

    .subtitle {
      font-size: 26rpx;
      font-weight: 500;
      color: #333333;
    }
  }
</style>
