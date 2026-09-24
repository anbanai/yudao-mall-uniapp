import { offerPhoneSharing } from '@/sheep/hooks/useIdentityConsent';
import sheep from '@/sheep';

export async function authorizePhoneNumber(detail) {
  if (detail?.errMsg !== 'getPhoneNumber:ok') {
    return false;
  }

  const userStore = sheep.$store('user');
  const provider = sheep.$platform.useProvider();
  const success = userStore.isLogin
    ? await provider.bindUserPhoneNumber(detail)
    : await provider.mobileLogin(detail);
  if (!success) {
    return false;
  }

  await userStore.getInfo();
  void offerPhoneSharing();
  return true;
}
