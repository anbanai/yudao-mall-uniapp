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

      <view class="section-head"><text class="section-title">我的权益</text><text class="section-note">当前等级</text></view>
      <view class="view-tabs" role="tablist">
        <button v-for="tab in tabs" :key="tab.key" class="view-tab" :class="{ active: state.view === tab.key }" @tap="switchView(tab.key)">{{ tab.name }}</button>
      </view>
      <view v-if="state.view === 'levels'" class="level-tabs">
        <button v-for="level in [1, 2, 3, 4, 5]" :key="level" class="view-tab" :class="{ active: state.selectedLevel === level }" @tap="loadLevel(level)">V{{ level }}</button>
      </view>
      <view v-if="state.sectionLoading" class="empty">正在加载...</view>
      <view v-else-if="state.sectionError" class="empty"><text>加载失败</text><button class="retry" @tap="retrySection">重新加载</button></view>
      <template v-else>
      <view v-if="!visibleBenefits.length" class="empty">暂无权益</view>
      <view v-else class="benefits">
        <view v-for="item in visibleBenefits" :key="item.accountId || item.code" class="benefit-row">
          <view class="benefit-icon">{{ iconText(item) }}</view>
          <view class="benefit-main">
            <view class="benefit-title"><text>{{ item.name }}</text><text v-if="item.claimable" class="tag">可领取</text></view>
            <text class="benefit-desc">{{ item.description || '会员专属权益' }}</text>
            <text class="benefit-meta">{{ item.actionType === 2 ? '服务待开通' : `剩余 ${item.availableQuantity || 0} 次` }}{{ item.periodEnd ? ` · 有效期至 ${formatDate(item.periodEnd)}` : '' }}</text>
          </view>
          <button v-if="item.claimable && state.view === 'mine'" class="claim" :disabled="state.claimingId === item.accountId" @tap="claim(item)">{{ state.claimingId === item.accountId ? '领取中' : '领取' }}</button>
          <text v-else class="status">{{ benefitStatus(item) }}</text>
        </view>
      </view>
      </template>

      <view class="section-head records-head"><text class="section-title">权益说明</text></view>
      <view class="explain">积分倍率会随会员等级变化，历史订单按下单时的等级快照计算；退款时按原订单积分记录回滚。</view>
    </view>
  </s-layout>
</template>

<script setup>
  import { computed, reactive } from 'vue';
  import { onShow } from '@dcloudio/uni-app';
  import BenefitApi from '@/sheep/api/member/benefit';

  const tabs = [{ key: 'mine', name: '我的权益' }, { key: 'levels', name: '等级对比' }, { key: 'records', name: '领取记录' }];
  const state = reactive({ loading: true, error: false, sectionLoading: false, sectionError: false,
    claimingId: null, view: 'mine', selectedLevel: 1, levelBenefits: [], records: [], overview: { benefits: [] } });
  const visibleBenefits = computed(() => state.view === 'mine' ? state.overview.benefits : state.view === 'levels' ? state.levelBenefits : state.records);
  const multiplierText = computed(() => ((state.overview.pointTradeGiveMultiplier || 1000) / 1000).toFixed(1));

  function iconText(item) {
    if (item.code === 'POINT_MULTIPLIER') return '分';
    if (item.code?.includes('BIRTHDAY')) return '生';
    if (item.code?.includes('QUARTER')) return '季';
    return '礼';
  }
  function formatDate(value) {
    return value ? String(value).slice(0, 10) : '';
  }
  function benefitStatus(item) {
    if (item.status === 1) return '已过期';
    if (item.actionType === 2 || (item.claimType === 1 && !item.claimable && item.availableQuantity > 0)) return '即将开放';
    if (item.claimType === 1 && item.availableQuantity === 0) return '已领取';
    if (item.availableQuantity > 0) return '已到账';
    return '已用完';
  }
  function openPoints() { uni.navigateTo({ url: '/pages/user/wallet/score' }); }
  async function switchView(view) {
    state.view = view;
    if (view === 'levels') await loadLevel(state.selectedLevel);
    if (view === 'records') await loadRecords();
  }
  function retrySection() { return state.view === 'levels' ? loadLevel(state.selectedLevel) : loadRecords(); }
  async function loadLevel(level) {
    state.selectedLevel = level;
    state.sectionLoading = true;
    state.sectionError = false;
    try {
      const result = await BenefitApi.getLevels(level);
      if (result?.code !== 0) throw new Error('等级权益加载失败');
      state.levelBenefits = result.data || [];
    } catch { state.sectionError = true; }
    finally { state.sectionLoading = false; }
  }
  async function loadRecords() {
    state.sectionLoading = true;
    state.sectionError = false;
    try {
      const result = await BenefitApi.getRecords();
      if (result?.code !== 0) throw new Error('权益记录加载失败');
      state.records = result.data || [];
    } catch { state.sectionError = true; }
    finally { state.sectionLoading = false; }
  }
  async function load() {
    state.loading = true;
    state.error = false;
    try {
      const result = await BenefitApi.getOverview();
      if (result?.code !== 0) throw new Error('权益加载失败');
      state.overview = result.data || { benefits: [] };
      state.selectedLevel = state.overview.level || 1;
    } catch { state.error = true; }
    finally { state.loading = false; }
  }
  async function claim(item) {
    if (state.claimingId) return;
    state.claimingId = item.accountId;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    try {
      const result = await BenefitApi.claim(item.accountId, requestId);
      if (result?.code !== 0) throw new Error('领取失败');
      await load();
    } catch { uni.showToast({ title: '领取失败，请稍后重试', icon: 'none' }); }
    finally { state.claimingId = null; }
  }
  onShow(load);
