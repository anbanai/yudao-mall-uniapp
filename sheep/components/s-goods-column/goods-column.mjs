function normalizeDisplayText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

export function getGoodsTitle(data = {}) {
  return normalizeDisplayText(data.title || data.name);
}

export function getGoodsSubtitle(data = {}) {
  return normalizeDisplayText(data.subtitle || data.introduction);
}

export function shouldShowGoodsSubtitle(data = {}) {
  const title = getGoodsTitle(data);
  const subtitle = getGoodsSubtitle(data);
  return Boolean(subtitle) && subtitle !== title;
}
