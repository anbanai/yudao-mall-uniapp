const GROUP_LIMIT = 15;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 50;
const MENU_DEFAULTS = {
  activeBackgroundColor: '#e6f4ff',
  activeColor: '#0958d9',
  backgroundColor: '#ffffff',
  color: '#595959',
  layout: 'horizontal',
};
const MENU_MAX_VISIBLE_ITEMS = 8;

export function resolveProductGroupMenu(menu = {}) {
  return { ...MENU_DEFAULTS, ...(menu || {}) };
}

export function getProductGroupMenuItemStyle(menu, active) {
  return {
    backgroundColor: active ? menu.activeBackgroundColor : menu.backgroundColor,
    color: active ? menu.activeColor : menu.color,
    fontWeight: active ? '600' : '400',
  };
}

export function getProductGroupMenuHeight(itemCount) {
  return Number(itemCount) > MENU_MAX_VISIBLE_ITEMS
    ? 'calc(100vh - env(safe-area-inset-top))'
    : 'auto';
}

export function normalizeGroupIds(groupIds = []) {
  const ids = Array.isArray(groupIds) ? groupIds : String(groupIds || '').split(',');
  return [...new Set(ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))].slice(
    0,
    GROUP_LIMIT,
  );
}

// Old saved metadata has no visibility field; only explicit hidden/disabled values are rejected.
export function publicProductGroups(groups = []) {
  if (!Array.isArray(groups)) return [];
  const seen = new Set();
  return groups.filter((group) => {
    const id = Number(group?.id);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) return false;
    if (group.status != null && Number(group.status) !== 0) return false;
    if ([false, 0, 'false', '0'].includes(group.storefrontVisible)) return false;
    seen.add(id);
    return true;
  });
}

export function orderSelectedGroups(groupIds, groups = []) {
  const groupMap = new Map(publicProductGroups(groups).map((group) => [Number(group.id), group]));
  return normalizeGroupIds(groupIds)
    .map((id) => groupMap.get(id))
    .filter(Boolean);
}

export function normalizePageSize(pageSize) {
  if (pageSize == null || pageSize === '') return DEFAULT_PAGE_SIZE;
  const value = Number(pageSize);
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.trunc(value)));
}

export function getSortParams(sortType) {
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

export function normalizeGroupSort(sortType) {
  return ['default', 'latest', 'sales', 'priceAsc', 'priceDesc'].includes(sortType)
    ? sortType
    : 'default';
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

export function getProductGroupResponseData(response) {
  if (response?.code !== 0) {
    throw new Error(response?.msg || 'request failed');
  }
  return response.data;
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
          Promise.resolve().then(() => requestPage(query)),
        );
      }
      const request = cache.get(key);
      let list;
      try {
        list = await request;
      } catch (error) {
        if (cache.get(key) === request) cache.delete(key);
        if (requestGeneration !== generation) return { accepted: false, list: [] };
        throw error;
      }
      if (requestGeneration !== generation) {
        return { accepted: false, list: [] };
      }
      return { accepted: true, list: Array.isArray(list) ? list : [] };
    },
  };
}
