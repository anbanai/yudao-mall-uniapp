import assert from 'node:assert/strict';
import test from 'node:test';

import { navigateToKefuChat } from '../sheep/helper/kefu.mjs';

test('uses the app router when it is available', () => {
  const calls = [];
  const router = { go: (...args) => calls.push(args) };
  globalThis.uni = { navigateTo: () => assert.fail('unexpected uni fallback') };

  assert.equal(navigateToKefuChat(router, { id: 42 }), true);
  assert.deepEqual(calls, [['/pages/chat/index', { id: 42 }]]);
});

test('uses uni.navigateTo when the app router is unavailable', () => {
  const calls = [];
  globalThis.uni = { navigateTo: (options) => calls.push(options) };

  assert.equal(navigateToKefuChat(undefined, { id: 'tea 1', empty: null }), true);
  assert.deepEqual(calls, [{ url: '/pages/chat/index?id=tea%201' }]);
});

test('does not throw when neither navigation API is available', () => {
  delete globalThis.uni;

  assert.equal(navigateToKefuChat(undefined), false);
});
