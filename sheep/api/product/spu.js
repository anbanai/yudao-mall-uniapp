import request, { getTenantId } from '@/sheep/request';

function normalizeIds(ids) {
  return [
    ...new Set(
      String(ids || '')
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  ];
}

function logProductResponse(ids, response) {
  const requestedIds = normalizeIds(ids);
  const returnedIds = Array.isArray(response?.data)
    ? response.data.map((item) => Number(item?.id)).filter((id) => Number.isSafeInteger(id))
    : [];
  const missingIds = requestedIds.filter((id) => !returnedIds.includes(id));
  const details = {
    tenantId: getTenantId(),
    requestedIds,
    requestedCount: requestedIds.length,
    returnedCount: returnedIds.length,
    missingIds,
    code: response?.code,
    msg: response?.msg,
  };
  if (response?.code !== 0) {
    console.error('[商品] 商品接口失败', details);
  } else if (missingIds.length > 0) {
    console.warn('[商品] 商品接口成功但部分商品不可售或不存在', details);
  }
}

function ensureProductResponseOk(response) {
  if (response?.code !== 0) {
    const error = new Error(response?.msg || '商品详情加载失败');
    error.response = response;
    throw error;
  }
  return response;
}

const SpuApi = {
  // 获得商品 SPU 列表
  getSpuListByIds: async (ids) => {
    const response = await request({
      url: '/product/spu/list-by-ids',
      method: 'GET',
      params: { ids },
      custom: {
        showLoading: false,
        showError: true,
        noRefresh: true,
      },
    });
    logProductResponse(ids, response);
    return response;
  },
  // 获得商品结算信息
  getSettlementProduct: (spuIds) => {
    return request({
      url: '/trade/order/settlement-product',
      method: 'GET',
      params: { spuIds },
      custom: {
        showLoading: false,
        showError: false,
        noRefresh: true,
      },
    });
  },
  // 获得商品 SPU 分页
  getSpuPage: (params) => {
    return request({
      url: '/product/spu/page',
      method: 'GET',
      params,
      custom: {
        showLoading: false,
        showError: false,
      },
    });
  },
  // 查询商品
  getSpuDetail: async (id) => {
    const response = await request({
      url: '/product/spu/get-detail',
      method: 'GET',
      params: { id },
      custom: {
        showLoading: false,
        showError: true,
      },
    });
    return ensureProductResponseOk(response);
  },
};
export default SpuApi;
