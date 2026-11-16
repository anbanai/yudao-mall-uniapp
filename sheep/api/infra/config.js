import request from '@/sheep/request';

const ConfigApi = {
  getValueByKey: (key) => request({
    url: '/infra/config/get-value-by-key',
    method: 'GET',
    params: { key },
    custom: { showLoading: false, showError: false, auth: false, noRefresh: true },
  }),
};

export default ConfigApi;
