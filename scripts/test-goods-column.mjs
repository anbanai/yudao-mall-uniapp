import assert from 'node:assert/strict';

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

console.log('goods column display checks passed');
