const CATEGORY_LIMIT = 15;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 50;

export function normalizeCategoryIds(categoryIds = []) {
  return [...new Set(categoryIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(
    0,
    CATEGORY_LIMIT,
  );
}

export function orderSelectedCategories(categoryIds, categories = []) {
  const categoryMap = new Map(
    categories
      .filter((category) => Number.isInteger(Number(category?.id)))
      .map((category) => [Number(category.id), category]),
  );
  return normalizeCategoryIds(categoryIds)
    .map((id) => categoryMap.get(id))
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

export function buildProductCategoryQuery(source, tab) {
  return {
    ...(tab === 'all'
      ? { categoryIds: normalizeCategoryIds(source.categoryIds).join(',') }
      : { categoryId: Number(tab) }),
    pageNo: 1,
    pageSize: normalizePageSize(source.pageSize),
    ...getSortParams(source.sortType),
  };
}

export function getProductCategoryResponseData(response) {
  if (response?.code !== 0) {
    throw new Error(response?.msg || 'request failed');
  }
  return response.data;
}

export function createProductCategoryLoader(requestPage) {
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
        cache.set(key, Promise.resolve().then(() => requestPage(query)));
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
