import assert from 'node:assert/strict';
import {
  createAfterSaleSelectionState,
  setAfterSaleConfig,
  toggleAfterSaleWay,
  selectAfterSaleReason,
} from '../sheep/helper/afterSaleSelection.mjs';

const state = createAfterSaleSelectionState();

toggleAfterSaleWay(state, '10');
assert.equal(state.way, '10');

toggleAfterSaleWay(state, '10');
assert.equal(state.way, '');
assert.deepEqual(state.reasonList, []);

setAfterSaleConfig(state, {
  afterSaleRefundReasons: ['退款原因 A'],
  afterSaleReturnReasons: ['退货原因 B'],
});
toggleAfterSaleWay(state, '20');
assert.deepEqual(state.reasonList, ['退货原因 B']);

selectAfterSaleReason(state, '退货原因 B');
assert.equal(state.currentValue, '退货原因 B');

setAfterSaleConfig(state, {
  afterSaleRefundReasons: JSON.stringify(['退款原因 C']),
  afterSaleReturnReasons: [{ title: '退货原因 D' }],
});
toggleAfterSaleWay(state, '10');
assert.deepEqual(state.reasonList, ['退款原因 C']);
toggleAfterSaleWay(state, '20');
assert.deepEqual(state.reasonList, ['退货原因 D']);

console.log('aftersale selection tests passed');
