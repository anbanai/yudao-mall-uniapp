import request from '@/sheep/request';

const BenefitApi = {
  getOverview: () => request({
    url: '/member/benefits/overview',
    method: 'GET',
    custom: { auth: true, formalAuth: true },
  }),
  getLevels: () => request({
    url: '/member/benefits/levels',
    method: 'GET',
    custom: { auth: true, formalAuth: true },
  }),
};

export default BenefitApi;
