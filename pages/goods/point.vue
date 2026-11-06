<!-- 秒杀商品详情 -->
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
      text="活动不存在或已结束"
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
        <!-- 价格+标题 -->
        <view class="title-card detail-card ss-p-y-30 ss-p-x-20">
          <view class="ss-flex ss-row-between ss-col-center ss-m-b-26">
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
            <view class="sales-text">
              已兑换{{ (activity.totalStock || 0) - (activity.stock || 0) }}/{{
                state.selectedSku.stock ?? state.goodsInfo.stock ?? 0
              }}
            </view>
          </view>
          <view class="origin-price-text ss-m-b-28" v-if="state.goodsInfo.marketPrice">
            原价：￥{{ fen2yuan(state.selectedSku.marketPrice || state.goodsInfo.marketPrice) }}
          </view>
          <view class="title-row ss-flex ss-row-between ss-col-start">
            <view class="title-text ss-line-2 ss-m-b-6">{{ state.goodsInfo.name || '' }}</view>
            <button class="goods-share ss-reset-button" open-type="share" aria-label="分享">
              <text class="cicon-reply share-icon" />
              <text class="share-label">分享</text>
            </button>
          </view>
          <view class="subtitle-text ss-line-1">{{ state.goodsInfo.introduction }}</view>
        </view>

        <!-- 配送、服务、规格信息 -->
        <view class="detail-info-card detail-card ss-flex-col">
          <view class="detail-info-row delivery-row" @tap="onChooseDeliveryAddress">
            <text class="detail-info-label">配送</text>
            <view class="detail-info-content delivery-content">
              <view class="delivery-address-line">
                <text class="cicon-place-o delivery-icon" />
                <text class="delivery-address">
                  {{
                    state.deliveryAddress
                      ? `${state.deliveryAddress.areaName} ${state.deliveryAddress.detailAddress}`
                      : '请选择收货地址'
                  }}
                </text>
              </view>
              <text class="delivery-shipping">快递包邮</text>
            </view>
            <text class="_icon-forward detail-info-arrow" />
          </view>
          <view class="detail-info-row">
            <text class="detail-info-label">服务</text>
            <text class="detail-info-content">退货包运费 · 自动退款 · 7天无理由退货...</text>
            <text class="_icon-forward detail-info-arrow" />
          </view>
          <detail-cell-sku
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
      <detail-tabbar v-model="state.goodsInfo">
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
            :class="isOutOfStock || isPointExchangeDisabled ? 'disabled-btn-box' : 'check-btn-box'"
            :disabled="isOutOfStock || isPointExchangeDisabled"
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
            <view v-if="isOutOfStock">已售罄</view>
            <view v-else-if="isPointExchangeDisabled">
              还差 {{ pointExchangeStatus.shortfall }} 积分
            </view>
            <view v-else>立即兑换</view>
          </button>
        </view>
      </detail-tabbar>
    </block>
  </s-layout>
</template>

