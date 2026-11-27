export function getBannerLayout({ aspectRatio, height, heightMode }) {
  const configuredHeight = Number(height);
  const fallbackHeight = configuredHeight > 0 ? configuredHeight : 174;

  if (heightMode !== 'adaptive') {
    return { height: configuredHeight, aspectRatio: undefined, imageMode: 'scaleToFill' };
  }

  const ratio =
    Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 375 / fallbackHeight;
  return { height: fallbackHeight, aspectRatio: ratio, imageMode: 'aspectFill' };
}
