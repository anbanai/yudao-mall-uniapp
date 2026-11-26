import {
  normalizeGroupIds,
  normalizeGroupSort,
  enabledProductGroups,
} from '../../sheep/components/s-goods-group/product-group.mjs';

// The destination revalidates every ID before displaying names and products.
export function buildProductGroupShare({
  groups = [],
  browse = false,
  keyword = '',
  sortType,
  linkAddress = '',
  image = '',
} = {}) {
  const ids = normalizeGroupIds(enabledProductGroups(groups).map((group) => group.id));
  const showProducts = ids.length > 0 && !browse;
  const path = showProducts ? 'pages/goods/group-list' : 'pages/goods/group-index';
  let query = ids.length ? `groupIds=${ids.join(',')}` : '';
  let h5Query = query;
  if (showProducts) {
    const escapedKeyword = encodeURIComponent(String(keyword));
    const sort = normalizeGroupSort(sortType);
    // H5's Vue Router and UniApp's decodedQuery each decode the query once.
    h5Query += `&keyword=${encodeURIComponent(escapedKeyword)}&sortType=${sort}`;
    query += `&keyword=${escapedKeyword}&sortType=${sort}`;
  }
  const pageUrl = `${path}${query ? '?' + query : ''}`;
  return {
    title: showProducts ? '分组商品' : '商品分组',
    desc: '按主题发现好物',
    image,
    path,
    query,
    // H5 uses history routing; keep any configured deployment subdirectory.
    link: `${linkAddress.replace(/\/$/, '')}/${path}${h5Query ? `?${h5Query}` : ''}`,
    // The existing poster uses a 32-character mini-program scene; filters do not fit.
    poster: false,
    forward: { path: pageUrl, query },
  };
}

// Native routes retain escaped query values; H5's router decodes them.
export function decodeGroupShareKeyword(keyword) {
  try {
    return decodeURIComponent(String(keyword || ''));
  } catch {
    return String(keyword || '');
  }
}
