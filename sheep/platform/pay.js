import sheep from '@/sheep';
// #ifdef H5
import $wxsdk from '@/sheep/libs/sdk-h5-weixin';
// #endif
import { getRootUrl } from '@/sheep/helper';
import PayOrderApi from '@/sheep/api/pay/order';

/**
 * 支付
 *
 * @param {String} payment = ['wechat','alipay','wallet','mock']  	- 支付方式
 * @param {String} orderType = ['goods','recharge','groupon']  	- 订单类型
 * @param {String} id					- 订单号
 */

export default class SheepPay {
  constructor(payment, orderType, id, channelCode) {
    this.payment = payment;
    this.id = id;
    this.orderType = orderType;
    this.channelCode = channelCode;
    this.pending = this.payAction();
  }

  async payAction() {
    const payAction = {
      WechatOfficialAccount: {
        wechat: () => {
          return this.wechatOfficialAccountPay();
        },
        alipay: () => {
          return this.redirectPay(); // 现在公众号可以直接跳转支付宝页面
        },
        wallet: () => {
          return this.walletPay();
        },
        mock: () => {
          return this.mockPay();
        },
      },
      WechatMiniProgram: {
        wechat: () => {
          return this.wechatMiniProgramPay();
        },
        alipay: () => {
          return this.copyPayLink();
        },
        wallet: () => {
          return this.walletPay();
        },
        mock: () => {
          return this.mockPay();
        },
      },
      App: {
        wechat: () => {
          return this.wechatAppPay();
        },
        alipay: () => {
          return this.alipay();
        },
        wallet: () => {
          return this.walletPay();
        },
        mock: () => {
          return this.mockPay();
        },
      },
      H5: {
        wechat: () => {
          return this.wechatWapPay();
        },
        alipay: () => {
          return this.redirectPay();
        },
        wallet: () => {
          return this.walletPay();
        },
        mock: () => {
          return this.mockPay();
        },
      },
    };
    try {
      return await payAction[sheep.$platform.name][this.payment]();
    } catch {
      sheep.$helper.toast('支付请求失败，请稍后重试');
    }
  }

  // 预支付
  async prepay(channel) {
    const data = { id: this.id, channelCode: channel, channelExtras: {} };
    if (['wx_pub', 'wx_lite', 'yeepay_wx_lite'].includes(channel)) {
      const openid = await sheep.$platform.useProvider('wechat').getOpenid(true);
      if (!openid) {
        this.bindWeixin();
        return { code: -1, msg: '请先绑定微信' };
      }
      data.channelExtras.openid = openid;
    }
    const res = await PayOrderApi.submitOrder(data);
    if (res.code !== 0 && /无效的openid|下单账号与支付账号不一致/.test(res.msg || '')) {
      this.bindWeixin();
    }
    return res;
  }
  // #ifdef H5
  // 微信公众号 JSSDK 支付
  async wechatOfficialAccountPay() {
    let { code, data } = await this.prepay('wx_pub');
    if (code !== 0) {
      return;
    }
    const payConfig = JSON.parse(data.displayContent);
    $wxsdk.wxpay(payConfig, {
      success: () => {
        this.payResult('success');
      },
      cancel: () => {
        sheep.$helper.toast('支付已手动取消');
      },
      fail: (error) => {
        if (error.errMsg.indexOf('chooseWXPay:没有此SDK或暂不支持此SDK模拟') >= 0) {
          sheep.$helper.toast(
            '发起微信支付失败，原因：可能是微信开发者工具不支持，建议使用微信打开网页后支付',
          );
          return;
        }
        this.payResult('fail');
      },
    });
  }

  // 浏览器微信 H5 支付 TODO 芋艿：待接入（注意：H5 支付是给普通浏览器，不是微信公众号的支付，绝大多数人用不到，可以忽略）
  async wechatWapPay() {
    const { error, data } = await this.prepay();
    if (error === 0) {
      const redirect_url = `${getRootUrl()}pages/pay/result?id=${this.id}&payment=${
        this.payment
      }&orderType=${this.orderType}`;
      location.href = `${data.pay_data.h5_url}&redirect_url=${encodeURIComponent(redirect_url)}`;
    }
  }

