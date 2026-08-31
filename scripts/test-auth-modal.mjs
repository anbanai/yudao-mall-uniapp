import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeTypes, parse } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const componentPath = resolve(projectRoot, 'sheep/components/s-auth-modal/s-auth-modal.vue');
const componentSource = await readFile(componentPath, 'utf8');
const { descriptor } = parseSfc(componentSource);
const template = parse(descriptor.template.content);

async function loadComponent(relativePath) {
  const source = await readFile(resolve(projectRoot, relativePath), 'utf8');
  const { descriptor: componentDescriptor } = parseSfc(source);
  return {
    descriptor: componentDescriptor,
    template: parse(componentDescriptor.template.content),
  };
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

function findButtonByEvent(node, eventName, expressionFragment) {
  if (node.type === NodeTypes.ELEMENT && node.tag === 'button') {
    const event = node.props.find(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'on' &&
        prop.arg?.content === eventName &&
        prop.exp?.content.includes(expressionFragment),
    );
    if (event) return node;
  }
  for (const child of node.children || []) {
    const match = findButtonByEvent(child, eventName, expressionFragment);
    if (match) return match;
  }
}

function evaluateDisabled(button, context) {
  const disabled = button.props.find(
    (prop) =>
      prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' && prop.arg?.content === 'disabled',
  );
  assert.ok(disabled?.exp?.content, 'login action should bind its disabled state');
  return new Function(...Object.keys(context), `return Boolean(${disabled.exp.content});`)(
    ...Object.values(context),
  );
}

function getTextContent(node) {
  if (node.type === NodeTypes.TEXT) {
    return node.content.trim();
  }
  return (node.children || []).map(getTextContent).join('');
}

function collectLoginTabs(node, tabs = []) {
  if (node.type === NodeTypes.ELEMENT && node.tag === 'button') {
    const tap = node.props.find(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'on' &&
        prop.arg?.content === 'tap' &&
        prop.exp?.content.includes('showAuthModal('),
    );
    const loginType = tap?.exp?.content.match(/showAuthModal\('([^']+Login)'\)/)?.[1];
    if (loginType) {
      tabs.push({ type: loginType, label: getTextContent(node) });
    }
  }
  for (const child of node.children || []) {
    collectLoginTabs(child, tabs);
  }
  return tabs;
}

assert.deepEqual(
  collectLoginTabs(template),
  [
    { type: 'wechatLogin', label: '快捷登录' },
    { type: 'smsLogin', label: '短信登录' },
    { type: 'accountLogin', label: '账号登录' },
  ],
  'mini-program users should get three peer login tabs with quick login first',
);

function preprocessForPlatform(source, platform) {
  const included = [true];
  const result = [];
  const enabled = (condition) => condition === platform;

  for (const line of source.split('\n')) {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef|endif)\s*([\w-]+)?/);
    if (!directive) {
      if (included.at(-1)) result.push(line);
      continue;
    }
    const [, type, condition] = directive;
    if (type === 'endif') {
      included.pop();
    } else {
      const matches = enabled(condition);
      included.push(included.at(-1) && (type === 'ifdef' ? matches : !matches));
    }
  }
  return result.join('\n');
}

const modalHookSource = await readFile(resolve(projectRoot, 'sheep/hooks/useModal.js'), 'utf8');
const modalHookForMp = preprocessForPlatform(modalHookSource, 'MP-WEIXIN');
const showAuthStart = modalHookForMp.indexOf('export function showAuthModal(');
const showAuthEnd = modalHookForMp.indexOf('\n}\n\n// 关闭授权弹框', showAuthStart) + 2;
assert.ok(showAuthStart >= 0 && showAuthEnd > showAuthStart, 'showAuthModal source not found');

const modalState = { auth: '' };
const showAuthModal = new Function(
  '$store',
  `${modalHookForMp
    .slice(showAuthStart, showAuthEnd)
    .replace('export function ', 'function ')}\nreturn showAuthModal;`,
)(() => ({
  $patch(update) {
    update(modalState);
  },
}));

showAuthModal();
assert.equal(
  modalState.auth,
  'wechatLogin',
  'the mini-program login modal should open on the primary WeChat tab',
);

