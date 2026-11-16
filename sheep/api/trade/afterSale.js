import request from '@/sheep/request';

const AfterSaleApi = {
  // 获得售后分页
  getAfterSalePage: (params) => {
    return request({
      url: `/trade/after-sale/page`,
      method: 'GET',
      params,
      custom: {
        showLoading: false,
      },
    });
  },
  // 创建售后
  createAfterSale: (data) => {
    return request({
      url: `/trade/after-sale/create`,
      method: 'POST',
      data,
    });
  },
  // 获得售后
  getAfterSale: (id) => {
    return request({
      url: `/trade/after-sale/get`,
      method: 'GET',
      params: {
        id,
      },
    });
  },
  // 取消售后
  cancelAfterSale: (id) => {
    return request({
      url: `/trade/after-sale/cancel`,
      method: 'DELETE',
      params: {
        id,
      },
    });
  },
  // 获得售后日志列表
  getAfterSaleLogList: (afterSaleId) => {
    return request({
      url: `/trade/after-sale-log/list`,
      method: 'GET',
      params: {
        afterSaleId,
      },
    });
  },
  // 退回货物
  deliveryAfterSale: (data) => {
    return request({
      url: `/trade/after-sale/delivery`,
      method: 'PUT',
      data,
    });
  },
  // 预览上门取件信息
  previewReturnShipment: (id, data = {}) => {
    return request({
      url: `/trade/after-sale/${id}/return-shipment/preview`,
      method: 'POST',
      data,
    });
  },
  // 创建上门取件单
  createReturnShipment: (id, data) => {
    return request({
      url: `/trade/after-sale/${id}/return-shipment/create`,
      method: 'POST',
      data,
    });
  },
  // 查询上门取件单
  getReturnShipment: (id) => {
    return request({
      url: `/trade/after-sale/${id}/return-shipment`,
      method: 'GET',
    });
  },
  // 取消上门取件单
  cancelReturnShipment: (id) => {
    return request({
      url: `/trade/after-sale/${id}/return-shipment/cancel`,
      method: 'POST',
    });
  },
  // 查询上门取件轨迹
  getReturnShipmentTraces: (id) => {
    return request({
      url: `/trade/after-sale/${id}/return-shipment/traces`,
      method: 'GET',
    });
  },
};

export default AfterSaleApi;
