import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { nextTick, reactive, watchEffect } from 'vue';

import {
  DEFAULT_DISPLAY_PRODUCT_COUNT,
  buildCategoryProductQuery,
  createScrollIntentTracker,
  findActiveCategoryIndex,
  findInitialCategoryIndex,
  getTopLevelCategories,
  normalizeDisplayProductCount,
} from '../pages/index/category-page.mjs';

assert.equal(DEFAULT_DISPLAY_PRODUCT_COUNT, 6);
assert.equal(normalizeDisplayProductCount(), 6);
assert.equal(normalizeDisplayProductCount(0), 6);
assert.equal(normalizeDisplayProductCount(51), 6);
assert.equal(normalizeDisplayProductCount('12'), 12);

assert.deepEqual(buildCategoryProductQuery({ id: 23, displayProductCount: 12 }), {
  categoryId: 23,
  pageNo: 1,
  pageSize: 12,
});
assert.deepEqual(buildCategoryProductQuery({ id: 23 }), {
  categoryId: 23,
  pageNo: 1,
  pageSize: 6,
});

const categories = [
  { id: 1, parentId: 0, name: '产品分类', picUrl: '/images/tea.jpg' },
  { id: 11, parentId: 1, name: '绿茶', displayProductCount: 8 },
  { id: 12, parentId: 1, name: '红茶' },
  { id: 111, parentId: 11, name: '龙井' },
  { id: 2, parentId: 0, name: '器具分类', picUrl: '/images/wares.jpg' },
  { id: 21, parentId: 2, name: '茶器', picUrl: '/images/teaware.jpg' },
];
const topLevelCategories = getTopLevelCategories(categories);
assert.deepEqual(topLevelCategories.map(({ id }) => id), [1, 2]);
assert.deepEqual(topLevelCategories.map(({ picUrl }) => picUrl), [
  '/images/tea.jpg',
  '/images/wares.jpg',
]);
assert.deepEqual(getTopLevelCategories([categories[0], categories[4]]), topLevelCategories);
assert.deepEqual(getTopLevelCategories(null), []);
assert.equal(findInitialCategoryIndex(topLevelCategories, 2), 1);
assert.equal(findInitialCategoryIndex(topLevelCategories, 21, categories), 1);
assert.equal(findInitialCategoryIndex(topLevelCategories, undefined), 0);
assert.equal(
  findActiveCategoryIndex(
    [{ top: 100, bottom: 500 }, { top: 510, bottom: 900 }],
    { top: 100, bottom: 700 },
  ),
  0,
);
assert.equal(
  findActiveCategoryIndex(
    [{ top: -500, bottom: 620 }, { top: 650, bottom: 690 }],
    { top: 100, bottom: 700 },
  ),
  0,
);
assert.equal(
  findActiveCategoryIndex(
    [{ top: -500, bottom: 620 }, { top: 650, bottom: 690 }],
    { top: 100, bottom: 700 },
    200,
  ),
  1,
);

const scrollIntentTracker = createScrollIntentTracker();
const pendingScrollVersion = scrollIntentTracker.capture();
assert.equal(scrollIntentTracker.isCurrent(pendingScrollVersion), true);
scrollIntentTracker.invalidate();
assert.equal(scrollIntentTracker.isCurrent(pendingScrollVersion), false);

