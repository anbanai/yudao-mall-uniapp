import sheep from '@/sheep';

export function openOrderLogistics(orderId) {
  sheep.$router.go('/pages/order/express/log', { id: orderId });
}
