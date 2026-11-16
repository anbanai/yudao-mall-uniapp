import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NodeTypes, parse } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';

import * as orderLogistics from '../sheep/helper/orderLogistics.mjs';

const {
  createOrderLogisticsOpener,
  createExpressTrackLoader,
  loadOrderInfo,
  getLogisticsFallbackParams,
} = orderLogistics;

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
assert.deepEqual(
  manifest['mp-weixin']?.plugins?.logisticsPlugin,
  {
    version: '2.3.0',
    provider: 'wx9ad912bf20548d92',
  },
  'the compatible WeChat logistics plugin must be declared inside mp-weixin.plugins',
);
assert.equal(
  manifest['mp-weixin']?.logisticsPlugin,
  undefined,
  'the plugin declaration must not be emitted as an unsupported app.json field',
);

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
    openFallback: (id, reason) => calls.fallback.push({ id, reason }),
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
  assert.deepEqual(calls.fallback, [{ id: 1002, reason: 'token-unavailable' }]);
}

{
  const failure = new Error('network failure');
  const { open, calls } = createHarness({
    ensureWechatWaybillToken: async () => {
      throw failure;
    },
  });
  assert.equal(await open(1003), false);
  assert.deepEqual(calls.fallback, [{ id: 1003, reason: 'token-request-failed' }]);
}

{
  const failure = new Error('plugin unavailable');
  const { open, calls } = createHarness({
    requireLogisticsPlugin: () => {
      throw failure;
    },
  });
  assert.equal(await open(1004), false);
  assert.deepEqual(calls.fallback, [{ id: 1004, reason: 'plugin-unavailable' }]);
}

{
  const { open, calls } = createHarness({ requireLogisticsPlugin: () => null });
  assert.equal(await open(1004), false);
  assert.deepEqual(calls.fallback, [{ id: 1004, reason: 'plugin-unavailable' }]);
}

{
  const failure = new Error('plugin open failed');
  const { open, calls } = createHarness({
    requireLogisticsPlugin: () => ({
      openWaybillTracking: async () => {
        throw failure;
      },
    }),
  });
  assert.equal(await open(1005), false);
  assert.deepEqual(calls.fallback, [{ id: 1005, reason: 'plugin-open-failed' }]);
}

{
  const { open, calls } = createHarness({ getPlatformName: () => 'H5' });
  assert.equal(await open(1006), false);
  assert.deepEqual(calls.ensure, []);
  assert.deepEqual(calls.requirePlugin, []);
  assert.deepEqual(calls.fallback, [{ id: 1006, reason: undefined }]);
}

assert.equal(
  typeof createExpressTrackLoader,
  'function',
  'the fallback page needs a stateful express-track loader',
);

const track = {
  content: '快件已到达上海转运中心',
  time: '2026-09-14T14:22:00+08:00',
};

{
  const states = [];
  const load = createExpressTrackLoader({
    getOrderExpressTrackList: async () => ({ code: 0, msg: '', data: [track] }),
    onStateChange: (state) => states.push(state),
  });
  const result = await load(2001);
  assert.deepEqual(states, [
    { status: 'loading', tracks: [], message: '' },
    { status: 'success', tracks: [track], message: '' },
  ]);
  assert.deepEqual(result, states.at(-1));
}

{
  const states = [];
  const load = createExpressTrackLoader({
    getOrderExpressTrackList: async () => ({ code: 0, msg: '', data: [] }),
    onStateChange: (state) => states.push(state),
  });
  assert.deepEqual(await load(2002), { status: 'empty', tracks: [], message: '' });
  assert.deepEqual(states.at(0), { status: 'loading', tracks: [], message: '' });
}

for (const response of [
  { code: 500, msg: 'SQLException: redis.internal:6379', data: null },
  { code: 0, msg: '', data: null },
]) {
  const load = createExpressTrackLoader({
    getOrderExpressTrackList: async () => response,
    onStateChange: () => {},
  });
  assert.deepEqual(await load(2003), {
    status: 'error',
    tracks: [],
    message: '物流信息加载失败，请稍后重试',
  });
}

{
  const load = createExpressTrackLoader({
    getOrderExpressTrackList: async () => {
      throw new Error('request timeout');
    },
    onStateChange: () => {},
  });
  assert.deepEqual(await load(2004), {
    status: 'error',
    tracks: [],
    message: '物流信息加载失败，请稍后重试',
  });
}

assert.equal(typeof loadOrderInfo, 'function', 'order details need defensive normalization');
const orderInfo = { id: 2005, items: [{ picUrl: 'https://example.com/goods.png' }] };
assert.deepEqual(
  await loadOrderInfo(async () => ({ code: 0, msg: '', data: orderInfo }), 2005),
  orderInfo,
);
for (const response of [false, null, { code: 500, data: null }, { code: 0, data: null }]) {
  assert.deepEqual(await loadOrderInfo(async () => response, 2005), {});
}
assert.deepEqual(
  await loadOrderInfo(async () => {
    throw new Error('request timeout');
  }, 2005),
  {},
);

