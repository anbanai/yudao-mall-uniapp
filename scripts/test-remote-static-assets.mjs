import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const remoteAssets = [
  'activity-left.png',
  'activity-right.png',
  'cart-empty.png',
  'collect-empty.png',
  'comment-empty.png',
  'coupon-empty.png',
  'data-empty.png',
  'goods-empty.png',
  'internet-empty.png',
  'order-empty.png',
  'soldout-empty.png',
];

const [emptyComponentSource, activityPageSource, logisticsPageSource] = await Promise.all([
  readFile(resolve(projectRoot, 'sheep/components/s-empty/s-empty.vue'), 'utf8'),
  readFile(resolve(projectRoot, 'pages/activity/index.vue'), 'utf8'),
  readFile(resolve(projectRoot, 'pages/order/express/log.vue'), 'utf8'),
]);

assert.match(
  emptyComponentSource,
  /sheep\.\$url\.static\(props\.icon\)/,
  'empty-state assets should resolve through the configured OSS static URL',
);
assert.match(
  activityPageSource,
  /sheep\.\$url\.static\('\/static\/activity-left\.png'\)/,
  'the activity decoration should resolve through the configured OSS static URL',
);
assert.match(
  logisticsPageSource,
  /sheep\.\$url\.static\('\/static\/data-empty\.png'\)/,
  'the logistics empty state should resolve through the configured OSS static URL',
);
assert.match(
  logisticsPageSource,
  /sheep\.\$url\.static\('\/static\/internet-empty\.png'\)/,
  'the logistics error state should resolve through the configured OSS static URL',
);

for (const asset of remoteAssets) {
  await assert.rejects(
    access(resolve(projectRoot, 'static', asset)),
    `static/${asset} should not remain in the mini-program package`,
  );
}

console.log('remote static asset checks passed');
