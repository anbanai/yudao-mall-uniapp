import {
  normalizeGroupIds,
  normalizeGroupSort,
  publicProductGroups,
} from '../../sheep/components/s-goods-group/product-group.mjs';

// Generic copy cannot retain a group name after that group becomes internal.
// The destination revalidates every ID before displaying names and products.
export function buildProductGroupShare({
  groups = [],
  keyword = '',
  sortType,
  linkAddress = '',
  image = '',
} = {}) {
  const ids = normalizeGroupIds(publicProductGroups(groups).map((group) => group.id));
  const path = ids.length ? 'pages/goods/group-list' : 'pages/goods/group-index';
  const query = ids.length
    ? `groupIds=${ids.join(',')}&keyword=${encodeURIComponent(
        String(keyword),
      )}&sortType=${normalizeGroupSort(sortType)}`
    : '';
  const pageUrl = `${path}${query ? `?${query}` : ''}`;
  // H5's Vue Router decodes once, then UniApp's decodedQuery decodes again.
  // Keep literal percent escapes (e.g. a keyword containing "%26") intact.
  const h5Query = ids.length
    ? `groupIds=${ids.join(',')}&keyword=${encodeURIComponent(
        encodeURIComponent(String(keyword)),
      )}&sortType=${normalizeGroupSort(sortType)}`
    : '';
  return {
    title: ids.length ? '分组商品' : '商品分组',
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
