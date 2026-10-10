import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [home, list, detail, detailContent] = await Promise.all([
  read('pages/index/index.vue'),
  read('pages/goods/list.vue'),
  read('pages/goods/index.vue'),
  read('pages/goods/components/detail/detail-content-card.vue'),
]);

assert.match(
  home,
  /homeTemplateReady|homeComponents/,
  'home must expose an explicit template readiness check',
);
assert.match(
  home,
  /v-if="homeTemplateReady"[\s\S]*<view v-else class="home-loading"/,
  'home must render a loading shell before template components are available',
);
assert.doesNotMatch(
  home,
  /<s-block\s+v-if="template"/,
  'home component rendering must not use the default template object as readiness',
);
assert.match(
  home,
  /onPullDownRefresh[\s\S]*productGroupRefreshKey\.value \+= 1/,
  'pull-to-refresh must still refresh home product blocks',
);
const onShowBody = home.match(/onShow\([\s\S]*?\n  \}\);/)?.[0] || '';
assert.doesNotMatch(
  onShowBody,
  /productGroupRefreshKey\.value \+= 1/,
  'onShow must not clear and reload every home product block',
);
assert.match(
  home,
  /首页加载中|home-loading|home-skeleton/,
  'home needs a stable loading placeholder',
);

assert.match(list, /isLoading|requestGeneration|loading/, 'list loading must have a request guard');
assert.match(
  list,
  /state\.pagination\.list = concat\(/,
  'products must be committed before optional settlement data',
);
assert.match(
  list,
  /getSettlementProduct[\s\S]*\.then|void OrderApi\.getSettlementProduct/,
  'settlement data must be supplemental',
);
assert.doesNotMatch(
  list,
  /await OrderApi\.getSettlementProduct/,
  'list rendering must not wait for settlement data',
);
assert.doesNotMatch(
  list,
  /@getHeight="mountMasonry/,
  'card measurement must not gate list insertion',
);
assert.match(
  list,
  /appendSettlementProduct\(data\.list, res\.data\)/,
  'settlement supplements only the current page results',
);
assert.doesNotMatch(
  list,
  /appendSettlementProduct\(state\.pagination\.list, res\.data\)/,
  'settlement must not scan the accumulated list',
);

assert.match(detail, /state\.skeletonLoading = false/, 'detail core data must end the skeleton');
assert.match(detailContent, /\$url\.thumb/, 'detail content images must use thumbnails');
assert.match(
  detailContent,
  /<mp-html[^>]*lazy-load/,
  'detail rich text must enable image lazy loading',
);
assert.match(
  detailContent,
  /typeof props\.content === 'string'/,
  'detail content must tolerate empty API values',
);
assert.match(detailContent, /isSigned/, 'detail content must preserve signed media URLs');

console.log('loading performance regression checks passed');
