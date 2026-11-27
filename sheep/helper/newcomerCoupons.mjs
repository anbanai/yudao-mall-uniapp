// Multiple coupon blocks can enter the homepage together. Share only the in-flight
// WeChat lookup, so returning after checkout always checks the order history again.
let visitorLookup;
function canShowVisitorEntry(api, getCode, epoch, refreshKey) {
  if (visitorLookup && visitorLookup.epoch === epoch && visitorLookup.refreshKey === refreshKey) return visitorLookup.promise;
  const lookup = { epoch, refreshKey };
  lookup.promise = getCode().then(async (code) => {
    if (!code) return false;
    const response = await api.getWeixinVisitorEntry(code);
    return response?.code === 0 && response.data === true;
  }).finally(() => {
    if (visitorLookup === lookup) visitorLookup = undefined;
  });
  visitorLookup = lookup;
  return lookup.promise;
}

export async function getVisibleNewcomerCoupons(ids, { api, hasToken, weixin, getCode, current, epoch, refreshKey }) {
  if (!ids.length || (!hasToken && !weixin)) return [];
  const query = (id, isToken) => api.getNewcomerCoupon(id, { isToken, noRefresh: true });
  const results = await Promise.all(ids.map(async (id) => {
    const response = await query(id, hasToken);
    if (response?.code === 401 && hasToken && weixin && current()) return query(id, false);
    return response;
  }));
  if (!current()) return [];
  const coupons = results.filter((result) => result?.code === 0 && result.data).map((result) => result.data);
  const needsIdentity = coupons.some((coupon) => coupon.reasonCode === 'LOGIN_REQUIRED');
  const visitorVisible = weixin && needsIdentity && await canShowVisitorEntry(api, getCode, epoch, refreshKey);
  if (!current()) return [];
  return coupons.filter((coupon) => coupon.reasonCode === 'LOGIN_REQUIRED' ? visitorVisible : coupon.showEntry === true);
}
