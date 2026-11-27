import { computed, ref, watch } from 'vue';
import sheep from '@/sheep';

export function useUserAvatar(getAvatar) {
  const avatarLoadError = ref(false);
  const sourceUrl = computed(() => sheep.$url.cdn(getAvatar()));
  const defaultAvatarUrl = sheep.$url.static('/static/member-center/guest.jpg');
  const avatarUrl = computed(() => (!avatarLoadError.value && sourceUrl.value) || defaultAvatarUrl);

  watch(sourceUrl, retryAvatar);

  function retryAvatar() {
    avatarLoadError.value = false;
  }

  function onAvatarError() {
    avatarLoadError.value = true;
  }

  return { avatarUrl, onAvatarError, retryAvatar };
}
