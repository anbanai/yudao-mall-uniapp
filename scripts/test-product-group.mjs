import assert from 'node:assert/strict';

import {
  buildProductGroupQuery,
  createProductGroupLoader,
  normalizeCategoryIds,
  orderSelectedCategories,
} from '../sheep/components/s-goods-group/product-group.mjs';
import { getBlockOverflow } from '../sheep/components/s-block/block.mjs';

assert.equal(getBlockOverflow(true), 'visible');
assert.equal(getBlockOverflow(false), 'hidden');

assert.deepEqual(
  normalizeCategoryIds([1, 2, 1, ...Array.from({ length: 20 }, (_, i) => i + 3)]),
  Array.from({ length: 15 }, (_, i) => i + 1),
);

assert.deepEqual(
  orderSelectedCategories(
    [2, 99, 1],
    [
      { id: 1, name: '黄茶' },
      { id: 2, name: '绿茶' },
    ],
  ),
  [
    { id: 2, name: '绿茶' },
    { id: 1, name: '黄茶' },
  ],
);

const sortCases = [
  ['default', {}],
  ['latest', { sortAsc: false, sortField: 'createTime' }],
  ['sales', { sortAsc: false, sortField: 'salesCount' }],
  ['priceAsc', { sortAsc: true, sortField: 'price' }],
  ['priceDesc', { sortAsc: false, sortField: 'price' }],
];
for (const [sortType, sorting] of sortCases) {
  assert.deepEqual(buildProductGroupQuery({ categoryIds: [2, 1], pageSize: 99, sortType }, 'all'), {
    categoryIds: '2,1',
    pageNo: 1,
    pageSize: 50,
    ...sorting,
  });
}
assert.equal(
  buildProductGroupQuery({ categoryIds: [2], pageSize: null, sortType: 'default' }, 2).pageSize,
  10,
);

let calls = 0;
const loader = createProductGroupLoader(async (query) => {
  calls += 1;
  return [{ id: query.categoryId }];
});
assert.equal(calls, 0, 'tabs should load lazily');
const query = buildProductGroupQuery({ categoryIds: [2], pageSize: 10, sortType: 'default' }, 2);
assert.deepEqual(await loader.load('2', query), { accepted: true, list: [{ id: 2 }] });
assert.deepEqual(await loader.load('2', query), { accepted: true, list: [{ id: 2 }] });
assert.equal(calls, 1, 'cached tabs should not make duplicate product requests');
loader.clear();
await loader.load('2', query);
assert.equal(calls, 2, 'clearing the component cache should reload the tab');

let resolveStaleRequest;
const staleLoader = createProductGroupLoader(
  () =>
    new Promise((resolve) => {
      resolveStaleRequest = resolve;
    }),
);
const staleRequest = staleLoader.load('2', query);
await Promise.resolve();
staleLoader.clear();
resolveStaleRequest([{ id: 2 }]);
assert.deepEqual(
  await staleRequest,
  { accepted: false, list: [] },
  'clearing the cache should invalidate in-flight product requests',
);

const failedLoader = createProductGroupLoader(async () => {
  throw new Error('network error');
});
assert.deepEqual(
  await failedLoader.load('2', query),
  { accepted: true, list: [] },
  'failed product requests should render an empty group',
);

console.log('product group query checks passed');
