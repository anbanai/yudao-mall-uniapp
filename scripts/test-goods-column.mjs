import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  getGoodsSubtitle,
  getGoodsTitle,
  shouldShowGoodsSubtitle,
} from '../sheep/components/s-goods-column/goods-column.mjs';

assert.equal(getGoodsTitle({ name: 'Tea A' }), 'Tea A');
assert.equal(getGoodsSubtitle({ introduction: 'A fresh tea' }), 'A fresh tea');
assert.equal(shouldShowGoodsSubtitle({ name: 'Tea A', introduction: ' Tea A ' }), false);
assert.equal(shouldShowGoodsSubtitle({ name: 'Tea A', introduction: 'A fresh tea' }), true);
assert.equal(shouldShowGoodsSubtitle({ name: 'Tea A' }), false);

const goodsColumnSource = await readFile(
  new URL('../sheep/components/s-goods-column/s-goods-column.vue', import.meta.url),
  'utf8',
);
assert.match(
  goodsColumnSource,
  /\.price-unit\s*\{[\s\S]*?margin-right:\s*4rpx;/,
  'product card prices should leave visible space after the currency symbol',
);

console.log('goods column display checks passed');
