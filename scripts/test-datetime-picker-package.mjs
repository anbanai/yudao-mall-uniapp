import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'dist/build/mp-weixin');

async function exists(path) {
  try {
    await access(resolve(outputRoot, path));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

assert.equal(
  await exists('uni_modules/uni-datetime-picker'),
  false,
  'uni-datetime-picker should not be emitted into the main package',
);

for (const packageRoot of ['pages/user', 'pages/commission']) {
  assert.equal(
    await exists(`${packageRoot}/components/uni-datetime-picker/uni-datetime-picker.js`),
    true,
    `uni-datetime-picker should be emitted into ${packageRoot}`,
  );
}

console.log('datetime picker subpackage checks passed');
