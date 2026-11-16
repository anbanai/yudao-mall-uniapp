import request from '@/sheep/request';

const CartApi = {
  addCart: (data) => {
    return request({
      url: '/trade/cart/add',
      method: 'POST',
      data: data,
      custom: {
        showSuccess: true,
        successMsg: '已添加到购物车~',
        formalAuth: true,
      },
    });
  },
  updateCartCount: (data) => {
    return request({
      url: '/trade/cart/update-count',
      method: 'PUT',
      data: data,
      custom: {
        formalAuth: true,
      },
    });
  },
  updateCartSelected: (data) => {
    return request({
      url: '/trade/cart/update-selected',
      method: 'PUT',
      data: data,
      custom: {
        formalAuth: true,
      },
    });
  },
  deleteCart: (ids) => {
    return request({
      url: '/trade/cart/delete',
      method: 'DELETE',
      params: {
        ids,
      },
      custom: {
        formalAuth: true,
      },
    });
  },
  getCartList: () => {
    return request({
      url: '/trade/cart/list',
      method: 'GET',
      custom: {
        showLoading: false,
        auth: true,
        formalAuth: true,
      },
    });
  },
};

export default CartApi;