  // 支付链接(支付宝 wap 支付)
  async redirectPay() {
    let { code, data } = await this.prepay('alipay_wap');
    if (code !== 0) {
      return;
    }
    location.href = data.displayContent;
  }

  // #endif

  // 微信小程序支付
  async wechatMiniProgramPay() {
    const channel = this.channelCode || 'wx_lite';
    if (!['wx_lite', 'yeepay_wx_lite'].includes(channel)) return;
    const { code, data } = await this.prepay(channel);
    if (code !== 0) {
      return;
    }
    // 调用微信小程序支付
    const payConfig = JSON.parse(data.displayContent);
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: payConfig.timeStamp,
      nonceStr: payConfig.nonceStr,
      package: payConfig.package || payConfig.packageValue,
      signType: payConfig.signType,
      paySign: payConfig.paySign,
      success: (res) => {
        this.payResult('success');
      },
      fail: (err) => {
        if (err.errMsg === 'requestPayment:fail cancel') {
          sheep.$helper.toast('支付已手动取消');
        } else {
          this.payResult('fail');
        }
      },
    });
  }

  // 余额支付
  async walletPay() {
    const { code } = await this.prepay('wallet');
    code === 0 && this.payResult('success');
  }

  // 模拟支付
  async mockPay() {
    const { code } = await this.prepay('mock');
    code === 0 && this.payResult('success');
  }

  // 支付宝复制链接支付（通过支付宝 wap 支付实现）
  async copyPayLink() {
    let { code, data } = await this.prepay('alipay_wap');
    if (code !== 0) {
      return;
    }
    // 引入 showModal 点击确认：复制链接；
    uni.showModal({
      title: '支付宝支付',
      content: '复制链接到外部浏览器',
      confirmText: '复制链接',
      success: (res) => {
        if (res.confirm) {
          sheep.$helper.copyText(data.displayContent);
        }
      },
    });
  }

  // 支付宝支付（App）
  async alipay() {
    let that = this;
    const { code, data } = await this.prepay('alipay_app');
    if (code !== 0) {
      return;
    }

    // TODO @芋艿：【可优化】如果是沙箱支付，EnvUtils.setEnv(EnvUtils.EnvEnum.SANDBOX)，相关 https://t.zsxq.com/yjyJQ
    uni.requestPayment({
      provider: 'alipay',
      orderInfo: data.displayContent, // 直接使用返回的支付参数
      success: (res) => {
        that.payResult('success');
      },
      fail: (err) => {
        if (err.errMsg === 'requestPayment:fail [paymentAlipay:62001]user cancel') {
          sheep.$helper.toast('支付已手动取消');
        } else {
          that.payResult('fail');
        }
      },
    });
  }

  // 微信支付（App）
  async wechatAppPay() {
    // 获取预支付信息
    const { code, data } = await this.prepay('wx_app');
    if (code !== 0) {
      sheep.$helper.toast('获取支付信息失败');
      return;
    }

    // App 微信支付与小程序的参数结构不同：Android、iOS 必须通过 orderInfo 传递，且键名需全小写
    // 后端微信支付 V2、V3 返回的字段命名不一致，因此在此统一转换
    // 参考：https://uniapp.dcloud.net.cn/api/plugins/payment.html#%E5%BE%AE%E4%BF%A1app%E6%94%AF%E4%BB%98
    const payConfig = JSON.parse(data.displayContent);
    const orderInfo = {
      appid: payConfig.appid || payConfig.appId,
      partnerid: payConfig.partnerid || payConfig.partnerId,
      prepayid: payConfig.prepayid || payConfig.prepayId,
      package: payConfig.package || payConfig.packageValue || 'Sign=WXPay',
      noncestr: payConfig.noncestr || payConfig.nonceStr,
      timestamp: Number(payConfig.timestamp || payConfig.timeStamp),
      sign: payConfig.sign,
    };
    // 调用微信支付
    uni.requestPayment({
      provider: 'wxpay',
      orderInfo,
      success: () => {
        this.payResult('success');
      },
      fail: (err) => {
        if (err.errMsg === 'requestPayment:fail cancel') {
          sheep.$helper.toast('支付已手动取消');
        } else {
          sheep.$helper.toast('支付失败：' + err.errMsg);
          this.payResult('fail');
        }
      },
    });
  }

  // 支付结果跳转,success:成功，fail:失败
  payResult(resultType) {
    goPayResult(this.id, this.orderType, resultType);
  }

  // 引导绑定微信
  bindWeixin() {
    goBindWeixin();
  }
}

