import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(projectRoot, 'sheep/platform/pay.js'), 'utf8');
const start = source.indexOf('export function getPayMethods(channels) {');
const end = source.indexOf('\n}\n\n// 支付结果跳转', start) + 2;
assert.ok(start >= 0 && end > start, 'getPayMethods source not found');

const platform = { name: 'App' };
const getPayMethods = new Function(
  'sheep',
  `${source.slice(start, end).replace('export function ', 'function ')}\nreturn getPayMethods;`,
)(
  {
    $platform: platform,
  },
);

const valuesFor = (channels) => getPayMethods(channels).map((method) => method.value);

assert.deepEqual(
  valuesFor(['wx_app']),
  ['wechat'],
  'only enabled App channels should be returned',
);

assert.deepEqual(
  valuesFor(['mock', 'wallet', 'alipay_app', 'wx_app']),
  ['wechat', 'alipay', 'wallet', 'mock'],
  'enabled channels should keep the existing payment method order',
);

platform.name = 'H5';
assert.deepEqual(
  valuesFor(['alipay_wap', 'wallet', 'mock']),
  ['alipay', 'wallet', 'mock'],
  'H5 should expose supported enabled channels only',
);

platform.name = 'WechatOfficialAccount';
assert.deepEqual(
  valuesFor(['wx_pub', 'alipay_wap']),
  ['wechat', 'alipay'],
  'official accounts should map both supported channels',
);

platform.name = 'WechatMiniProgram';
assert.deepEqual(
  valuesFor(['wx_lite', 'alipay_wap']),
  ['wechat', 'alipay'],
  'mini programs should map both supported channels',
);

platform.name = 'Unknown';
assert.deepEqual(
  valuesFor(['wx_app', 'alipay_app', 'wallet', 'mock']),
  ['wallet', 'mock'],
  'unsupported platforms should still expose platform-independent methods',
);

assert.deepEqual(
  valuesFor([]),
  [],
  'an empty backend channel list should return no payment methods',
);

console.log('payment method filtering checks passed');
