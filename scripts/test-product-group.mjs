import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodedQuery } from '@dcloudio/uni-shared';
import { buildProductGroupShare, decodeGroupShareKeyword } from '../pages/goods/group-share.mjs';
import {
  createGroupPager,
  createGroupPageState,
  createProductListSource,
  createProductListState,
} from '../sheep/components/s-goods-group/group-source.mjs';

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

const { createProductCategoryLoader, getProductCategoryResponseData } = productCategory;

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

const ok = (data) => ({ code: 0, data });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

assert.deepEqual(normalizeGroupIds(null), []);
assert.deepEqual(normalizeGroupIds('2,1,2,NaN,-1'), [2, 1]);
const metadata = [
  { id: 1, name: '公开', status: 0, storefrontVisible: true },
  { id: 2, name: '内部', status: 0, storefrontVisible: false },
  { id: 3, name: '停用', status: 1, storefrontVisible: true },
  { id: 4, name: '历史公开' },
  { id: 1, name: '重复' },
];
assert.deepEqual(
  productGroup.publicProductGroups(metadata).map((group) => group.id),
  [1, 4],
);
assert.deepEqual(
  orderSelectedGroups([2, 1, 3, 4, 99], metadata).map((group) => group.id),
  [1, 4],
);

// Cursor commit, retry and keyword/sort requests use only revalidated public IDs.
const pageState = createGroupPageState();
const pageRequests = [];
let failSecondPage = true;
const pager = createGroupPager(
  {
    getGroups: async () => ok(metadata),
    getPage: async (query) => {
      pageRequests.push(query);
      if (query.pageNo === 2 && failSecondPage) {
        failSecondPage = false;
        throw new Error('temporary failure');
      }
      return ok({ list: [{ id: query.pageNo }], total: 3 });
    },
  },
  pageState,
);
await pager.refresh({ groupIds: [2, 1, 3, 4, 99], keyword: '茶', sortType: 'priceAsc' });
assert.equal(pageRequests[0].groupIds, '1,4');
assert.equal(pageRequests[0].keyword, '茶');
assert.equal(pageRequests[0].sortField, 'price');
assert.equal(pageRequests[0].sortAsc, true);
assert.equal(pageState.pageNo, 1);
await pager.loadMore();
assert.equal(pageState.pageNo, 1, 'failure must not advance the successful cursor');
assert.equal(pageState.error, true);
await pager.retry();
assert.deepEqual(
  pageRequests.map((query) => query.pageNo),
  [1, 2, 2],
);
assert.deepEqual(
  pageState.list.map((item) => item.id),
  [1, 2],
);
await pager.loadMore();
await pager.loadMore();
assert.equal(pageRequests.length, 4, 'finished pages must not keep loading');
assert.equal(pageState.hasMore, false);

// Metadata failures retry validation, while invalid/hidden groups never query products.
let metadataCalls = 0;
let unavailableProductCalls = 0;
const unavailableState = createGroupPageState();
const unavailablePager = createGroupPager(
  {
    getGroups: async () => {
      metadataCalls += 1;
      if (metadataCalls === 1) return { code: 500 };
      return ok(metadata);
    },
    getPage: async () => {
      unavailableProductCalls += 1;
      return ok({ list: [], total: 0 });
    },
  },
  unavailableState,
);
await unavailablePager.refresh({ groupIds: [2, 3, 99] });
assert.equal(unavailableState.error, true);
await unavailablePager.retry();
assert.equal(metadataCalls, 2);
assert.equal(unavailableState.unavailable, true);
await unavailablePager.refresh({ groupIds: [] });
assert.equal(
  unavailableProductCalls,
  0,
  'an empty or unavailable selection must not query all products',
);
assert.equal(metadataCalls, 2);

// A refresh starts a new generation even while product/price requests remain in flight.
const oldPage = deferred();
const raceState = createGroupPageState();
const racePager = createGroupPager(
  {
    getGroups: async (ids) => ok([{ id: Number(ids), name: `分组${ids}` }]),
    getPage: async (query) =>
      query.groupIds === '1' ? oldPage.promise : ok({ list: [{ id: 20 }], total: 1 }),
  },
  raceState,
);
const oldRefresh = racePager.refresh({ groupIds: [1] });
await Promise.resolve();
await racePager.refresh({ groupIds: [4], keyword: '新搜索' });
oldPage.resolve(ok({ list: [{ id: 10 }], total: 1 }));
await oldRefresh;
assert.deepEqual(raceState.list, [{ id: 20 }]);
assert.deepEqual(
  raceState.groups.map((group) => group.id),
  [4],
);

