import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

for (const form of ['sms-login', 'change-mobile', 'change-password', 'reset-password']) {
  test(`${form} allows the complete secure six-digit code and legacy four-digit code`, () => {
    const path = new URL(`../sheep/components/s-auth-modal/components/${form}.vue`, import.meta.url);
    const template = readFileSync(path, 'utf8');
    const codeInput = [...template.matchAll(/<uni-easyinput\b[^>]*>/g)].map(match => match[0])
      .find(input => input.includes('v-model="state.model.code"'));
    assert.ok(codeInput, 'SMS code input must exist');
    const maximum = Number(codeInput.match(/maxlength="(-?\d+)"/)?.[1] ?? -1);
    for (const sms of ['123456', '1234']) assert.ok(maximum === -1 || maximum >= sms.length, `Input must not truncate ${sms.length}-digit SMS`);
  });
}
