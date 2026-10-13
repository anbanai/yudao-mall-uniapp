import request from '@/sheep/request';

const TradeConfigApi = {
  // 获得交易配置
  getTradeConfig: ({ showError = true } = {}) => {
    return request({
      url: `/trade/config/get`,
      method: 'GET',
      custom: {
        showLoading: false,
        showError,
      },
    });
  },
};

export default TradeConfigApi;
