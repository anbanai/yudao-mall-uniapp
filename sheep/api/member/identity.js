import request from '@/sheep/request';
const custom = { auth: true, showLoading: false, showError: false, noRefresh: true };
export default {
  status: () => request({ url: '/member/identity/status', custom: { ...custom } }),
  setPhoneSharing: (enabled, consentRevision) => request({
    url: '/member/identity/phone-sharing', method: 'POST', data: { enabled, consentRevision }, custom: { ...custom },
  }),
};
