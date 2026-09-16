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
  /logo: 'https:\/\/static\.teaworthshare\.com\/[^']+'/,
  'the settings logo should use the remote CDN so it is not bundled into the mini program',
);
assert.match(appStoreSource, /copyright: '好茶不忍独享'/);
assert.match(appStoreSource, /copytime: 'Copyright© 2026 不忍独享'/);
assert.doesNotMatch(
  settingSource,
  /\{\{ appInfo\.name \}\}/,
  'the full brand image already contains the Chinese and English names',
);

console.log('branding checks passed');
