import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { NodeTypes, parse } from '@vue/compiler-dom';
import { parse as parseSfc } from '@vue/compiler-sfc';

const moduleUrl = new URL('../sheep/helper/withdrawal.mjs', import.meta.url);

let withdrawal;
try {
  withdrawal = await import(moduleUrl.href + `?test=${Date.now()}`);
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

assert.ok(withdrawal, 'withdrawal rule helpers should exist');

const { buildWithdrawalRules, getWithdrawalAmountError, isWithdrawalConfigValid, yuanToFen } =
  withdrawal;

assert.equal(yuanToFen('0.30'), 30);
assert.equal(yuanToFen('12.34'), 1234);
assert.equal(yuanToFen('.5'), 50);
assert.equal(yuanToFen('1.'), 100);
assert.equal(yuanToFen('0.005'), undefined);
assert.equal(yuanToFen('1.004'), undefined);
assert.equal(yuanToFen('not-a-number'), undefined);

const limits = { rulesReady: true, minPrice: 50, availablePrice: 5000 };
assert.equal(getWithdrawalAmountError('', limits), 'invalid');
assert.equal(getWithdrawalAmountError('0.49', limits), 'below-minimum');
assert.equal(getWithdrawalAmountError('10.001', limits), 'invalid');
assert.equal(getWithdrawalAmountError('50.01', limits), 'above-available');
assert.equal(getWithdrawalAmountError('50', limits), '');
assert.equal(getWithdrawalAmountError('10', { ...limits, rulesReady: false }), 'rules-unavailable');

assert.equal(
  isWithdrawalConfigValid({
    brokerageWithdrawMinPrice: 0,
    brokerageFrozenDays: 0,
    brokerageWithdrawTypes: [],
  }),
  true,
);
assert.equal(
  isWithdrawalConfigValid({
    brokerageWithdrawMinPrice: '',
    brokerageFrozenDays: 0,
    brokerageWithdrawTypes: [],
  }),
  false,
);
assert.equal(
  isWithdrawalConfigValid({
    brokerageWithdrawMinPrice: 0,
    brokerageWithdrawTypes: [],
  }),
  false,
);

assert.deepEqual(
  buildWithdrawalRules({
    availablePrice: 5000,
    minPrice: 50,
    frozenDays: 2,
    withdrawTypes: [1, 2, 5],
  }),
  [
    { label: '可提现额度', value: '当前可提现 50.00 元' },
    { label: '单笔限额', value: '最低 0.50 元，最高不超过当前可提现金额' },
    { label: '每日提现次数', value: '不限次数' },
    { label: '提现时间', value: '每日全天均可提交申请' },
    {
      label: '到账时间',
      value: '申请提交后需平台审核；审核通过后预计 1-3 个工作日到账，节假日顺延',
    },
    { label: '冻结规则', value: '佣金冻结 2 天，到期后方可提现' },
    { label: '提现方式', value: '钱包余额、银行卡转账、微信零钱' },
  ],
);

assert.deepEqual(buildWithdrawalRules({}), [
  { label: '可提现额度', value: '当前可提现 -- 元' },
  { label: '单笔限额', value: '最低 -- 元，最高不超过当前可提现金额' },
  { label: '每日提现次数', value: '不限次数' },
  { label: '提现时间', value: '每日全天均可提交申请' },
  {
    label: '到账时间',
    value: '申请提交后需平台审核；审核通过后预计 1-3 个工作日到账，节假日顺延',
  },
  { label: '冻结规则', value: '冻结天数加载中' },
  { label: '提现方式', value: '提现方式加载中' },
]);

assert.deepEqual(buildWithdrawalRules({ availablePrice: '', minPrice: '', frozenDays: '' }), [
  { label: '可提现额度', value: '当前可提现 -- 元' },
  { label: '单笔限额', value: '最低 -- 元，最高不超过当前可提现金额' },
  { label: '每日提现次数', value: '不限次数' },
  { label: '提现时间', value: '每日全天均可提交申请' },
  {
    label: '到账时间',
    value: '申请提交后需平台审核；审核通过后预计 1-3 个工作日到账，节假日顺延',
  },
  { label: '冻结规则', value: '冻结天数加载中' },
  { label: '提现方式', value: '提现方式加载中' },
]);

const withdrawSource = await readFile(
  new URL('../pages/commission/withdraw.vue', import.meta.url),
  'utf8',
);
const { descriptor } = parseSfc(withdrawSource);
const withdrawTemplate = parse(descriptor.template.content);

function findAmountInput(node) {
  if (node.type === NodeTypes.ELEMENT && node.tag === 'uni-easyinput') {
    const placeholder = node.props.find(
      (prop) => prop.type === NodeTypes.ATTRIBUTE && prop.name === 'placeholder',
    );
    if (placeholder?.value?.content === '请输入提现金额') {
      return node;
    }
  }
  for (const child of node.children || []) {
    const match = findAmountInput(child);
    if (match) return match;
  }
}

const amountInput = findAmountInput(withdrawTemplate);
const amountInputType = amountInput?.props.find(
  (prop) => prop.type === NodeTypes.ATTRIBUTE && prop.name === 'type',
);
assert.equal(
  amountInputType?.value?.content,
  'digit',
  'the mini-program withdrawal keyboard should allow decimal amounts',
);

function findNoticeTitle(node) {
  if (
    node.type === NodeTypes.ELEMENT &&
    node.props.some(
      (prop) =>
        prop.type === NodeTypes.ATTRIBUTE &&
        prop.name === 'class' &&
        prop.value?.content === 'title ss-m-b-30',
    )
  ) {
    return node;
  }
  for (const child of node.children || []) {
    const match = findNoticeTitle(child);
    if (match) return match;
  }
}

const noticeTitle = findNoticeTitle(withdrawTemplate);
assert.equal(noticeTitle?.children?.[0]?.content, '提现规则');
assert.match(
  descriptor.template.content,
  /rule.label[\s\S]*rule\.value/,
  'withdrawal rules should render labels and values separately for readability',
);

function findWithdrawalRuleList(node, ancestors = []) {
  if (
    node.type === NodeTypes.ELEMENT &&
    node.props.some(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'for' &&
        prop.exp?.content.includes('withdrawalRules'),
    )
  ) {
    return { node, ancestors };
  }
  for (const child of node.children || []) {
    const match = findWithdrawalRuleList(child, [...ancestors, node]);
    if (match) return match;
  }
}

const withdrawalRuleList = findWithdrawalRuleList(withdrawTemplate);
assert.ok(withdrawalRuleList, 'withdrawal rule list should be rendered');
assert.equal(
  withdrawalRuleList.ancestors.some((node) =>
    (node.props || []).some(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'if' &&
        prop.exp?.content === 'rulesReady',
    ),
  ),
  false,
  'withdrawal rules should remain visible while account data is loading',
);

console.log('withdrawal rule checks passed');
