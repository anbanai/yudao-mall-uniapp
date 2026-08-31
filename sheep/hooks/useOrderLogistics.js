import sheep from '@/sheep';
import OrderApi from '@/sheep/api/trade/order';
import { createOrderLogisticsOpener } from '@/sheep/helper/orderLogistics.mjs';

export const openOrderLogistics = createOrderLogisticsOpener({
  getPlatformName: () => sheep.$platform.name,
  ensureWechatWaybillToken: (orderId) => OrderApi.ensureWechatWaybillToken(orderId),
  requireLogisticsPlugin: () => {
    // #ifdef MP-WEIXIN
    return requirePlugin('logisticsPlugin');
    // #endif
    // #ifndef MP-WEIXIN
    return null;
    // #endif
  },
  openFallback: (orderId) => {
    sheep.$router.go('/pages/order/express/log', { id: orderId });
  },
});
