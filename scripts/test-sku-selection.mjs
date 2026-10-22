import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const goodsSource = await readFile(new URL('../sheep/hooks/useGoods.js', import.meta.url), 'utf8');
const selectorSource = await readFile(
  new URL('../sheep/components/s-select-sku/s-select-sku.vue', import.meta.url),
  'utf8',
);
const grouponSelectorSource = await readFile(
  new URL('../sheep/components/s-select-groupon-sku/s-select-groupon-sku.vue', import.meta.url),
  'utf8',
);
const detailSkuSource = await readFile(
  new URL('../pages/goods/components/detail/detail-cell-sku.vue', import.meta.url),
  'utf8',
);
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

assert.doesNotMatch(
  selectorSource,
  /initDefaultSelect\s*\(/,
  'the detail SKU picker must wait for the user before selecting a property value',
);
assert.doesNotMatch(
  grouponSelectorSource,
  /initDefaultSelect\s*\(/,
  'the groupon detail SKU picker must wait for the user before selecting a property value',
);
assert.match(
  detailSkuSource,
  /<detail-cell label="规格" :value="value" \/>/,
  'the detail SKU row should display only the 规格 label before selection',
);
assert.match(
  detailSkuSource,
  /if \(!props\.sku\?\.id\) \{\s*return '';[\s\S]*?if \(!props\.sku\.properties\?\.length\) \{\s*return '';/,
  'unselected and single-SKU details should not expose 默认规格 as a selected value',
);

console.log('single SKU selection checks passed');
