import assert from 'node:assert/strict';

import { getPointRecordDisplay } from '../sheep/helper/pointRecord.mjs';

assert.deepEqual(
  getPointRecordDisplay({ title: '订单积分奖励（待生效）', status: 1 }),
  { title: '订单积分奖励', statusText: '已生效', statusClass: 'effective' },
  'an effective record must not retain the pending label',
);
assert.deepEqual(getPointRecordDisplay({ title: '订单积分奖励（待生效）', status: 2 }), {
  title: '订单积分奖励',
  statusText: '待生效',
  statusClass: 'pending',
});
assert.deepEqual(getPointRecordDisplay({ title: '订单积分奖励（待生效）', status: 3 }), {
  title: '订单积分奖励',
  statusText: '已作废',
  statusClass: 'cancelled',
});
assert.deepEqual(
  getPointRecordDisplay({ title: '签到', status: null }),
  { title: '签到', statusText: '已生效', statusClass: 'effective' },
  'legacy records without a status must remain effective',
);
assert.deepEqual(
  getPointRecordDisplay({ title: '订单积分奖励', status: 99 }),
  { title: '订单积分奖励', statusText: '状态未知', statusClass: 'unknown' },
  'unknown statuses must not be presented as effective',
);

console.log('point record display checks passed');
