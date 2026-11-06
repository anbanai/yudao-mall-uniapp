<!-- 首页，支持店铺装修 -->
<template>
  <view class="home-page">
    <s-layout
      title="首页"
      navbar="custom"
      tabbar="/pages/index/index"
      :bgStyle="template?.page || {}"
      :navbarStyle="template?.navigationBar || {}"
      onShareAppMessage
    >
      <template v-if="homeTemplateReady">
        <s-block
          v-for="(item, index) in homeComponents"
          :key="index"
          :styles="item.property.style"
          :allow-overflow="
            (item.id === 'ProductGroup' || item.id === 'ProductCategory') && item.property.sticky
          "
        >
          <s-block-item
            :type="item.id"
            :data="item.property"
            :styles="item.property.style"
            :refresh-key="productGroupRefreshKey"
          />
        </s-block>
      </template>
      <view v-else class="home-loading" aria-label="首页加载中">
        <view class="home-loading__search" />
        <view class="home-loading__banner" />
        <view class="home-loading__grid">
          <view v-for="item in 4" :key="item" class="home-loading__tile" />
        </view>
        <view class="home-loading__products">
          <view v-for="item in 4" :key="item" class="home-loading__product">
            <view class="home-loading__image" />
            <view class="home-loading__line home-loading__line--long" />
            <view class="home-loading__line" />
          </view>
        </view>
      </view>
    </s-layout>
  </view>
</template>

<script setup>
  import { computed, ref } from 'vue';
  import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import $share from '@/sheep/platform/share';
  // 隐藏原生tabBar
  uni.hideTabBar({
    fail: () => {},
  });

  const template = computed(() => sheep.$store('app').template?.home);
  // The store starts with a placeholder object. A components array marks a loaded template.
  const homeComponents = computed(() =>
    Array.isArray(template.value?.components) ? template.value.components : [],
  );
  const homeTemplateReady = computed(() => Array.isArray(template.value?.components));
  const productGroupRefreshKey = ref(0);
  // 在此处拦截改变一下首页轮播图 此处先写死后期复活 放到启动函数里
  // (async function() {
  // console.log('原代码首页定制化数据',template)
  // let {
  // 	data
  // } = await index2Api.decorate();
  // console.log('首页导航配置化过高无法兼容',JSON.parse(data[1].value))
  // 改变首页底部数据 但是没有通过数组id获取商品数据接口
  // let {
  // 	data: datas
  // } = await index2Api.spids();
  // template.value.data[9].data.goodsIds = datas.list.map(item => item.id);
  // template.value.data[0].data.list = JSON.parse(data[0].value).map(item => {
  // 	return {
  // 		src: item.picUrl,
  // 		url: item.url,
  // 		title: item.name,
  // 		type: "image"
  // 	}
  // })
  // }())

  onLoad((options) => {
    // #ifdef MP
    // 小程序识别二维码
    if (options.scene) {
      const sceneParams = decodeURIComponent(options.scene).split('=');
      console.log('sceneParams=>', sceneParams);
      options[sceneParams[0]] = sceneParams[1];
    }
    // #endif

    // 预览模板
    if (options.templateId) {
      sheep.$store('app').init(options.templateId);
    }

    // 解析分享信息
    if (options.spm) {
      $share.decryptSpm(options.spm);
    }

    // 进入指定页面(完整页面路径)
    if (options.page) {
      sheep.$router.go(decodeURIComponent(options.page));
    }
  });

  onShow(async () => {
    // #ifdef APP-PLUS
    // ios首次授权网络，需要重新加载一次应用初始化
    // 可能需要考虑上uni.onNetworkStatusChange，uni.offNetworkStatusChange组合拳以及主动主动唤起权限申请
    // 一开始放app.vue，感觉负载太重，搬到这里来了。
    // 如果你的首页不是这个页面，需要把代码搬过去。
    if (sheep.$platform.os === 'ios') {
      if (await sheep.$platform.checkNetwork()) {
        await sheep.$store('app').init();
      }
    }
    // #endif
  });

  // 下拉刷新
  onPullDownRefresh(() => {
    productGroupRefreshKey.value += 1;
    sheep.$store('app').init();
    setTimeout(function () {
      uni.stopPullDownRefresh();
    }, 800);
  });
</script>

<style lang="scss" scoped>
  .home-loading__search {
    height: 72rpx;
    margin: 20rpx;
    border-radius: 36rpx;
    background: #f1f2f4;
  }

  .home-loading__banner {
    height: 300rpx;
    margin: 0 20rpx 20rpx;
    border-radius: 12rpx;
    background: #f1f2f4;
  }

  .home-loading__grid {
    display: flex;
    gap: 16rpx;
    padding: 0 20rpx 20rpx;
  }

  .home-loading__tile {
    flex: 1;
    height: 120rpx;
    border-radius: 12rpx;
    background: #f1f2f4;
  }

  .home-loading__products {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    padding: 0 20rpx;
  }

  .home-loading__product {
    width: calc(50% - 10rpx);
  }

  .home-loading__image {
    height: 330rpx;
    border-radius: 12rpx;
    background: #f1f2f4;
  }

  .home-loading__line {
    width: 70%;
    height: 24rpx;
    margin-top: 16rpx;
    border-radius: 12rpx;
    background: #f1f2f4;
  }

  .home-loading__line--long {
    width: 90%;
  }

  @keyframes home-loading-pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }

  .home-loading__search,
  .home-loading__banner,
  .home-loading__tile,
  .home-loading__image,
  .home-loading__line {
    animation: home-loading-pulse 1.4s ease-in-out infinite;
  }
</style>
