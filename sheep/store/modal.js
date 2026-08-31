import { defineStore } from 'pinia';

const modal = defineStore('modal', {
  state: () => ({
    auth: '', // 授权弹框 wechatLogin|accountLogin|smsLogin|resetPassword|changeMobile|changePassword
    authTransition: false, // H5 登录方式切换时的临时关闭状态
    authTransitionId: 0, // 用于取消过期的 H5 登录方式切换
    share: false, // 分享弹框
    menu: false, // 快捷菜单弹框
    advHistory: [], // 广告弹框记录
    lastTimer: {
      // 短信验证码计时器，为了防止刷新请求做了持久化
      smsLogin: 0,
      changeMobile: 0,
      resetPassword: 0,
      changePassword: 0,
    },
  }),
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'modal-store',
        paths: ['lastTimer', 'advHistory'],
      },
    ],
  },
});

export default modal;