const modalHookForH5 = preprocessForPlatform(modalHookSource, 'H5');
const showAuthForH5Start = modalHookForH5.indexOf('export function showAuthModal(');
const showAuthForH5End = modalHookForH5.indexOf('\n}\n\n// 关闭授权弹框', showAuthForH5Start) + 2;
const closeAuthForH5Start = modalHookForH5.indexOf('export function closeAuthModal(');
const closeAuthForH5End = modalHookForH5.indexOf('\n}\n\n// 打开分享弹框', closeAuthForH5Start) + 2;
assert.ok(
  showAuthForH5Start >= 0 && showAuthForH5End > showAuthForH5Start,
  'H5 showAuthModal source not found',
);
assert.ok(
  closeAuthForH5Start >= 0 && closeAuthForH5End > closeAuthForH5Start,
  'H5 closeAuthModal source not found',
);

const h5ModalState = {
  auth: 'smsLogin',
  authTransition: false,
  authTransitionId: 0,
  authTransitionCloseId: 0,
};
const scheduledCallbacks = [];
const h5ModalStore = {
  get auth() {
    return h5ModalState.auth;
  },
  get authTransition() {
    return h5ModalState.authTransition;
  },
  get authTransitionId() {
    return h5ModalState.authTransitionId;
  },
  get authTransitionCloseId() {
    return h5ModalState.authTransitionCloseId;
  },
  set authTransitionCloseId(value) {
    h5ModalState.authTransitionCloseId = value;
  },
  $patch(update) {
    update(h5ModalState);
  },
};
const h5AuthFunctions = new Function(
  '$store',
  'setTimeout',
  `${modalHookForH5
    .slice(showAuthForH5Start, showAuthForH5End)
    .replace('export function ', 'function ')}\n${modalHookForH5
    .slice(closeAuthForH5Start, closeAuthForH5End)
    .replace('export function ', 'function ')}\nreturn { showAuthModal, closeAuthModal };`,
)(
  () => h5ModalStore,
  (callback) => scheduledCallbacks.push(callback),
);
h5AuthFunctions.showAuthModal('accountLogin');
assert.equal(h5ModalState.auth, '', 'H5 login mode switching should close before reopening');
assert.equal(
  h5ModalState.authTransition,
  true,
  'H5 login mode switching should mark the temporary close as an internal transition',
);
scheduledCallbacks.shift()();
assert.equal(h5ModalState.auth, 'accountLogin', 'H5 should reopen on the requested login mode');
assert.equal(
  h5ModalState.authTransition,
  false,
  'H5 should clear the internal transition marker after reopening',
);

h5AuthFunctions.showAuthModal('smsLogin');
assert.equal(h5ModalState.authTransition, true, 'a later H5 transition should be active');
h5AuthFunctions.closeAuthModal();
assert.equal(h5ModalState.authTransition, false, 'a genuine close should cancel the transition');
scheduledCallbacks.shift()();
assert.equal(
  h5ModalState.auth,
  '',
  'a cancelled H5 transition must not reopen the login modal from a stale callback',
);

const setupSource = descriptor.scriptSetup.content;
const popup = collectElements(template, 'su-popup')[0];
assert.ok(popup, 'auth popup not found');
const popupCloseEvent = popup.props.find(
  (prop) =>
    prop.type === NodeTypes.DIRECTIVE && prop.name === 'on' && prop.arg?.content === 'close',
);
assert.equal(
  popupCloseEvent?.exp?.content,
  'handlePopupClose',
  'auth popup should distinguish an internal H5 transition from a genuine close',
);

