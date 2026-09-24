<template>
  <s-layout title="统一账户与手机号共享">
    <view class="identity-settings">
      <text class="heading">您决定手机号是否共享</text>
      <text>{{ disclosure }}</text>
      <text v-if="loading">正在读取授权状态…</text>
      <template v-else-if="status">
        <text>账户关联：{{ status.linked ? '已关联' : '未关联' }}</text>
        <text v-if="status.maskedPhone">已验证手机号：{{ status.maskedPhone }}</text>
        <button v-if="privacyUrl" @tap="sheep.$router.go(privacyUrl)">查看共享隐私说明</button>
        <text>手机号共享：{{ status.phoneSharing ? '已开启' : '未开启' }}</text>
        <text v-if="!status.linked">请从茶多酚选择商城并授权关联后，再管理手机号共享。</text>
        <text v-else-if="!status.phoneVerified">您可在需要时完成商城手机号验证，再选择是否同步。</text>
        <button v-if="canEnable" :disabled="saving" @tap="enable">查看说明并选择是否同意</button>
        <button v-if="status.phoneSharing" :disabled="saving" @tap="revoke">撤销手机号共享</button>
        <text v-if="status.phoneSharing">撤销将停止后续同步，不会删除依法留存的交易资料。</text>
      </template>
      <text v-else>当前暂无法读取共享服务。您可继续浏览商城，稍后再试。</text>
      <text v-if="notice">{{ notice }}</text>
      <button :disabled="loading || saving" @tap="load">刷新状态</button>
    </view>
  </s-layout>
</template>
<script setup>
  import { computed, ref } from 'vue';
  import { onShow } from '@dcloudio/uni-app';
  import sheep from '@/sheep';
  import IdentityApi from '@/sheep/api/member/identity';
  import { offerPhoneSharing } from '@/sheep/hooks/useIdentityConsent';
  import { canOfferPhoneSharing, phoneSharingDisclosure } from '@/sheep/helper/identityConsent.mjs';
  import { sessionEpoch, isCurrentSession } from '@/sheep/helper/identitySession.mjs';
  const status = ref(null), loading = ref(false), saving = ref(false), notice = ref('');
  const disclosure = computed(() => phoneSharingDisclosure(status.value || {}));
  const privacyUrl = computed(() => /^https:\/\//.test(status.value?.phoneSharingPrivacyUrl || '') ? status.value.phoneSharingPrivacyUrl : '');
  const canEnable = computed(() => canOfferPhoneSharing(status.value));
  async function load() {
    status.value = null;
    if (!sheep.$store('user').isLogin) return;
    const epoch = sessionEpoch();
    loading.value = true;
    try {
      const response = await IdentityApi.status();
      if (isCurrentSession(epoch) && response?.code === 0) status.value = response.data;
    } finally { loading.value = false; }
  }
  async function enable() {
    saving.value = true;
    try { await offerPhoneSharing(); await load(); }
    finally { saving.value = false; }
  }
  async function revoke() {
    saving.value = true;
    notice.value = '';
    try {
      const result = await IdentityApi.setPhoneSharing(false);
      notice.value = result?.code === 0 ? '已撤销手机号共享' : '暂未撤销成功，请稍后重试';
      await load();
    } finally { saving.value = false; }
  }
  onShow(load);
</script>
<style lang="scss" scoped>
  .identity-settings { padding: 36rpx; display: flex; flex-direction: column; gap: 28rpx; font-size: 32rpx; line-height: 1.75; }
  .heading { font-size: 38rpx; font-weight: 600; }
  button { width: 100%; font-size: 32rpx; min-height: 88rpx; }
</style>
