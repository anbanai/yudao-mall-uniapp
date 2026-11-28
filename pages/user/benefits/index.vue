<template>
  <s-layout title="会员权益中心" :bgStyle="{ color: '#F7F8F3' }">
    <view class="page">
      <s-member-center :key="memberSession">
        <view v-if="user.isFormalLogin" class="member-card-details">
          <view class="member-card-actions">
            <text v-if="state.overview">购物返积分 {{ multiplierText }} 倍</text>
            <button class="ss-reset-button points-link" @tap="openPoints">积分明细 ›</button>
          </view>
          <text v-if="state.overview" class="card-note">
            按确认收货后的商品实付金额计算，不含运费
          </text>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <view class="asset-recovery">
          <button v-if="!user.isFormalLogin" @tap="loginForRecovery">微信登录，查看旧资产</button>
          <button v-else-if="recoveryState.needsRefresh" :disabled="recoveryState.busy" @tap="refreshOnly">
            资产显示未更新，重新刷新
          </button>
          <button
            v-else
            open-type="getPhoneNumber"
            :disabled="recoveryState.busy"
            :loading="recoveryState.busy"
            @getphonenumber="recover"
          >
            授权微信手机号，恢复旧资产
          </button>
          <text class="recovery-note">按本人微信授权手机号匹配，旧积分累加、等级取高</text>
          <view v-if="user.isFormalLogin && recoveryState.message" class="recovery-message" aria-live="polite">
            {{ recoveryState.message }}
          </view>
        </view>
        <!-- #endif -->
      </s-member-center>

      <view v-if="state.loading" class="state">正在加载权益...</view>
      <view v-else-if="state.error" class="state">
        <text>权益暂时无法加载</text>
        <button class="retry" @tap="load">重新加载</button>
      </view>
      <view v-else-if="state.overview">
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
    </view>
  </s-layout>
</template>

<script setup>
  import { computed, reactive, watch } from 'vue';
  import { onShow } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import BenefitApi from '@/sheep/api/member/benefit';
  import { sessionEpoch } from '@/sheep/helper/sessionEpoch.mjs';
  // #ifdef MP-WEIXIN
  import UserApi from '@/sheep/api/member/user';
  import { createRecovery } from '@/sheep/helper/member.mjs';
  import { showAuthModal } from '@/sheep/hooks/useModal';
  // #endif

  const tabs = [{ key: 'mine', name: '我的权益' }, { key: 'levels', name: '等级对比' }];
  const user = sheep.$store('user');
  const memberSession = computed(sessionEpoch);
  const state = reactive({ loading: true, error: false, view: 'mine', selectedLevel: 1, overview: null });
  let overviewRequestId = 0;
  const selectedLevel = computed(() => state.overview?.levels.find((item) => item.level === state.selectedLevel));
  const visibleBenefits = computed(() => (state.view === 'mine' ? state.overview?.benefits : selectedLevel.value?.benefits) || []);
  const multiplierText = computed(() => ((state.overview?.pointTradeGiveMultiplier || 1000) / 1000).toFixed(1));

  // #ifdef MP-WEIXIN
  const recoveryState = reactive({ busy: false, needsRefresh: false, message: '' });
  const loginForRecovery = () => showAuthModal('wechatLogin');
  const { recover, refreshOnly } = createRecovery(recoveryState, {
    formal: () => user.isFormalLogin,
    login: loginForRecovery,
    epoch: sessionEpoch,
    submit: UserApi.recoverYouzanAssets,
    refresh: async () => {
      await Promise.all([user.getInfo(), loadOverview()]);
    },
  });
  // #endif

  watch([sessionEpoch, () => user.isFormalLogin], ([, formal]) => {
    overviewRequestId++;
    state.overview = null;
    state.loading = false;
    state.error = false;
    // #ifdef MP-WEIXIN
    recoveryState.message = '';
    recoveryState.needsRefresh = false;
    // #endif
    if (formal) void load();
  });

  function iconText(item) {
    if (item.code === 'POINT_MULTIPLIER') return '分';
    if (item.code?.includes('BIRTHDAY')) return '生';
    if (item.code?.includes('QUARTER')) return '季';
    return '礼';
  }
  function openPoints() { uni.navigateTo({ url: '/pages/user/wallet/score' }); }
  function switchView(view) { state.view = view; }
  async function loadOverview({ showLoading = false } = {}) {
    const owner = sessionEpoch();
    const requestId = ++overviewRequestId;
    const isCurrent = () => sessionEpoch() === owner && requestId === overviewRequestId;
    if (showLoading) {
      state.loading = true;
      state.error = false;
    }
    try {
      const result = await BenefitApi.getOverview();
      if (!isCurrent()) return;
      if (result?.code !== 0) throw new Error('权益加载失败');
      state.overview = result.data || { benefits: [], levels: [] };
      state.selectedLevel = state.overview.level || 1;
      state.error = false;
    } catch (error) {
      if (!isCurrent()) return;
      if (state.loading) state.error = true;
      throw error;
    } finally {
      if (isCurrent()) state.loading = false;
    }
  }

  async function load() {
    const requests = [loadOverview({ showLoading: true })];
    if (user.isFormalLogin) {
      requests.push(user.getInfo());
    }
    await Promise.allSettled(requests);
  }
  onShow(load);
</script>

<style lang="scss" scoped>
  .page { padding: 28rpx 30rpx 60rpx; color: #17211b; }
  .member-card-details { margin-top: 24rpx; font-size: 24rpx; }
  .member-card-actions, .benefit-title { display: flex; align-items: center; justify-content: space-between; }
  .points-link { margin-left: auto; color: #1f4a38; font-size: 24rpx; }
  .card-note, .level-requirement { display: block; margin-top: 10rpx; color: #65756a; font-size: 21rpx; }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; margin: 44rpx 0 18rpx; }
  .asset-recovery { margin-top: 24rpx; }
  .asset-recovery button { background: #e2eee6; color: #1f4a38; font-size: 26rpx; }
  .recovery-note, .recovery-message { display: block; margin-top: 12rpx; color: #65756a; font-size: 23rpx; line-height: 1.5; }
  .recovery-message { color: #1f4a38; }
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