<script setup>
  import { computed, reactive, ref, unref } from 'vue';
  import { onLoad, onPageScroll, onShow } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import { isEmpty } from 'lodash-es';
  import { fen2yuan, formatGoodsSwiper } from '@/sheep/hooks/useGoods';
  import detailNavbar from './components/detail/detail-navbar.vue';
  import detailCellSku from './components/detail/detail-cell-sku.vue';
  import detailTabbar from './components/detail/detail-tabbar.vue';
  import detailSkeleton from './components/detail/detail-skeleton.vue';
  import detailCommentCard from './components/detail/detail-comment-card.vue';
  import detailContentCard from './components/detail/detail-content-card.vue';
  import SpuApi from '@/sheep/api/product/spu';
  import { PromotionActivityTypeEnum, SharePageEnum } from '@/sheep/helper/const';
  import { getPointExchangeStatus } from '@/sheep/helper/pointExchange.mjs';
  import PointApi from '@/sheep/api/promotion/point';
  import AddressApi from '@/sheep/api/member/address';

  const headerBg = sheep.$url.css('/static/img/shop/goods/score-bg.png');
  const btnBg = sheep.$url.css('/static/img/shop/goods/seckill-btn.png');
  const disabledBtnBg = sheep.$url.css('/static/img/shop/goods/activity-btn-disabled.png');
  const seckillBg = sheep.$url.css('/static/img/shop/goods/seckill-tip-bg.png');
  const grouponBg = sheep.$url.css('/static/img/shop/goods/groupon-tip-bg.png');

  onPageScroll(() => {});
  const state = reactive({
    skeletonLoading: true,
    goodsInfo: {},
    showSelectSku: false,
    goodsSwiper: [],
    selectedSku: {},
    showModel: false,
    total: 0,
    price: '',
    deliveryAddress: null,
    hasSelectedDeliveryAddress: false,
    deliveryAddressLoaded: false,
  });

  let deliveryAddressRequest;
  function loadDeliveryAddress() {
    if (state.hasSelectedDeliveryAddress || state.deliveryAddressLoaded) {
      return Promise.resolve();
    }
    if (!deliveryAddressRequest) {
      deliveryAddressRequest = (async () => {
        try {
          const { data = [] } = await AddressApi.getAddressList();
          if (!state.hasSelectedDeliveryAddress) {
            state.deliveryAddress = data.find((item) => item.defaultStatus) || data[0] || null;
          }
        } catch {
          if (!state.hasSelectedDeliveryAddress) {
            state.deliveryAddress = null;
          }
        } finally {
          state.deliveryAddressLoaded = true;
          deliveryAddressRequest = null;
        }
      })();
    }
    return deliveryAddressRequest;
  }

  function onChooseDeliveryAddress() {
    uni.$once('SELECT_ADDRESS', ({ addressInfo } = {}) => {
      state.deliveryAddress = addressInfo;
      state.hasSelectedDeliveryAddress = true;
    });
    sheep.$router.go('/pages/user/address/list', { type: 'select' });
  }

  onShow(() => {
    void loadDeliveryAddress();
  });

  // 规格变更
  function onSkuChange(e) {
    state.selectedSku = e;
  }

  // 立即购买
  async function onBuy(sku) {
    await loadDeliveryAddress();
    sheep.$router.go('/pages/order/confirm', {
      data: JSON.stringify({
        order_type: 'goods',
        buy_type: 'point',
        pointActivityId: activity.value.id,
        addressInfo: state.deliveryAddress,
        items: [
          {
            skuId: sku.id,
            count: sku.count,
          },
        ],
      }),
    });
  }

  // 分享信息
  const shareInfo = computed(() => {
    if (isEmpty(unref(activity))) return {};
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
        title: state.goodsInfo.name, // 商品名称
        image: sheep.$url.cdn(state.goodsInfo.picUrl), // 商品主图
        point: getShowPrice.value.point, // 积分数量
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

  const pointExchangeStatus = computed(() =>
    getPointExchangeStatus(
      getShowPrice.value.point,
      sheep.$store('user').userInfo.point,
      state.selectedSku.count || 1,
    ),
  );
  const isPointExchangeDisabled = computed(
    () => !!state.selectedSku.id && !pointExchangeStatus.value.canExchange,
  );
  const isOutOfStock = computed(() => (state.selectedSku.stock ?? state.goodsInfo.stock ?? 0) <= 0);

  // 查询活动
  const getActivity = async (id) => {
    const { data } = await PointApi.getPointActivity(id);
    if (!data) {
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
      console.error('[积分商品] 商品详情加载失败', { id, error });
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }
    if (!data) {
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }
    data.activity_type = PromotionActivityTypeEnum.POINT.type;
    state.goodsInfo = data;
    state.goodsInfo.stock = Math.min(data.stock, activity.value.stock);
    // 处理轮播图
    state.goodsSwiper = formatGoodsSwiper(state.goodsInfo.sliderPicUrls);

    // 价格、库存使用活动的
    data.skus.forEach((sku) => {
      const product = activity.value.products.find((product) => product.skuId === sku.id);
      if (product) {
        sku.point = product.point;
        sku.pointPrice = product.price;
        sku.stock = Math.min(sku.stock, product.stock);
        // 设置限购数量
        sku.limitCount = product.count;
      } else {
        // 找不到可能是没配置
        sku.stock = 0;
      }
    });

    state.skeletonLoading = false;
  };

  onLoad((options) => {
    // 非法参数
    if (!options.id) {
      state.goodsInfo = null;
      state.skeletonLoading = false;
      return;
    }

    // 查询活动
    getActivity(options.id);
  });
</script>

<style lang="scss" scoped>
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

    .title-row {
      gap: 16rpx;
    }

    .goods-share {
      width: 64rpx;
      min-height: 76rpx;
      flex-shrink: 0;
      flex-direction: column;
      justify-content: flex-start;
      color: $dark-3;
    }

    .share-icon {
      font-size: 42rpx;
      line-height: 44rpx;
    }

    .share-label {
      font-size: 22rpx;
      line-height: 30rpx;
    }

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

    .sales-text {
      font-size: 26rpx;
      font-weight: 500;
      color: $gray-c;
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

  .detail-info-card {
    padding: 0;
  }

  .detail-info-row {
    display: flex;
    min-height: 88rpx;
    box-sizing: border-box;
    align-items: center;
    padding: 18rpx 20rpx;
    border-bottom: 1rpx solid $gray-e;

    &:last-child {
      border-bottom: 0;
    }
  }

  .detail-info-label {
    width: 86rpx;
    flex-shrink: 0;
    color: $dark-9;
    font-size: 28rpx;
  }

  .detail-info-content {
    min-width: 0;
    flex: 1;
    color: $dark-9;
    font-size: 28rpx;
    line-height: 40rpx;
  }

  .delivery-content {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10rpx;
    color: $dark-9;
  }

  .delivery-address-line {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 10rpx;
    overflow: hidden;
  }

  .delivery-address {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delivery-shipping {
    flex-shrink: 0;
    color: $dark-9;
    font-size: 24rpx;
    line-height: 32rpx;
    white-space: nowrap;
  }

  .delivery-content text:last-child {
    color: $dark-9;
  }

  .delivery-icon {
    flex-shrink: 0;
    color: $dark-9;
    font-size: 32rpx;
  }

  .detail-info-arrow {
    flex-shrink: 0;
    margin-left: 12rpx;
    color: $dark-9;
    font-size: 28rpx;
  }

  .detail-info-card :deep(.detail-cell-wrap) {
    min-height: 88rpx;
    box-sizing: border-box;
    padding: 18rpx 20rpx;
  }

  .detail-info-card :deep(.detail-cell-wrap .label-text) {
    width: 86rpx;
    margin-right: 0;
    color: $dark-9;
    font-size: 28rpx;
    font-weight: 400;
  }

  .detail-info-card :deep(.detail-cell-wrap .cell-content) {
    color: $dark-9;
    font-size: 28rpx;
    font-weight: 400;
  }

  .detail-info-card :deep(.detail-cell-wrap .right-forwrad-icon) {
    color: $dark-9;
    font-size: 28rpx;
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
