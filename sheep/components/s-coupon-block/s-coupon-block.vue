<!-- 装修营销组件：优惠券  -->
<template>
  <scroll-view
    class="scroll-box"
    scroll-x
    scroll-anchoring
    :style="[bgStyle, { marginLeft: `${data.space}px` }]"
  >
    <view
      v-if="couponList.length"
      class="coupon-box ss-flex"
      :style="couponList.length === 2 ? couponBoxStyleTwo : couponBoxStyleNormal"
    >
      <view
        class="coupon-item"
        :style="[couponBg, { marginLeft: `${data.space}px` }]"
        v-for="(item, index) in couponList"
        :key="index"
      >
        <su-coupon
          :size="SIZE_LIST[columns - 1]"
          :textColor="data.textColor"
          background=""
          :couponId="item.id"
          :title="formatCouponTitle(item)"
          :type="formatCouponDiscountType(item)"
          :value="formatCouponDiscountValue(item)"
          :sellBy="formatValidityType(item)"
          :surplus="item.totalCount === -1 ? -1 : item.totalCount - item.takeCount"
        >
          <template v-slot:btn>
            <!-- 两列时，领取按钮坚排 -->
            <button
              v-if="columns === 2"
              @click.stop="onGetCoupon(item.id)"
              class="ss-reset-button card-btn vertical"
              :style="[btnStyles]"
            >
              <view class="btn-text">立即领取</view>
            </button>
            <button
              v-else
              class="ss-reset-button card-btn"
              :style="[btnStyles]"
              @click.stop="onGetCoupon(item.id)"
            >
              立即领取
            </button>
          </template>
        </su-coupon>
      </view>
    </view>
    <view v-for="item in newcomerCoupons" :key="item.templateId" class="newcomer-coupon">
      <view class="newcomer-copy">
        <text class="newcomer-title">{{ item.name }}</text>
        <text class="newcomer-desc">{{ item.description || newcomerOffer(item) }}</text>
        <text v-if="!item.canTake && item.reason" class="newcomer-reason">{{ item.reason }}</text>
      </view>
      <button class="newcomer-button" :disabled="claimingId === item.templateId" @tap="claimNewcomer(item)">
        {{ claimingId === item.templateId ? '领取中' : item.reasonCode === 'LOGIN_REQUIRED' ? '登录领取' : item.canTake ? '立即领取' : '暂不可领' }}
      </button>
    </view>
  </scroll-view>
</template>

