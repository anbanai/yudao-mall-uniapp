export function getMemberProgress(user = {}, levels = []) {
  const sorted = [...levels].sort((left, right) => left.level - right.level);
  const current = user.level || null;
  const next = sorted.find((item) => !current || item.level > current.level);
  const experience = Math.max(0, Number(user.experience) || 0);
  return {
    levels: sorted, current, next, experience,
    remaining: next ? Math.max(0, next.experience - experience) : 0,
    isHighest: !!current && sorted.length > 0 && !next,
    discount: sorted.find((item) => item.level === current?.level)?.discountPercent ?? current?.discountPercent,
  };
}

export function discountText(percent) {
  if (percent == null) return '权益信息暂不可用';
  return percent < 100 ? `会员折扣 ${percent / 10} 折` : '暂无会员折扣';
}

export function getRecoveryMessage(result) {
  switch (result?.status) {
    case 'RESTORED': return `恢复成功，新增 ${result.addedPoint} 积分`;
    case 'ALREADY_RESTORED': return '旧资产已恢复，无需重复领取';
    case 'NOT_FOUND': return '暂未匹配到旧资产，请稍后重试或联系客服';
    default: return '恢复结果暂不可用，请稍后重试';
  }
}

export function createRecovery(state, { formal, login, epoch, submit, refresh }) {
  let lastCode;
  async function readAssets(owner) {
    try {
      await refresh();
      if (epoch() === owner) state.needsRefresh = false;
    } catch {
      if (epoch() === owner) state.needsRefresh = true;
    }
  }
  return {
    async recover(event) {
      if (state.busy || state.needsRefresh) return;
      if (!formal()) return login();
      const detail = event?.detail;
      if (detail?.errMsg !== 'getPhoneNumber:ok' || typeof detail.code !== 'string' || !detail.code.trim()) {
        state.message = '未授权手机号，尚未恢复旧资产';
        return;
      }
      if (detail.code === lastCode) return;
      lastCode = detail.code;
      const owner = epoch();
      state.busy = true;
      try {
        const result = await submit(detail.code);
        if (epoch() !== owner) return;
        if (!result || result.code !== 0) {
          state.message = result?.code === 403
            ? '恢复验证未通过，请用微信手机号重新登录后再授权。若仍失败，请联系客服。'
            : '恢复未确认，请重新授权重试';
          if (result?.code === 401) await refresh();
          return;
        }
        state.message = getRecoveryMessage(result.data);
        if (['RESTORED', 'ALREADY_RESTORED'].includes(result.data?.status)) await readAssets(owner);
      } catch {
        if (epoch() === owner) state.message = '暂时无法确认恢复结果，请重新授权重试';
      } finally {
        state.busy = false;
      }
    },
    async refreshOnly() {
      if (state.busy || !state.needsRefresh || !formal()) return;
      state.busy = true;
      try { await readAssets(epoch()); } finally { state.busy = false; }
    },
  };
}
