import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperSource = await readFile(new URL('../sheep/helper/index.js', import.meta.url), 'utf8');
const copyTextStart = helperSource.indexOf('export function copyText');
const h5BranchStart = helperSource.indexOf('// #ifdef H5', copyTextStart);
const nativeCopyTextSource = helperSource
  .slice(copyTextStart, h5BranchStart)
  .replace('export function', 'function')
  .concat('}');

const clipboardCalls = [];
const toastCalls = [];
const copyText = new Function('uni', 'toast', `${nativeCopyTextSource}\nreturn copyText;`)(
  {
    setClipboardData(options) {
      clipboardCalls.push(options);
      options.success();
    },
  },
  (message) => toastCalls.push(message),
);

copyText(202609110001);
copyText(null);

assert.equal(clipboardCalls.length, 1);
assert.equal(clipboardCalls[0].data, '202609110001');
assert.deepEqual(toastCalls, ['复制成功!', '复制失败!']);

console.log('copy text normalization checks passed');
