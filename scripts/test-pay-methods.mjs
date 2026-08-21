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

assert.deepEqual(
  getPayMethods(['wx_app']).map((method) => method.value),
  ['wechat'],
  'only enabled App channels should be returned',
);

platform.name = 'H5';
assert.deepEqual(
  getPayMethods(['alipay_wap']).map((method) => method.value),
  ['alipay'],
  'only the enabled H5 channel should be returned',
);

assert.deepEqual(
  getPayMethods([]).map((method) => method.value),
  [],
  'an empty backend channel list should return no payment methods',
);

console.log('payment method filtering checks passed');
