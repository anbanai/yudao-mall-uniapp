import $api from '@/sheep/api';
import $url from '@/sheep/url';
import $router from '@/sheep/router';
import $platform from '@/sheep/platform';
import $helper from '@/sheep/helper';
import zIndex from '@/sheep/config/zIndex.js';
import $store from '@/sheep/store';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);
dayjs.extend(duration);

const sheep = {
  $api,
  $store,
  $url,
  $router,
  $platform,
  $helper,
  $zIndex: zIndex,
};

// 加载Shopro底层依赖
export async function ShoproInit() {
  // 应用初始化
  await $store('app').init();

  // 平台初始化加载(各平台provider提供不同的加载流程)
  $platform.load();

  // 微信小程序：进入即静默登录，注册匿名会员并获取 openid，便于统计用户信息
  // (登录成功后 accessToken 会由 request 拦截器自动写入，openid 会存入本地存储)
  // #ifdef MP-WEIXIN
  await silentLogin();
  // #endif

  if (process.env.NODE_ENV === 'development') {
    ShoproDebug();
  }
}

// 微信小程序静默登录：确保进入即拿到登录态 + openid，便于统计用户信息。
// 已登录却缺 openid 时，会静默向后端补齐（不新建账号）；未登录则静默登录/注册匿名会员。
async function silentLogin() {
  // 仅开发环境打印 openid，避免在正式环境控制台泄露用户标识
  const isDev = process.env.NODE_ENV === 'development';
  // 已有 openid，无需重复获取
  if (uni.getStorageSync('openid')) {
    return;
  }
  const provider = $platform.useProvider('wechat');
  const userStore = $store('user');
  if (userStore.isLogin) {
    // 已登录：从后端绑定关系补齐 openid（无交互、无 loading）
    try {
      const openid = await provider.getOpenid(true);
      if (openid) {
        isDev && console.log('[ShoproInit] 已登录，openid 已补齐:', openid);
      } else {
        console.warn('[ShoproInit] 已登录但未找到 openid，请检查后端微信小程序社交客户端配置');
      }
    } catch (e) {
      console.error('[ShoproInit] 微信小程序静默取 openid 失败', e);
    }
    return;
  }
  // 未登录：静默登录，注册匿名会员并获取 openid
  try {
    const ok = await provider.login(true);
    if (ok) {
      isDev && console.log('[ShoproInit] 静默登录成功，openid:', uni.getStorageSync('openid'));
    } else {
      console.warn('[ShoproInit] 微信小程序静默登录未成功，openid 暂不可用');
    }
  } catch (e) {
    console.error('[ShoproInit] 微信小程序静默登录失败', e);
  }
}

// 开发模式
function ShoproDebug() {
  // 开发环境引入vconsole调试
  // #ifdef H5
  // import("vconsole").then(vconsole => {
  // 	new vconsole.default();
  // });
  // #endif
  // 同步前端页面到后端
  // console.log(ROUTES)
}

export default sheep;