const categoryPage = readFileSync(
  fileURLToPath(new URL('../pages/index/category.vue', import.meta.url)),
  'utf8',
);
const categorySection = readFileSync(
  fileURLToPath(new URL('../pages/index/components/category-section.vue', import.meta.url)),
  'utf8',
);
assert.match(categoryPage, /requestToken/);
assert.match(categoryPage, /buildCategoryProductQuery/);
assert.match(categoryPage, /getTopLevelCategories\(categories\)/);
assert.match(
  categoryPage,
  /<view\s+v-for="category in state\.categoryList"\s+:id="`category-section-\$\{category\.id\}`"\s+:key="category\.id"\s+class="category-anchor"[^>]*>\s*<category-section/,
);
assert.match(categoryPage, /selectAll\('\.category-anchor'\)/);
assert.match(categoryPage, /<category-section\s+:category="category"/);
assert.match(categorySection, /<image :src="sheep\.\$url\.cdn\(category\.picUrl\)"/);
assert.match(categoryPage, /scroll-into-view="state\.scrollTarget"/);
assert.match(categoryPage, /@touchmove="onRightTouchMove"/);
assert.match(categoryPage, /scrollToCategory\(selectedIndex, true\)/);
const menuHandler = categoryPage.match(/function onMenu\(index\) \{([\s\S]*?)\n  \}/)?.[1] || '';
assert.match(menuHandler, /scrollToCategory\(index\);/);
assert.doesNotMatch(menuHandler, /scrollToCategory\(index,\s*true\)/);
const getListBody = categoryPage.match(/async function getList\(\) \{([\s\S]*?)\n  \}/)?.[1] || '';
assert.match(getListBody, /rightScrollTop\s*=\s*0/);
assert.match(getListBody, /scrollIntentTracker\.invalidate\(\)/);
assert.doesNotMatch(`${categoryPage}\n${categorySection}`, /商品总数|查看全部/);

const rightScrollSource = categoryPage.match(/function onRightScroll\(event\) \{[\s\S]*?\n  \}/)?.[0];
assert.ok(rightScrollSource);
const scrollTimers = new Map();
let timerId = 0;
let activeMenu = 0;
const scrollQuery = {
  in: () => scrollQuery,
  select: () => scrollQuery,
  selectAll: () => scrollQuery,
  boundingClientRect: () => scrollQuery,
  exec: (callback) =>
    callback([{ top: 100, bottom: 700 }, [{ top: -300, bottom: 120 }, { top: 120, bottom: 840 }]]),
};
const onRightScroll = new Function(
  'uni',
  'setTimeout',
  'clearTimeout',
  'findActiveCategoryIndex',
  'syncActiveMenu',
  'state',
  `const instance = {};
  const requestToken = 1;
  let rightScrollTop = 0;
  let scrollSyncTimer;
  ${rightScrollSource}
  return onRightScroll;`,
)(
  { createSelectorQuery: () => scrollQuery },
  (callback) => {
    scrollTimers.set(++timerId, callback);
    return timerId;
  },
  (id) => scrollTimers.delete(id),
  findActiveCategoryIndex,
  (index) => {
    activeMenu = index;
  },
  {
    get activeMenu() {
      return activeMenu;
    },
  },
);
onRightScroll({ detail: { scrollTop: 400 } });
const firstTimer = [...scrollTimers.keys()][0];
onRightScroll({ detail: { scrollTop: 420 } });
assert.deepEqual(
  [...scrollTimers.keys()],
  [firstTimer],
  'A new scroll event must not delay synchronization',
);
scrollTimers.get(firstTimer)();
assert.equal(activeMenu, 1);

// Observe the same loading state and product list that the page template reads.
const loadProductsSource = categoryPage.match(
  /async function loadCategoryProducts\(categories, token\) \{[\s\S]*?\n  \}/,
)?.[0];
assert.ok(loadProductsSource);
const state = reactive({ sections: {} });
let finishRequest;
const productResponse = new Promise((resolve) => {
  finishRequest = resolve;
});
const loadCategoryProducts = new Function(
  'state',
  'reactive',
  'SpuApi',
  'buildCategoryProductQuery',
  'requestToken',
  'pendingScrollIntent',
  'nextTick',
  'onRightScroll',
  `${loadProductsSource}\nreturn loadCategoryProducts;`,
)(
  state,
  reactive,
  { getSpuPage: () => productResponse },
  buildCategoryProductQuery,
  1,
  null,
  nextTick,
  () => {},
);
let visibleSection;
const stop = watchEffect(() => {
  const section = state.sections[23];
  visibleSection = section && { loading: section.loading, products: section.products };
});
const loadProducts = loadCategoryProducts([{ id: 23 }], 1);
await nextTick();
assert.deepEqual(visibleSection, { loading: true, products: [] });
const products = [{ id: 45, name: '盖碗' }];
finishRequest({ code: 0, data: { list: products } });
await loadProducts;
await nextTick();
assert.deepEqual(visibleSection, { loading: false, products });
stop();

console.log('category page checks passed');
