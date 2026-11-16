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

assert.deepEqual(valuesFor(['yeepay_wx_lite']), ['wechat'], 'Yeepay must expose WeChat mini program payment');
assert.equal(getPayMethods(['yeepay_wx_lite'])[0].channelCode, 'yeepay_wx_lite');
assert.equal(getPayMethods(['wx_lite', 'yeepay_wx_lite'])[0].channelCode, 'yeepay_wx_lite');
assert.equal(getPayMethods(['wx_lite'])[0].channelCode, 'wx_lite', 'retain enabled legacy WeChat channel');

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

const runtime = { $platform: { name: 'WechatMiniProgram', useProvider: () => ({ getOpenid: async () => 'OPEN-ID' }) }, $helper: { toast: () => {} } };
let submission;
let payment;
let submitFailure = false;
const toasts = [];
runtime.$helper.toast = (message) => toasts.push(message);
const Payment = new Function('sheep', 'PayOrderApi', 'uni',
  source.replace(/^import .*;$/gm, '').replace('export default class', 'class').replace(/export function /g, 'function ') + '\nreturn SheepPay;'
)(runtime, { submitOrder: async (data) => { if (submitFailure) throw new Error('synthetic-sensitive-response'); submission = data; return { code: 0, data: { displayContent: JSON.stringify({ timeStamp: '1', nonceStr: 'nonce', package: 'prepay_id=TN', signType: 'RSA', paySign: 'signed' }) } }; } }, { requestPayment: (data) => { payment = data; } });
const pay = Object.assign(Object.create(Payment.prototype), { payment: 'wechat', id: 42, channelCode: 'yeepay_wx_lite', bindWeixin: () => {} });
await pay.wechatMiniProgramPay();
assert.equal(submission.channelCode, 'yeepay_wx_lite');
assert.equal(submission.channelExtras.openid, 'OPEN-ID');
assert.equal(payment.package, 'prepay_id=TN', 'use the standard package returned by Yeepay');
runtime.$platform.useProvider = () => ({ getOpenid: async () => null });
const missingOpenId = await pay.prepay('yeepay_wx_lite');
assert.notEqual(missingOpenId.code, 0, 'missing OpenID must settle instead of hanging');
console.log('Yeepay mini program submission checks passed');

runtime.$platform.useProvider = () => ({ getOpenid: async () => 'OPEN-ID' });
submitFailure = true;
await assert.doesNotReject(() => pay.payAction(), 'constructor dispatch must settle failed prepayment');
assert.deepEqual(toasts, ['支付请求失败，请稍后重试'], 'network failures show a safe retry message');
console.log('payment dispatch failure checks passed');