export function getPayMethods(channels) {
  const payMethods = [
    {
      icon: '/static/img/shop/pay/wechat.png',
      title: '微信支付',
      value: 'wechat',
      disabled: true,
    },
    {
      icon: '/static/img/shop/pay/alipay.png',
      title: '支付宝支付',
      value: 'alipay',
      disabled: true,
    },
    {
      icon: '/static/img/shop/pay/wallet.png',
      title: '余额支付',
      value: 'wallet',
      disabled: true,
    },
    {
      icon: '/static/img/shop/pay/apple.png',
      title: 'Apple Pay',
      value: 'apple',
      disabled: true,
    },
    {
      icon: '/static/img/shop/pay/wallet.png',
      title: '模拟支付',
      value: 'mock',
      disabled: true,
    },
  ];
  const platform = sheep.$platform.name;

  // 1. 处理【微信支付】
  const wechatMethod = payMethods[0];
  if (
    (platform === 'WechatOfficialAccount' && channels.includes('wx_pub')) ||
    (platform === 'WechatMiniProgram' && (channels.includes('wx_lite') || channels.includes('yeepay_wx_lite'))) ||
    (platform === 'App' && channels.includes('wx_app'))
  ) {
    wechatMethod.disabled = false;
    if (platform === 'WechatMiniProgram') {
      wechatMethod.channelCode = channels.includes('yeepay_wx_lite') ? 'yeepay_wx_lite' : 'wx_lite';
    }
  }

  // 2. 处理【支付宝支付】
  const alipayMethod = payMethods[1];
  if (
    (platform === 'H5' && channels.includes('alipay_wap')) ||
    (platform === 'WechatOfficialAccount' && channels.includes('alipay_wap')) ||
    (platform === 'WechatMiniProgram' && channels.includes('alipay_wap')) ||
    (platform === 'App' && channels.includes('alipay_app'))
  ) {
    alipayMethod.disabled = false;
  }
  // 3. 处理【余额支付】
  const walletMethod = payMethods[2];
  if (channels.includes('wallet')) {
    walletMethod.disabled = false;
  }
  // 4. 处理【苹果支付】TODO 芋艿：未来接入
  // 5. 处理【模拟支付】
  const mockMethod = payMethods[4];
  if (channels.includes('mock')) {
    mockMethod.disabled = false;
  }
  return payMethods.filter((item) => !item.disabled);
}

// 支付结果跳转,success:成功，fail:失败
export function goPayResult(id, orderType, resultType) {
  sheep.$router.redirect('/pages/pay/result', {
    id,
    orderType,
    payState: resultType,
  });
}

export function goBindWeixin() {
  uni.showModal({
    title: '微信支付',
    content: '请先绑定微信再使用微信支付',
    success: function (res) {
      if (res.confirm) {
        sheep.$platform.useProvider('wechat').bind();
      }
    },
  });
}

// 获取微信支付渠道码
export function getWeixinPayChannelCode() {
  const platform = sheep.$platform.name;
  switch (platform) {
    case 'WechatOfficialAccount':
      return 'wx_pub';
    case 'WechatMiniProgram':
      return 'wx_lite';
    case 'App':
      return 'wx_app';
    case 'H5':
      return 'wx_wap';
    default:
      return '';
  }
}
