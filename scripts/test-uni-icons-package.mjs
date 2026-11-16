import assert from 'node:assert/strict';
import { access, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'dist/build/mp-weixin');
const iconsOutput = resolve(outputRoot, 'uni_modules/uni-icons/components/uni-icons');

await assert.rejects(
  access(resolve(iconsOutput, 'icons.js')),
  { code: 'ENOENT' },
  'APP-NVUE icon metadata should not be emitted into MP-WEIXIN',
);

const { size: wxssSize } = await stat(resolve(iconsOutput, 'uni-icons.wxss'));
assert.ok(
  wxssSize <= 20 * 1024,
  `MP-WEIXIN uni-icons styles should be at most 20 KB, received ${(
    wxssSize / 1024
  ).toFixed(1)} KB`,
);

console.log('uni-icons mini program package checks passed');
