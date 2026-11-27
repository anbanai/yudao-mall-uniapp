export function createDeliveryAddressLoader({ getSession, fetchAddresses, applyAddress }) {
  let sessionKey;
  let sessionVersion = 0;
  let hasSelectedAddress = false;
  let loaded = false;
  let request;

  function syncSession() {
    const session = getSession();
    const nextKey = session.isLogin ? `member:${session.epoch ?? session.userId ?? 'unknown'}` : 'guest';
    if (nextKey !== sessionKey) {
      sessionKey = nextKey;
      sessionVersion += 1;
      hasSelectedAddress = false;
      loaded = false;
      applyAddress(null);
    }
    return { ...session, key: nextKey, version: sessionVersion };
  }

  async function load() {
    const session = syncSession();
    if (!session.isLogin || hasSelectedAddress || loaded) return;
    if (request?.key === session.key) return request.promise;

    let task;
    task = (async () => {
      try {
        const addresses = await fetchAddresses();
        const current = syncSession();
        if (current.version !== session.version || hasSelectedAddress) return;
        applyAddress(addresses.find((address) => address.defaultStatus) || addresses[0] || null);
      } catch {
        const current = syncSession();
        if (current.version !== session.version || hasSelectedAddress) return;
        applyAddress(null);
      } finally {
        if (request?.promise === task) {
          request = null;
          const current = syncSession();
          if (current.version === session.version) loaded = true;
        }
      }
    })();
    request = { key: session.key, promise: task };
    return task;
  }

  function select(address) {
    syncSession();
    if (!getSession().isLogin) return;
    hasSelectedAddress = true;
    loaded = true;
    applyAddress(address || null);
  }

  return { load, select };
}
