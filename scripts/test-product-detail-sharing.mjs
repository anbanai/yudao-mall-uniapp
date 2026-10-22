import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [goodsPage, pointPage, tabbar, goodsPoster] = await Promise.all([
  read('pages/goods/index.vue'),
  read('pages/goods/point.vue'),
  read('pages/goods/components/detail/detail-tabbar.vue'),
  read('pages/public/components/canvas-poster/poster/goods.js'),
]);

assert.match(goodsPage, /商品分享/);
assert.match(tabbar, /首页/);
assert.match(tabbar, /购物车/);
assert.match(goodsPage, /配送地址/);
assert.match(goodsPage, /快递包邮/);
assert.match(goodsPage, /已售数量/);
assert.match(goodsPage, /剩余库存/);
assert.match(goodsPage, /price:\s*fen2yuan\(state\.goodsInfo\.price\)/);
assert.match(pointPage, /point:\s*getShowPrice\.value\.point/);
assert.match(pointPage, /title:\s*state\.goodsInfo\.name/);
assert.match(
  pointPage,
  /剩余库存 \{\{ state\.selectedSku\.stock \?\? state\.goodsInfo\.stock \?\? 0 \}\} 件/,
);
assert.match(goodsPoster, /poster\.shareInfo\.poster\.point/);
assert.doesNotMatch(tabbar, /收藏/);
assert.doesNotMatch(tabbar, /分享/);

console.log('product detail sharing checks passed');