</script>

<style lang="scss" scoped>
  .page { padding: 28rpx 30rpx 60rpx; color: #17211b; }
  .member-card { padding: 34rpx; border-radius: 10rpx; background: #1f4a38; color: #fff; box-shadow: 0 12rpx 28rpx rgba(31, 74, 56, .12); }
  .card-head, .card-stats, .benefit-title { display: flex; align-items: center; justify-content: space-between; }
  .eyebrow { display: block; font-size: 18rpx; letter-spacing: 2rpx; opacity: .72; }
  .level { display: block; margin-top: 10rpx; font-size: 42rpx; font-weight: 600; }
  .level-mark { font-size: 40rpx; opacity: .8; }
  .card-stats { margin-top: 46rpx; justify-content: flex-start; gap: 88rpx; }
  .stat-label, .stat-value { display: block; }
  .stat-label { font-size: 22rpx; opacity: .72; }
  .stat-value { margin-top: 8rpx; font-size: 34rpx; font-weight: 600; }
  .card-note { display: block; margin-top: 30rpx; font-size: 21rpx; opacity: .75; }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; margin: 44rpx 0 18rpx; }
  .section-title { font-size: 32rpx; font-weight: 600; }
  .section-note { color: #65756a; font-size: 22rpx; }
  .benefit-row { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 0; border-bottom: 1px solid #e5e9e3; }
  .benefit-icon { width: 68rpx; height: 68rpx; border-radius: 50%; background: #e2eee6; color: #1f4a38; text-align: center; line-height: 68rpx; font-size: 28rpx; font-weight: 600; }
  .benefit-main { flex: 1; min-width: 0; }
  .benefit-title { justify-content: flex-start; gap: 12rpx; font-size: 28rpx; }
  .tag { padding: 4rpx 10rpx; color: #a64935; background: #f8e8e1; border-radius: 4rpx; font-size: 19rpx; }
  .benefit-desc, .benefit-meta { display: block; margin-top: 8rpx; color: #65756a; font-size: 22rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .benefit-meta { color: #1f4a38; }
  .claim, .retry { flex: none; margin: 0; padding: 0 22rpx; height: 58rpx; line-height: 58rpx; border: 0; border-radius: 6rpx; background: #b64b35; color: #fff; font-size: 22rpx; }
  .claim::after, .retry::after { border: 0; }
  .status { flex: none; color: #8a948c; font-size: 22rpx; }
  .empty, .state, .explain { padding: 50rpx 30rpx; text-align: center; color: #778279; font-size: 24rpx; }
  .retry { display: block; margin: 24rpx auto 0; width: 180rpx; }
  .explain { padding: 24rpx 0; text-align: left; line-height: 1.7; }
  .view-tabs, .level-tabs { display: flex; gap: 8rpx; margin: 8rpx 0 18rpx; }
  .view-tab { flex: 1; margin: 0; padding: 0 8rpx; height: 64rpx; line-height: 64rpx; border: 0; border-radius: 4rpx; background: transparent; color: #65756a; font-size: 23rpx; }
  .view-tab::after { border: 0; }
  .view-tab.active { background: #e2eee6; color: #1f4a38; font-weight: 600; }
  .claim[disabled] { opacity: .5; }
</style>