const handlePopupCloseStart = setupSource.indexOf('function handlePopupClose() {');
const handlePopupCloseEnd = setupSource.indexOf('\n  }', handlePopupCloseStart) + 4;
assert.ok(
  handlePopupCloseStart >= 0 && handlePopupCloseEnd > handlePopupCloseStart,
  'handlePopupClose source not found',
);
const popupModalStore = {
  authTransition: true,
  authTransitionId: 1,
  authTransitionCloseId: 1,
};
let popupCloseCalls = 0;
const handlePopupClose = new Function(
  'modalStore',
  'closeAuthModal',
  `${setupSource.slice(handlePopupCloseStart, handlePopupCloseEnd)}\nreturn handlePopupClose;`,
)(popupModalStore, () => {
  popupCloseCalls += 1;
});
handlePopupClose();
assert.equal(popupCloseCalls, 0, 'an internal H5 transition should ignore the popup close event');
assert.equal(
  popupModalStore.authTransitionCloseId,
  0,
  'the expected internal popup close should only be ignored once',
);
handlePopupClose();
assert.equal(
  popupCloseCalls,
  1,
  'a second popup close during an H5 transition should be treated as a genuine user close',
);
popupModalStore.authTransition = false;
handlePopupClose();
assert.equal(popupCloseCalls, 2, 'a genuine popup close should close the auth modal');

const initialPopupModalStore = {
  authTransition: false,
  authTransitionId: 0,
  authTransitionCloseId: 0,
};
let initialPopupCloseCalls = 0;
const handleInitialPopupClose = new Function(
  'modalStore',
  'closeAuthModal',
  `${setupSource.slice(handlePopupCloseStart, handlePopupCloseEnd)}\nreturn handlePopupClose;`,
)(initialPopupModalStore, () => {
  initialPopupCloseCalls += 1;
});
handleInitialPopupClose();
assert.equal(
  initialPopupCloseCalls,
  1,
  'a popup close outside an H5 transition should never be mistaken for an internal close',
);

h5ModalState.auth = 'smsLogin';
h5AuthFunctions.showAuthModal('accountLogin');
const transitionCloseHandler = new Function(
  'modalStore',
  'closeAuthModal',
  `${setupSource.slice(handlePopupCloseStart, handlePopupCloseEnd)}\nreturn handlePopupClose;`,
)(h5ModalStore, h5AuthFunctions.closeAuthModal);
transitionCloseHandler();
assert.equal(
  h5ModalState.authTransition,
  true,
  'the expected internal popup close should keep the H5 transition active',
);
transitionCloseHandler();
scheduledCallbacks.shift()();
assert.equal(
  h5ModalState.auth,
  '',
  'a user close during an H5 transition must prevent the scheduled modal reopen',
);
assert.equal(
  h5ModalState.authTransition,
  false,
  'a user close during an H5 transition should cancel the transition',
);

const toggleAgreementStart = setupSource.indexOf('function toggleAgreement() {');
const toggleAgreementEnd = setupSource.indexOf('\n  }', toggleAgreementStart) + 4;
assert.ok(
  toggleAgreementStart >= 0 && toggleAgreementEnd > toggleAgreementStart,
  'toggleAgreement source not found',
);

const toggleProtocolState = { protocol: false };
const toggleProtocol = new Function(
  'state',
  `${setupSource.slice(toggleAgreementStart, toggleAgreementEnd)}\nreturn toggleAgreement;`,
)(toggleProtocolState);
toggleProtocol();
assert.equal(
  toggleProtocolState.protocol,
  true,
  'agreement checkbox should become selected on tap',
);
toggleProtocol();
assert.equal(
  toggleProtocolState.protocol,
  false,
  'agreement checkbox should become unselected on second tap',
);

const resetAgreementStart = setupSource.indexOf('function resetAgreementOnClose(');
const resetAgreementEnd = setupSource.indexOf('\n  }', resetAgreementStart) + 4;
assert.ok(
  resetAgreementStart >= 0 && resetAgreementEnd > resetAgreementStart,
  'resetAgreementOnClose source not found',
);
const resetProtocolState = { protocol: true };
const resetAgreementOnClose = new Function(
  'state',
  `${setupSource.slice(resetAgreementStart, resetAgreementEnd)}\nreturn resetAgreementOnClose;`,
)(resetProtocolState);
resetAgreementOnClose(['', true]);
assert.equal(
  resetProtocolState.protocol,
  true,
  'H5 login mode switching should preserve the agreement state',
);
resetAgreementOnClose(['', false]);
assert.equal(
  resetProtocolState.protocol,
  false,
  'closing the login modal should reset the agreement checkbox',
);

