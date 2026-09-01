const GROUP_LIMIT = 15;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 50;

export function normalizeGroupIds(groupIds = []) {
  return [...new Set(groupIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(
    0,
    GROUP_LIMIT,
  );
}

export function orderSelectedGroups(groupIds, groups = []) {
  const groupMap = new Map(
    groups
      .filter((group) => Number.isInteger(Number(group?.id)))
      .map((group) => [Number(group.id), group]),
  );
  return normalizeGroupIds(groupIds)
    .map((id) => groupMap.get(id))
    .filter(Boolean);
}

function normalizePageSize(pageSize) {
  if (pageSize == null || pageSize === '') return DEFAULT_PAGE_SIZE;
  const value = Number(pageSize);
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.trunc(value)));
}

function getSortParams(sortType) {
  switch (sortType) {
    case 'latest':
      return { sortField: 'createTime', sortAsc: false };
    case 'sales':
      return { sortField: 'salesCount', sortAsc: false };
    case 'priceAsc':
      return { sortField: 'price', sortAsc: true };
    case 'priceDesc':
      return { sortField: 'price', sortAsc: false };
    default:
      return {};
  }
}

export function buildProductGroupQuery(source, tab) {
  return {
    ...(tab === 'all'
      ? { groupIds: normalizeGroupIds(source.groupIds).join(',') }
      : { groupIds: String(Number(tab)) }),
    pageNo: 1,
    pageSize: normalizePageSize(source.pageSize),
    ...getSortParams(source.sortType),
  };
}

export function buildProductGroupRouteQuery(source, tab, groupName) {
  return {
    groupIds: tab === 'all' ? normalizeGroupIds(source.groupIds).join(',') : String(Number(tab)),
    groupName: encodeURIComponent(groupName || ''),
    sortType: source.sortType || 'default',
  };
}

export function createProductGroupLoader(requestPage) {
  const cache = new Map();
  let generation = 0;
  return {
    clear() {
      generation += 1;
      cache.clear();
    },
    async load(key, query) {
      const requestGeneration = generation;
      if (!cache.has(key)) {
        cache.set(
          key,
          Promise.resolve()
            .then(() => requestPage(query))
            .then((list) => (Array.isArray(list) ? list : []))
            .catch(() => []),
        );
      }
      const list = await cache.get(key);
      if (requestGeneration !== generation) {
        return { accepted: false, list: [] };
      }
      return { accepted: true, list };
    },
  };
}
