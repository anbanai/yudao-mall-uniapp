import IdentityApi from '@/sheep/api/member/identity';
import { requestPhoneSharingConsent } from '@/sheep/helper/identityConsent.mjs';
import { sessionEpoch, isCurrentSession, isIdentityBlocked } from '@/sheep/helper/identitySession.mjs';
let prompting = false;
export async function offerPhoneSharing() {
  if (prompting || isIdentityBlocked()) return false;
  prompting = true;
  const epoch = sessionEpoch();
  try {
    const result = await IdentityApi.status();
    if (result?.code !== 0) return false;
    return await requestPhoneSharingConsent({
      status: result.data,
      current: () => isCurrentSession(epoch) && !isIdentityBlocked(),
      confirm: (content) => new Promise((resolve) => uni.showModal({
        title: '是否同步已验证手机号？', content,
        confirmText: '同意同步', cancelText: '暂不同意',
        success: (answer) => resolve(answer.confirm === true), fail: () => resolve(false),
      })),
      save: IdentityApi.setPhoneSharing,
    });
  } catch { return false; }
  finally { prompting = false; }
}
