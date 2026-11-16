<template>
  <s-layout title="会员权益中心" :bgStyle="{ color: '#F7F8F3' }">
    <view v-if="state.loading" class="state">正在加载权益...</view>
    <view v-else-if="state.error" class="state">
      <text>权益暂时无法加载</text>
      <button class="retry" @tap="load">重新加载</button>
    </view>
    <view v-else class="page">
      <view class="member-card">
        <view class="card-head">
          <view>
            <text class="eyebrow">TEA MEMBERSHIP</text>
            <text class="level">{{ state.overview.levelName || '普通会员' }}</text>
          </view>
          <text class="level-mark">V{{ state.overview.level || 0 }}</text>
        </view>
        <view class="card-stats">
          <view @tap="openPoints"><text class="stat-label">当前积分 ›</text><text class="stat-value">{{ state.overview.point || 0 }}</text></view>
          <view><text class="stat-label">购物返积分</text><text class="stat-value">{{ multiplierText }} 倍</text></view>
        </view>
        <text class="card-note">按确认收货后的商品实付金额计算，不含运费</text>
      </view>

      <view class="upgrade-block">
        <view class="upgrade-heading">
          <text>成长值</text>
          <text v-if="state.overview.nextExperience !== null">
            {{ state.overview.experience || 0 }} / {{ state.overview.nextExperience }}
          </text>
          <text v-else>已达最高等级</text>
        </view>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: `${progress}%` }" />
        </view>
        <text v-if="state.overview.nextExperience !== null" class="upgrade-note">
          再获得 {{ Math.max(0, state.overview.nextExperience - (state.overview.experience || 0)) }} 成长值升级
        </text>
      </view>

      <view class="section-head"><text class="section-title">我的权益</text><text class="section-note">当前等级</text></view>
      <view class="view-tabs" role="tablist">
        <button v-for="tab in tabs" :key="tab.key" class="view-tab" :class="{ active: state.view === tab.key }" @tap="switchView(tab.key)">{{ tab.name }}</button>
      </view>
      <view v-if="state.view === 'levels'" class="level-tabs">
        <button v-for="level in state.overview.levels" :key="level.level" class="view-tab" :class="{ active: state.selectedLevel === level.level }" @tap="state.selectedLevel = level.level">V{{ level.level }}</button>
      </view>
      <view v-if="!visibleBenefits.length" class="empty">暂无权益</view>
      <view v-else class="benefits">
        <view v-for="item in visibleBenefits" :key="item.code" class="benefit-row">
          <view class="benefit-icon">{{ iconText(item) }}</view>
          <view class="benefit-main">
            <view class="benefit-title"><text>{{ item.name }}</text></view>
            <text class="benefit-desc">{{ item.description || '会员专属权益' }}</text>
          </view>
        </view>
      </view>

      <view v-if="state.view === 'levels' && selectedLevel" class="level-requirement">
        {{ selectedLevel.name }} · 升级成长值 {{ selectedLevel.experience || 0 }}
      </view>
      <view class="section-head"><text class="section-title">权益说明</text></view>
      <view class="explain">折扣按会员等级生效。当前升级条件以成长值为准。</view>
    </view>
  </s-layout>
</template>

