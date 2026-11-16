import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appStore = await readFile(new URL('../sheep/store/app.js', import.meta.url), 'utf8');
const share = await readFile(new URL('../sheep/platform/share.js', import.meta.url), 'utf8');
const layout = await readFile(new URL('../sheep/components/s-layout/s-layout.vue', import.meta.url), 'utf8');

assert.match(appStore, /shopro\.share\.cover/);
assert.match(appStore, /JSON\.parse\(result\.data\)/);
assert.match(share, /getConfiguredCover/);
assert.match(share, /SharePageEnum\.USER/);
assert.match(share, /SharePageEnum\.CUSTOM/);
assert.match(layout, /sharePage/);
console.log('share cover configuration check passed');
