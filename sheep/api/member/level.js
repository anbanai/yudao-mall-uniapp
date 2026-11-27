import request from '@/sheep/request';

export default {
  getLevelList: () =>
    request({
      url: '/member/level/list',
      method: 'GET',
      custom: { showLoading: false },
    }),
};
