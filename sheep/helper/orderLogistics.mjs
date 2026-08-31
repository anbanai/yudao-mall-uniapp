export function createOrderLogisticsOpener({
  getPlatformName,
  ensureWechatWaybillToken,
  requireLogisticsPlugin,
  openFallback,
}) {
  return async function openOrderLogistics(orderId) {
    const fallback = () => {
      openFallback(orderId);
      return false;
    };

    if (getPlatformName() !== 'WechatMiniProgram') {
      return fallback();
    }

    try {
      const response = await ensureWechatWaybillToken(orderId);
      const waybillToken = response?.code === 0 ? response.data : '';
      if (typeof waybillToken !== 'string' || !waybillToken.trim()) {
        return fallback();
      }

      const plugin = requireLogisticsPlugin('logisticsPlugin');
      if (typeof plugin?.openWaybillTracking !== 'function') {
        return fallback();
      }
      await plugin.openWaybillTracking({ waybillToken });
      return true;
    } catch (_error) {
      return fallback();
    }
  };
}
