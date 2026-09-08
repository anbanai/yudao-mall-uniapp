import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const goodsSource = await readFile(new URL('../sheep/hooks/useGoods.js', import.meta.url), 'utf8');
const functionStart = goodsSource.indexOf('export function getDefaultSku');
assert.notEqual(functionStart, -1, 'the default SKU helper should exist');
const functionEnd = goodsSource.indexOf('\n}', functionStart) + 2;
const getDefaultSku = new Function(
  `${goodsSource
    .slice(functionStart, functionEnd)
    .replace('export function getDefaultSku', 'function getDefaultSku')}
return getDefaultSku;`,
)();

const singleSku = {
  id: 1001,
  stock: 3,
  properties: [],
};
assert.equal(getDefaultSku([singleSku]), singleSku);
assert.equal(
  getDefaultSku([{ id: 1000, stock: 0, properties: [] }, singleSku]),
  singleSku,
  'the default SKU should prefer an in-stock SKU',
);
assert.equal(getDefaultSku([]), undefined);
assert.equal(getDefaultSku(null), undefined);

console.log('single SKU selection checks passed');
