const LEGACY_PENDING_TITLE = '订单积分奖励（待生效）';
const ORDER_REWARD_TITLE = '订单积分奖励';

const statusDisplays = {
  1: { statusText: '已生效', statusClass: 'effective' },
  2: { statusText: '待生效', statusClass: 'pending' },
  3: { statusText: '已作废', statusClass: 'cancelled' },
};
const unknownStatusDisplay = { statusText: '状态未知', statusClass: 'unknown' };

export function getPointRecordDisplay(record) {
  const status =
    record?.status == null
      ? statusDisplays[1]
      : statusDisplays[record.status] || unknownStatusDisplay;
  return {
    title: record?.title === LEGACY_PENDING_TITLE ? ORDER_REWARD_TITLE : record?.title,
    ...status,
  };
}
