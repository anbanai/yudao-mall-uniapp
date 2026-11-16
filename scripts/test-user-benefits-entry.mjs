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
