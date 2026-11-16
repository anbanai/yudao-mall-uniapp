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
const seckillSelectorSource = await readFile(
  new URL('../sheep/components/s-select-seckill-sku/s-select-seckill-sku.vue', import.meta.url),
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
for (const [name, source] of [
  ['standard', selectorSource],
  ['groupon', grouponSelectorSource],
  ['seckill', seckillSelectorSource],
]) {
  assert.doesNotMatch(
    source,
    /currentPropertyArray\.splice\s*\(/,
    `${name} SKU picker must not call array methods on the property map`,
  );
  assert.match(
    source,
    /state\.currentPropertyArray\[propertyId\]\s*=\s*'';/,
    `${name} SKU picker should clear a deselected property in the property map`,
  );
}
assert.match(
  detailSkuSource,
  /<detail-cell :label="label" :value="value" \/>/,
  'the detail SKU row should use its configured 规格 label',
);
assert.match(
  detailSkuSource,
  /if \(!props\.sku\?\.id\) \{\s*return '选择';[\s\S]*?if \(!props\.sku\.properties\?\.length\) \{\s*return '选择';/,
  'unselected details should prompt the user to 选择 a specification',
);

console.log('single SKU selection checks passed');
