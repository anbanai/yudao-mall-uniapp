import request from '@/sheep/request';

const BenefitApi = {
  getOverview: () => request({
    url: '/member/benefits/overview',
    method: 'GET',
    custom: { auth: true, formalAuth: true },
  }),
  getLevels: (level) => request({
    url: `/member/benefits/levels?level=${encodeURIComponent(level)}`,
    method: 'GET',
    custom: { auth: true, formalAuth: true },
  }),
  getRecords: () => request({
    url: '/member/benefits/records',
    method: 'GET',
    custom: { auth: true, formalAuth: true },
  }),
  claim: (accountId, requestId) => request({
    url: `/member/benefits/${accountId}/claim?requestId=${encodeURIComponent(requestId)}`,
    method: 'POST',
    custom: { auth: true, formalAuth: true, showSuccess: true, successMsg: '领取成功' },
  }),
};

export default BenefitApi;