const oldMetadata = deferred();
const metadataRaceState = createGroupPageState();
const metadataPageCalls = [];
const metadataRacePager = createGroupPager(
  {
    getGroups: (ids) => (ids === '1' ? oldMetadata.promise : Promise.resolve(ok([{ id: 4 }]))),
    getPage: async (query) => {
      metadataPageCalls.push(query);
      return ok({ list: [], total: 0 });
    },
  },
  metadataRaceState,
);
const oldValidation = metadataRacePager.refresh({ groupIds: [1] });
await metadataRacePager.refresh({ groupIds: [4] });
oldMetadata.reject(new Error('stale validation failure'));
await oldValidation;
assert.equal(metadataRaceState.error, false);
assert.deepEqual(
  metadataPageCalls.map((query) => query.groupIds),
  ['4'],
);

const pricing = deferred();
const priceState = createGroupPageState();
let decorateStarted = deferred();
const pricePager = createGroupPager(
  {
    getGroups: async () => ok([{ id: 1 }]),
    getPage: async () => ok({ list: [{ id: 10 }], total: 1 }),
    decorate: async () => {
      decorateStarted.resolve();
      return pricing.promise;
    },
  },
  priceState,
);
const priceRefresh = pricePager.refresh({ groupIds: [1] });
await decorateStarted.promise;
await pricePager.refresh({ groupIds: [] });
pricing.resolve([{ id: 99 }]);
await priceRefresh;
assert.deepEqual(
  priceState.list,
  [],
  'late settlement responses must not resurrect stale products',
);
assert.equal(priceState.unavailable, true);

// Duplicate reach-bottom events share the same pending page and results deduplicate products.
const nextPage = deferred();
const duplicateState = createGroupPageState();
let duplicateCalls = 0;
const duplicatePager = createGroupPager(
  {
    getGroups: async () => ok([{ id: 1 }]),
    getPage: async (query) => {
      duplicateCalls += 1;
      return query.pageNo === 1 ? ok({ list: [{ id: 1 }], total: 2 }) : nextPage.promise;
    },
  },
  duplicateState,
);
await duplicatePager.refresh({ groupIds: [1] });
const nextRequest = duplicatePager.loadMore();
await duplicatePager.loadMore();
assert.equal(duplicateCalls, 2);
nextPage.resolve(ok({ list: [{ id: 1 }, { id: 2 }], total: 2 }));
await nextRequest;
assert.deepEqual(
  duplicateState.list.map((item) => item.id),
  [1, 2],
);
duplicatePager.dispose();
await duplicatePager.refresh({ groupIds: [1] });
assert.equal(duplicateCalls, 2);

// ProductList switches data sources without leaking manual IDs into group requests.
const sourceState = createProductListState();
const sourceRequests = [];
const shelf = createProductListSource(
  {
    getGroups: async (ids) => {
      sourceRequests.push(['metadata', ids]);
      return ok(metadata);
    },
    getGroupPage: async (query) => {
      sourceRequests.push(['group', query]);
      return ok({ list: [{ id: 7 }, { id: 7 }, { id: 8 }], total: 2 });
    },
    getSpus: async (ids) => {
      sourceRequests.push(['manual', ids]);
      return ok([{ id: 8 }, { id: 7 }]);
    },
  },
  sourceState,
);
await shelf.load({ spuIds: [7, 8, 7, 99] });
assert.deepEqual(
  sourceState.list.map((item) => item.id),
  [7, 8],
);
assert.deepEqual(sourceRequests, [['manual', '7,8,99']]);
await shelf.load({
  sourceType: 'group',
  groupIds: [2, 4, 1, 99],
  spuIds: [500],
  pageSize: 100,
  sortType: 'latest',
});
assert.deepEqual(
  sourceState.list.map((item) => item.id),
  [7, 8],
);
assert.deepEqual(sourceRequests[2], [
  'group',
  {
    groupIds: '4,1',
    pageNo: 1,
    pageSize: 50,
    sortField: 'createTime',
    sortAsc: false,
  },
]);
assert.equal(sourceRequests.filter(([type]) => type === 'manual').length, 1);
await shelf.load({ sourceType: 'group', groupIds: [2, 3, 99], spuIds: [500] });
assert.equal(sourceState.unavailable, true);
assert.deepEqual(sourceState.list, []);
assert.equal(sourceRequests.filter(([type]) => type === 'group').length, 1);
await shelf.load({ sourceType: 'group', groupIds: [] });
assert.equal(sourceState.unavailable, true);
await shelf.load({ sourceType: 'manual', spuIds: [] });
assert.equal(sourceState.unavailable, false);
assert.deepEqual(sourceState.list, []);
assert.equal(sourceState.loaded, true, 'an empty manual product selection must finish loading');