<script setup>
  import { computed, reactive } from 'vue';
  import { onShow } from '@dcloudio/uni-app';
  import BenefitApi from '@/sheep/api/member/benefit';

  const tabs = [{ key: 'mine', name: '我的权益' }, { key: 'levels', name: '等级对比' }];
  const state = reactive({ loading: true, error: false, view: 'mine', selectedLevel: 1, overview: { benefits: [], levels: [] } });
  const selectedLevel = computed(() => state.overview.levels.find((item) => item.level === state.selectedLevel));
  const visibleBenefits = computed(() => state.view === 'mine' ? state.overview.benefits : selectedLevel.value?.benefits || []);
  const multiplierText = computed(() => ((state.overview.pointTradeGiveMultiplier || 1000) / 1000).toFixed(1));
  const progress = computed(() => {
    const next = state.overview.nextExperience;
    return next ? Math.min(100, Math.round(((state.overview.experience || 0) / next) * 100)) : 100;
  });

  function iconText(item) {
    if (item.code === 'POINT_MULTIPLIER') return '分';
    if (item.code?.includes('BIRTHDAY')) return '生';
    if (item.code?.includes('QUARTER')) return '季';
    return '礼';
  }
  function openPoints() { uni.navigateTo({ url: '/pages/user/wallet/score' }); }
  function switchView(view) { state.view = view; }
  async function load() {
    state.loading = true;
    state.error = false;
    try {
      const result = await BenefitApi.getOverview();
      if (result?.code !== 0) throw new Error('权益加载失败');
      state.overview = result.data || { benefits: [], levels: [] };
      state.selectedLevel = state.overview.level || 1;
    } catch { state.error = true; }
    finally { state.loading = false; }
  }
  onShow(load);
</script>

<style lang="scss" scoped>
  .page { padding: 28rpx 30rpx 60rpx; color: #17211b; }
  .member-card { padding: 34rpx; border-radius: 10rpx; background: #1f4a38; color: #fff; box-shadow: 0 12rpx 28rpx rgba(31, 74, 56, .12); }
  .card-head, .card-stats, .benefit-title, .upgrade-heading { display: flex; align-items: center; justify-content: space-between; }
  .eyebrow { display: block; font-size: 18rpx; letter-spacing: 2rpx; opacity: .72; }
  .level { display: block; margin-top: 10rpx; font-size: 42rpx; font-weight: 600; }
  .level-mark { font-size: 40rpx; opacity: .8; }
  .card-stats { margin-top: 46rpx; justify-content: flex-start; gap: 88rpx; }
  .stat-label, .stat-value { display: block; }
  .stat-label { font-size: 22rpx; opacity: .72; }
  .stat-value { margin-top: 8rpx; font-size: 34rpx; font-weight: 600; }
  .card-note { display: block; margin-top: 30rpx; font-size: 21rpx; opacity: .75; }
  .upgrade-block { padding: 26rpx 0 4rpx; }
  .upgrade-heading { color: #34473a; font-size: 23rpx; }
  .progress-track { height: 10rpx; margin-top: 14rpx; overflow: hidden; border-radius: 8rpx; background: #e2e9e3; }
  .progress-fill { height: 100%; border-radius: inherit; background: #54836a; }
  .upgrade-note, .level-requirement { display: block; margin-top: 10rpx; color: #65756a; font-size: 21rpx; }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; margin: 44rpx 0 18rpx; }
  .section-title { font-size: 32rpx; font-weight: 600; }
  .section-note { color: #65756a; font-size: 22rpx; }
  .benefit-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 0; border-bottom: 1px solid #e5e9e3; }
  .benefit-icon { width: 68rpx; height: 68rpx; border-radius: 50%; background: #e2eee6; color: #1f4a38; text-align: center; line-height: 68rpx; font-size: 28rpx; font-weight: 600; }
  .benefit-main { flex: 1; min-width: 0; }
  .benefit-title { justify-content: flex-start; gap: 12rpx; font-size: 28rpx; }
  .benefit-desc { display: block; margin-top: 8rpx; color: #65756a; font-size: 22rpx; }
  .empty, .state, .explain { padding: 50rpx 30rpx; text-align: center; color: #778279; font-size: 24rpx; }
  .explain { padding: 24rpx 0; text-align: left; line-height: 1.7; }
  .view-tabs, .level-tabs { display: flex; gap: 8rpx; margin: 8rpx 0 18rpx; }
  .view-tab { flex: 1; margin: 0; padding: 0 8rpx; height: 64rpx; line-height: 64rpx; border: 0; border-radius: 4rpx; background: transparent; color: #65756a; font-size: 23rpx; }
  .view-tab::after { border: 0; }
  .view-tab.active { background: #e2eee6; color: #1f4a38; font-weight: 600; }
</style>
