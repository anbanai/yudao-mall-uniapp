import assert from 'node:assert/strict';

import { mergePointActivitiesWithSpus } from '../sheep/components/s-point-block/point-block.mjs';

const activities = [
  { id: 7, spuId: 101, stock: 4, totalStock: 10, point: 300, price: 1200 },
  { id: 15, spuId: 999, stock: 2, totalStock: 2, point: 500, price: 800 },
  { id: 8, spuId: 102, stock: 6, totalStock: 12, point: 400, price: 1600 },
];
const spus = [
  { id: 102, name: 'Tea B', price: 2200 },
  { id: 101, name: 'Tea A', price: 1800 },
];

assert.deepEqual(mergePointActivitiesWithSpus(activities, spus, 4), [
  {
    id: 101,
    name: 'Tea A',
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

assert.deepEqual(
  spus,
  [
    { id: 102, name: 'Tea B', price: 2200 },
    { id: 101, name: 'Tea A', price: 1800 },
  ],
  'merging point data must not mutate the shared SPU response',
);

console.log('point block data checks passed');