// Retry revalidates visibility; stale source responses and post-unmount results are ignored.
let retrySourceCalls = 0;
const retrySourceState = createProductListState();
const retrySource = createProductListSource(
  {
    getGroups: async () => ok([{ id: 1 }]),
    getGroupPage: async () => {
      retrySourceCalls += 1;
      if (retrySourceCalls === 1) throw new Error('offline');
      return ok({ list: [{ id: 1 }] });
    },
  },
  retrySourceState,
);
await retrySource.load({ sourceType: 'group', groupIds: [1] });
assert.equal(retrySourceState.error, true);
await retrySource.load({ sourceType: 'group', groupIds: [1] });
assert.equal(retrySourceState.error, false);
assert.deepEqual(retrySourceState.list, [{ id: 1 }]);

const slowManual = deferred();
const sourceRaceState = createProductListState();
const sourceRace = createProductListSource(
  {
    getSpus: () => slowManual.promise,
    getGroups: async () => ok([{ id: 1 }]),
    getGroupPage: async () => ok({ list: [{ id: 2 }] }),
  },
  sourceRaceState,
);
const oldManual = sourceRace.load({ spuIds: [9] });
await sourceRace.load({ sourceType: 'group', groupIds: [1] });
slowManual.resolve(ok([{ id: 9 }]));
await oldManual;
assert.deepEqual(sourceRaceState.list, [{ id: 2 }]);
const unmountMetadata = deferred();
const unmountState = createProductListState();
let unmountProductCalls = 0;
const unmountSource = createProductListSource(
  {
    getGroups: () => unmountMetadata.promise,
    getGroupPage: async () => {
      unmountProductCalls += 1;
      return ok({ list: [{ id: 9 }] });
    },
  },
  unmountState,
);
const unmountedLoad = unmountSource.load({ sourceType: 'group', groupIds: [1] });
unmountSource.dispose();
unmountMetadata.resolve(ok([{ id: 1 }]));
await unmountedLoad;
assert.equal(unmountProductCalls, 0);
assert.deepEqual(unmountState.list, []);

// Wiring contracts keep primary category and existing list endpoints independent.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const block = read('../sheep/components/s-block-item/s-block-item.vue');
assert.match(block, /<s-product-list[\s\S]*?:refresh-key="refreshKey"/);
const wrapper = read('../sheep/components/s-product-list/s-product-list.vue');
assert.match(wrapper, /:goods-list="state.list"/);
assert.match(wrapper, /state\.loaded && !state\.list\.length/);
assert.match(wrapper, /暂无商品/);
assert.match(wrapper, /props\.refreshKey/);
assert.match(wrapper, /source\.dispose\(\)/);
const appStore = read('../sheep/store/app.js');
assert.match(appStore, /AppID 未绑定租户/);
assert.match(appStore, /tenantResult\?\.code !== 0/);
assert.match(appStore, /miniProgramFallbackTenantId = tenantId/);
assert.match(appStore, /避免沿用设备上残留的旧租户/);
assert.match(appStore, /确保异常回退也会生效/);
for (const component of ['s-goods-group', 's-goods-category']) {
  assert.match(
    read(`../sheep/components/${component}/${component}.vue`),
    /:goods-list="goodsList"/,
  );
}
const groupPage = read('../pages/goods/group-list.vue');
assert.doesNotMatch(groupPage, /options\.groupName|SpuApi|getSpuPage/);
assert.match(groupPage, /onPullDownRefresh\(refresh\)/);
assert.match(read('../pages/index/search.vue'), /\/pages\/goods\/group-index/);
assert.match(read('../pages/goods/index.vue'), /getGroupListBySpuId/);
assert.match(read('../sheep/api/product/group.js'), /\/product\/group\/list-by-spu-id/);

