import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');

const [couponApi, homeCoupons, detail, orderApi, confirm, selector, router] = await Promise.all([
  read('sheep/api/promotion/coupon.js'),
  read('sheep/components/s-coupon-block/s-coupon-block.vue'),
  read('pages/coupon/detail.vue'),
  read('sheep/api/trade/order.js'),
  read('pages/order/confirm.vue'),
  read('pages/order/components/s-coupon-select.vue'),
  read('sheep/router/index.js'),
]);

assert.match(couponApi, /\/promotion\/coupon-template\/newcomer/);
assert.match(couponApi, /\/promotion\/coupon\/take-newcomer/);
assert.match(couponApi, /\/promotion\/coupon-promotion\/resolve/);
assert.match(couponApi, /\/promotion\/coupon-promotion\/take/);
assert.match(homeCoupons, /reasonCode === 'LOGIN_REQUIRED'/);
assert.match(homeCoupons, /result\.data\.showEntry/);
assert.match(homeCoupons, /requireFormalAuth\(async \(\) =>/);
assert.match(detail, /options\.promotionCode/);
assert.match(detail, /state\.promotion\.miniProgramPath/);
assert.match(detail, /takeCouponPromotion\(state\.promotionCode\)/);
assert.match(detail, /exchangeSkuId/);
assert.match(detail, /couponIds: \[Number\(state\.couponId\)\]/);
assert.match(orderApi, /couponIds\.map\(\(id\) => `couponIds=/);
assert.match(selector, /state\.couponIds\.length >= 10/);
assert.match(confirm, /effectiveCouponIds/);
assert.match(confirm, /couponExclusionReasons/);
assert.match(router, /pendingFormalAuthContinuation/);

console.log('coupon marketing integration checks passed');
