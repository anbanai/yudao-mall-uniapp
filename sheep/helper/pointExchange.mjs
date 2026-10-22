function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(Math.trunc(number), 0) : 0;
}

export function getPointExchangeStatus(pointPerItem, availablePoint, count = 1) {
  const requiredPoint = nonNegativeInteger(pointPerItem) * Math.max(nonNegativeInteger(count), 1);
  const normalizedAvailablePoint = nonNegativeInteger(availablePoint);
  const shortfall = Math.max(requiredPoint - normalizedAvailablePoint, 0);

  return {
    requiredPoint,
    availablePoint: normalizedAvailablePoint,
    shortfall,
    canExchange: shortfall === 0,
  };
}
