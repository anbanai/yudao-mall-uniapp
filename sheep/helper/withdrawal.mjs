const WITHDRAW_TYPE_LABELS = {
  1: '钱包余额',
  2: '银行卡转账',
  3: '微信收款码',
  4: '支付宝收款码',
  5: '微信零钱',
  6: '支付宝余额',
};

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function formatFen(price) {
  if (!isNonNegativeNumber(price)) {
    return '--';
  }
  return (price / 100).toFixed(2);
}

export function isWithdrawalConfigValid(config) {
  return Boolean(
    config &&
      Array.isArray(config.brokerageWithdrawTypes) &&
      isNonNegativeNumber(config.brokerageWithdrawMinPrice) &&
      isNonNegativeNumber(config.brokerageFrozenDays),
  );
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
  if (options.minPrice > 0 && price < options.minPrice) {
    return 'below-minimum';
  }
  if (price > options.availablePrice) {
    return 'above-available';
  }
  return '';
}

export function getWithdrawalAmountHint(value, options) {
  if (!options.rulesReady) {
    return '';
  }
  const price = yuanToFen(value);
  if (price === undefined || price <= 0) {
    if (options.minPrice > 0) {
      return `最低提现金额为 ${formatFen(options.minPrice)} 元`;
    }
    return '';
  }
  if (options.minPrice > 0 && price < options.minPrice) {
    return `最低提现金额为 ${formatFen(options.minPrice)} 元`;
  }
  if (price > options.availablePrice) {
    return `最高可提现 ${formatFen(options.availablePrice)} 元`;
  }
  return '';
}

export function buildWithdrawalRules({ availablePrice, minPrice, frozenDays, withdrawTypes } = {}) {
  const methodNames = [...new Set(withdrawTypes ?? [])]
    .map((type) => WITHDRAW_TYPE_LABELS[type])
    .filter(Boolean);
  const methodText = Array.isArray(withdrawTypes)
    ? methodNames.length
      ? methodNames.join('、')
      : '暂无可用提现方式'
    : '提现方式加载中';
  const frozenRule = isNonNegativeNumber(frozenDays)
    ? `佣金冻结 ${frozenDays} 天，到期后方可提现`
    : '冻结天数加载中';

  const minPriceText = isNonNegativeNumber(minPrice)
    ? minPrice > 0
      ? `最低 ${formatFen(minPrice)} 元`
      : '无最低提现金额限制'
    : '最低限额加载中';
  const maxPriceText = isNonNegativeNumber(availablePrice)
    ? `最高可提现 ${formatFen(availablePrice)} 元`
    : '';
  const limitText = minPriceText + (maxPriceText ? `，${maxPriceText}` : '');

  return [
    { label: '可提现额度', value: `当前可提现 ${formatFen(availablePrice)} 元` },
    { label: '单笔限额', value: limitText },
    { label: '每日提现次数', value: '不限次数' },
    { label: '提现时间', value: '每日全天均可提交申请' },
    {
      label: '到账时间',
      value: '申请提交后需平台审核；审核通过后预计 1-3 个工作日到账，节假日顺延',
    },
    { label: '冻结规则', value: frozenRule },
    { label: '提现方式', value: methodText },
  ];
}
