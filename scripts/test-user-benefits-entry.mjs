import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const userPage = await readFile(resolve(scriptDir, '../pages/index/user.vue'), 'utf8');
const benefitsPage = await readFile(resolve(scriptDir, '../pages/user/benefits/index.vue'), 'utf8');
const benefitApi = await readFile(resolve(scriptDir, '../sheep/api/member/benefit.js'), 'utf8');

assert.equal(
  userPage.includes('/pages/user/benefits/index'),
  true,
  '用户中心应显示会员权益中心入口',
);
assert.match(userPage, /注册会员\s+尊享权益/, '会员卡主标题应与参考图一致');
assert.match(
  userPage,
  /限时专属新人礼 \| 新人专属积分 \| 15项会员权益/,
  '会员卡权益文案应与参考图一致',
);
assert.match(userPage, /else showAuthModal\(\)/, '游客点击注册会员卡应打开登录授权弹窗');
assert.match(
  userPage,
  /title: '退款\/售后',[\s\S]{0,100}path: '\/pages\/order\/aftersale\/list'/,
  '退款售后入口应打开售后列表',
);
assert.equal(
  (userPage.match(/<image class="shortcut-icon"/g) || []).length,
  2,
  '订单和账户快捷入口都应使用图片素材',
);
assert.match(userPage, /memberNavbarStyle/, '个人中心自定义导航栏应提供标题');
assert.match(userPage, /profile-header\.jpg/, '会员顶部背景应使用提供的素材');
assert.match(userPage, /member-promo\.jpg/, '会员卡应使用提供的素材');
assert.match(
  userPage,
  /memberCenterAsset\('guest\.jpg'\)/,
  '游客默认头像应从会员中心 OSS 素材目录加载',
);
assert.match(userPage, /aria-label="签到" @tap="openCheckin"/, '签到按钮应响应点击');
assert.match(
  userPage,
  /function openCheckin\(\) \{\s*sheep\.\$router\.go\('\/pages\/app\/sign'\);\s*\}/,
  '签到应经过路由守卫，以便游客登录后继续前往签到页',
);
assert.equal(
  userPage.includes('>会员权益中心</button>'),
  false,
  '会员权益中心入口应使用可访问的自定义入口',
);
assert.equal(
  benefitsPage.includes('<s-layout title="会员权益中心"'),
  true,
  '会员权益中心页面应保留，便于后续恢复',
);
assert.match(benefitsPage, /state\.overview\.levels/, '等级对比应使用后端返回的启用等级');
assert.match(benefitsPage, /nextExperience/, '会员权益中心应展示升级经验条件');
assert.doesNotMatch(benefitsPage, /\[1, 2, 3, 4, 5\]/, '等级数量不能硬编码');
assert.doesNotMatch(benefitsPage, /领取记录|function claim\(/, '页面不能展示未实现的领取流程');
assert.doesNotMatch(benefitApi, /getRecords|claim:/, '客户端不能调用未实现的领取接口');

console.log('user benefits entry check passed');
