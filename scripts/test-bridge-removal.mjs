import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const frontendRoot = resolve(new URL('..', import.meta.url).pathname);
const read = (relative) => readFileSync(resolve(frontendRoot, relative), 'utf8');

assert.equal(existsSync(resolve(frontendRoot, 'sheep/hooks/useIdentityBridge.js')), false);
assert.equal(existsSync(resolve(frontendRoot, 'sheep/helper/identityBridge.mjs')), false);
assert.equal(existsSync(resolve(frontendRoot, 'sheep/helper/identityConsent.mjs')), false);
assert.equal(existsSync(resolve(frontendRoot, 'sheep/api/member/identity.js')), false);
assert.equal(existsSync(resolve(frontendRoot, 'pages/user/identity.vue')), false);

for (const file of ['App.vue', 'pages.json', 'pages/index/user.vue', 'pages/user/info.vue']) {
  const source = read(file);
  assert.doesNotMatch(source, /identity[-_ ]?bridge|统一账户|手机号共享|茶多酚|关联商城/i, file);
}

console.log('frontend identity bridge removal checks passed');
