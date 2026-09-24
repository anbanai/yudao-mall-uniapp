export const PHONE_SHARING_PURPOSE = '共享给茶多酚统一账户，用于已授权关联商城登录';
export function canOfferPhoneSharing(status) {
  return status?.linked === true && status.phoneVerified === true && status.phoneSharing === false && status.enabled !== false
    && typeof status.phoneSharingConsentRevision === 'string' && /^[a-f0-9]{64}$/.test(status.phoneSharingConsentRevision);
}
export function phoneSharingDisclosure(status = {}) {
  const operatorName = status.identityOperatorName || status.operatorName;
  const operator = operatorName ? `接收方运营主体：${operatorName}。` : '';
  const policy = status.phoneSharingConsentText ? `${status.phoneSharingConsentText}。` : '';
  const version = status.phoneSharingPolicyVersion ? `授权版本：${status.phoneSharingPolicyVersion}。` : '';
  const purpose = status.purpose ? `具体用途：${status.purpose}。` : '';
  return `${PHONE_SHARING_PURPOSE}。${operator}${purpose}${policy}${version}仅同步已验证手机号，可在“统一账户与手机号共享”中随时撤销；不同意不影响商城浏览。`;
}
export async function requestPhoneSharingConsent({ status, confirm, save, current = () => true }) {
  if (!canOfferPhoneSharing(status) || !current()) return false;
  const consentSnapshot = { ...status };
  if (!(await confirm(phoneSharingDisclosure(consentSnapshot))) || !current()) return false;
  const result = await save(true, consentSnapshot.phoneSharingConsentRevision);
  return current() && result?.code === 0;
}
