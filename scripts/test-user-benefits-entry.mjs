import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const userPage = await readFile(resolve(scriptDir, '../pages/index/user.vue'), 'utf8');
const benefitsPage = await readFile(resolve(scriptDir, '../pages/user/benefits/index.vue'), 'utf8');

assert.equal(
  userPage.includes('/pages/user/benefits/index'),
  false,
  '用户中心不应显示会员权益中心入口',
);
assert.equal(
  userPage.includes('>会员权益中心</button>'),
  false,
  '用户中心不应显示会员权益中心按钮',
);
assert.equal(
  benefitsPage.includes('<s-layout title="会员权益中心"'),
  true,
  '会员权益中心页面应保留，便于后续恢复',
);

console.log('user benefits entry check passed');
