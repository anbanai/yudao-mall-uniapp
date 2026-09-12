import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  mergePointActivitiesWithSpus,
  normalizePointSpu,
} from '../sheep/components/s-point-block/point-block.mjs';

const pointBlockSource = readFileSync(
  new URL('../sheep/components/s-point-block/s-point-block.vue', import.meta.url),
  'utf8',
);
const goodsColumnSource = readFileSync(
  new URL('../sheep/components/s-goods-column/s-goods-column.vue', import.meta.url),
  'utf8',
);

const activities = [
  { id: 7, spuId: 101, stock: 4, totalStock: 10, point: 300, price: 1200 },
  { id: 15, spuId: 999, stock: 2, totalStock: 2, point: 500, price: 800 },
  { id: 8, spuId: 102, stock: 6, totalStock: 12, point: 400, price: 1600 },
];
const spus = [
  { id: 102, name: 'Tea B', introduction: 'Tea B', price: 2200 },
  { id: 101, name: 'Tea A', introduction: 'A fresh tea', price: 1800 },
];

assert.deepEqual(mergePointActivitiesWithSpus(activities, spus, 4), [
  {
    id: 101,
    name: 'Tea A',
    introduction: 'A fresh tea',
    price: 1800,
    pointStock: 4,
    pointTotalStock: 10,
    point: 300,
    pointPrice: 1200,
    activityId: 7,
    activityType: 4,
  },
  {
    id: 102,
    name: 'Tea B',
    price: 2200,
    pointStock: 6,
    pointTotalStock: 12,
    point: 400,
    pointPrice: 1600,
    activityId: 8,
    activityType: 4,
  },
]);

assert.deepEqual(mergePointActivitiesWithSpus(null, spus, 4), []);
assert.deepEqual(mergePointActivitiesWithSpus(activities, null, 4), []);

assert.deepEqual(normalizePointSpu({ name: 'Tea A', introduction: ' Tea A ' }), {
  name: 'Tea A',
});
assert.deepEqual(normalizePointSpu({ name: 'Tea A', introduction: 'A fresh tea' }), {
  name: 'Tea A',
  introduction: 'A fresh tea',
});

assert.deepEqual(
  spus,
  [
    { id: 102, name: 'Tea B', introduction: 'Tea B', price: 2200 },
    { id: 101, name: 'Tea A', introduction: 'A fresh tea', price: 1800 },
  ],
  'merging point data must not mutate the shared SPU response',
);

assert.equal(
  (pointBlockSource.match(/variant="point"/g) || []).length,
  2,
  'both point columns must opt into the dedicated layout variant',
);
assert.equal(
  (pointBlockSource.match(/goods-md-box goods-md-box--point/g) || []).length,
  2,
  'both point columns must expose a root-level marker for parent layout rules',
);
assert.match(
  pointBlockSource,
  /\.goods-md-box:not\(\.goods-md-box--point\)/,
  'parent button positioning must exclude point card roots',
);
assert.match(
  goodsColumnSource,
  /v-if="variant === 'point'"[\s\S]*class="md-point-meta[^"]*"[\s\S]*class="md-point-score[^"]*"[\s\S]*\{\{ data\.point \}\}[\s\S]*class="goods-origin-price/,
  'point cards must show points and the original price together on the second row',
);
assert.match(
  goodsColumnSource,
  /class="md-point-action[^"]*"[\s\S]*fen2yuan\(data\.pointPrice\)[\s\S]*<slot name="cart"/,
  'point cards must show the cash price and purchase control together on the third row',
);
assert.match(
  goodsColumnSource,
  /\.md-point-meta[\s\S]*justify-content:\s*space-between/,
  'the point and original-price row must distribute its content without overlap',
);
assert.match(
  goodsColumnSource,
  /\.md-point-action[\s\S]*justify-content:\s*space-between/,
  'the cash price and purchase-control row must distribute its content without overlap',
);
assert.match(
  pointBlockSource,
  /\.goods-md-box,[\s\S]*\.cart-btn\s*\{[\s\S]*height:\s*50rpx[\s\S]*\.goods-md-box:not\(\.goods-md-box--point\)[\s\S]*position:\s*absolute/,
  'point buttons must keep their visual style while only non-point buttons use absolute positioning',
);
assert.doesNotMatch(
  pointBlockSource,
  /paddingRight: data\.space \+ 'rpx', marginBottom: data\.space \+ 'px'/,
  'left point column spacing must not use the non-responsive px unit',
);
assert.doesNotMatch(
  pointBlockSource,
  /paddingLeft: data\.space \+ 'rpx', marginBottom: data\.space \+ 'px'/,
  'right point column spacing must not use the non-responsive px unit',
);
assert.equal(
  (pointBlockSource.match(/marginBottom: data\.space \+ 'rpx'/g) || []).length,
  2,
  'both point columns must use the responsive rpx unit',
);

console.log('point block data checks passed');