assert.equal(
  typeof getLogisticsFallbackParams,
  'function',
  'the router needs to distinguish normal cross-platform usage from a WeChat fallback',
);
assert.deepEqual(getLogisticsFallbackParams(3001), { id: 3001 });
assert.deepEqual(getLogisticsFallbackParams(3002, 'plugin-open-failed'), {
  id: 3002,
  fallback: '1',
});

const fallbackPageSource = await readFile(
  new URL('../pages/order/express/log.vue', import.meta.url),
  'utf8',
);
const { descriptor } = parseSfc(fallbackPageSource);
const fallbackPageTemplate = parse(descriptor.template.content);

function collectElements(node, elements = []) {
  if (node.type === NodeTypes.ELEMENT) {
    elements.push(node);
  }
  for (const child of node.children || []) {
    collectElements(child, elements);
  }
  return elements;
}

function getTextContent(node) {
  if (node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION) {
    return node.type === NodeTypes.TEXT ? node.content.trim() : `{{ ${node.content.content} }}`;
  }
  return (node.children || []).map(getTextContent).join('');
}

function hasConditional(element, condition) {
  return element.props.some(
    (prop) =>
      prop.type === NodeTypes.DIRECTIVE &&
      ['if', 'else-if'].includes(prop.name) &&
      prop.exp?.content === condition,
  );
}

const fallbackElements = collectElements(fallbackPageTemplate);
const fallbackNotice = fallbackElements.find((element) =>
  hasConditional(element, 'state.isWechatFallback'),
);
assert.match(
  getTextContent(fallbackNotice || {}),
  /已切换到基础物流查询/,
  'a WeChat fallback must be explained instead of appearing as an unexplained page change',
);

const loadingState = fallbackElements.find((element) =>
  hasConditional(element, "state.trackStatus === 'loading'"),
);
assert.match(getTextContent(loadingState || {}), /物流信息加载中/);

const emptyState = fallbackElements.find((element) =>
  hasConditional(element, "state.trackStatus === 'empty'"),
);
assert.match(getTextContent(emptyState || {}), /暂无物流轨迹/);

const errorState = fallbackElements.find((element) =>
  hasConditional(element, "state.trackStatus === 'error'"),
);
assert.match(getTextContent(errorState || {}), /state\.trackError/);
const retryAction = collectElements(errorState || {}).find(
  (element) =>
    element.tag === 'button' &&
    element.props.some(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'on' &&
        prop.arg?.content === 'tap' &&
        prop.exp?.content === 'retryExpressDetail',
    ),
);
assert.ok(retryAction, 'a failed fallback query must offer a retry action');

const timelineMarker = fallbackElements.find(
  (element) =>
    element.tag === 'text' &&
    element.props.some(
      (prop) =>
        prop.type === NodeTypes.ATTRIBUTE &&
        prop.name === 'class' &&
        prop.value?.content.split(/\s+/).includes('cicon-title'),
    ) &&
    element.props.some(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'bind' &&
        prop.arg?.content === 'class' &&
        prop.exp?.content.includes('activity-color'),
    ),
);
assert.ok(timelineMarker, 'the latest timeline marker must retain its glyph while highlighted');

const orderApiSource = await readFile(
  new URL('../sheep/api/trade/order.js', import.meta.url),
  'utf8',
);
const orderDetailApiStart = orderApiSource.indexOf(
  'getOrderDetail: (id, sync, { showError = true } = {}) => {',
);
const orderDetailApiEnd = orderApiSource.indexOf(
  '\n  },\n  // 订单列表',
  orderDetailApiStart,
);
assert.ok(
  orderDetailApiStart >= 0 && orderDetailApiEnd > orderDetailApiStart,
  'order detail API source not found',
);
const orderDetailApiFactory = new Function(
  'request',
  `return (${orderApiSource.slice(
    orderDetailApiStart + 'getOrderDetail: '.length,
    orderDetailApiEnd + 4,
  )});`,
)((config) => config);
assert.equal(orderDetailApiFactory(2006).custom.showError, true);
assert.equal(
  orderDetailApiFactory(2006, undefined, { showError: false }).custom.showError,
  false,
  'the optional order detail request must support suppressing raw backend error toasts',
);
assert.match(
  fallbackPageSource,
  /OrderApi\.getOrderDetail\(orderId, undefined, \{ showError: false \}\)/,
  'the fallback page must suppress raw backend errors from its optional order detail request',
);

const expressApiStart = orderApiSource.indexOf('getOrderExpressTrackList: (id) => {');
const expressApiEnd = orderApiSource.indexOf(
  '\n  },\n  // 生成微信物流查询组件运单令牌',
  expressApiStart,
);
assert.ok(
  expressApiStart >= 0 && expressApiEnd > expressApiStart,
  'express track API source not found',
);
const expressApiFactory = new Function(
  'request',
  `return (${orderApiSource.slice(
    expressApiStart + 'getOrderExpressTrackList: '.length,
    expressApiEnd + 4,
  )});`,
)((config) => config);
assert.deepEqual(expressApiFactory(2006), {
  url: '/trade/order/get-express-track-list',
  method: 'GET',
  params: { id: 2006 },
  custom: { showError: false },
});

console.log('wechat logistics plugin fallback checks passed');
