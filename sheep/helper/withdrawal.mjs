const WITHDRAW_TYPE_LABELS = {
  1: '钱包余额',
  2: '银行卡转账',
  3: '微信收款码',
  4: '支付宝收款码',
  5: '微信零钱',
  6: '支付宝余额',
};

function formatFen(price) {
  return (Number(price || 0) / 100).toFixed(2);
}

export function yuanToFen(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const normalizedValue = String(value).trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(normalizedValue)) {
    return undefined;
  }
  const price = Number(normalizedValue);
  if (!Number.isFinite(price)) {
    return undefined;
  }
  return Math.round(price * 100);
}

export function getWithdrawalAmountError(value, options) {
  if (!options.rulesReady) {
    return 'rules-unavailable';
  }
  const price = yuanToFen(value);
  if (price === undefined || price <= 0) {
    return 'invalid';
  }
  if (price < options.minPrice) {
    return 'below-minimum';
  }
  if (price > options.availablePrice) {
    return 'above-available';
  }
  return '';
}

export function buildWithdrawalRules({
  availablePrice,
  minPrice,
  frozenDays,
  withdrawTypes,
  dailyLimit = '不限',
  withdrawTime = '全天均可申请',
  arrivalTime = '提交后预计 1-3 个工作日到账，节假日顺延',
}) {
  const methodNames = [...new Set(withdrawTypes || [])]
    .map((type) => WITHDRAW_TYPE_LABELS[type])
    .filter(Boolean);

  return [
    { label: '可提现额度', value: `当前可提现 ${formatFen(availablePrice)} 元` },
    { label: '单笔限额', value: `最低 ${formatFen(minPrice)} 元，最高不超过当前可提现金额` },
    { label: '每日提现次数', value: dailyLimit },
    { label: '提现时间', value: withdrawTime },
    { label: '到账时间', value: arrivalTime },
    { label: '冻结规则', value: `佣金冻结 ${Number(frozenDays || 0)} 天，到期后方可提现` },
    {
      label: '提现方式',
      value: methodNames.length ? methodNames.join('、') : '暂无可用提现方式',
    },
  ];
}
