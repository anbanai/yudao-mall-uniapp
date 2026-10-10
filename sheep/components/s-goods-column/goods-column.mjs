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

export function getGoodsImageHeight(width, imageWh) {
  const numericWidth = Number(width);
  const sourceWidth = Number(imageWh?.w);
  const sourceHeight = Number(imageWh?.h);
  if (numericWidth > 0 && sourceWidth > 0 && sourceHeight > 0) {
    return numericWidth * (sourceHeight / sourceWidth);
  }
  return numericWidth;
}
