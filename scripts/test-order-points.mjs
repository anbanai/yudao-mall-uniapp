import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ORDER_PRICE_CHANGED_CODE,
  createExclusiveRunner,
  createOrderPointFlow,
  createRequestGate,
  getPointView,
  isOrderPriceChanged,
} from '../sheep/helper/orderPoints.mjs';

const available = getPointView(
  { totalPoint: 5000, maxUsePoint: 3889, maxPointPrice: 3889, usePoint: 0, price: {} },
  false,
);
assert.equal(available.disabled, false);
assert.equal(available.summary, '本单最多可用 3889 积分，最高抵扣 ￥38.89');

const selected = getPointView(
  {
    totalPoint: 5000,
    maxUsePoint: 3889,
    maxPointPrice: 3889,
    usePoint: 3889,
    price: { pointPrice: 3889 },
  },
  true,
);
assert.equal(selected.summary, '已使用 3889 积分，抵扣 -￥38.89');
assert.equal(selected.remainingText, '剩余积分 1111');

const unavailable = getPointView(
  { totalPoint: 5000, maxUsePoint: 0, maxPointPrice: 0, usePoint: 0, price: {} },
  false,
);
assert.equal(unavailable.disabled, true);
assert.equal(unavailable.summary, '当前订单暂无可抵扣积分');

const legacy = getPointView({ totalPoint: 20, usePoint: 0, price: {} }, false);
assert.equal(
  legacy.disabled,
  false,
  'older backends must remain selectable when the user has points',
);
assert.equal(legacy.summary, '当前积分 20');

const gate = createRequestGate();
const first = gate.begin();
const second = gate.begin();
assert.equal(gate.isLatest(first), false, 'an older settlement response must be ignored');
assert.equal(gate.isLatest(second), true);
assert.equal(gate.isBusy(), true, 'point toggles must be blocked during settlement');
gate.finish(first);
assert.equal(gate.isBusy(), true, 'an older response must not clear the latest loading state');
gate.finish(second);
assert.equal(gate.isBusy(), false);

assert.equal(isOrderPriceChanged(1011000040), true);
assert.equal(isOrderPriceChanged('1011000040'), true);
assert.equal(isOrderPriceChanged(0), false);
assert.equal(ORDER_PRICE_CHANGED_CODE, 1011000040);

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

let pointSelected = false;
let settlement = { totalPoint: 100, maxUsePoint: 99, maxPointPrice: 99, price: {} };
const responses = [];
const flow = createOrderPointFlow({
  getSelected: () => pointSelected,
  setSelected: (value) => {
    pointSelected = value;
  },
  getSettlement: () => settlement,
  applySettlement: (value) => {
    settlement = value;
  },
  requestSettlement: () => responses.shift().promise,
});

const toggleResponse = deferred();
responses.push(toggleResponse);
const pendingToggle = flow.toggle(true);
assert.equal((await flow.toggle(false)).blocked, true, 'repeated toggles must be blocked');
toggleResponse.resolve({
  code: 0,
  data: {
    totalPoint: 100,
    maxUsePoint: 99,
    maxPointPrice: 99,
    usePoint: 99,
    price: { pointPrice: 99 },
  },
});
assert.equal((await pendingToggle).ok, true);
assert.equal(pointSelected, true);
assert.equal(settlement.usePoint, 99);

const failedToggleResponse = deferred();
responses.push(failedToggleResponse);
const failedToggle = flow.toggle(false);
failedToggleResponse.resolve({ code: 500 });
assert.equal((await failedToggle).ok, false);
assert.equal(pointSelected, true, 'a failed settlement must restore the checkbox');
assert.equal(settlement.usePoint, 99, 'a failed settlement must restore the displayed price');

settlement = { totalPoint: 100, maxUsePoint: 0, maxPointPrice: 0, price: {} };
assert.equal((await flow.toggle(true)).blocked, true, 'zero usable points must disable selection');

const olderResponse = deferred();
const latestResponse = deferred();
responses.push(olderResponse, latestResponse);
const olderRefresh = flow.refresh();
const latestRefresh = flow.refresh();
latestResponse.resolve({ code: 0, data: { marker: 'latest' } });
assert.equal((await latestRefresh).ok, true);
olderResponse.resolve({ code: 0, data: { marker: 'older' } });
assert.equal((await olderRefresh).stale, true);
assert.equal(
  settlement.marker,
  'latest',
  'stale settlement data must not overwrite the latest result',
);

const submitResponse = deferred();
let submitCalls = 0;
const submitRunner = createExclusiveRunner(async () => {
  submitCalls += 1;
  return submitResponse.promise;
});
const pendingSubmit = submitRunner.run();
assert.equal((await submitRunner.run()).blocked, true, 'repeated order submission must be blocked');
submitResponse.resolve({ code: 0 });
await pendingSubmit;
assert.equal(submitCalls, 1);

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const confirmSource = await readFile(resolve(projectRoot, 'pages/order/confirm.vue'), 'utf8');
assert.match(confirmSource, /const checked = event\.detail\.value\.includes\('point'\)/);
assert.match(confirmSource, /expectedPayPrice: state\.orderInfo\.price\.payPrice/);
assert.match(confirmSource, /expectedUsePoint: state\.orderInfo\.usePoint \|\| 0/);
assert.match(
  confirmSource,
  /if \(isOrderPriceChanged\(code\)\) \{\s+await getOrderInfo\(\)/,
  'a changed order snapshot must refresh settlement and remain on the confirmation page',
);

console.log('order point settlement checks passed');
