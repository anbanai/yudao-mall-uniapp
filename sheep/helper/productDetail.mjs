const toCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
};

export function getRemainingStock(selectedSku, product) {
  return toCount(selectedSku?.id ? selectedSku.stock : product?.stock);
}

export function getPointSkuQuantityLimit(sku) {
  return Math.min(toCount(sku?.stock), toCount(sku?.limitCount ?? 1));
}

export function getRedeemedCount(activity) {
  return Math.max(toCount(activity?.totalStock) - toCount(activity?.stock), 0);
}

export function getPreSaleLabel(product) {
  if (product?.isPreSale !== true) return '';
  const deliveryDays = toCount(product.deliveryDays);
  return deliveryDays > 0 ? `预售 · 付款后${deliveryDays}天发货` : '预售商品';
}

export function getPointExchangeStatus(balance, pointPerUnit, quantity = 1) {
  const available = toCount(balance);
  const unitPoints = toCount(pointPerUnit);
  const count = Math.max(1, toCount(quantity));
  const required = unitPoints * count;
  return {
    available,
    required,
    shortfall: Math.max(required - available, 0),
    canExchange: available >= required,
  };
}
