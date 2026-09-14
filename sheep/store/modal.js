import { defineStore } from 'pinia';

const modal = defineStore('modal', {
  state: () => ({
    auth: '', // 授权弹框 wechatLogin|accountLogin|smsLogin|resetPassword|changeMobile|changePassword
    authTransition: false, // H5 登录方式切换时的临时关闭状态
    authTransitionId: 0, // 用于取消过期的 H5 登录方式切换
    authTransitionCloseId: 0, // H5 登录方式切换时预期触发的一次性弹窗关闭事件
    share: false, // 分享弹框
    posterShareInfo: null, // 分包海报页使用的一次性分享信息（不持久化）
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
  actions: {
    setPosterShareInfo(shareInfo) {
      this.posterShareInfo = shareInfo;
    },
    consumePosterShareInfo() {
      const shareInfo = this.posterShareInfo;
      this.posterShareInfo = null;
      return shareInfo;
    },
  },
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
