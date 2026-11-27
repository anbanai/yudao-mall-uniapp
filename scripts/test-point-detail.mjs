import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { readFileSync } from 'node:fs';
import { getPointExchangeStatus, getPointSkuQuantityLimit, getRemainingStock } from '../sheep/helper/productDetail.mjs';
import { invalidateSession, isCurrentSession, sessionEpoch } from '../sheep/helper/sessionEpoch.mjs';
import { createDeliveryAddressLoader } from '../sheep/helper/deliveryAddress.mjs';

const pointPage = readFileSync(new URL('../pages/goods/point.vue', import.meta.url), 'utf8');
// Run the page setup with controlled activity and product responses.
const setup = pointPage.split('<script setup>')[1].split('</script>')[0]
  .replace(/^  import .*?;$/gm, '');
const activity = { id: 12, spuId: 34, status: 0, stock: 3, products: [{ skuId: 1, stock: 3, point: 10 }], point: 10 };
let product = null;
let availableActivity = activity;
const user = reactive({ isLogin: false, userInfo: { point: 99999 } });
let getUserInfo = async () => ({ code: 0, data: { point: 263 } });
let getAddresses = async () => ({ code: 0, data: [{ id: 1, defaultStatus: true }] });
let showPage;
let authOpened = false;
const navigations = [];
const messages = [];
const page = runInNewContext(setup + `
;({ state, shareInfo, getActivity, exchangeLabel, exchangePriceText, isExchangeDisabled,
  loadDeliveryAddress, onBuy, onExchangeTap, onSkuChange, openSkuSelector })
`, {
  computed, reactive, ref, watch, getPointExchangeStatus, getRemainingStock, isCurrentSession, sessionEpoch,
  createDeliveryAddressLoader, getPointSkuQuantityLimit,
  onLoad() {}, onPageScroll() {},
  onShow(callback) { showPage = callback; },
  PointApi: { getPointActivity: () => ({ data: availableActivity }) },
  SpuApi: { getSpuDetail: () => ({ data: structuredClone(product) }) },
  UserApi: { getUserInfo: () => getUserInfo() },
  AddressApi: { getAddressList: () => getAddresses() },
  showAuthModal() { authOpened = true; },
  PromotionActivityTypeEnum: { POINT: { type: 'point' } },
  SharePageEnum: { POINT: { value: 'point' } },
  sheep: {
    $store: () => user,
    $url: { css: (url) => url, cdn: (url) => url },
    $platform: { share: { getShareInfo: (info) => info } },
    $router: { go: (path, { data }) => navigations.push({ path, order: JSON.parse(data) }) },
    $helper: { toast: (message) => messages.push(message) },
  },
  formatGoodsSwiper: (urls) => (urls || []).filter(Boolean).map((src) => ({ src })),
  fen2yuan: (price) => (price / 100).toFixed(2),
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

availableActivity = {
  ...activity,
  point: 100,
  products: [
    { skuId: 1, stock: 0, point: 100, price: 0 },
    { skuId: 2, stock: 2, point: 18600, price: 0 },
    { skuId: 3, stock: 1, point: 22000, price: 0 },
  ],
};
product.skus = [{ id: 1, stock: 5 }, { id: 2, stock: 2 }, { id: 3, stock: 1 }];
await page.getActivity(activity.id);
assert.equal(page.exchangeLabel.value, '登录后兑换');
page.onExchangeTap();
assert.equal(authOpened, true);
assert.equal(page.state.showSelectSku, false);

user.isLogin = true;
await nextTick();
await showPage();
assert.equal(
  page.isExchangeDisabled.value,
  true,
  'opening the detail page must block exchange when every in-stock SKU costs more than the balance',
);
assert.equal(page.exchangeLabel.value, '还差 18337 积分');
assert.equal(page.exchangePriceText.value, '18600', 'the exchange price stays visible above the shortfall');
page.onExchangeTap();
assert.equal(page.state.showSelectSku, false);

let resolveBalance;
getUserInfo = () => new Promise((resolve) => { resolveBalance = resolve; });
const pending = showPage();
assert.equal(page.exchangeLabel.value, '查询积分中');
assert.equal(page.isExchangeDisabled.value, true, 'a cached balance must not enable exchange while refreshing');
resolveBalance({ code: 0, data: { point: 18600 } });
await pending;
assert.equal(page.exchangeLabel.value, '立即兑换');
assert.equal(page.exchangePriceText.value, '18600');
assert.equal(page.isExchangeDisabled.value, false, 'an exact balance can redeem an available SKU');
page.onExchangeTap();
assert.equal(page.state.showSelectSku, true);

page.onSkuChange({ id: 2, stock: 2, point: 18600, pointPrice: 500, count: 2 });
assert.equal(page.exchangeLabel.value, '还差 18600 积分');
assert.equal(page.exchangePriceText.value, '37200+￥10.00');
assert.equal(page.isExchangeDisabled.value, true);
page.state.showSelectSku = false;
page.openSkuSelector();
assert.equal(page.state.showSelectSku, true, 'the specification row can reopen an unaffordable selection for editing');
page.onSkuChange({ id: 2, stock: 2, point: 18600, pointPrice: 500, count: 1 });
assert.equal(page.isExchangeDisabled.value, false);
assert.equal(page.exchangePriceText.value, '18600+￥5.00');

getUserInfo = async () => { throw new Error('offline'); };
await showPage();
assert.equal(page.exchangeLabel.value, '重试查询积分');
getUserInfo = async () => ({ code: 0, data: { point: 0 } });
await page.onExchangeTap();
assert.equal(page.exchangeLabel.value, '还差 18600 积分', 'a confirmed zero balance shows a shortfall after retry');

getUserInfo = () => new Promise((resolve) => { resolveBalance = resolve; });
const oldAccountRequest = showPage();
const resolveOldBalance = resolveBalance;
await page.loadDeliveryAddress();
assert.equal(page.state.deliveryAddress.id, 1);
getAddresses = async () => ({ code: 0, data: [{ id: 2, defaultStatus: true }] });
invalidateSession();
getUserInfo = async () => ({ code: 0, data: { point: 263 } });
await nextTick();
resolveOldBalance({ code: 0, data: { point: 99999 } });
await oldAccountRequest;
assert.equal(page.exchangeLabel.value, '还差 18337 积分', 'a balance response from a prior account is ignored');
assert.equal(page.state.showSelectSku, false);
await page.loadDeliveryAddress();
assert.equal(page.state.deliveryAddress.id, 2, 'switching accounts must replace the cached delivery address');

getUserInfo = async () => ({ code: 0, data: { point: 50000 } });
await showPage();
const sku = { id: 2, stock: 2, limitCount: 2, point: 18600, count: 3 };
page.openSkuSelector();
await page.onBuy(sku);
assert.deepEqual(navigations, []);
assert.deepEqual(messages, ['超过可兑换数量']);

sku.count = 2;
await Promise.all([page.onBuy(sku), page.onBuy(sku)]);
assert.deepEqual(navigations, [{
  path: '/pages/order/confirm',
  order: {
    order_type: 'goods',
    buy_type: 'point',
    pointActivityId: activity.id,
    items: [{ skuId: 2, count: 2 }],
    addressInfo: { id: 2, defaultStatus: true },
  },
}]);

availableActivity = null;
await page.getActivity(activity.id);
assert.equal(page.state.goodsInfo, null);
assert.equal(page.state.skeletonLoading, false);
assert.equal(page.state.activityError, '活动不存在或已结束');
assert.equal(Object.keys(page.shareInfo.value).length, 0);

console.log('point detail checks passed');
