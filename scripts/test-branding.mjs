import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appStoreSource = await readFile(resolve(projectRoot, 'sheep/store/app.js'), 'utf8');
const settingSource = await readFile(resolve(projectRoot, 'pages/public/setting.vue'), 'utf8');

assert.match(appStoreSource, /name: '不忍独享'/);
assert.match(
  appStoreSource,
  /logo: 'https:\/\/teaworthshare\.oss-cn-chengdu\.aliyuncs\.com\/20260820\/%E4%B8%8D%E5%BF%8D%E7%8B%AC%E4%BA%AB%20%20%E6%B0%B4%E5%8D%B0-06\.png'/,
  'the settings logo should stay remote so it is not bundled into the mini program',
);
assert.match(appStoreSource, /copyright: '好茶不忍独享'/);
assert.match(appStoreSource, /copytime: 'Copyright© 2026 不忍独享'/);
assert.doesNotMatch(
  settingSource,
  /\{\{ appInfo\.name \}\}/,
  'the full brand image already contains the Chinese and English names',
);

console.log('branding checks passed');
