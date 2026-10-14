import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile(
  new URL('../sheep/components/s-kefu-modal/s-kefu-modal.vue', import.meta.url),
  'utf8',
);

test('keeps the customer-service popup image-led', () => {
  assert.match(component, /:showClose="true"/);
  assert.match(component, /show-menu-by-longpress/);
  assert.match(component, /class="kefu-image"/);
  assert.doesNotMatch(component, /联系专属客服/);
  assert.doesNotMatch(component, /长按图片识别企微二维码/);
  assert.doesNotMatch(component, /class="ss-reset-button kefu-close"/);
  assert.doesNotMatch(component, /class="kefu-tip"/);
  assert.doesNotMatch(component, /class="kefu-title"/);
});

test('uses a transparent popup shell so the artwork owns the visual treatment', () => {
  assert.match(component, /backgroundColor="none"/);
  assert.match(component, /round="0"/);
  assert.match(component, /max-width:\s*calc\(100vw\s*-\s*32rpx\)/);
  assert.match(component, /max-height:\s*calc\(100vh\s*-\s*96rpx\)/);
});
