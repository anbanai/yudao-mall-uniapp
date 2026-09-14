export function createOrderLogisticsOpener({
  getPlatformName,
  ensureWechatWaybillToken,
  requireLogisticsPlugin,
  openFallback,
}) {
  return async function openOrderLogistics(orderId) {
    const fallback = (reason) => {
      openFallback(orderId, reason);
      return false;
    };

    if (getPlatformName() !== 'WechatMiniProgram') {
      return fallback();
    }

    let response;
    try {
      response = await ensureWechatWaybillToken(orderId);
    } catch (_error) {
      return fallback('token-request-failed');
    }
    const waybillToken = response?.code === 0 ? response.data : '';
    if (typeof waybillToken !== 'string' || !waybillToken.trim()) {
      return fallback('token-unavailable');
    }

    let plugin;
    try {
      plugin = requireLogisticsPlugin('logisticsPlugin');
    } catch (_error) {
      return fallback('plugin-unavailable');
    }
    if (typeof plugin?.openWaybillTracking !== 'function') {
      return fallback('plugin-unavailable');
    }

    try {
      await plugin.openWaybillTracking({ waybillToken });
      return true;
    } catch (_error) {
      return fallback('plugin-open-failed');
    }
  };
}

export function createExpressTrackLoader({ getOrderExpressTrackList, onStateChange }) {
  const publish = (state) => {
    onStateChange(state);
    return state;
  };

  return async function loadExpressTracks(orderId) {
    publish({ status: 'loading', tracks: [], message: '' });

    let response;
    try {
      response = await getOrderExpressTrackList(orderId);
    } catch (_error) {
      return publish({
        status: 'error',
        tracks: [],
        message: '物流信息加载失败，请稍后重试',
      });
    }

    if (response?.code !== 0 || !Array.isArray(response.data)) {
      return publish({
        status: 'error',
        tracks: [],
        message: '物流信息加载失败，请稍后重试',
      });
    }
    if (response.data.length === 0) {
      return publish({ status: 'empty', tracks: [], message: '' });
    }
    return publish({ status: 'success', tracks: response.data, message: '' });
  };
}

export async function loadOrderInfo(getOrderDetail, orderId) {
  try {
    const response = await getOrderDetail(orderId);
    if (response?.code === 0 && response.data && typeof response.data === 'object') {
      return response.data;
    }
  } catch (_error) {
    // The tracking state remains independently usable when order details fail.
  }
  return {};
}

export function getLogisticsFallbackParams(orderId, reason) {
  return reason ? { id: orderId, fallback: '1' } : { id: orderId };
}
