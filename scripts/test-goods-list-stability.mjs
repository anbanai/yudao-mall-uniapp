import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const renderHelpers = await import(
  '../sheep/components/s-goods-column/goods-list-render.mjs'
).catch(() => null);
assert.ok(renderHelpers, 'goods list render helpers must exist');

const { appendGoodsToColumns, appendUniqueGoods } = renderHelpers;
const first = { id: 1 };
const second = { id: 2 };
const third = { id: 3 };
const fourth = { id: 4 };
const left = [first];
const right = [second];
const leftReference = left;
const rightReference = right;

appendGoodsToColumns(left, right, [third, fourth]);

assert.equal(left, leftReference, 'pagination must keep the left column array');
assert.equal(right, rightReference, 'pagination must keep the right column array');
assert.deepEqual(left, [first, third], 'new even-indexed goods append to the left column');
assert.deepEqual(right, [second, fourth], 'new odd-indexed goods append to the right column');

const snowflakeId = '1937417281934481409';
const existing = [{ id: snowflakeId }];
const existingReference = existing;
const added = appendUniqueGoods(existing, [{ id: snowflakeId }, { id: '1937417281934481410' }]);
assert.equal(existing, existingReference, 'pagination must keep the source list array');
assert.deepEqual(
  added.map((item) => item.id),
  ['1937417281934481410'],
  'deduplication must preserve large string IDs without numeric precision loss',
);
assert.equal(existing.length, 2, 'only unseen goods are appended');

const column = await import('../sheep/components/s-goods-column/goods-column.mjs');
assert.equal(column.getGoodsImageHeight(345), 345, 'unknown dimensions reserve a square image');
assert.equal(
  column.getGoodsImageHeight(345, { w: 600, h: 300 }),
  172.5,
  'known image dimensions reserve their aspect ratio before loading',
);
assert.equal(
  column.getGoodsImageHeight(345, { w: 0, h: 300 }),
  345,
  'invalid image dimensions fall back to a square image',
);

const [listPage, goodsColumn] = await Promise.all([
  readFile(new URL('../pages/goods/list.vue', import.meta.url), 'utf8'),
  readFile(
    new URL('../sheep/components/s-goods-column/s-goods-column.vue', import.meta.url),
    'utf8',
  ),
]);
const shelves = await readFile(
  new URL('../sheep/components/s-goods-shelves/s-goods-shelves.vue', import.meta.url),
  'utf8',
);
assert.doesNotMatch(
  listPage,
  /:lazyLoad="false"/,
  'long product lists must retain native lazy loading to limit image decode pressure',
);
assert.match(
  goodsColumn,
  /lazyLoad:\s*\{[\s\S]*?default:\s*true/,
  'other surfaces must retain lazy image loading by default',
);
assert.match(
  goodsColumn,
  /class="sm-img-box"[\s\S]*?:lazy-load="lazyLoad"/,
  'three-column cards must retain configurable native image lazy loading',
);
assert.match(shelves, /v-if="layoutType === 'threeCol'"/);

console.log('goods list stability checks passed');
