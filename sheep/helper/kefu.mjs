export function navigateToKefuChat(router, options = {}) {
  if (typeof router?.go === 'function') {
    router.go('/pages/chat/index', options);
    return true;
  }

  const query = Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  if (typeof uni === 'undefined' || typeof uni.navigateTo !== 'function') {
    return false;
  }

  uni.navigateTo({
    url: `/pages/chat/index${query ? `?${query}` : ''}`,
  });
  return true;
}
