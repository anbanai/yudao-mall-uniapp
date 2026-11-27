export function getSwiperRatioPadding(aspectRatio, mode) {
  if (!aspectRatio) return undefined;
  if (mode === 'card') {
    // 卡片宽度为轮播宽度的 610/750，另留出上下间距。
    return `calc(${((610 / 750) * 100) / aspectRatio}% + 80rpx)`;
  }
  return `${100 / aspectRatio}%`;
}
