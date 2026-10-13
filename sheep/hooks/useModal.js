import $store from '@/sheep/store';
import $helper from '@/sheep/helper';
import dayjs from 'dayjs';
import { ref } from 'vue';
import test from '@/sheep/helper/test.js';
import AuthUtil from '@/sheep/api/member/auth';

// 打开授权弹框
export function showAuthModal(type = '') {
  if (!type) {
    // #ifdef MP-WEIXIN
    type = 'phoneAuthorization';
    // #endif
    // #ifndef MP-WEIXIN
    type = 'smsLogin';
    // #endif
  }
  const modal = $store('modal');
  // #ifdef H5
  const hasPendingPopupClose = modal.auth !== '' || modal.authTransitionCloseId !== 0;
  const transitionId = (modal.authTransitionId || 0) + 1;
  modal.$patch((state) => {
    state.authTransition = true;
    state.authTransitionId = transitionId;
    state.authTransitionCloseId = hasPendingPopupClose ? transitionId : 0;
  });
  closeAuthModal(true);
  setTimeout(() => {
    if (!modal.authTransition || modal.authTransitionId !== transitionId) {
      return;
    }
    modal.$patch((state) => {
      state.auth = type;
      state.authTransition = false;
      state.authTransitionCloseId = 0;
    });
  }, 200);
  // #endif

  // #ifndef H5
  modal.$patch((state) => {
    state.auth = type;
  });
  // #endif
}

// 关闭授权弹框
export function closeAuthModal(preserveTransition = false) {
  $store('modal').$patch((state) => {
    state.auth = '';
    if (!preserveTransition) {
      state.authTransition = false;
      state.authTransitionId = (state.authTransitionId || 0) + 1;
      state.authTransitionCloseId = 0;
    }
  });
}

// 打开分享弹框
export function showShareModal() {
  $store('modal').$patch((state) => {
    state.share = true;
  });
}

// 关闭分享弹框
export function closeShareModal() {
  $store('modal').$patch((state) => {
    state.share = false;
  });
}

// 打开快捷菜单
export function showMenuTools() {
  $store('modal').$patch((state) => {
    state.menu = true;
  });
}

// 关闭快捷菜单
export function closeMenuTools() {
  $store('modal').$patch((state) => {
    state.menu = false;
  });
}

// 打开客服弹框。企微配置缺失或读取失败时回退到在线客服页。
export async function showKefuModal(options = {}, router) {
  const modal = $store('modal');
  const tradeConfig = $store('tradeConfig');
  const chatOptions = options && typeof options === 'object' ? { ...options } : {};

  try {
    const config = await tradeConfig.getTradeConfig();
    if (!config?.kefuWechatQrCodeUrl) {
      $store('modal').$patch((state) => {
        state.kefu = false;
        state.kefuOptions = chatOptions;
      });
      // keep the existing deep-linkable online chat page as the fallback
      router?.go('/pages/chat/index', chatOptions);
      return false;
    }
    modal.$patch((state) => {
      state.kefuOptions = chatOptions;
      state.kefu = true;
    });
    return true;
  } catch (error) {
    modal.$patch((state) => {
      state.kefu = false;
      state.kefuOptions = chatOptions;
    });
    router?.go('/pages/chat/index', chatOptions);
    return false;
  }
}

// 关闭客服弹框
export function closeKefuModal() {
  $store('modal').$patch((state) => {
    state.kefu = false;
    state.kefuOptions = {};
  });
}

// 发送短信验证码  60秒
export function getSmsCode(event, mobile) {
  const modalStore = $store('modal');
  const lastSendTimer = modalStore.lastTimer[event];
  if (typeof lastSendTimer === 'undefined') {
    $helper.toast('短信发送事件错误');
    return;
  }

  const duration = dayjs().unix() - lastSendTimer;
  const canSend = duration >= 60;
  if (!canSend) {
    $helper.toast('请稍后再试');
    return;
  }
  // 只有 mobile 非空时才校验。因为部分场景（修改密码），不需要输入手机
  if (mobile && !test.mobile(mobile)) {
    $helper.toast('手机号码格式不正确');
    return;
  }

  // 发送验证码 + 更新上次发送验证码时间
  let scene = -1;
  switch (event) {
    case 'resetPassword':
      scene = 4;
      break;
    case 'changePassword':
      scene = 3;
      break;
    case 'changeMobile':
      scene = 2;
      break;
    case 'smsLogin':
      scene = 1;
      break;
  }
  AuthUtil.sendSmsCode(mobile, scene).then((res) => {
    if (res.code === 0) {
      modalStore.$patch((state) => {
        state.lastTimer[event] = dayjs().unix();
      });
    }
  });
}

// 获取短信验证码倒计时 -- 60秒
export function getSmsTimer(event, mobile = '') {
  const modalStore = $store('modal');
  const lastSendTimer = modalStore.lastTimer[event];

  if (typeof lastSendTimer === 'undefined') {
    $helper.toast('短信发送事件错误');
    return;
  }

  const duration = ref(dayjs().unix() - lastSendTimer - 60);
  const canSend = duration.value >= 0;

  if (canSend) {
    return '获取验证码';
  }

  if (!canSend) {
    setTimeout(() => {
      duration.value++;
    }, 1000);
    return -duration.value.toString() + ' 秒';
  }
}

// 记录广告弹框历史
export function saveAdvHistory(adv) {
  const modal = $store('modal');

  modal.$patch((state) => {
    if (!state.advHistory.includes(adv.imgUrl)) {
      state.advHistory.push(adv.imgUrl);
    }
  });
}
