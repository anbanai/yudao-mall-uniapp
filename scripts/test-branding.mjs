import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(projectRoot, 'manifest.json'), 'utf8'));
const pages = JSON.parse(await readFile(resolve(projectRoot, 'pages.json'), 'utf8'));
const packageInfo = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
const appStore = await readFile(resolve(projectRoot, 'sheep/store/app.js'), 'utf8');
const configSource = await readFile(resolve(projectRoot, 'sheep/config/index.js'), 'utf8');
const settingsPage = await readFile(resolve(projectRoot, 'pages/public/setting.vue'), 'utf8');

assert.equal(manifest.name, '好茶引力');
assert.equal(manifest.h5.title, '好茶引力');
assert.equal(pages.globalStyle.navigationBarTitleText, '好茶引力');
assert.equal(packageInfo.displayName, '好茶引力');
assert.match(appStore, /image: shareCover\.default \|\| shopLogo/);
assert.match(configSource, /\[好茶引力 \$\{version\}\]/);
assert.match(appStore, /let shopLogo = '\/static\/logo\.png'/);
assert.match(appStore, /new URL\('\.\.\/\.\.\/static\/logo\.png', import\.meta\.url\)\.href/);
assert.match(settingsPage, /:src="appInfo\.logo"/);
await access(resolve(projectRoot, 'static/logo.png'));

const { android, ios } = manifest['app-plus'].distribute.icons;
const iconPaths = new Set([
  ...Object.values(android),
  ios.appstore,
  ...Object.values(ios.ipad),
  ...Object.values(ios.iphone),
]);
await Promise.all([...iconPaths].map((path) => access(resolve(projectRoot, path))));

console.log('branding checks passed');
