import assert from 'node:assert/strict';

import * as productGroup from '../sheep/components/s-goods-group/product-group.mjs';
import * as productCategory from '../sheep/components/s-goods-category/product-category.mjs';
import { resolveDiyProductComponentType } from '../sheep/components/s-block-item/block-item.mjs';
import { getBlockOverflow } from '../sheep/components/s-block/block.mjs';

const {
  buildProductGroupQuery,
  buildProductGroupRouteQuery,
  createProductGroupLoader,
  getProductGroupResponseData,
  normalizeGroupIds,
  orderSelectedGroups,
} = productGroup;

const {
  createProductCategoryLoader,
  getProductCategoryResponseData,
} = productCategory;

assert.equal(getBlockOverflow(true), 'visible');
assert.equal(getBlockOverflow(false), 'hidden');

assert.equal(resolveDiyProductComponentType('ProductCategory', {}), 'ProductCategory');
assert.equal(
  resolveDiyProductComponentType('ProductGroup', { categoryIds: [1] }),
  'ProductCategory',
  'legacy category-backed ProductGroup data should still render as a category component',
);
assert.equal(
  resolveDiyProductComponentType('ProductGroup', { categoryIds: [1], groupIds: [] }),
  'ProductCategory',
  'legacy category data normalized by an intermediate release should remain a category component',
);
assert.equal(resolveDiyProductComponentType('ProductGroup', { groupIds: [1] }), 'ProductGroup');

assert.deepEqual(productCategory.normalizeCategoryIds?.([2, 1, 2, 0]), [2, 1]);
assert.deepEqual(
  productCategory.buildProductCategoryQuery?.(
    { categoryIds: [2, 1, 2], pageSize: 99, sortType: 'latest' },
    'all',
  ),
  {
    categoryIds: '2,1',
    pageNo: 1,
    pageSize: 50,
    sortAsc: false,
    sortField: 'createTime',
  },
);
assert.deepEqual(
  productCategory.buildProductCategoryQuery?.(
    { categoryIds: [2, 1], pageSize: 10, sortType: 'default' },
    2,
  ),
  { categoryId: 2, pageNo: 1, pageSize: 10 },
);

assert.deepEqual(productGroup.resolveProductGroupMenu?.({}), {
  activeBackgroundColor: '#e6f4ff',
  activeColor: '#0958d9',
  backgroundColor: '#ffffff',
  color: '#595959',
  layout: 'horizontal',
});

assert.deepEqual(
  productGroup.getProductGroupMenuItemStyle?.(
    {
      activeBackgroundColor: '#fff1f0',
      activeColor: '#a8071a',
      backgroundColor: '#f5f5f5',
      color: '#434343',
      layout: 'vertical',
    },
    true,
  ),
  {
    backgroundColor: '#fff1f0',
    color: '#a8071a',
    fontWeight: '600',
  },
);

assert.equal(productGroup.getProductGroupMenuHeight?.(2), 'auto');
assert.equal(
  productGroup.getProductGroupMenuHeight?.(12),
  'calc(100vh - env(safe-area-inset-top))',
);

assert.deepEqual(
  normalizeGroupIds([1, 2, 1, ...Array.from({ length: 20 }, (_, i) => i + 3)]),
  Array.from({ length: 15 }, (_, i) => i + 1),
);

assert.deepEqual(
  orderSelectedGroups(
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
  assert.deepEqual(buildProductGroupQuery({ groupIds: [2, 1], pageSize: 99, sortType }, 'all'), {
    groupIds: '2,1',
    pageNo: 1,
    pageSize: 50,
    ...sorting,
  });
}
assert.equal(
  buildProductGroupQuery({ groupIds: [2], pageSize: null, sortType: 'default' }, 2).pageSize,
  10,
);

let calls = 0;
const loader = createProductGroupLoader(async (query) => {
  calls += 1;
  return [{ id: Number(query.groupIds) }];
});
assert.equal(calls, 0, 'tabs should load lazily');
const query = buildProductGroupQuery({ groupIds: [2], pageSize: 10, sortType: 'default' }, 2);
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

assert.deepEqual(
  buildProductGroupRouteQuery({ groupIds: [2, 1, 2], sortType: 'sales' }, 'all', '全部'),
  { groupIds: '2,1', groupName: '%E5%85%A8%E9%83%A8', sortType: 'sales' },
);
assert.deepEqual(
  buildProductGroupRouteQuery({ groupIds: [2, 1], sortType: 'default' }, 1, '绿茶&红茶=特选'),
  {
    groupIds: '1',
    groupName: '%E7%BB%BF%E8%8C%B6%26%E7%BA%A2%E8%8C%B6%3D%E7%89%B9%E9%80%89',
    sortType: 'default',
  },
);

assert.deepEqual(getProductGroupResponseData({ code: 0, data: { list: [{ id: 2 }] } }), {
  list: [{ id: 2 }],
});
assert.throws(
  () => getProductGroupResponseData({ code: 500, msg: 'group request failed' }),
  /group request failed/,
);
assert.deepEqual(getProductCategoryResponseData({ code: 0, data: [{ id: 3 }] }), [{ id: 3 }]);
assert.throws(
  () => getProductCategoryResponseData({ code: 500, msg: 'category request failed' }),
  /category request failed/,
);

let failedGroupCalls = 0;
const failedGroupLoader = createProductGroupLoader(async () => {
  failedGroupCalls += 1;
  if (failedGroupCalls === 1) throw new Error('network error');
  return [{ id: 2 }];
});
await assert.rejects(failedGroupLoader.load('2', query), /network error/);
assert.deepEqual(
  await failedGroupLoader.load('2', query),
  { accepted: true, list: [{ id: 2 }] },
  'failed group product requests should be evicted so retry can succeed',
);

let failedCategoryCalls = 0;
const failedCategoryLoader = createProductCategoryLoader(async () => {
  failedCategoryCalls += 1;
  if (failedCategoryCalls === 1) throw new Error('network error');
  return [{ id: 3 }];
});
await assert.rejects(failedCategoryLoader.load('3', { categoryId: 3 }), /network error/);
assert.deepEqual(
  await failedCategoryLoader.load('3', { categoryId: 3 }),
  { accepted: true, list: [{ id: 3 }] },
  'failed category product requests should be evicted so retry can succeed',
);

console.log('product group query checks passed');
