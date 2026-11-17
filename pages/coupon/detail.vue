<!-- 优惠券详情  -->
<template>
  <s-layout title="优惠券详情" :onShareAppMessage="shareInfo">
    <view class="bg-white">
      <!-- 详情卡片 -->
      <view class="detail-wrap ss-p-20">
        <view class="detail-box">
          <view class="tag-box ss-flex ss-col-center ss-row-center">
            <image
              class="tag-image"
              :src="sheep.$url.static('/static/img/shop/app/coupon_icon.png')"
              mode="aspectFit"
            />
          </view>
          <view class="top ss-flex-col ss-col-center">
            <view class="title ss-m-t-50 ss-m-b-20 ss-m-x-20">{{ state.coupon.name }}</view>
            <view class="subtitle ss-m-b-50" v-if="state.coupon.couponType !== 2">
              满 {{ fen2yuan(state.coupon.usePrice) }} 元，
              {{
                state.coupon.discountType === 1
                  ? '减 ' + fen2yuan(state.coupon.discountPrice) + ' 元'
                  : '打 ' + state.coupon.discountPercent / 10.0 + ' 折'
              }}
            </view>
            <view class="subtitle ss-m-b-50" v-else>兑换指定商品：{{ state.exchangeProduct?.name || state.coupon.name }}</view>
            <button
              v-if="state.coupon.couponType === 2 && state.couponId > 0"
              class="ss-reset-button ss-m-b-30"
              :class="state.coupon.status === 1 ? 'use-btn' : 'disable-btn'"
              :disabled="state.coupon.status !== 1"
              @click="redeemExchangeCoupon"
            >
              立即兑换
            </button>
            <button
              v-else
              class="ss-reset-button ss-m-b-30"
              :class="state.coupon.canTake || state.coupon.status === 1 ? 'use-btn' : 'disable-btn'"
              :disabled="!(state.newcomer?.canTake || state.newcomer?.reasonCode === 'LOGIN_REQUIRED' || state.coupon.canTake)"
              @click="getCoupon"
            >
              <text v-if="state.id > 0">{{ state.newcomer?.reasonCode === 'LOGIN_REQUIRED' ? '登录领取' : state.newcomer?.canTake || state.coupon.canTake ? '立即领取' : '暂不可领' }}</text>
              <text v-else>{{ state.coupon.status === 1 ? '可使用' : state.coupon.status === 2 ? '已使用' : '已过期' }}</text>
            </button>
            <view v-if="state.newcomer?.reason && state.newcomer.reasonCode !== 'LOGIN_REQUIRED'" class="coupon-reason">{{ state.newcomer.reason }}</view>
            <view v-if="state.promotionError" class="promotion-error">该推广链接已失效</view>
            <view class="time ss-m-y-30" v-if="state.coupon.validityType === 2">
              有效期：领取后 {{ state.coupon.fixedEndTerm }} 天内可用
            </view>
            <view class="time ss-m-y-30" v-else>
              有效期: {{ sheep.$helper.timeFormat(state.coupon.validStartTime, 'yyyy-mm-dd') }} 至
              {{ sheep.$helper.timeFormat(state.coupon.validEndTime, 'yyyy-mm-dd') }}
            </view>
            <view class="coupon-line ss-m-t-14"></view>
          </view>
          <view class="bottom">
            <view class="type ss-flex ss-col-center ss-row-between ss-p-x-30">
              <view>优惠券类型</view>
              <view>{{ state.coupon.couponType === 2 ? '商品兑换券' : state.coupon.discountType === 1 ? '满减券' : '折扣券' }}</view>
            </view>
            <view v-if="state.coupon.couponType === 2" class="type ss-flex ss-col-center ss-row-between ss-p-x-30">
              <view>兑换商品</view><view>指定规格 · 1 件</view>
            </view>
            <uni-collapse>
              <uni-collapse-item title="优惠券说明" v-if="state.coupon.description">
                <view class="content ss-p-b-20">
                  <text class="des ss-p-l-30">{{ state.coupon.description }}</text>
                </view>
              </uni-collapse-item>
            </uni-collapse>
          </view>
        </view>
      </view>

      <!-- 适用商品 -->
      <view
        class="all-user ss-flex ss-row-center ss-col-center"
        v-if="state.coupon.productScope === 1"
      >
        全场通用
      </view>

      <su-sticky v-else bgColor="#fff">
        <view class="goods-title ss-p-20">
          {{ state.coupon.productScope === 2 ? '指定商品可用' : '指定分类可用' }}
        </view>
        <su-tabs
          :scrollable="true"
          :list="state.tabMaps"
          @change="onTabsChange"
          :current="state.currentTab"
          v-if="state.coupon.productScope === 3"
        />
      </su-sticky>
      <!-- 指定商品 -->
      <view v-if="state.coupon.productScope === 2">
        <view v-for="(item, index) in state.pagination.list" :key="index">
          <s-goods-column
            class="ss-m-20"
            size="lg"
            :data="item"
            @click="sheep.$router.go('/pages/goods/index', { id: item.id })"
            :goodsFields="{
              title: { show: true },
              subtitle: { show: true },
              price: { show: true },
              original_price: { show: true },
              sales: { show: true },
              stock: { show: false },
            }"
          />
        </view>
      </view>
      <!-- 指定分类 -->
      <view v-if="state.coupon.productScope === 3">
        <view v-for="(item, index) in state.pagination.list" :key="index">
          <s-goods-column
            class="ss-m-20"
            size="lg"
            :data="item"
            @click="sheep.$router.go('/pages/goods/index', { id: item.id })"
            :goodsFields="{
              title: { show: true },
              subtitle: { show: true },
              price: { show: true },
              original_price: { show: true },
              sales: { show: true },
              stock: { show: false },
            }"
          ></s-goods-column>
        </view>
      </view>
      <uni-load-more
        v-if="state.pagination.total > 0 && state.coupon.productScope === 3"
        :status="state.loadStatus"
        :content-text="{
          contentdown: '上拉加载更多',
        }"
        @tap="loadMore"
      />
      <s-empty
        v-if="state.coupon.productScope === 3 && state.pagination.total === 0"
        paddingTop="0"
        icon="/static/soldout-empty.png"
        text="暂无商品"
      />
    </view>
  </s-layout>