h5ModalState.auth = 'smsLogin';
resetProtocolState.protocol = true;
h5AuthFunctions.showAuthModal('accountLogin');
transitionCloseHandler();
h5AuthFunctions.showAuthModal('smsLogin');
transitionCloseHandler();
while (scheduledCallbacks.length) {
  scheduledCallbacks.shift()();
}
assert.equal(
  h5ModalState.auth,
  '',
  'a user close after consecutive H5 mode changes must prevent every scheduled reopen',
);
assert.equal(
  h5ModalState.authTransition,
  false,
  'a user close after consecutive H5 mode changes should cancel the latest transition',
);
resetAgreementOnClose([h5ModalState.auth, h5ModalState.authTransition]);
assert.equal(
  resetProtocolState.protocol,
  false,
  'cancelling consecutive H5 mode changes should reset the agreement checkbox',
);

h5ModalState.auth = 'smsLogin';
h5AuthFunctions.showAuthModal('accountLogin');
const firstTransitionId = h5ModalState.authTransitionId;
h5AuthFunctions.showAuthModal('smsLogin');
assert.notEqual(
  h5ModalState.authTransitionId,
  firstTransitionId,
  'a later H5 mode change should supersede the earlier transition',
);
assert.equal(
  h5ModalState.authTransitionCloseId,
  h5ModalState.authTransitionId,
  'an outstanding programmatic close should follow the latest transition',
);
transitionCloseHandler();
assert.equal(
  h5ModalState.authTransitionCloseId,
  0,
  'the outstanding programmatic close should still be consumed only once',
);
while (scheduledCallbacks.length) {
  scheduledCallbacks.shift()();
}
assert.equal(
  h5ModalState.auth,
  'smsLogin',
  'only the latest H5 mode should reopen after consecutive changes',
);
assert.equal(
  h5ModalState.authTransition,
  false,
  'the latest consecutive H5 mode change should finish its transition',
);

assert.equal(
  collectElements(template, 'checkbox').length,
  1,
  'login should use one agreement checkbox',
);
assert.equal(
  collectElements(template, 'radio').length,
  0,
  'login should not ask users to explicitly refuse',
);

const quickLoginButton = findButtonByEvent(template, 'getphonenumber', 'getPhoneNumber');
assert.ok(quickLoginButton, 'quick login button not found');
assert.equal(
  evaluateDisabled(quickLoginButton, { state: { protocol: false } }),
  true,
  'quick login should be disabled before the agreement is accepted',
);
assert.equal(
  evaluateDisabled(quickLoginButton, { state: { protocol: true } }),
  false,
  'quick login should be enabled after the agreement is accepted',
);

const smsLoginComponent = await loadComponent(
  'sheep/components/s-auth-modal/components/sms-login.vue',
);
const getCodeButton = findButtonByEvent(
  smsLoginComponent.template,
  'tap',
  'checkAgreementAndGetSmsCode',
);
const smsSubmitButton = findButtonByEvent(smsLoginComponent.template, 'tap', 'smsLoginSubmit');
assert.ok(getCodeButton, 'SMS code button not found');
assert.ok(smsSubmitButton, 'SMS login button not found');
assert.equal(
  evaluateDisabled(getCodeButton, { state: { isMobileEnd: false }, props: { agreeStatus: false } }),
  true,
  'SMS code request should be disabled before the agreement is accepted',
);
assert.equal(
  evaluateDisabled(getCodeButton, { state: { isMobileEnd: false }, props: { agreeStatus: true } }),
  false,
  'SMS code request should be enabled after the agreement is accepted',
);
assert.equal(
  evaluateDisabled(smsSubmitButton, { props: { agreeStatus: false } }),
  true,
  'SMS login should be disabled before the agreement is accepted',
);
assert.equal(
  evaluateDisabled(smsSubmitButton, { props: { agreeStatus: true } }),
  false,
  'SMS login should be enabled after the agreement is accepted',
);

