export const ORDER_COUNT_KEYS = [
  'allCount',
  'unpaidCount',
  'undeliveredCount',
  'deliveredCount',
  'uncommentedCount',
  'afterSaleCount',
];

export function createDefaultOrderCount() {
  return ORDER_COUNT_KEYS.reduce((count, key) => {
    count[key] = 0;
    return count;
  }, {});
}

export function normalizeOrderCount(data = {}) {
  return ORDER_COUNT_KEYS.reduce((count, key) => {
    const value = Number(data?.[key]);
    count[key] = Number.isFinite(value) && value >= 0 ? value : 0;
    return count;
  }, {});
}

export function createOrderCountRefresher({ fetchOrderCount, applyOrderCount }) {
  let latestRequest = 0;

  return async function refreshOrderCount() {
    const requestId = ++latestRequest;
    const response = await fetchOrderCount();
    if (requestId !== latestRequest) {
      return { stale: true };
    }
    if (response?.code !== 0) {
      return { ok: false };
    }
    applyOrderCount(normalizeOrderCount(response.data));
    return { ok: true };
  };
}