</template>

<script setup>
  import sheep from '@/sheep';
  import { onLoad, onReachBottom } from '@dcloudio/uni-app';
  import { computed, reactive } from 'vue';
  import { concat } from 'lodash-es';
  import CouponApi from '@/sheep/api/promotion/coupon';
  import { fen2yuan } from '@/sheep/hooks/useGoods';
  import SpuApi from '@/sheep/api/product/spu';
  import CategoryApi from '@/sheep/api/product/category';
  import { resetPagination } from '@/sheep/helper/utils';

  const state = reactive({
    id: 0, // 优惠劵模版编号 templateId
    couponId: 0, // 用户优惠劵编号 couponId
    coupon: {}, // 优惠劵信息
    promotionCode: '',
    promotion: null,
    promotionError: false,
    newcomer: null,
    exchangeProduct: null,

    pagination: {
      list: [],
      total: 0,
      pageNo: 1,
      pageSize: 8,
    },
    categoryId: 0, // 选中的商品分类编号
    tabMaps: [], // 指定分类时，每个分类构成一个 tab
    currentTab: 0, // 选中的 tabMaps 下标
    loadStatus: '',
  });

  const shareInfo = computed(() => {
    const info = sheep.$platform.share.getShareInfo({
      title: state.coupon.name || '优惠券',
      image: sheep.$url.cdn(state.coupon.picUrl),
    });
    if (state.promotion?.miniProgramPath) {
      info.forward = { ...info.forward, path: state.promotion.miniProgramPath.replace(/^\//, '') };
    }
    return info;
  });

  function onTabsChange(e) {
    resetPagination(state.pagination);
    state.currentTab = e.index;
    state.categoryId = e.value;
    getGoodsListByCategory();
  }

  async function getGoodsListByCategory() {
    state.loadStatus = 'loading';
    const { code, data } = await SpuApi.getSpuPage({
      categoryId: state.categoryId,
      pageNo: state.pagination.pageNo,
      pageSize: state.pagination.pageSize,
    });
    if (code !== 0) {
      return;
    }
    state.pagination.list = concat(state.pagination.list, data.list);
    state.pagination.total = data.total;
    state.loadStatus = state.pagination.list.length < state.pagination.total ? 'more' : 'noMore';
  }

  // 获得商品列表，指定商品范围
  async function getGoodsListById() {
    const { data, code } = await SpuApi.getSpuListByIds(state.coupon.productScopeValues.join(','));
    if (code !== 0) {
      return;
    }
    state.pagination.list = data;
  }

  // 获得分类列表
  async function getCategoryList() {
    const { data, code } = await CategoryApi.getCategoryListByIds(
      state.coupon.productScopeValues.join(','),
    );
    if (code !== 0) {
      return;
    }
    state.tabMaps = data.map((category) => ({ name: category.name, value: category.id }));
    // 加载第一个分类的商品列表
    if (state.tabMaps.length > 0) {
      state.categoryId = state.tabMaps[0].value;
      await getGoodsListByCategory();
    }
  }

  // 领取优惠劵
  async function getCoupon() {
    await sheep.$router.requireFormalAuth(async () => {
      let result;
      if (state.promotionCode) {
        result = await CouponApi.takeCouponPromotion(state.promotionCode);
      } else if (state.newcomer?.templateId) {
        result = await CouponApi.takeNewcomerCoupon(state.id);
      } else {
        result = await CouponApi.takeCoupon(state.id);
      }
      if (result?.code !== 0) {
        if (result?.msg) uni.showToast({ title: result.msg, icon: 'none' });
        return;
      }
      if (!state.promotionCode && state.newcomer?.templateId && !result.data?.canTake) {
        uni.showToast({ title: result.data?.reason || '暂不可领取', icon: 'none' });
        state.newcomer = result.data;
        state.coupon.canTake = false;
        return;
      }
      if (result.data?.reasonCode === 'ALREADY_TAKEN') {
        uni.showToast({ title: result.data.reason || '新人券已领取', icon: 'none' });
        state.coupon.canTake = false;
        return;
      }
      uni.showToast({ title: '领取成功', icon: 'success' });
      if (state.promotionCode || state.newcomer?.templateId) {
        state.coupon.canTake = false;
        return;
      }
      setTimeout(getCouponContent, 600);
    });
  }

  function redeemExchangeCoupon() {
    if (state.coupon.status !== 1 || !state.coupon.exchangeSkuId) return;
    sheep.$router.go('/pages/order/confirm', {
      data: JSON.stringify({
        order_type: 'goods',
        couponId: Number(state.couponId),
        couponIds: [Number(state.couponId)],
        items: [{ skuId: Number(state.coupon.exchangeSkuId), count: 1 }],
      }),
    });
  }

  // 加载优惠劵信息
  async function getCouponContent() {
    const { code, data } =
      state.id > 0
        ? await CouponApi.getCouponTemplate(state.id)
        : await CouponApi.getCoupon(state.couponId);
    if (code !== 0) {
      return;
    }
    state.coupon = data;
    if (data.couponType === 2 && data.exchangeSpuId) {
      const exchangeResult = await SpuApi.getSpuDetail(data.exchangeSpuId);
      state.exchangeProduct = exchangeResult?.code === 0 ? exchangeResult.data : null;
    }
    if (state.id > 0) {
      const qualification = await CouponApi.getNewcomerCoupon(state.id);
      state.newcomer = qualification?.code === 0 ? qualification.data : null;
      if (state.newcomer) {
        state.coupon.canTake = Boolean(state.newcomer.canTake || state.newcomer.reasonCode === 'LOGIN_REQUIRED');
      }
    }
    // 不同指定范围，加载不同数据
    if (state.coupon.productScope === 2) {
      await getGoodsListById();
    } else if (state.coupon.productScope === 3) {
      await getCategoryList();
    }
  }

  // 加载更多
  function loadMore() {
    if (state.loadStatus === 'noMore') {
      return;
    }
    state.pagination.pageNo++;
    getGoodsListByCategory();
  }

  onLoad(async (options) => {
    state.id = Number(options.id || 0);
    state.couponId = Number(options.couponId || 0);
    state.promotionCode = options.promotionCode || '';
    if (state.promotionCode) {
      const promotionResult = await CouponApi.resolveCouponPromotion(state.promotionCode);
      state.promotion = promotionResult?.code === 0 ? promotionResult.data : null;
      if (!state.promotion) {
        state.promotionError = true;
        return;
      }
      state.id = Number(state.promotion.templateId);
    }
    await getCouponContent(state.id, state.couponId);
  });

  // 上拉加载更多
  onReachBottom(() => {
    loadMore();
  });
</script>

<style lang="scss" scoped>
  .goods-title {
    font-size: 34rpx;
    font-weight: bold;
    color: #333333;
  }

  .detail-wrap {
    background: linear-gradient(
      180deg,
      var(--ui-BG-Main),
      var(--ui-BG-Main-gradient),
      var(--ui-BG-Main),
      #fff
    );
  }

  .detail-box {
    // background-color: var(--ui-BG);
    border-radius: 6rpx;
    position: relative;
    margin-top: 100rpx;
    .tag-box {
      width: 140rpx;
      height: 140rpx;
      background: var(--ui-BG);
      border-radius: 50%;
      position: absolute;
      top: -70rpx;
      left: 50%;
      z-index: 6;
      transform: translateX(-50%);

      .tag-image {
        width: 104rpx;
        height: 104rpx;
        border-radius: 50%;
      }
    }

    .top {
      background-color: #fff;
      border-radius: 20rpx 20rpx 0 0;
      -webkit-mask: radial-gradient(circle at 16rpx 100%, #0000 16rpx, red 0) -16rpx;
      padding: 110rpx 0 0 0;
      position: relative;
      z-index: 5;

      .title {
        font-size: 40rpx;
        color: #333;
        font-weight: bold;
      }

      .subtitle {
        font-size: 28rpx;
        color: #333333;
      }

      .use-btn {
        width: 386rpx;
        height: 80rpx;
        line-height: 80rpx;
        background: linear-gradient(90deg, var(--ui-BG-Main), var(--ui-BG-Main-gradient));
        border-radius: 40rpx;
        color: $white;
      }

      .disable-btn {
        width: 386rpx;
        height: 80rpx;
        line-height: 80rpx;
        background: #e5e5e5;
        border-radius: 40rpx;
        color: $white;
      }

      .time {
        font-size: 26rpx;
        font-weight: 400;
        color: #999999;
      }

      .coupon-line {
        width: 95%;
        border-bottom: 2rpx solid #eeeeee;
      }
    }

    .bottom {
      background-color: #fff;
      border-radius: 0 0 20rpx 20rpx;
      -webkit-mask: radial-gradient(circle at 16rpx 0%, #0000 16rpx, red 0) -16rpx;
      padding: 40rpx 30rpx;

      .type {
        height: 96rpx;
        border-bottom: 2rpx solid #eeeeee;
      }
    }

    .des {
      font-size: 24rpx;
      font-weight: 400;
      color: #666666;
    }
  }

  .all-user {
    width: 100%;
    height: 300rpx;
    font-size: 34rpx;
    font-weight: bold;
    color: #333333;
  }

  .coupon-reason, .promotion-error {
    max-width: 620rpx;
    margin: 0 30rpx;
    color: #a34a35;
    font-size: 22rpx;
    line-height: 1.5;
    text-align: center;
  }
</style>
