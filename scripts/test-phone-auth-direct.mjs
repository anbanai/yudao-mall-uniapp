import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeTypes, parse } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function loadTemplate(relativePath) {
  const source = await readFile(resolve(projectRoot, relativePath), 'utf8');
  const { descriptor } = parseSfc(source);
  return parse(descriptor.template.content);
}

function collectElements(node, tag, elements = []) {
  if (node.type === NodeTypes.ELEMENT && node.tag === tag) {
    elements.push(node);
  }
  for (const child of node.children || []) {
    collectElements(child, tag, elements);
  }
  return elements;
}

function hasDirective(element, name, argument, expression = '') {
  return element.props.some(
    (prop) =>
      prop.type === NodeTypes.DIRECTIVE &&
      prop.name === name &&
      prop.arg?.content === argument &&
      (!expression || prop.exp?.content.includes(expression)),
  );
}

function hasAttribute(element, name, value) {
  return element.props.some(
    (prop) =>
      prop.type === NodeTypes.ATTRIBUTE && prop.name === name && prop.value?.content === value,
  );
}

function textContent(node) {
  if (node.type === NodeTypes.TEXT) {
    return node.content.trim();
  }
  return (node.children || []).map(textContent).join('');
}

function findPhoneButton(template, label) {
  return collectElements(template, 'button').find(
    (button) =>
      hasAttribute(button, 'open-type', 'getPhoneNumber') &&
      hasDirective(button, 'on', 'getphonenumber', 'onPhoneAuthorization') &&
      hasDirective(button, 'bind', 'disabled', 'isAuthorizing') &&
      textContent(button).includes(label),
  );
}

const userCardTemplate = await loadTemplate('sheep/components/s-user-card/s-user-card.vue');
assert.ok(
  findPhoneButton(userCardTemplate, '请先登录'),
  'the mini-program login entry should directly request the phone number',
);
assert.ok(
  findPhoneButton(userCardTemplate, '去绑定'),
  'the mini-program bind entry should directly request the phone number',
);

const userInfoTemplate = await loadTemplate('pages/user/info.vue');
assert.ok(
  findPhoneButton(userInfoTemplate, '手机号'),
  'the mini-program mobile row should directly request the phone number',
);

const phoneAuthorizationPath = resolve(projectRoot, 'sheep/hooks/usePhoneAuthorization.js');
let phoneAuthorizationSource = '';
try {
  phoneAuthorizationSource = await readFile(phoneAuthorizationPath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

assert.match(
  phoneAuthorizationSource,
  /export async function authorizePhoneNumber\(detail\)/,
  'the shared phone authorization handler should exist',
);

const functionStart = phoneAuthorizationSource.indexOf(
  'export async function authorizePhoneNumber(detail)',
);
const functionEnd = phoneAuthorizationSource.indexOf('\n}', functionStart) + 2;
// Inject test dependencies without replacing the network boundary used by the production function.
const functionForTest = new Function(
  `${phoneAuthorizationSource
    .slice(functionStart, functionEnd)
    .replace(
      'export async function authorizePhoneNumber(detail)',
      'async function authorizePhoneNumber(detail, injectedUserStore, injectedProvider)',
    )
    .replace("const userStore = sheep.$store('user');", 'const userStore = injectedUserStore;')
    .replace(
      'const provider = sheep.$platform.useProvider();',
      'const provider = injectedProvider;',
    )}\nreturn authorizePhoneNumber;`,
)();

const acceptedDetail = { errMsg: 'getPhoneNumber:ok', code: 'phone-code' };

const loginResult = await (async () => {
  const calls = [];
  const userStore = {
    isLogin: false,
    userInfo: {},
    async getInfo() {
      calls.push('getInfo');
      this.userInfo.mobile = '13800000000';
    },
  };
  const provider = {
    async mobileLogin(detail) {
      calls.push(['mobileLogin', detail]);
      return true;
    },
    async bindUserPhoneNumber(detail) {
      calls.push(['bindUserPhoneNumber', detail]);
      return true;
    },
  };
  return { result: await functionForTest(acceptedDetail, userStore, provider), calls, userStore };
})();
assert.equal(loginResult.result, true);
assert.deepEqual(loginResult.calls, [['mobileLogin', acceptedDetail], 'getInfo']);
assert.equal(loginResult.userStore.userInfo.mobile, '13800000000');

const bindResult = await (async () => {
  const calls = [];
  const userStore = {
    isLogin: true,
    async getInfo() {
      calls.push('getInfo');
    },
  };
  const provider = {
    async mobileLogin(detail) {
      calls.push(['mobileLogin', detail]);
      return true;
    },
    async bindUserPhoneNumber(detail) {
      calls.push(['bindUserPhoneNumber', detail]);
      return true;
    },
  };
  return { result: await functionForTest(acceptedDetail, userStore, provider), calls };
})();
assert.equal(bindResult.result, true);
assert.deepEqual(bindResult.calls, [['bindUserPhoneNumber', acceptedDetail], 'getInfo']);

const failedResult = await (async () => {
  const calls = [];
  const userStore = {
    isLogin: false,
    async getInfo() {
      calls.push('getInfo');
    },
  };
  const provider = {
    async mobileLogin(detail) {
      calls.push(['mobileLogin', detail]);
      return false;
    },
    async bindUserPhoneNumber(detail) {
      calls.push(['bindUserPhoneNumber', detail]);
      return false;
    },
  };
  return { result: await functionForTest(acceptedDetail, userStore, provider), calls };
})();
assert.equal(failedResult.result, false);
assert.deepEqual(failedResult.calls, [['mobileLogin', acceptedDetail]]);

const deniedResult = await (async () => {
  const calls = [];
  const userStore = {
    isLogin: false,
    async getInfo() {
      calls.push('getInfo');
    },
  };
  const provider = {
    async mobileLogin(detail) {
      calls.push(['mobileLogin', detail]);
    },
    async bindUserPhoneNumber(detail) {
      calls.push(['bindUserPhoneNumber', detail]);
    },
  };
  return {
    result: await functionForTest({ errMsg: 'getPhoneNumber:fail user deny' }, userStore, provider),
    calls,
  };
})();
assert.equal(deniedResult.result, false);
assert.deepEqual(deniedResult.calls, []);

console.log('direct phone authorization checks passed');
