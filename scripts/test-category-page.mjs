import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_DISPLAY_PRODUCT_COUNT,
  buildCategoryProductQuery,
  createScrollIntentTracker,
  findActiveCategoryIndex,
  findInitialCategoryIndex,
  getSecondLevelCategories,
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
  { id: 1, parentId: 0, name: '产品分类' },
  { id: 11, parentId: 1, name: '绿茶', displayProductCount: 8 },
  { id: 12, parentId: 1, name: '红茶' },
  { id: 111, parentId: 11, name: '龙井' },
  { id: 2, parentId: 0, name: '器具分类' },
  { id: 21, parentId: 2, name: '茶器' },
];
const secondLevelCategories = getSecondLevelCategories(categories);
assert.deepEqual(secondLevelCategories.map(({ id }) => id), [11, 12, 21]);
assert.equal(findInitialCategoryIndex(secondLevelCategories, 12), 1);
assert.equal(findInitialCategoryIndex(secondLevelCategories, 2), 2);
assert.equal(findInitialCategoryIndex(secondLevelCategories, undefined), 0);
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
assert.match(categoryPage, /getSecondLevelCategories\(response\.data\)/);
assert.match(categoryPage, /v-for="\(category, index\) in state\.categoryList"/);
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

console.log('category page checks passed');
