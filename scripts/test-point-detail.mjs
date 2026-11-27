import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { computed, reactive, ref } from 'vue';
import isEmpty from 'lodash/isEmpty.js';
import { readFileSync } from 'node:fs';

const pointPage = readFileSync(new URL('../pages/goods/point.vue', import.meta.url), 'utf8');
// Run the page setup with controlled activity and product responses.
const setup = pointPage.split('<script setup>')[1].split('</script>')[0]
  .replace(/^  import .*?;$/gm, '');
const activity = { id: 12, spuId: 34, status: 0, stock: 3, products: [{ skuId: 1, stock: 3, point: 10 }], point: 10 };
let product = null;
let availableActivity = activity;
const page = runInNewContext(setup + '\n;({ state, shareInfo, getActivity, isExchangeDisabled })', {
  computed, reactive, ref, isEmpty,
  onLoad() {}, onPageScroll() {},
  PointApi: { getPointActivity: () => ({ data: availableActivity }) },
  SpuApi: { getSpuDetail: () => ({ data: structuredClone(product) }) },
  PromotionActivityTypeEnum: { POINT: { type: 'point' } },
  SharePageEnum: { POINT: { value: 'point' } },
  sheep: {
    $url: { css: (url) => url, cdn: (url) => url },
    $platform: { share: { getShareInfo: (info) => info } },
  },
  formatGoodsSwiper: (urls) => (urls || []).filter(Boolean).map((src) => ({ src })),
  fen2yuan: (price) => price / 100,
});
await page.getActivity(activity.id);
assert.equal(page.state.goodsInfo, null);
assert.equal(Object.keys(page.shareInfo.value).length, 0);

product = { id: activity.spuId, name: '积分商品', picUrl: 'goods.png', stock: 5, skus: [{ id: 1, stock: 5 }] };
await page.getActivity(activity.id);
assert.equal(page.state.goodsInfo.id, product.id);
assert.equal(page.state.goodsInfo.stock, activity.stock);
assert.equal(page.shareInfo.value.image, product.picUrl);
assert.equal(page.shareInfo.value.title, product.name);
assert.equal(page.state.goodsSwiper[0]?.src, product.picUrl);

product.sliderPicUrls = ['slide.jpg'];
product.skus = [{ id: 1, stock: 0 }, { id: 2, stock: 5 }];
await page.getActivity(activity.id);
assert.equal(page.state.goodsSwiper[0].src, 'slide.jpg');
assert.equal(page.state.goodsInfo.stock, 0);
assert.equal(page.isExchangeDisabled.value, true);

product.skus = [{ id: 1, stock: 5 }];

availableActivity = { ...activity, stock: 0 };
await page.getActivity(activity.id);
assert.equal(page.state.goodsInfo.id, product.id);
assert.equal(page.isExchangeDisabled.value, true);
assert.equal(page.state.goodsInfo.skus[0].stock, 0);

availableActivity = null;
await page.getActivity(activity.id);
assert.equal(page.state.goodsInfo, null);
assert.equal(page.state.skeletonLoading, false);
assert.equal(page.state.activityError, '活动不存在或已结束');
assert.equal(Object.keys(page.shareInfo.value).length, 0);

console.log('point detail checks passed');
