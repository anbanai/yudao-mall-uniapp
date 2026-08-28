export const ORDER_PRICE_CHANGED_CODE = 1011000040;

const nonNegativeInteger = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
};

const fen2yuan = (value) => (nonNegativeInteger(value) / 100).toFixed(2);

export function getPointView(orderInfo = {}, selected = false) {
  const totalPoint = nonNegativeInteger(orderInfo.totalPoint);
  const usePoint = nonNegativeInteger(orderInfo.usePoint);
  const pointPrice = nonNegativeInteger(orderInfo.price?.pointPrice);
  const hasMaximum = orderInfo.maxUsePoint !== undefined && orderInfo.maxUsePoint !== null;
  const maxUsePoint = hasMaximum ? nonNegativeInteger(orderInfo.maxUsePoint) : totalPoint;
  const maxPointPrice = hasMaximum ? nonNegativeInteger(orderInfo.maxPointPrice) : 0;
  const disabled = hasMaximum ? maxUsePoint === 0 : totalPoint === 0;

  if (disabled) {
    return {
      disabled,
      summary: '当前订单暂无可抵扣积分',
      remainingText: '',
      maxUsePoint,
      maxPointPrice,
    };
  }
  if (selected) {
    return {
      disabled,
      summary: `已使用 ${usePoint} 积分，抵扣 -￥${fen2yuan(pointPrice)}`,
      remainingText: `剩余积分 ${Math.max(totalPoint - usePoint, 0)}`,
      maxUsePoint,
      maxPointPrice,
    };
  }
  return {
    disabled,
    summary: hasMaximum
      ? `本单最多可用 ${maxUsePoint} 积分，最高抵扣 ￥${fen2yuan(maxPointPrice)}`
      : `当前积分 ${totalPoint}`,
    remainingText: '',
    maxUsePoint,
    maxPointPrice,
  };
}

export function createRequestGate() {
  let sequence = 0;
  let active = 0;
  return {
    begin() {
      active = ++sequence;
      return active;
    },
    isLatest(request) {
      return request === sequence;
    },
    finish(request) {
      if (request === sequence) {
        active = 0;
      }
    },
    isBusy() {
      return active !== 0;
    },
  };
}

export function createOrderPointFlow({
  getSelected,
  setSelected,
  getSettlement,
  applySettlement,
  requestSettlement,
}) {
  const gate = createRequestGate();

  async function refresh(rollback) {
    const request = gate.begin();
    try {
      const response = await requestSettlement();
      if (!gate.isLatest(request)) {
        return { stale: true, response };
      }
      if (!response || response.code !== 0) {
        rollback?.();
        return { ok: false, response };
      }
      applySettlement(response.data);
      return { ok: true, response };
    } catch (error) {
      if (gate.isLatest(request)) {
        rollback?.();
      }
      return { ok: false, stale: !gate.isLatest(request), error };
    } finally {
      gate.finish(request);
    }
  }

  async function toggle(nextSelected) {
    if (gate.isBusy()) {
      return { blocked: true };
    }
    const previousSelected = getSelected();
    const previousSettlement = getSettlement();
    if (nextSelected && getPointView(previousSettlement, false).disabled) {
      return { blocked: true };
    }
    setSelected(nextSelected);
    return refresh(() => {
      setSelected(previousSelected);
      applySettlement(previousSettlement);
    });
  }

  return {
    refresh,
    toggle,
    isSettling: gate.isBusy,
  };
}

export function createExclusiveRunner(action) {
  let running = false;
  return {
    async run(...args) {
      if (running) {
        return { blocked: true };
      }
      running = true;
      try {
        return await action(...args);
      } finally {
        running = false;
      }
    },
    isRunning() {
      return running;
    },
  };
}

export function isOrderPriceChanged(code) {
  return Number(code) === ORDER_PRICE_CHANGED_CODE;
}
