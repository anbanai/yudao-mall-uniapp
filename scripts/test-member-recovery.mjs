import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { createRecovery, discountText, getMemberProgress, getRecoveryMessage } from '../sheep/helper/member.mjs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const levels = [1, 2, 3, 4, 5].map((level) => ({ level, experience: level * 100, discountPercent: 100 - level }));
for (const tier of levels) {
  test(`第 ${tier.level} 档按成长值升级，只应用当前折扣`, () => {
    const reversed = levels.toReversed();
    const progress = getMemberProgress({ point: 9999, experience: tier.experience + 17, level: { level: tier.level } }, reversed);
    assert.deepEqual(progress.levels, levels);
    assert.equal(reversed[0].level, 5);
    assert.equal(progress.remaining, tier.level < 5 ? 83 : 0);
    assert.equal(progress.next?.level, tier.level < 5 ? tier.level + 1 : undefined);
    assert.equal(progress.isHighest, tier.level === 5);
    assert.equal(discountText(progress.discount), `会员折扣 ${tier.discountPercent / 10} 折`);
  });
}
test('未定级、空配置和越过下一档门槛', () => {
  assert.equal(getMemberProgress({ experience: 30, point: 4000 }, levels).remaining, 70);
  assert.equal(getMemberProgress({ level: levels[0] }, []).isHighest, false);
  assert.equal(getMemberProgress({ experience: 600, level: levels[1] }, levels).remaining, 0);
  assert.match(discountText(null), /暂不可用/);
  assert.match(discountText(100), /暂无会员折扣/);
});

const authorized = (code) => ({ detail: { errMsg: 'getPhoneNumber:ok', code } });
function harness(overrides = {}) {
  const state = { busy: false, needsRefresh: false, message: '' };
  const calls = { login: 0, codes: [], refresh: 0 };
  const handlers = createRecovery(state, {
    formal: () => true, login: () => ++calls.login, epoch: () => 1,
    submit: async (code) => { calls.codes.push(code); return { code: 0, data: { status: 'RESTORED', addedPoint: 100 } }; },
    refresh: async () => { calls.refresh++; }, ...overrides,
  });
  return { ...handlers, state, calls };
}
test('技术会话不是正式登录；拒绝和缺少授权码不提交', async () => {
  const guest = harness({ formal: () => false });
  await guest.recover(authorized('one'));
  assert.deepEqual(guest.calls, { login: 1, codes: [], refresh: 0 });
  const member = harness();
  for (const event of [undefined, { detail: { code: 'unused', errMsg: 'getPhoneNumber:fail user deny' } }, authorized(' ')]) await member.recover(event);
  assert.deepEqual(member.calls.codes, []);
  assert.match(member.state.message, /未授权/);
});
test('并发点击和重复回调不重发；成功立即刷新', async () => {
  const member = harness();
  const run = member.recover(authorized('one'));
  assert.equal(member.state.busy, true);
  await member.recover(authorized('two'));
  await run;
  await member.recover(authorized('one'));
  assert.deepEqual(member.calls.codes, ['one']);
  assert.equal(member.calls.refresh, 1);
  assert.match(member.state.message, /新增 100 积分/);
});
test('中断后使用新的微信 code，重复领取只刷新不本地加分', async () => {
  const codes = [];
  const member = harness({ submit: async (code) => {
    codes.push(code);
    if (code === 'first') throw Error('offline');
    return { code: 0, data: { status: 'ALREADY_RESTORED' } };
  } });
  await member.recover(authorized('first'));
  assert.match(member.state.message, /重新授权/);
  await member.recover(authorized('first'));
  await member.recover(authorized('fresh'));
  assert.deepEqual(codes, ['first', 'fresh']);
  assert.equal(member.calls.refresh, 1);
  assert.match(member.state.message, /无需重复/);
});
test('刷新失败保留已确认结果，只重试读取', async () => {
  let reads = 0;
  const member = harness({ refresh: async () => { if (++reads === 1) throw Error('offline'); } });
  await member.recover(authorized('once'));
  assert.equal(member.state.needsRefresh, true);
  assert.match(member.state.message, /恢复成功/);
  await member.recover(authorized('never-submit'));
  await member.refreshOnly();
  assert.deepEqual(member.calls.codes, ['once']);
  assert.equal(reads, 2);
  assert.equal(member.state.needsRefresh, false);
});
test('切换账号不回写旧请求', async () => {
  let epoch = 1;
  const member = harness({ epoch: () => epoch });
  const pending = member.recover(authorized('old'));
  epoch++;
  await pending;
  assert.equal(member.calls.refresh, 0);
  assert.equal(member.state.message, '');
});
test('业务失败、未匹配和未知返回不显示到账', async () => {
  for (const [result, pattern] of [[{ code: 12 }, /未确认/], [{ code: 403 }, /用微信手机号重新登录/], [{ code: 0, data: { status: 'NOT_FOUND' } }, /暂未匹配/], [{ code: 0 }, /暂不可用/]]) {
    const member = harness({ submit: async () => result });
    await member.recover(authorized('one'));
    assert.match(member.state.message, pattern);
    assert.equal(member.calls.refresh, 0);
  }
  assert.match(getRecoveryMessage(), /暂不可用/);
});
test('恢复 API 只提交 code；禁止 401 自动重放', async () => {
  const api = Function('request', source('sheep/api/member/user.js').replace(/^import .*?;\n/, '').replace('export default UserApi;', 'return UserApi;'))((config) => config);
  const config = await api.recoverYouzanAssets('synthetic');
  assert.deepEqual(config.data, { code: 'synthetic' });
  assert.equal(config.url, '/member/user/recover-youzan-assets');
  assert.equal(config.method, 'POST');
  for (const flag of ['auth', 'formalAuth', 'noRefresh']) assert.equal(config.custom[flag], true);
});
test('完整会员卡和恢复入口一同迁入会员权益中心', () => {
  const userPage = source('pages/index/user.vue');
  assert.doesNotMatch(userPage, /<s-member-center\b/);
  assert.match(userPage, /<s-block\b/);
  const card = source('sheep/components/s-member-center/s-member-center.vue');
  const benefitsPage = source('pages/user/benefits/index.vue');
  const memberCard = benefitsPage.match(/<s-member-center\b[^>]*>([\s\S]*?)<\/s-member-center>/)?.[1];
  assert.ok(memberCard, '会员权益中心应挂载完整会员卡');
  const phoneButton = /open-type="getPhoneNumber"[^>]+@getphonenumber="recover"/;
  assert.match(memberCard, phoneButton);
  assert.match(memberCard, /旧积分累加、等级取高/);
  assert.match(memberCard, /recoveryState\.message/);
  assert.match(card, /好茶引力/);
  assert.match(card, /可用积分/);
  assert.match(card, /成长值/);
  assert.match(card, /当前生效权益/);
  assert.match(card, /<slot\s*\/>/);
  assert.match(benefitsPage, /showAuthModal\('wechatLogin'\)/);
  assert.doesNotMatch(benefitsPage, /smsLogin|<input/);
});

