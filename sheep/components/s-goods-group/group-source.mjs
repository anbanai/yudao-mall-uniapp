import {
  buildProductGroupQuery,
  getProductGroupResponseData,
  normalizeGroupIds,
  orderSelectedGroups,
} from './product-group.mjs';

export function createGroupPageState() {
  return {
    groups: [],
    list: [],
    total: 0,
    pageNo: 0,
    loading: false,
    loaded: false,
    error: false,
    unavailable: false,
    hasMore: false,
  };
}

// The state may be a Vue reactive proxy. Requests never advance the cursor until committed.
export function createGroupPager({ getGroups, getPage, decorate }, state) {
  let generation = 0;
  let source = {};
  let metadataReady = false;
  let disposed = false;
  const current = (token) => !disposed && generation === token;

  async function fetchNext(token) {
    const pageNo = state.pageNo + 1;
    state.loading = true;
    state.error = false;
    try {
      const groupIds = state.groups.map((group) => Number(group.id));
      if (!groupIds.length) return;
      const data = getProductGroupResponseData(
        await getPage({
          ...buildProductGroupQuery({ ...source, groupIds }, 'all'),
          pageNo,
          keyword: source.keyword || '',
        }),
      );
      if (!current(token)) return;
      let list = Array.isArray(data?.list) ? data.list : [];
      if (decorate && list.length) list = await decorate(list);
      if (!current(token)) return;
      const seen = new Set(state.list.map((item) => Number(item.id)));
      const unique = list.filter((item) => {
        if (seen.has(Number(item.id))) return false;
        seen.add(Number(item.id));
        return true;
      });
      state.list = [...state.list, ...unique];
      state.total = Math.max(0, Number(data?.total) || 0);
      state.pageNo = pageNo;
      state.hasMore = list.length > 0 && state.list.length < state.total;
    } catch {
      if (current(token)) state.error = true;
    } finally {
      if (current(token)) {
        state.loading = false;
        state.loaded = true;
      }
    }
  }

  async function refresh(nextSource) {
    if (disposed) return;
    const token = ++generation;
    source = { ...nextSource, groupIds: normalizeGroupIds(nextSource?.groupIds) };
    metadataReady = false;
    Object.assign(state, createGroupPageState(), { loading: true });
    try {
      if (!source.groupIds.length) {
        state.unavailable = true;
        return;
      }
      const groups = getProductGroupResponseData(await getGroups(source.groupIds.join(',')));
      if (!current(token)) return;
      state.groups = orderSelectedGroups(source.groupIds, groups);
      metadataReady = true;
      if (!state.groups.length) {
        state.unavailable = true;
        return;
      }
      await fetchNext(token);
    } catch {
      if (current(token)) state.error = true;
    } finally {
      if (current(token)) {
        state.loading = false;
        state.loaded = true;
      }
    }
  }

  return {
    refresh,
    loadMore() {
      if (disposed || state.loading || !metadataReady || !state.hasMore || state.error) return;
      return fetchNext(generation);
    },
    retry() {
      if (disposed || state.loading) return;
      return metadataReady ? fetchNext(generation) : refresh(source);
    },
    dispose() {
      disposed = true;
      generation += 1;
    },
  };
}

export function createProductListState() {
  return { groups: [], list: [], loading: false, loaded: false, error: false, unavailable: false };
}

export function createProductListSource({ getGroups, getGroupPage, getSpus }, state) {
  let generation = 0;
  let disposed = false;
  return {
    async load(source = {}) {
      if (disposed) return;
      const token = ++generation;
      Object.assign(state, createProductListState(), { loading: true });
      try {
        if (source.sourceType === 'group') {
          const ids = normalizeGroupIds(source.groupIds);
          if (!ids.length) {
            state.unavailable = true;
            return;
          }
          const metadata = getProductGroupResponseData(await getGroups(ids.join(',')));
          if (disposed || token !== generation) return;
          state.groups = orderSelectedGroups(ids, metadata);
          if (!state.groups.length) {
            state.unavailable = true;
            return;
          }
          const page = getProductGroupResponseData(
            await getGroupPage(
              buildProductGroupQuery(
                {
                  ...source,
                  groupIds: state.groups.map((group) => Number(group.id)),
                },
                'all',
              ),
            ),
          );
          if (disposed || token !== generation) return;
          const seen = new Set();
          state.list = (Array.isArray(page?.list) ? page.list : []).filter((item) => {
            if (seen.has(Number(item.id))) return false;
            seen.add(Number(item.id));
            return true;
          });
        } else {
          // Preserve the existing manually curated order, including old configs without sourceType.
          const ids = [
            ...new Set(
              (Array.isArray(source.spuIds) ? source.spuIds : [])
                .map(Number)
                .filter((id) => Number.isSafeInteger(id) && id > 0),
            ),
          ];
          if (!ids.length) return;
          const list = getProductGroupResponseData(await getSpus(ids.join(',')));
          if (disposed || token !== generation) return;
          const byId = new Map(
            (Array.isArray(list) ? list : []).map((item) => [Number(item.id), item]),
          );
          state.list = ids.map((id) => byId.get(id)).filter(Boolean);
        }
      } catch {
        if (!disposed && token === generation) state.error = true;
      } finally {
        if (!disposed && token === generation) {
          state.loading = false;
          state.loaded = true;
        }
      }
    },
    dispose() {
      disposed = true;
      generation += 1;
    },
  };
}
