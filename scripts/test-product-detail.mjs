import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getPointExchangeStatus,
  getPreSaleLabel,
  getRedeemedCount,
  getRemainingStock,
} from '../sheep/helper/productDetail.mjs';

assert.equal(getRemainingStock({}, { stock: 12 }), 12);
assert.equal(getRemainingStock({ id: 4, stock: 3 }, { stock: 12 }), 3);
assert.equal(getRedeemedCount({ totalStock: 20, stock: 7 }), 13);
assert.equal(getRedeemedCount({ totalStock: 4, stock: 8 }), 0);
assert.equal(getPreSaleLabel({ isPreSale: true, deliveryDays: 5 }), '预售 · 付款后5天发货');
assert.equal(getPreSaleLabel({ isPreSale: false, deliveryDays: 5 }), '');
assert.deepEqual(getPointExchangeStatus(99, 50, 2), {
  available: 99,
  required: 100,
  shortfall: 1,
  canExchange: false,
});
assert.equal(getPointExchangeStatus(100, 50, 2).canExchange, true);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [goodsPage, pointPage, tabbar, selector, orderConfirm] = await Promise.all([
  read('pages/goods/index.vue'),
  read('pages/goods/point.vue'),
  read('pages/goods/components/detail/detail-tabbar.vue'),
  read('sheep/components/s-select-seckill-sku/s-select-seckill-sku.vue'),
  read('pages/order/confirm.vue'),
]);

assert.match(goodsPage, /剩余库存 \{\{ remainingStock \}\}/);
assert.match(goodsPage, /AddressApi\.getAddressList\(\)/);
assert.match(goodsPage, /addressInfo: state\.deliveryAddress/);
assert.match(pointPage, /已兑换 \{\{ redeemedCount \}\}/);
assert.match(pointPage, /:point-balance="pointBalance"/);
assert.match(pointPage, /activityError/);
assert.match(tabbar, /cicon-home-o/);
assert.match(tabbar, /cicon-cart-o/);
assert.match(selector, /pointShortfall/);
assert.match(selector, /:disabled="isBuyDisabled"/);
assert.match(orderConfirm, /addressState\.value\.addressInfo = state\.orderPayload\.addressInfo \|\| \{\}/);
assert.match(orderConfirm, /addressId: addressState\.value\.addressInfo\.id/);

console.log('product detail checks passed');
