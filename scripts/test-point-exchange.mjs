import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const helperPath = new URL('../sheep/helper/pointExchange.mjs', import.meta.url);
assert.equal(
  existsSync(fileURLToPath(helperPath)),
  true,
  'point exchange eligibility should be calculated by a reusable helper',
);

const { getPointExchangeStatus, getRedeemedCount } = await import(helperPath);
assert.equal(getRedeemedCount(100, 45), 55);
assert.equal(
  getRedeemedCount(4, 8),
  0,
  'inconsistent inventory must not show negative redemptions',
);
assert.equal(getRedeemedCount('invalid', 2), 0, 'invalid inventory values must normalize to zero');
assert.deepEqual(getPointExchangeStatus(300, 200), {
  requiredPoint: 300,
  availablePoint: 200,
  shortfall: 100,
  canExchange: false,
});
assert.deepEqual(getPointExchangeStatus(300, 300), {
  requiredPoint: 300,
  availablePoint: 300,
  shortfall: 0,
  canExchange: true,
});
assert.deepEqual(
  getPointExchangeStatus(100, 150, 2),
  {
    requiredPoint: 200,
    availablePoint: 150,
    shortfall: 50,
    canExchange: false,
  },
  'eligibility must include the selected quantity',
);

const { getPointExchangeStatus: getDetailStatus } = await import('../sheep/helper/productDetail.mjs');
assert.deepEqual(getDetailStatus(150, 100, 2), {
  available: 150,
  required: 200,
  shortfall: 50,
  canExchange: false,
});
assert.equal(getDetailStatus(200, 100, 2).canExchange, true);

const skuSelectorSource = readFileSync(
  new URL('../pages/goods/components/s-select-seckill-sku.vue', import.meta.url),
  'utf8',
);
const pointDetailSource = readFileSync(
  new URL('../pages/goods/point.vue', import.meta.url),
  'utf8',
);
assert.match(
  skuSelectorSource,
  /:disabled="isBuyDisabled"[\s\S]*?const isBuyDisabled = computed\([\s\S]*?pointShortfall\.value > 0/,
  'the point exchange confirmation button must be disabled before checkout when points are short',
);
assert.match(
  skuSelectorSource,
  /if \(state\.goodsInfo\.activity_type !== PromotionActivityTypeEnum\.POINT\.type \|\| !state\.selectedSku\.id\) \{\s*return 0;/,
  'the point balance check must not affect non-point promotions',
);
assert.match(
  skuSelectorSource,
  /还差\s*\{\{\s*pointShortfall\s*\}\}\s*积分/,
  'the disabled point exchange button must show the point shortfall',
);
assert.match(
  skuSelectorSource,
  /else if \(pointShortfall\.value > 0\) \{\s*sheep\.\$helper\.toast\('积分不足'\);\s*\} else \{\s*emits\('buy'/,
  'the buy handler must guard against bypassing the disabled state',
);
assert.match(
  pointDetailSource,
  /getPointExchangeStatus\(pointBalance\.value, state\.selectedSku\.point, state\.selectedSku\.count \|\| 1\)/,
  'the detail CTA should calculate the shortfall for the selected SKU and quantity',
);
assert.match(
  pointDetailSource,
  /state\.selectedSku\.id\s*&&\s*!selectedPointStatus\.value\.canExchange/,
  'the detail CTA should stay enabled until a multi-spec SKU is selected',
);
assert.match(
  pointDetailSource,
  /:disabled="isExchangeDisabled"[\s\S]*?const isExchangeDisabled = computed\([\s\S]*?state\.goodsInfo\.stock === 0 \|\|/,
  'the detail CTA should disable for sold-out items or insufficient points',
);
assert.match(
  pointDetailSource,
  /还差 \{\{ selectedPointStatus\.shortfall \}\} 积分/,
  'the detail CTA should explain the point shortfall before opening the selector',
);

console.log('point exchange eligibility checks passed');
