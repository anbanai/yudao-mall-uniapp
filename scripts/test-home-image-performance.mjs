import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [column, swiper, banner, imageBlock, appStore] = await Promise.all([
  read('sheep/components/s-goods-column/s-goods-column.vue'),
  read('sheep/ui/su-swiper/su-swiper.vue'),
  read('sheep/components/s-image-banner/s-image-banner.vue'),
  read('sheep/components/s-image-block/s-image-block.vue'),
  read('sheep/store/app.js'),
]);

assert.match(column, /\$url\.thumb\(/, 'goods cards should use thumbnail URLs');
assert.match(column, /lazy-load/, 'goods card images should use native lazy loading');
assert.match(swiper, /:lazy-load="item\.lazyLoad"/, 'swiper should support per-item lazy loading');
assert.match(banner, /lazyLoad: index !== 0/, 'the first banner image should remain eager');
assert.match(imageBlock, /\$url\.thumb\(/, 'image bars should use thumbnail URLs');
assert.doesNotMatch(appStore, /file\.sheepjs\.com|filesystem:\s*'qcloud'/);

console.log('home image performance checks passed');
