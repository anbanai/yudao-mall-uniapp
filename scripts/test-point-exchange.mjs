import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const helperPath = new URL('../sheep/helper/pointExchange.mjs', import.meta.url);
assert.equal(
  existsSync(fileURLToPath(helperPath)),
  true,
  'point exchange eligibility should be calculated by a reusable helper',
);

const { getPointExchangeStatus } = await import(helperPath);
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

const skuSelectorSource = readFileSync(
  new URL('../sheep/components/s-select-seckill-sku/s-select-seckill-sku.vue', import.meta.url),
  'utf8',
);
assert.match(
  skuSelectorSource,
  /:disabled="isPointExchangeDisabled"/,
  'the point exchange confirmation button must be disabled before checkout when points are short',
);
assert.match(
  skuSelectorSource,
  /state\.goodsInfo\.activity_type === PromotionActivityTypeEnum\.POINT\.type/,
  'the point balance check must not affect non-point promotions',
);
assert.match(
  skuSelectorSource,
  /还差\s*\{\{\s*pointExchangeStatus\.shortfall\s*\}\}\s*积分/,
  'the disabled point exchange button must show the point shortfall',
);
assert.match(
  skuSelectorSource,
  /if\s*\(isPointExchangeDisabled\.value\)\s*return/,
  'the buy handler must guard against bypassing the disabled state',
);

console.log('point exchange eligibility checks passed');
