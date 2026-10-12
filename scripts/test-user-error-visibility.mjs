import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => readFile(resolve(scriptDir, '..', relativePath), 'utf8');

const request = await read('sheep/request/index.js');
const userApi = await read('sheep/api/member/user.js');
const userStore = await read('sheep/store/user.js');
const userPage = await read('pages/index/user.vue');
const userInfoPage = await read('pages/user/info.vue');

assert.match(
  request,
  /if \(error\.config\.custom\.showError\) \{\s*return Promise\.reject\(error\);/s,
  '显示错误的请求必须保留 rejected 状态，让页面能够处理真实失败原因',
);
assert.match(userApi, /url: '\/member\/user\/get'/);
assert.match(userApi, /showError: true/);
assert.match(
  userStore,
  /if \(!response \|\| response\.code !== 0\) \{[\s\S]*throw error;/,
  '用户信息接口失败时必须抛出错误，不能继续使用空用户数据',
);
assert.match(userPage, /用户信息加载失败/);
assert.match(userPage, /console\.error\('\[用户中心\] 用户信息加载失败'/);
assert.match(userPage, /@clickAction="refreshUserData"/);
assert.match(userInfoPage, /state\.loadError/);
assert.match(userInfoPage, /@clickAction="getUserInfo"/);
assert.match(userInfoPage, /console\.error\('\[用户资料\] 用户信息加载失败'/);

console.log('user error visibility checks passed');
