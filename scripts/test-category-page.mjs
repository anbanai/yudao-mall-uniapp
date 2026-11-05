import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_DISPLAY_PRODUCT_COUNT,
  buildCategoryProductQuery,
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
assert.doesNotMatch(`${categoryPage}\n${categorySection}`, /商品总数|查看全部/);

console.log('category page checks passed');