const accountLoginComponent = await loadComponent(
  'sheep/components/s-auth-modal/components/account-login.vue',
);
const accountSubmitButton = findButtonByEvent(
  accountLoginComponent.template,
  'tap',
  'accountLoginSubmit',
);
assert.ok(accountSubmitButton, 'account login button not found');
assert.equal(
  evaluateDisabled(accountSubmitButton, { props: { agreeStatus: false } }),
  true,
  'account login should be disabled before the agreement is accepted',
);
assert.equal(
  evaluateDisabled(accountSubmitButton, { props: { agreeStatus: true } }),
  false,
  'account login should be enabled after the agreement is accepted',
);

const getPhoneNumberStart = setupSource.indexOf('const getPhoneNumber = async (e) => {');
const getPhoneNumberEnd = setupSource.indexOf('\n  };', getPhoneNumberStart) + 5;
assert.ok(
  getPhoneNumberStart >= 0 && getPhoneNumberEnd > getPhoneNumberStart,
  'getPhoneNumber source not found',
);

const protocolState = { protocol: null };
const toastMessages = [];
let mobileLoginCalls = 0;
let closeCalls = 0;
const getPhoneNumber = new Function(
  'state',
  'sheep',
  'closeAuthModal',
  `${setupSource.slice(getPhoneNumberStart, getPhoneNumberEnd)}\nreturn getPhoneNumber;`,
)(
  protocolState,
  {
    $helper: { toast: (message) => toastMessages.push(message) },
    $platform: {
      useProvider: () => ({
        mobileLogin: async () => {
          mobileLoginCalls += 1;
          return true;
        },
      }),
    },
  },
  () => {
    closeCalls += 1;
  },
);

const phoneNumberEvent = { detail: { errMsg: 'getPhoneNumber:ok', code: 'phone-code' } };
await getPhoneNumber(phoneNumberEvent);
assert.equal(mobileLoginCalls, 0, 'quick login must not submit before the agreement is accepted');
assert.equal(closeCalls, 0, 'the login modal must remain open before the agreement is accepted');

protocolState.protocol = true;
await getPhoneNumber(phoneNumberEvent);
assert.equal(mobileLoginCalls, 1, 'accepted users should be able to submit quick login');
assert.equal(closeCalls, 1, 'a successful quick login should close the modal');

function findWechatLoginButton(node) {
  if (node.type === NodeTypes.ELEMENT && node.tag === 'button') {
    const tap = node.props.find(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'on' &&
        prop.arg?.content === 'tap' &&
        prop.exp?.content.includes("thirdLogin('wechat')"),
    );
    if (tap) return node;
  }
  for (const child of node.children || []) {
    const match = findWechatLoginButton(child);
    if (match) return match;
  }
}

const wechatLoginButton = findWechatLoginButton(template);
assert.ok(
  wechatLoginButton,
  'the WeChat login button should exist for supported non-mini-program clients',
);
assert.equal(
  evaluateDisabled(wechatLoginButton, { state: { protocol: false } }),
  true,
  'third-party login should be disabled before the agreement is accepted',
);
assert.equal(
  evaluateDisabled(wechatLoginButton, { state: { protocol: true } }),
  false,
  'third-party login should be enabled after the agreement is accepted',
);

const visibilityDirective = wechatLoginButton.props.find(
  (prop) => prop.type === NodeTypes.DIRECTIVE && prop.name === 'if',
);
assert.ok(
  visibilityDirective?.exp?.content,
  'the WeChat login button should have a visibility rule',
);

const isWechatLoginVisible = new Function(
  'sheep',
  `return Boolean(${visibilityDirective.exp.content});`,
);

const visibleFor = (name, isWechatInstalled = true) =>
  isWechatLoginVisible({ $platform: { name, isWechatInstalled } });

assert.equal(
  visibleFor('WechatMiniProgram'),
  false,
  'mini programs already have silent identity login and should not show a duplicate WeChat icon',
);
assert.equal(
  visibleFor('WechatOfficialAccount'),
  true,
  'official accounts should retain WeChat login',
);
assert.equal(
  visibleFor('App'),
  true,
  'the App should retain WeChat login when WeChat is installed',
);
assert.equal(
  visibleFor('App', false),
  false,
  'the App should hide WeChat login when it is unavailable',
);

console.log('auth modal platform visibility checks passed');
