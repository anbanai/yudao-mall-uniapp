import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { computed, reactive, watch } from 'vue';

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

const { getPointExchangeStatus: getDetailStatus, getPointSkuQuantityLimit } =
  await import('../sheep/helper/productDetail.mjs');
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
const selectorSetup = skuSelectorSource.split('<script setup>')[1].split('</script>')[0]
  .replace(/^  import .*?;$/gm, '');
const pointProperties = (id) => [{ propertyId: 1, valueId: id }];
const modelValue = {
  activity_type: 4,
  skus: [
    { id: 1, stock: 5, limitCount: 3, point: 100, properties: pointProperties(1) },
    { id: 2, stock: 1, limitCount: 2, point: 100, properties: pointProperties(2) },
  ],
};
const boughtSkus = [];
const messages = [];
const selector = runInNewContext(selectorSetup + '\n;({ state, onSelectSku, onBuyCountChange, onBuy, isBuyDisabled, maxBuyCount })', {
  computed, reactive, watch,
  defineEmits: () => (event, sku) => { if (event === 'buy') boughtSkus.push(sku.id); },
  defineProps: () => ({ modelValue, pointBalance: 200, singleLimitCount: 1 }),
  convertProductPropertyList: () => [{ id: 1, values: [{ id: 1 }, { id: 2 }] }],
  PromotionActivityTypeEnum: { POINT: { type: 4 } },
  getPointExchangeStatus: getDetailStatus,
  getPointSkuQuantityLimit,
  min: (values) => Math.min(...values),
  sheep: { $helper: { toast: (message) => messages.push(message) } },
});
selector.onSelectSku(1, 1);
assert.equal(selector.maxBuyCount.value, 3);
selector.onBuyCountChange(4);
assert.equal(selector.state.selectedSku.count, 3, 'point quantity is capped by the selected SKU redemption limit');
assert.equal(selector.isBuyDisabled.value, true, 'quantity changes must update the redemption gate');
selector.onBuy();
assert.deepEqual(boughtSkus, []);
assert.deepEqual(messages, ['积分不足']);
selector.onSelectSku(1, 2);
assert.equal(selector.state.selectedSku.count, 1, 'switching to a lower-stock SKU reduces the quantity');
assert.equal(selector.isBuyDisabled.value, false);
selector.onBuy();
assert.deepEqual(boughtSkus, [2]);

console.log('point exchange eligibility checks passed');
