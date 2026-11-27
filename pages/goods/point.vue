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
                {{ getShowPrice.point }}{{ getShowPrice.price ? `+￥${getShowPrice.price}` : '' }}
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
            @tap="openSkuSelector"
          />
        </view>

        <!-- 规格与数量弹框 -->
        <s-select-seckill-sku
          v-model="state.goodsInfo"
          :show="state.showSelectSku && pointBalance !== null"
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
            class="ss-reset-button exchange-btn ss-flex-col"
            :class="{ 'has-origin-price': state.goodsInfo.marketPrice }"
            :disabled="isExchangeDisabled"
            @tap="onExchangeTap"
          >
            <view v-if="exchangePriceText" class="exchange-price ss-flex ss-col-center">
              <image
                :src="sheep.$url.static('/static/img/shop/goods/score1.svg')"
                class="exchange-point-img"
              />
              <text class="exchange-price-text">{{ exchangePriceText }}</text>
            </view>
            <view :class="{ 'exchange-shortfall': isExchangeDisabled && exchangePriceText }">
              {{ exchangeLabel }}
            </view>
          </button>
        </view>
      </detail-tabbar>
    </block>
  </s-layout>
</template>

<script setup>
  import { computed, reactive, ref, watch } from 'vue';
  import { onLoad, onPageScroll, onShow } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
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
  import UserApi from '@/sheep/api/member/user';
  import { getPointExchangeStatus, getPointSkuQuantityLimit, getPreSaleLabel, getRedeemedCount, getRemainingStock } from '@/sheep/helper/productDetail.mjs';
  import { createDeliveryAddressLoader } from '@/sheep/helper/deliveryAddress.mjs';
  import { isCurrentSession, sessionEpoch } from '@/sheep/helper/sessionEpoch.mjs';
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
  });

  // 规格变更
  function onSkuChange(e) {
    state.selectedSku = e;
  }

  // 立即购买
  async function onBuy(sku) {
    if (!state.showSelectSku || pointBalance.value === null) return;
    if (!sku?.id) {
      sheep.$helper.toast('请选择规格');
      return;
    }
    if (sku.stock <= 0) {
      sheep.$helper.toast('库存不足');
      return;
    }
    const { id, point, count = 1 } = sku;
    if (!Number.isInteger(count) || count < 1 || count > getPointSkuQuantityLimit(sku)) {
      sheep.$helper.toast('超过可兑换数量');
      return;
    }
    if (!getPointExchangeStatus(pointBalance.value, point, count).canExchange) {
      sheep.$helper.toast('积分不足');
      return;
    }
    const epoch = sessionEpoch();
    state.showSelectSku = false;
    await loadDeliveryAddress();
    if (!isCurrentSession(epoch)) return;
    sheep.$router.go('/pages/order/confirm', {
      data: JSON.stringify({
        order_type: 'goods',
        buy_type: 'point',
        pointActivityId: activity.value.id,
        items: [
          {
            skuId: id,
            count,
          },
        ],
        addressInfo: state.deliveryAddress || undefined,
      }),
    });
  }

  const isLogin = computed(() => sheep.$store('user').isLogin);
  const pointBalance = ref(null);
  const pointLoadFailed = ref(false);
  let pointRequestId = 0;

  const exchangeSku = computed(() => {
    if (state.selectedSku.id) return state.selectedSku;
    let cheapestSku;
    for (const sku of state.goodsInfo?.skus || []) {
      if (sku.stock > 0 && (!cheapestSku || sku.point < cheapestSku.point)) {
        cheapestSku = sku;
      }
    }
    return cheapestSku;
  });
  const exchangeQuantity = computed(() => state.selectedSku.count || 1);
  const exchangeStatus = computed(() =>
    getPointExchangeStatus(pointBalance.value, getShowPrice.value.point, exchangeQuantity.value),
  );
  const isSoldOut = computed(() => remainingStock.value === 0);
  const isPointLoading = computed(
    () => isLogin.value && pointBalance.value === null && !pointLoadFailed.value,
  );
  const isExchangeDisabled = computed(
    () => isSoldOut.value || isPointLoading.value ||
      (pointBalance.value !== null && !exchangeStatus.value.canExchange),
  );
  const exchangeLabel = computed(() => {
    if (isSoldOut.value) return '已售罄';
    if (!isLogin.value) return '登录后兑换';
    if (isPointLoading.value) return '查询积分中';
    if (pointLoadFailed.value) return '重试查询积分';
    if (!exchangeStatus.value.canExchange) return `还差 ${exchangeStatus.value.shortfall} 积分`;
    return '立即兑换';
  });
  const redeemedCount = computed(() => getRedeemedCount(activity.value));
  const remainingStock = computed(() => getRemainingStock(state.selectedSku, state.goodsInfo));
  const preSaleLabel = computed(() => getPreSaleLabel(state.goodsInfo));

  async function loadPointBalance() {
    const requestId = ++pointRequestId;
    const epoch = sessionEpoch();
    pointBalance.value = null;
    pointLoadFailed.value = false;
    if (!isLogin.value) return;
    try {
      const response = await UserApi.getUserInfo();
      if (requestId !== pointRequestId || !isCurrentSession(epoch)) return;
      const point = response?.data?.point;
      if (response?.code === 0 && Number.isFinite(point)) {
        pointBalance.value = point;
      } else {
        pointLoadFailed.value = true;
      }
    } catch {
      if (requestId === pointRequestId && isCurrentSession(epoch)) {
        pointLoadFailed.value = true;
      }
    }
  }

  function openSkuSelector() {
    if (!isLogin.value) return showAuthModal();
    if (pointLoadFailed.value) return loadPointBalance();
    if (pointBalance.value !== null) state.showSelectSku = true;
  }

  function onExchangeTap() {
    if (!isExchangeDisabled.value) return openSkuSelector();
  }

  const deliveryAddress = createDeliveryAddressLoader({
    getSession: () => ({ isLogin: isLogin.value, epoch: sessionEpoch() }),
    fetchAddresses: async () => {
      const { code, data } = await AddressApi.getAddressList();
      return code === 0 && Array.isArray(data) ? data : [];
    },
    applyAddress: (address) => {
      state.deliveryAddress = address;
    },
  });
  const loadDeliveryAddress = deliveryAddress.load;

  function onChooseDeliveryAddress() {
    if (!isLogin.value) {
      showAuthModal();
      return;
    }
    const epoch = sessionEpoch();
    uni.$once('SELECT_ADDRESS', ({ addressInfo } = {}) => {
      if (addressInfo && isCurrentSession(epoch)) deliveryAddress.select(addressInfo);
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
    const sku = exchangeSku.value;
    const price = sku ? sku.pointPrice : activity.value?.price;
    return {
      point: sku ? sku.point : activity.value?.point,
      price: price ? fen2yuan(price) : '',
    };
  });
  const exchangePriceText = computed(() => {
    if (pointBalance.value === null || isSoldOut.value) return '';
    const unitPrice = exchangeSku.value ? exchangeSku.value.pointPrice : activity.value?.price;
    const price = unitPrice ? fen2yuan(unitPrice * exchangeQuantity.value) : '';
    return `${exchangeStatus.value.required}${price ? `+￥${price}` : ''}`;
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
      if (product && (product.count ?? 1) > 0) {
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
  onShow(loadPointBalance);
  watch([isLogin, sessionEpoch], () => {
    state.showSelectSku = false;
    loadDeliveryAddress();
    return loadPointBalance();
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
    .exchange-btn {
      width: 248rpx;
      height: 80rpx;
      font-size: 24rpx;
      font-weight: 600;
      background-image: v-bind(btnBg);
      background-repeat: no-repeat;
      background-size: 100% 100%;
      color: #fff;
      line-height: normal;
      border-radius: 40rpx;

      &.has-origin-price {
        margin-left: -36rpx;
        border-radius: 0 40rpx 40rpx 0;
      }

      &[disabled] {
        background-color: transparent;
        background-image: v-bind(disabledBtnBg);
        color: #999;
      }
    }

    .exchange-price {
      max-width: calc(100% - 32rpx);
    }

    .exchange-price-text {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .exchange-point-img {
      flex-shrink: 0;
      width: 36rpx;
      height: 36rpx;
      margin: 0 4rpx;
    }

    .exchange-shortfall {
      color: #666;
      font-size: 20rpx;
      font-weight: 500;
      line-height: 26rpx;
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
      border-radius: 40rpx 0 0 40rpx;
      line-height: normal;
      font-size: 24rpx;
      font-weight: 500;
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
