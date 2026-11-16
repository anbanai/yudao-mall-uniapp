function normalizeReasons(reasons) {
  if (typeof reasons === 'string') {
    try {
      reasons = JSON.parse(reasons);
    } catch {
      reasons = reasons ? [reasons] : [];
    }
  }
  if (!Array.isArray(reasons)) {
    return [];
  }
  return reasons
    .map((reason) => {
      if (typeof reason === 'string' || typeof reason === 'number') {
        return String(reason);
      }
      return reason?.title || reason?.name || reason?.value || '';
    })
    .filter(Boolean);
}

export function createAfterSaleSelectionState() {
  return {
    way: '',
    reasonList: [],
    currentValue: '',
    config: {},
  };
}

function refreshReasonList(state) {
  const reasons =
    state.way === '10'
      ? state.config.afterSaleRefundReasons
      : state.way === '20'
      ? state.config.afterSaleReturnReasons
      : [];
  state.reasonList = normalizeReasons(reasons);
}

export function setAfterSaleConfig(state, config) {
  state.config = config || {};
  refreshReasonList(state);
}

export function toggleAfterSaleWay(state, way) {
  state.way = state.way === way ? '' : way;
  state.currentValue = '';
  refreshReasonList(state);
}

export function selectAfterSaleReason(state, reason) {
  if (state.reasonList.includes(reason)) {
    state.currentValue = reason;
  }
}
