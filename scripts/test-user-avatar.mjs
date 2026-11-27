import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { computed, nextTick, ref, watch } from 'vue';

const source = readFileSync(new URL('../sheep/hooks/useUserAvatar.js', import.meta.url), 'utf8');
const loadHook = new Function(
  'computed',
  'ref',
  'watch',
  'sheep',
  `${source.replace(/^import .*;$/gm, '').replace('export function', 'function')}
   return useUserAvatar;`,
);
const cdnUrl = 'https://cdn.example.com';
const defaultAvatarUrl = 'https://cdn.example.com/static/img/shop/default_avatar.png';
const useUserAvatar = loadHook(computed, ref, watch, {
  $url: {
    cdn: (path) => (path ? cdnUrl + path : ''),
    static: (path) => cdnUrl + path,
  },
});

test('空头像和加载失败使用同一张默认图，替换头像后重新加载', async () => {
  const profileAvatar = ref();
  const { avatarUrl, onAvatarError } = useUserAvatar(() => profileAvatar.value);
  assert.equal(avatarUrl.value, defaultAvatarUrl);

  profileAvatar.value = '/unavailable.jpg';
  await nextTick();
  assert.equal(avatarUrl.value, 'https://cdn.example.com/unavailable.jpg');
  onAvatarError();
  assert.equal(avatarUrl.value, defaultAvatarUrl);

  profileAvatar.value = '/replacement.jpg';
  await nextTick();
  assert.equal(avatarUrl.value, 'https://cdn.example.com/replacement.jpg');
});

test('刷新资料时重试加载失败且地址未变化的头像', () => {
  const { avatarUrl, onAvatarError, retryAvatar } = useUserAvatar(() => '/avatar.jpg');
  onAvatarError();
  assert.equal(avatarUrl.value, defaultAvatarUrl);

  retryAvatar();
  assert.equal(avatarUrl.value, 'https://cdn.example.com/avatar.jpg');
});
