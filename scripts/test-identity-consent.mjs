import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { canOfferPhoneSharing, requestPhoneSharingConsent, phoneSharingDisclosure } from '../sheep/helper/identityConsent.mjs';
const revision = 'a'.repeat(64);
const status = { linked: true, phoneSharing: false, phoneVerified: true, phoneSharingConsentRevision: revision };
test('phone sync requires linked verified identity and available service', () => {
  for (const value of [null, {}, {...status,linked:false}, {...status,phoneVerified:false}, {...status,phoneSharing:true}, {...status,enabled:false}]) assert.equal(canOfferPhoneSharing(value),false);
  assert.equal(canOfferPhoneSharing(status),true);
});
test('decline does not write consent and approval writes explicit true', async () => {
  const saves=[];
  const save=async (...values)=>{saves.push(values);return {code:0}};
  assert.equal(await requestPhoneSharingConsent({status,confirm:async()=>false,save}),false);
  assert.deepEqual(saves,[]);
  assert.equal(await requestPhoneSharingConsent({status,confirm:async()=>true,save}),true);
  assert.deepEqual(saves,[[true,revision]]);
});
test('account change while consent dialog is open prevents saving', async () => {
  let current=true,calls=0;
  await requestPhoneSharingConsent({status,current:()=>current,confirm:async()=>{current=false;return true},save:async()=>{calls++}});
  assert.equal(calls,0);
});
test('disclosure identifies recipient purpose and revocation',()=>{
  const text=phoneSharingDisclosure({operatorName:'商城运营方',purpose:'关联登录'});
  for (const phrase of ['共享给茶多酚统一账户，用于已授权关联商城登录','商城运营方','关联登录','随时撤销']) assert.ok(text.includes(phrase));
});
test('missing or malformed consent revision never offers a dialog or writes sharing', async () => {
  for (const phoneSharingConsentRevision of [undefined, null, '', 'a'.repeat(63), 'g'.repeat(64)]) {
    const oldStatus = { ...status, phoneSharingConsentRevision };
    assert.equal(canOfferPhoneSharing(oldStatus), false);
    assert.equal(await requestPhoneSharingConsent({
      status: oldStatus,
      confirm: async () => assert.fail('unversioned consent must not be offered'),
      save: async () => assert.fail('unversioned consent must not be saved'),
    }), false);
  }
});
test('status changes while modal is open cannot replace the displayed consent revision', async () => {
  const mutableStatus = { ...status, identityOperatorName: '原接收方', phoneSharingConsentText: '原授权说明' };
  const saves = [];
  assert.equal(await requestPhoneSharingConsent({
    status: mutableStatus,
    confirm: async (content) => {
      assert.ok(content.includes('原接收方'));
      assert.ok(content.includes('原授权说明'));
      mutableStatus.identityOperatorName = '新接收方';
      mutableStatus.phoneSharingConsentText = '新授权说明';
      mutableStatus.phoneSharingConsentRevision = 'b'.repeat(64);
      return true;
    },
    save: async (...values) => { saves.push(values); return { code: 0 }; },
  }), true);
  assert.deepEqual(saves, [[true, revision]]);
});
test('identity API transmits the displayed revision while withdrawal needs no revision', async () => {
  const requests = [];
  const source = readFileSync(new URL('../sheep/api/member/identity.js', import.meta.url), 'utf8')
    .replace("import request from '@/sheep/request';", '').replace('export default', 'return');
  const api = new Function('request', source)(async (options) => { requests.push(options); return { code: 0 }; });
  await api.setPhoneSharing(true, revision);
  await api.setPhoneSharing(false);
  assert.equal(requests[0].url, '/member/identity/phone-sharing');
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].data, { enabled: true, consentRevision: revision });
  assert.equal(requests[1].data.enabled, false);
  assert.equal(requests[1].data.consentRevision, undefined);
});