<script setup>
  import sheep from '@/sheep';
  import CouponApi from '@/sheep/api/promotion/coupon';
  import { ref, onMounted, computed } from 'vue';
  import { CouponTemplateValidityTypeEnum, PromotionDiscountTypeEnum } from '@/sheep/helper/const';
  import { floatToFixed2, formatDate } from '@/sheep/helper/utils';
  import { formatDiscountPercent } from '@/sheep/hooks/useGoods';

  const props = defineProps({
    data: {
      type: Object,
      default: () => ({}),
    },
    styles: {
      type: Object,
      default: () => ({}),
    },
  });
  const { columns, button } = props.data;
  const SIZE_LIST = ['lg', 'md', 'xs'];
  const couponBg = {
    background: `url(${sheep.$url.cdn(props.data.bgImg)}) no-repeat top center / 100% 100%`,
  };
  const btnStyles = {
    background: button.bgColor,
    color: button.color,
  };
  // 两列优惠券时的排版方式
  const couponBoxStyleNormal = {
    display: 'flex',
    'justify-content': 'space-between',
  };
  // 非两列优惠券时的排版方式
  const couponBoxStyleTwo = {
    display: 'flex',
    'justify-content': 'space-around',
  };
  // 设置背景样式
  const bgStyle = computed(() => {
    // 直接从 props.styles 解构
    const { bgType, bgImg, bgColor } = props.styles;

    // 根据 bgType 返回相应的样式
    return {
      background: bgType === 'img' ? `url(${bgImg}) no-repeat top center / 100% 100%` : bgColor,
    };
  });
  // 格式化【折扣类型】
  const formatCouponDiscountType = (coupon) => {
    if (coupon.discountType === PromotionDiscountTypeEnum.PRICE.type) {
      return 'reduce';
    }
    if (coupon.discountType === PromotionDiscountTypeEnum.PERCENT.type) {
      return 'percent';
    }
    return `未知【${coupon.discountType}】`;
  };

  // 格式化【折扣】
  const formatCouponDiscountValue = (coupon) => {
    if (coupon.discountType === PromotionDiscountTypeEnum.PRICE.type) {
      return floatToFixed2(coupon.discountPrice);
    }
    if (coupon.discountType === PromotionDiscountTypeEnum.PERCENT.type) {
      return formatDiscountPercent(coupon.discountPercent);
    }
    return `未知【${coupon.discountType}】`;
  };

  // 格式化【有效期限】
  const formatValidityType = (row) => {
    if (row.validityType === CouponTemplateValidityTypeEnum.DATE.type) {
      return `${formatDate(row.validStartTime)} 至 ${formatDate(row.validEndTime)}`;
    }
    if (row.validityType === CouponTemplateValidityTypeEnum.TERM.type) {
      return `领取后第 ${row.fixedStartTerm} - ${row.fixedEndTerm} 天内可用`;
    }
    return '未知【' + row.validityType + '】';
  };

  // 格式化【优惠券标题】
  const formatCouponTitle = (coupon) => {
    return `满${floatToFixed2(coupon.usePrice)}元${
      coupon.discountType === PromotionDiscountTypeEnum.PRICE.type
        ? ',减' + floatToFixed2(coupon.discountPrice) + '元'
        : ',打' + formatDiscountPercent(coupon.discountPercent) + '折'
    }`;
  };

  const couponList = ref([]);
  const newcomerCoupons = ref([]);
  const newcomerTemplateIds = ref(new Set());
  const claimingId = ref(null);

  function newcomerOffer(item) {
    if (item.discountType === 1) return `满${floatToFixed2(item.usePrice)}元减${floatToFixed2(item.discountPrice)}元`;
    return `满${floatToFixed2(item.usePrice)}元打${formatDiscountPercent(item.discountPercent)}折`;
  }

  async function loadNewcomerCoupons(templates) {
    const candidates = templates || [];
    const results = await Promise.all(candidates.map((item) => CouponApi.getNewcomerCoupon(item.id)));
    const configured = results.filter((result) => result?.code === 0 && result.data?.templateId);
    newcomerTemplateIds.value = new Set(configured.map((result) => String(result.data.templateId)));
    newcomerCoupons.value = configured
      .filter((result) => result.data.showEntry)
      .map((result) => result.data);
  }

  async function claimNewcomer(item) {
    if ((!item?.canTake && item?.reasonCode !== 'LOGIN_REQUIRED') || claimingId.value) return;
    claimingId.value = item.templateId;
    try {
      await sheep.$router.requireFormalAuth(async () => {
        const result = await CouponApi.takeNewcomerCoupon(item.templateId);
        if (result?.code === 0) {
          if (result.data?.reasonCode === 'ALREADY_TAKEN') {
            uni.showToast({ title: result.data.reason || '已领取', icon: 'none' });
          } else {
            uni.showToast({ title: '领取成功', icon: 'success' });
          }
          await refreshCouponLists();
        } else if (result?.data?.reason) {
          uni.showToast({ title: result.data.reason, icon: 'none' });
        }
      });
    } finally {
      claimingId.value = null;
    }
  }

  async function refreshCouponLists() {
    await getCouponTemplateList();
  }

  // 立即领取优惠券
  async function onGetCoupon(id) {
    await sheep.$router.requireFormalAuth(async () => {
      const { code, msg } = await CouponApi.takeCoupon(id);
      if (code !== 0) {
        uni.showToast({ title: msg || '领取失败', icon: 'none' });
        return;
      }
      await getCouponTemplateList();
    });
  }
  const getCouponTemplateList = async () => {
    const ids = props.data.couponIds || [];
    if (!ids.length) {
      couponList.value = [];
      newcomerCoupons.value = [];
      newcomerTemplateIds.value = new Set();
      return;
    }
    const { data } = await CouponApi.getCouponTemplateListByIds(ids.join(','));
    const templates = data || [];
    await loadNewcomerCoupons(templates);
    couponList.value = templates.filter((item) => !newcomerTemplateIds.value.has(String(item.id)));
  };
  onMounted(() => {
    getCouponTemplateList();
  });
</script>

<style lang="scss" scoped>
  .card-btn {
    width: 140rpx;
    height: 50rpx;
    border-radius: 25rpx;
    font-size: 24rpx;
    line-height: 50rpx;

    &.vertical {
      width: 50rpx;
      height: 140rpx;
      margin: auto 20rpx auto 0;

      .btn-text {
        font-size: 24rpx;
        text-align: center;
        writing-mode: vertical-lr;
      }
    }
  }

  .coupon-item {
    &:nth-of-type(1) {
      margin-left: 0 !important;
    }
  }

  .newcomer-coupon {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
    margin: 18rpx 20rpx 0;
    padding: 22rpx 24rpx;
    border-radius: 8rpx;
    background: #fff5ec;
    border: 1rpx solid #f0d5c2;
  }
  .newcomer-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 6rpx; }
  .newcomer-title { color: #7b3825; font-size: 28rpx; font-weight: 600; }
  .newcomer-desc, .newcomer-reason { color: #765d52; font-size: 22rpx; }
  .newcomer-button { flex: none; margin: 0; padding: 0 22rpx; height: 58rpx; line-height: 58rpx; border: 0; border-radius: 5rpx; background: #b64b35; color: #fff; font-size: 22rpx; }
  .newcomer-button::after { border: 0; }
  .newcomer-button[disabled] { opacity: .55; }
</style>
