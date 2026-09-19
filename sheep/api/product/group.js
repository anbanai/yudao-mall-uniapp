import request from '@/sheep/request';

const GroupApi = {
  getGroupList: () =>
    request({
      url: '/product/group/list',
      method: 'GET',
      custom: { showLoading: false, showError: false },
    }),
  getGroupListBySpuId: (spuId) =>
    request({
      url: '/product/group/list-by-spu-id',
      method: 'GET',
      params: { spuId },
      custom: { showLoading: false, showError: false },
    }),
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
