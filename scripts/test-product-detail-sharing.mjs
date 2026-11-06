import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [goodsPage, pointPage, tabbar, goodsPoster, detailCellSku] = await Promise.all([
  read('pages/goods/index.vue'),
  read('pages/goods/point.vue'),
  read('pages/goods/components/detail/detail-tabbar.vue'),
  read('pages/public/components/canvas-poster/poster/goods.js'),
  read('pages/goods/components/detail/detail-cell-sku.vue'),
]);
const orderConfirm = await read('pages/order/confirm.vue');

assert.match(goodsPage, /open-type="share"[\s\S]*cicon-reply[\s\S]*>分享</);
assert.match(pointPage, /open-type="share"[\s\S]*cicon-reply[\s\S]*>分享</);
assert.match(tabbar, /cicon-home-o[\s\S]*首页/);
assert.match(tabbar, /cicon-cart-o[\s\S]*购物车/);
assert.match(goodsPage, /<text class="detail-info-label">配送<\/text>/);
assert.match(goodsPage, /快递包邮/);
assert.match(goodsPage, /AddressApi\.getAddressList\(\)/);
assert.match(goodsPage, /defaultStatus/);
assert.match(goodsPage, /detailAddress/);
assert.match(goodsPage, /onChooseDeliveryAddress/);
assert.match(goodsPage, /addressInfo:\s*state\.deliveryAddress/);
assert.match(goodsPage, /async function onBuy\(e\)[\s\S]*?await loadDeliveryAddress\(\);/);
assert.match(
  goodsPage,
  /class="detail-info-content delivery-content"[\s\S]*delivery-address[\s\S]*delivery-shipping/,
);
assert.match(goodsPage, /\.delivery-content\s*\{[^}]*align-items:\s*center/);
assert.match(goodsPage, /\.delivery-address\s*\{[^}]*text-overflow:\s*ellipsis/);
assert.match(goodsPage, /<text class="detail-info-label">配送<\/text>/);
assert.match(goodsPage, /<text class="detail-info-label">服务<\/text>/);
assert.match(goodsPage, /退货包运费/);
assert.match(
  goodsPage,
  /<detail-cell-sku[\s\S]*label="规格"[\s\S]*@tap="state\.showSelectSku = true"/,
);
assert.match(pointPage, /<text class="detail-info-label">配送<\/text>/);
assert.match(pointPage, /<text class="detail-info-label">服务<\/text>/);
assert.match(pointPage, /退货包运费/);
assert.match(pointPage, /AddressApi\.getAddressList\(\)/);
assert.match(pointPage, /defaultStatus/);
assert.match(pointPage, /detailAddress/);
assert.match(pointPage, /onChooseDeliveryAddress/);
assert.match(pointPage, /addressInfo:\s*state\.deliveryAddress/);
assert.match(pointPage, /async function onBuy\(sku\)[\s\S]*?await loadDeliveryAddress\(\);/);
assert.match(
  pointPage,
  /class="detail-info-content delivery-content"[\s\S]*delivery-address[\s\S]*delivery-shipping/,
);
assert.match(pointPage, /\.delivery-content\s*\{[^}]*align-items:\s*center/);
assert.match(pointPage, /\.delivery-address\s*\{[^}]*text-overflow:\s*ellipsis/);
assert.match(
  orderConfirm,
  /addressState\.value\.addressInfo = state\.orderPayload\.addressInfo \|\| \{\}/,
);
assert.match(orderConfirm, /addressId:\s*addressState\.value\.addressInfo\.id/);
assert.match(
  pointPage,
  /<detail-cell-sku[\s\S]*label="规格"[\s\S]*@tap="state\.showSelectSku = true"/,
);
assert.match(detailCellSku, /if \(!props\.sku\?\.id\) \{\s*return '选择';/);
assert.match(goodsPage, /price:\s*fen2yuan\(state\.goodsInfo\.price\)/);
assert.match(
  goodsPage,
  /已售\{\{ state\.goodsInfo\.salesCount \|\| 0 \}\}\/\{\{\s*state\.selectedSku\.stock \?\? state\.goodsInfo\.stock \?\? 0\s*\}\}/,
);
assert.match(pointPage, /point:\s*getShowPrice\.value\.point/);
assert.match(pointPage, /title:\s*state\.goodsInfo\.name/);
assert.match(goodsPage, /title-card detail-card ss-p-y-30 ss-p-x-20/);
assert.match(pointPage, /title-card detail-card ss-p-y-30 ss-p-x-20/);
assert.match(goodsPage, /ss-flex ss-row-between ss-col-center ss-m-b-26/);
assert.match(pointPage, /ss-flex ss-row-between ss-col-center ss-m-b-26/);
assert.match(
  pointPage,
  /已兑换\{\{ \(activity\.totalStock \|\| 0\) - \(activity\.stock \|\| 0\) \}\}\/\{\{\s*state\.selectedSku\.stock \?\? state\.goodsInfo\.stock \?\? 0\s*\}\}/,
);
assert.doesNotMatch(goodsPage, /已售数量/);
assert.doesNotMatch(pointPage, /已售数量/);
assert.match(goodsPoster, /poster\.shareInfo\.poster\.point/);
assert.doesNotMatch(tabbar, /收藏/);
assert.doesNotMatch(tabbar, /分享/);

const coloricon = await read('sheep/scss/icon/_coloricon.scss');
assert.match(coloricon, /\.cicon-cart:before\s*\{\s*content: '\\e70b';/);
assert.match(coloricon, /\.cicon-home:before\s*\{\s*content: '\\e70d';/);
assert.match(coloricon, /\.cicon-cart-o:before\s*\{\s*content: '\\e708';/);
assert.match(coloricon, /\.cicon-home-o:before\s*\{\s*content: '\\e70a';/);
assert.match(coloricon, /\.cicon-reply:before\s*\{\s*content: '\\e618';/);
assert.match(coloricon, /\.cicon-place-o:before\s*\{\s*content: '\\e650';/);

console.log('product detail sharing checks passed');
