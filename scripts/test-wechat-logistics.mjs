import assert from 'node:assert/strict';

import { createOrderLogisticsOpener } from '../sheep/helper/orderLogistics.mjs';

function createHarness(overrides = {}) {
  const calls = {
    ensure: [],
    requirePlugin: [],
    openPlugin: [],
    fallback: [],
  };
  const dependencies = {
    getPlatformName: () => 'WechatMiniProgram',
    ensureWechatWaybillToken: async (id) => {
      calls.ensure.push(id);
      return { code: 0, data: 'token-123' };
    },
    requireLogisticsPlugin: (name) => {
      calls.requirePlugin.push(name);
      return {
        openWaybillTracking: async (options) => calls.openPlugin.push(options),
      };
    },
    openFallback: (id) => calls.fallback.push(id),
    ...overrides,
  };
  return { open: createOrderLogisticsOpener(dependencies), calls };
}

{
  const { open, calls } = createHarness();
  assert.equal(await open(1001), true);
  assert.deepEqual(calls.ensure, [1001]);
  assert.deepEqual(calls.requirePlugin, ['logisticsPlugin']);
  assert.deepEqual(calls.openPlugin, [{ waybillToken: 'token-123' }]);
  assert.deepEqual(calls.fallback, []);
}

for (const response of [{ code: 0, data: '' }, { code: 500, data: 'ignored-token' }, null]) {
  const { open, calls } = createHarness({
    ensureWechatWaybillToken: async (id) => {
      calls.ensure.push(id);
      return response;
    },
  });
  assert.equal(await open(1002), false);
  assert.deepEqual(calls.requirePlugin, []);
  assert.deepEqual(calls.fallback, [1002]);
}

{
  const { open, calls } = createHarness({
    ensureWechatWaybillToken: async () => {
      throw new Error('network failure');
    },
  });
  assert.equal(await open(1003), false);
  assert.deepEqual(calls.fallback, [1003]);
}

{
  const { open, calls } = createHarness({
    requireLogisticsPlugin: () => {
      throw new Error('plugin unavailable');
    },
  });
  assert.equal(await open(1004), false);
  assert.deepEqual(calls.fallback, [1004]);
}

{
  const { open, calls } = createHarness({ requireLogisticsPlugin: () => null });
  assert.equal(await open(1004), false);
  assert.deepEqual(calls.fallback, [1004]);
}

{
  const { open, calls } = createHarness({
    requireLogisticsPlugin: () => ({
      openWaybillTracking: async () => {
        throw new Error('plugin open failed');
      },
    }),
  });
  assert.equal(await open(1005), false);
  assert.deepEqual(calls.fallback, [1005]);
}

{
  const { open, calls } = createHarness({ getPlatformName: () => 'H5' });
  assert.equal(await open(1006), false);
  assert.deepEqual(calls.ensure, []);
  assert.deepEqual(calls.requirePlugin, []);
  assert.deepEqual(calls.fallback, [1006]);
}

console.log('wechat logistics plugin fallback checks passed');