test('权益概览加载失败时仍可使用恢复入口', () => {
  const template = source('pages/user/benefits/index.vue').split('</template>\n\n<script setup>')[0];
  assert.match(
    template,
    /<s-member-center\b(?![^>]*v-(?:if|else))[^>]*>[\s\S]*?<view class="asset-recovery">[\s\S]*?<\/s-member-center>\s*<view v-if="state\.loading"/,
    '恢复入口应独立于概览的加载和错误分支',
  );
});

test('原地换号立即清空旧概览，并忽略旧账号未完成的请求', async () => {
  const setup = source('pages/user/benefits/index.vue')
    .split('<script setup>')[1].split('</script>')[0].replace(/^\s*import .*$/gm, '');
  const epoch = ref(1);
  const user = reactive({ isFormalLogin: true, userInfo: { id: 1 } });
  const pending = [];
  let showPage;
  const page = runInNewContext(setup + '\n;({ state })', {
    computed, reactive, watch, createRecovery,
    sheep: { $store: () => user },
    UserApi: { recoverYouzanAssets() {} },
    BenefitApi: { getOverview: () => new Promise((resolve) => pending.push(resolve)) },
    onShow(callback) { showPage = callback; },
    sessionEpoch: () => epoch.value,
    showAuthModal() {},
  });
  const overview = (point) => ({ code: 0, data: { point, levels: [], benefits: [] } });
  const firstLoad = showPage();
  pending.shift()(overview(100));
  await firstLoad;
  assert.equal(page.state.overview.point, 100);

  const oldLoad = showPage();
  const respondToOldLoad = pending.shift();
  epoch.value++;
  user.isFormalLogin = false;
  await nextTick();
  assert.equal(page.state.overview, null);

  user.userInfo.id = 2;
  user.isFormalLogin = true;
  await nextTick();
  assert.equal(pending.length, 1, '新账号应自动读取积分和等级');
  pending.shift()(overview(50));
  await nextTick();
  respondToOldLoad({ code: 500 });
  await oldLoad;
  assert.equal(page.state.overview.point, 50);
  assert.equal(page.state.error, false);
});

test('商品详情品牌无 ID 时仍显示品牌名', () => {
  assert.match(source('pages/goods/index.vue'), /v-if="state\.goodsInfo\.brandName"[^>]*>品牌：{{ state\.goodsInfo\.brandName }}/);
});
