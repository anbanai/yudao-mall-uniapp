import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const helperSource = await readFile(new URL('../sheep/helper/index.js', import.meta.url), 'utf8');
const copyTextStart = helperSource.indexOf('export function copyText');
const copyTextEnd = helperSource.indexOf('\n\nexport default', copyTextStart);
const copyTextSource = helperSource
  .slice(copyTextStart, copyTextEnd)
  .replace('export function', 'function');
const nativeCopyTextSource = copyTextSource
  .replace(/\/\/ #ifdef H5[\s\S]*?\/\/ #endif\s*/, '')
  .replace(/\/\/ #ifndef H5/g, '');

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

const h5ClipboardCalls = [];
const h5ToastCalls = [];
const h5CopyTextSource = copyTextSource
  .replace(/\/\/ #ifndef H5[\s\S]*?\/\/ #endif\s*/, '')
  .replace(/\/\/ #ifdef H5/g, '');
const h5CopyText = new Function(
  'uni',
  'toast',
  'document',
  `${h5CopyTextSource}\nreturn copyText;`,
)(
  {
    setClipboardData(options) {
      h5ClipboardCalls.push(options);
      options.success();
    },
  },
  (message) => h5ToastCalls.push(message),
  {
    createElement() {
      return { style: {}, select() {} };
    },
    body: { appendChild() {} },
    execCommand() {
      return true;
    },
  },
);

h5CopyText('h5-order-no');

assert.equal(h5ClipboardCalls.length, 1);
assert.equal(h5ClipboardCalls[0].data, 'h5-order-no');
assert.deepEqual(h5ToastCalls, ['复制成功!']);

console.log('copy text normalization and H5 API checks passed');

await import('./test-order-copy.mjs');
