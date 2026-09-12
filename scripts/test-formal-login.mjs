import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAuthState } from '../sheep/helper/authState.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const anonymous = createAuthState({
  isLogin: true,
  userInfo: { mobile: '' },
});
assert.equal(anonymous.isLogin, true);
assert.equal(anonymous.isPhoneAuthorized, false);
assert.equal(anonymous.isFormalLogin, false);

const formal = createAuthState({
  isLogin: true,
  userInfo: { mobile: '13800138000' },
});
assert.equal(formal.isPhoneAuthorized, true);
assert.equal(formal.isFormalLogin, true);

const loggedOut = createAuthState({
  isLogin: false,
  userInfo: { mobile: '13800138000' },
});
assert.equal(loggedOut.isFormalLogin, false);

let userInfoCalls = 0;
const ensureState = createAuthState({
  isLogin: true,
  userInfo: { mobile: '' },
  getUserInfo: async () => {
    userInfoCalls += 1;
    return { mobile: '13800138000' };
  },
});
await ensureState.ensureUserInfo();
await ensureState.ensureUserInfo();
assert.equal(userInfoCalls, 1);
assert.equal(ensureState.isFormalLogin, true);

const routerSource = await readFile(resolve(projectRoot, 'sheep/router/index.js'), 'utf8');
assert.match(routerSource, /formalAuth/);
assert.match(routerSource, /resumeFormalAuthNavigation/);
const requestSource = await readFile(resolve(projectRoot, 'sheep/request/index.js'), 'utf8');
assert.match(requestSource, /formalAuth/);
assert.match(requestSource, /PHONE_AUTH_REQUIRED/);
assert.match(requestSource, /Promise\.resolve\(error\)/);
const orderSource = await readFile(resolve(projectRoot, 'sheep/api/trade/order.js'), 'utf8');
assert.match(orderSource, /formalAuth:\s*true/);
const modalHookSource = await readFile(resolve(projectRoot, 'sheep/hooks/useModal.js'), 'utf8');
assert.match(modalHookSource, /phoneAuthorization/);
const authModalSource = await readFile(
  resolve(projectRoot, 'sheep/components/s-auth-modal/s-auth-modal.vue'),
  'utf8',
);
assert.match(authModalSource, /authorizePhoneNumber/);
assert.match(authModalSource, /授权手机号完成正式登录/);

console.log('formal login state and gate checks passed');
