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
assert.match(homeCoupons, /getVisibleNewcomerCoupons/);
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

const { getVisibleNewcomerCoupons } = await import('../sheep/helper/newcomerCoupons.mjs');
const anonymous = { reasonCode: 'LOGIN_REQUIRED', showEntry: false };
const visible = { templateId: 5, showEntry: true };
let hasOrders = false;
let weixinReads = 0;
const context = {
  api: {
    getNewcomerCoupon: async () => ({ code: 0, data: anonymous }),
    getWeixinVisitorEntry: async (code) => {
      assert.equal(code, 'wx-code');
      weixinReads++;
      return { code: 0, data: !hasOrders };
    },
  },
  weixin: true, hasToken: false, current: () => true, getCode: async () => 'wx-code',
};
assert.deepEqual(await getVisibleNewcomerCoupons([5], context), [anonymous]);
hasOrders = true;
assert.deepEqual(await getVisibleNewcomerCoupons([5], context), []);
assert.deepEqual(await getVisibleNewcomerCoupons([5], { ...context, weixin: false }), []);
assert.equal(weixinReads, 2);
context.hasToken = true;
context.api.getNewcomerCoupon = async (_, options) => options.isToken
  ? { code: 401 } : { code: 0, data: anonymous };
assert.deepEqual(await getVisibleNewcomerCoupons([5], context), []);
assert.equal(weixinReads, 3);
context.api.getNewcomerCoupon = async () => ({ code: 0, data: visible });
assert.deepEqual(await getVisibleNewcomerCoupons([5], context), [visible]);
assert.deepEqual(await getVisibleNewcomerCoupons([5], { ...context, current: () => false }), []);
assert.equal(weixinReads, 3);
// An earlier account's in-flight WeChat response cannot make the card reappear.
let releaseLookup;
let lookupStarted;
const started = new Promise((resolve) => { lookupStarted = resolve; });
let active = true;
const pending = getVisibleNewcomerCoupons([5], {
  ...context, hasToken: false, current: () => active, epoch: 2,
  api: {
    getNewcomerCoupon: async () => ({ code: 0, data: anonymous }),
    getWeixinVisitorEntry: () => new Promise((resolve) => {
      releaseLookup = resolve;
      lookupStarted();
    }),
  },
});
await started;
active = false;
releaseLookup({ code: 0, data: true });
assert.deepEqual(await pending, []);
console.log('coupon marketing integration checks passed');
