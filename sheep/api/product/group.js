import request from '@/sheep/request';

const GroupApi = {
  getGroupListByIds: (ids) =>
    request({
      url: '/product/group/list-by-ids',
      method: 'GET',
      params: { ids },
      custom: { showLoading: false, showError: false },
    }),
  getGroupSpuPage: (params) =>
    request({
      url: '/product/group/spu-page',
      method: 'GET',
      params,
      custom: { showLoading: false, showError: false },
    }),
};

export default GroupApi;
