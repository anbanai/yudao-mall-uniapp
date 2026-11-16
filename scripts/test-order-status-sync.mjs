import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const orderMenu = await import('../sheep/helper/orderMenu.mjs').catch(() => null);
const orderStatus = await import('../sheep/helper/orderStatus.mjs').catch(() => null);

assert.ok(orderMenu, 'order menu mapping must be available as a testable module');
assert.ok(orderStatus, 'order status synchronization helpers must be available');

const pendingShipment = orderMenu.ORDER_MENU.find((item) => item.title === '待发货');
assert.deepEqual(pendingShipment, {
  title: '待发货',
  value: 2,
  icon: '/static/img/shop/order/no_send.png',
  path: '/pages/order/list',
  type: 'nosend',
  count: 'undeliveredCount',
});

const normalized = orderStatus.normalizeOrderCount({
  allCount: 8,
  unpaidCount: 2,
  undeliveredCount: 1,
});
assert.deepEqual(normalized, {
  allCount: 8,
  unpaidCount: 2,
  undeliveredCount: 1,
  deliveredCount: 0,
  uncommentedCount: 0,
  afterSaleCount: 0,
});

const applied = [];
const requests = [];
const refresh = orderStatus.createOrderCountRefresher({
  fetchOrderCount: () => new Promise((resolve) => requests.push(resolve)),
  applyOrderCount: (value) => applied.push(value),
});
const first = refresh();
const second = refresh();
requests[1]({ code: 0, data: { deliveredCount: 2 } });
assert.deepEqual(await second, { ok: true });
requests[0]({ code: 0, data: { deliveredCount: 99 } });
assert.deepEqual(await first, { stale: true });
assert.equal(applied.length, 1);
assert.equal(applied[0].deliveredCount, 2);

const userStoreSource = await readFile(resolve(projectRoot, 'sheep/store/user.js'), 'utf8');
assert.match(userStoreSource, /refreshOrderCount/);
assert.match(userStoreSource, /normalizeOrderCount/);

for (const file of [
  'pages/order/list.vue',
  'pages/order/detail.vue',
  'pages/order/aftersale/apply.vue',
  'pages/order/aftersale/list.vue',
  'pages/order/aftersale/detail.vue',
  'pages/order/aftersale/return-delivery.vue',
  'pages/goods/comment/add.vue',
  'pages/pay/result.vue',
]) {
  const source = await readFile(resolve(projectRoot, file), 'utf8');
  assert.match(
    source,
    /refreshOrderCount\(/,
    `${file} must refresh order counts after state changes`,
  );
}

console.log('order status synchronization checks passed');
