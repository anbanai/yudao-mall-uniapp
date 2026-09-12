import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperSource = await readFile(new URL('../sheep/helper/index.js', import.meta.url), 'utf8');
const detailSource = await readFile(new URL('../pages/order/detail.vue', import.meta.url), 'utf8');
const start = helperSource.indexOf('export function getOrderNo');
const end = helperSource.indexOf('\n\n/**\n * copyText', start);
assert.notEqual(start, -1, 'getOrderNo helper must be exported');

const getOrderNo = new Function(
  `${helperSource.slice(start, end).replace('export function', 'function')}\nreturn getOrderNo;`,
)();
const copyTextStart = helperSource.indexOf('export function copyText');
const copyTextEnd = helperSource.indexOf('\n\nexport default', copyTextStart);
const clipboardCalls = [];
const copyText = new Function(
  'uni',
  'toast',
  `${helperSource
    .slice(copyTextStart, copyTextEnd)
    .replace('export function', 'function')}\nreturn copyText;`,
)(
  {
    setClipboardData(options) {
      clipboardCalls.push(options);
      options.success();
    },
  },
  () => {},
);

assert.equal(getOrderNo({ no: 'o202609111804171' }), 'o202609111804171');
assert.equal(getOrderNo({ no: 'primary', orderNo: 'secondary' }), 'primary');
assert.equal(getOrderNo({ no: '  ', orderNo: 'fallback-order-no' }), 'fallback-order-no');
assert.equal(getOrderNo({ orderNo: 'fallback-order-no' }), 'fallback-order-no');
assert.equal(getOrderNo({ sn: 'sn-order-no' }), 'sn-order-no');
assert.equal(getOrderNo({ order_sn: 'legacy-order-no' }), 'legacy-order-no');
assert.equal(getOrderNo({ no: 0, id: 120761 }), 0);
assert.equal(getOrderNo({ id: 120761 }), 120761);
assert.equal(getOrderNo({}), '');
assert.equal(getOrderNo(null), '');

assert.match(detailSource, /getOrderNo\(state\.orderInfo\)/);
assert.match(detailSource, /copyText\(sheep\.\$helper\.getOrderNo\(state\.orderInfo\)\)/);
assert.match(helperSource.slice(helperSource.indexOf('export default')), /\n\s+getOrderNo,/);

copyText(getOrderNo({ orderNo: 'fallback-order-no' }));
assert.equal(clipboardCalls.length, 1);
assert.equal(clipboardCalls[0].data, 'fallback-order-no');

console.log('order copy number resolution checks passed');
