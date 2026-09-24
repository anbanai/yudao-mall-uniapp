// Handoff credentials live only in this coordinator's memory.
export function readIdentityHandoff(options) {
  const referrer = options?.referrerInfo;
  const value = referrer?.extraData?.identity_bridge;
  if (Number(options?.scene) !== 1037 || !/^wx[a-zA-Z0-9]{16}$/.test(referrer?.appId || '') ||
      value?.version !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(value.code || '') ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(value.request_id || '')) return null;
  return { handoffCode: value.code, requestId: value.request_id, sourceAppId: referrer.appId };
}

export function createIdentityCoordinator(deps) {
  let generation = 0, handoff = null, phase = 'idle', initialized, running;
  let completedGeneration = -1;
  const seen = new Set(); // Request IDs only, never credentials.
  const setPhase = (value) => { phase = value; deps.phase?.(value); };
  function capture(options) {
    const next = readIdentityHandoff(options);
    if (!next || seen.has(next.requestId)) return false;
    seen.add(next.requestId);
    handoff = next;
    generation++;
    setPhase('binding');
    deps.clearSession(); // Must happen synchronously, before app initialization.
    return true;
  }
  async function drain() {
    while (completedGeneration !== generation) {
      const current = generation;
      const incoming = handoff;
      if (phase === 'failed') return;
      try {
        if (!initialized) initialized = Promise.resolve().then(deps.initialize).catch((error) => {
          initialized = undefined;
          throw error;
        });
        await initialized;
        if (current !== generation) continue;
        const session = incoming ? await deps.exchange(incoming, () => current === generation) : await deps.silentLogin(() => current === generation);
        if (current !== generation) continue;
        // Runtime install is synchronous: token + OpenID must be installed atomically.
        if (session) await deps.install(session, () => current === generation);
        if (current !== generation) continue;
        handoff = null;
        completedGeneration = current;
        setPhase('ready');
      } catch (error) {
        if (current !== generation) continue;
        if (incoming) { setPhase('failed'); deps.failure?.(error); return; }
        completedGeneration = current;
        setPhase('ready'); // Anonymous catalog browsing remains available.
      }
    }
  }
  function run() {
    if (!running) running = drain().finally(() => { running = undefined; });
    return running;
  }
  return {
    capture, run,
    retry() { if (phase === 'failed' && handoff) setPhase('binding'); return run(); },
    browse() {
      handoff = null; generation++; deps.clearSession(); setPhase('binding'); return run();
    },
  };
}

// Preserve only public catalog destinations; credentials and private page IDs never enter URLs.
export function identityCatalogDestination(options) {
  const path = `/${String(options?.path || '').replace(/^\//, '')}`;
  // Keep this schema aligned with public page onLoad inputs, not arbitrary query keys.
  const allowed = {
    '/pages/index/index': [],
    '/pages/index/category': [],
    '/pages/index/search': [],
    '/pages/index/page': ['id'],
    '/pages/goods/list': ['categoryId', 'keyword'],
    '/pages/goods/index': ['id'],
    '/pages/goods/group-index': [],
    '/pages/goods/group-list': ['groupIds', 'keyword', 'sortType'],
    '/pages/goods/groupon': ['id'],
    '/pages/goods/seckill': ['id'],
    '/pages/goods/point': ['id'],
    '/pages/goods/comment/list': ['id'],
    '/pages/activity/index': ['activityId'],
    '/pages/activity/groupon/detail': ['id'],
    '/pages/activity/groupon/list': [],
    '/pages/activity/seckill/list': [],
    '/pages/activity/point/list': [],
  };
  if (!Object.prototype.hasOwnProperty.call(allowed, path)) return '/pages/index/index';
  const params = allowed[path].filter(key => typeof options?.query?.[key] === 'string')
    .map(key => `${key}=${encodeURIComponent(options.query[key])}`);
  return path + (params.length ? `?${params.join('&')}` : '');
}