// Shares capture the current public selection without retaining names in cards.
const shareKeyword = '茶 & 蜜=100% / 特选? # + %26';
const groupShare = buildProductGroupShare({
  groups: metadata,
  keyword: shareKeyword,
  sortType: 'priceDesc',
  linkAddress: 'https://shop.example.com/store/',
  image: 'https://shop.example.com/logo.png',
  groupName: '伪造名称',
});
assert.equal(groupShare.title, '分组商品');
assert.equal(groupShare.path, 'pages/goods/group-list');
assert.equal(groupShare.image, 'https://shop.example.com/logo.png');
assert.equal(
  groupShare.poster,
  false,
  'long filters must not produce a truncated mini-program QR scene',
);
assert.equal(groupShare.forward.path, `${groupShare.path}?${groupShare.query}`);
assert.equal(
  groupShare.forward.query,
  groupShare.query,
  'timeline needs query parameters, not a page path',
);
const sharedUrl = new URL(groupShare.link);
assert.equal(sharedUrl.pathname, '/store/pages/goods/group-list');
assert.equal(sharedUrl.searchParams.get('groupIds'), '1,4');
assert.equal(
  decodedQuery(Object.fromEntries(sharedUrl.searchParams)).keyword,
  shareKeyword,
  'H5 must roundtrip through URL parsing and UniApp decodedQuery',
);
for (const keyword of ['%26', '茶&蜜=好', '100%', '+ / # ?']) {
  const url = new URL(
    buildProductGroupShare({
      groups: [{ id: 1 }],
      keyword,
      linkAddress: 'https://shop.example.com',
    }).link,
  );
  assert.equal(decodedQuery(Object.fromEntries(url.searchParams)).keyword, keyword);
}
assert.equal(sharedUrl.searchParams.get('sortType'), 'priceDesc');
const nativeKeyword = groupShare.query
  .split('&')
  .find((item) => item.startsWith('keyword='))
  .slice(8);
assert.equal(decodeGroupShareKeyword(nativeKeyword), shareKeyword);
assert.equal(decodeGroupShareKeyword('%broken'), '%broken');
for (const group of metadata) assert.ok(!JSON.stringify(groupShare).includes(group.name));
assert.ok(!JSON.stringify(groupShare).includes('伪造名称'));

const changedShare = buildProductGroupShare({
  groups: [{ id: 4, name: '新名称' }],
  keyword: '新搜索',
  sortType: 'sales',
});
assert.equal(new URLSearchParams(changedShare.query).get('groupIds'), '4');
assert.equal(new URLSearchParams(changedShare.query).get('keyword'), '新搜索');
assert.equal(new URLSearchParams(changedShare.query).get('sortType'), 'sales');
const internalShare = buildProductGroupShare({
  groups: [{ id: 4, name: '旧名称', storefrontVisible: false }],
  keyword: '旧搜索',
});
assert.equal(internalShare.path, 'pages/goods/group-index');
assert.equal(internalShare.forward.path, 'pages/goods/group-index');
assert.equal(internalShare.forward.query, '');
assert.ok(!JSON.stringify(internalShare).includes('旧名称'));
assert.ok(!JSON.stringify(internalShare).includes('旧搜索'));
assert.deepEqual(
  buildProductGroupShare({ groups: [] }),
  buildProductGroupShare(),
  'unvalidated/failed metadata shares discovery',
);
assert.match(groupPage, /:onShareAppMessage="shareInfo"/);
assert.match(groupPage, /groups: pagerState\.groups/);
assert.match(read('../pages/goods/group-index.vue'), /:onShareAppMessage="shareInfo"/);
for (const page of ['group-list', 'group-index']) {
  assert.match(
    read(`../pages/goods/${page}.vue`),
    /onShow\(\(\) => \{\s*sheep\.\$platform\.share\.updateShareInfo\(shareInfo\.value\)/,
  );
}
assert.match(
  read('../sheep/components/s-layout/s-layout.vue'),
  /forward\.query \?\? shareInfo\.value\.forward\.path/,
);

console.log(
  'product group query, visibility, pagination, race, retry, data source and share checks passed',
);
