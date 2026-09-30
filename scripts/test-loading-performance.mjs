import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [home, list, detail, detailContent] = await Promise.all([
  read('pages/index/index.vue'),
  read('pages/goods/list.vue'),
  read('pages/goods/index.vue'),
  read('pages/goods/components/detail/detail-content-card.vue'),
]);

assert.doesNotMatch(home, /<view v-if="template">/, 'home must render a stable shell while the template loads');
assert.match(home, /onPullDownRefresh[\s\S]*productGroupRefreshKey\.value \+= 1/, 'pull-to-refresh must still refresh home product blocks');
const onShowBody = home.match(/onShow\([\s\S]*?\n  \}\);/)?.[0] || '';
assert.doesNotMatch(onShowBody, /productGroupRefreshKey\.value \+= 1/, 'onShow must not clear and reload every home product block');
assert.match(home, /首页加载中|home-loading|home-skeleton/, 'home needs a stable loading placeholder');

assert.match(list, /isLoading|requestGeneration|loading/, 'list loading must have a request guard');
assert.match(list, /state\.pagination\.list = concat\(/, 'products must be committed before optional settlement data');
assert.match(list, /getSettlementProduct[\s\S]*\.then|void OrderApi\.getSettlementProduct/, 'settlement data must be supplemental');
assert.doesNotMatch(list, /await OrderApi\.getSettlementProduct/, 'list rendering must not wait for settlement data');
assert.doesNotMatch(list, /@getHeight="mountMasonry/, 'card measurement must not gate list insertion');

assert.match(detail, /state\.skeletonLoading = false/, 'detail core data must end the skeleton');
assert.match(detailContent, /\$url\.thumb|lazy-load/, 'detail content images must use thumbnails and lazy loading');
assert.match(detailContent, /isSigned/, 'detail content must preserve signed media URLs');

console.log('loading performance regression checks passed');
