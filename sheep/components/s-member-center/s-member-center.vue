<template>
  <view class="member-center ss-m-20 ss-p-30">
    <button class="ss-reset-button card-head" @tap="expanded = !expanded">
      <view>
        <view class="member-title">好茶引力</view>
        <view class="ss-flex ss-col-center ss-m-t-16">
          <image v-if="formal && progress.current?.icon" class="badge" :src="sheep.$url.cdn(progress.current.icon)" mode="aspectFit" />
          <text v-else-if="formal && progress.current" class="ss-m-r-12">Lv.{{ progress.current.level }}</text>
          <text>{{ formal ? progress.current?.name || '暂无等级' : '登录查看会员等级' }}</text>
        </view>
      </view>
      <view class="points">可用积分 {{ formal ? user.userInfo.point ?? 0 : '--' }}<view>{{ expanded ? '收起等级卡' : '查看等级卡' }}</view></view>
    </button>
    <view v-if="expanded" class="ss-m-t-24">
      <view v-if="formal">成长值：{{ progress.experience }}</view>
      <view v-if="formal && progress.next">距 {{ progress.next.name }} 还差 {{ progress.remaining }} 成长值</view>
      <view v-else-if="formal && progress.isHighest">您已达到最高等级</view>
      <view v-if="formal">{{ progress.current ? '当前生效权益：' + discountText(progress.discount) : '当前暂无等级权益' }}</view>
      <view v-if="loading">等级信息加载中</view>
      <button v-else-if="loadFailed" @tap="loadLevels">等级信息加载失败，点击重试</button>
      <view v-else-if="!levels.length">会员等级规则即将公布</view>
      <view v-for="tier in progress.levels" :key="tier.level" class="ss-m-t-16">
        {{ tier.name }} · {{ tier.experience }} 成长值 · {{ discountText(tier.discountPercent) }}
        <text v-if="formal && tier.level === progress.current?.level">（当前等级）</text>
      </view>
    </view>
    <!-- #ifdef MP-WEIXIN -->
    <view class="ss-m-t-24">
      <button v-if="!formal" @tap="login">微信登录，查看旧资产</button>
      <button v-else-if="state.needsRefresh" :disabled="state.busy" @tap="refreshOnly">资产显示未更新，重新刷新</button>
      <button v-else open-type="getPhoneNumber" :disabled="state.busy" :loading="state.busy" @getphonenumber="recover">授权微信手机号，恢复旧资产</button>
      <view class="note">按本人微信授权手机号匹配，旧积分累加、等级取高</view>
      <view v-if="formal && state.message" aria-live="polite">{{ state.message }}</view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import sheep from '@/sheep';
  import { showAuthModal } from '@/sheep/hooks/useModal';
  import LevelApi from '@/sheep/api/member/level';
  import UserApi from '@/sheep/api/member/user';
  import { createRecovery, discountText, getMemberProgress } from '@/sheep/helper/member.mjs';
  import { sessionEpoch } from '@/sheep/helper/sessionEpoch.mjs';

  const user = sheep.$store('user');
  const formal = computed(() => user.isFormalLogin);
  const expanded = ref(false);
  const levels = ref([]);
  const loading = ref(false);
  const loadFailed = ref(false);
  const progress = computed(() => getMemberProgress(formal.value ? user.userInfo : {}, levels.value));
  const state = reactive({ busy: false, needsRefresh: false, message: '' });
  const login = () => showAuthModal('wechatLogin');
  const { recover, refreshOnly } = createRecovery(state, {
    formal: () => formal.value, login, epoch: sessionEpoch,
    submit: UserApi.recoverYouzanAssets, refresh: () => user.getInfo(),
  });

  async function loadLevels() {
    if (loading.value) return;
    loading.value = true;
    loadFailed.value = false;
    try {
      const result = await LevelApi.getLevelList();
      if (result?.code !== 0 || !Array.isArray(result.data)) throw new Error('level-list');
      levels.value = result.data;
    } catch {
      loadFailed.value = true;
    } finally {
      loading.value = false;
    }
  }
  onMounted(loadLevels);
</script>

<style scoped>
  .member-center { background: white; border-radius: 20rpx; color: #25362c; }
  .card-head { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; }
  .member-title { font-size: 38rpx; font-weight: 600; }
  .badge { width: 48rpx; height: 48rpx; margin-right: 12rpx; }
  .points { text-align: right; }
  .note { margin-top: 12rpx; color: #65756a; font-size: 24rpx; }
</style>
