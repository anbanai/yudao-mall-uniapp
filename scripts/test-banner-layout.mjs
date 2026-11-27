import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getBannerLayout } from '../sheep/components/s-image-banner/banner-layout.mjs';
import { getSwiperRatioPadding } from '../sheep/ui/su-swiper/swiper-layout.mjs';

test('legacy and explicitly fixed heights retain the original pixel height and image fit', () => {
  for (const heightMode of [undefined, 'fixed']) {
    assert.deepEqual(getBannerLayout({ height: 174, heightMode, aspectRatio: 2 }), {
      height: 174,
      aspectRatio: undefined,
      imageMode: 'scaleToFill',
    });
  }
});

test('adaptive mode uses the saved ratio and crops images proportionally', () => {
  assert.deepEqual(getBannerLayout({ heightMode: 'adaptive', height: 174, aspectRatio: 2 }), {
    height: 174,
    aspectRatio: 2,
    imageMode: 'aspectFill',
  });
  assert.equal(getSwiperRatioPadding(2, 'default'), '50%');
  assert.equal(getSwiperRatioPadding(2, 'card'), 'calc(40.666666666666664% + 80rpx)');
});

test('an adaptive Banner with missing dimensions has a stable fallback ratio', () => {
  assert.deepEqual(getBannerLayout({ heightMode: 'adaptive', height: 200, aspectRatio: 0 }), {
    height: 200,
    aspectRatio: 1.875,
    imageMode: 'aspectFill',
  });
});
