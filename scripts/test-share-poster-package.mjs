import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readProjectFile = (path) => readFile(resolve(projectRoot, path), 'utf8');

const [pagesSource, shareModalSource, modalStoreSource, posterPageSource, globalScssSource] =
  await Promise.all([
    readProjectFile('pages.json'),
    readProjectFile('sheep/components/s-share-modal/s-share-modal.vue'),
    readProjectFile('sheep/store/modal.js'),
    readProjectFile('pages/public/poster.vue').catch((error) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    }),
    readProjectFile('sheep/scss/index.scss'),
  ]);

const pagesConfig = JSON.parse(pagesSource);
const publicPackage = pagesConfig.subPackages.find(({ root }) => root === 'pages/public');

assert.ok(
  publicPackage?.pages.some(({ path }) => path === 'poster'),
  'the poster page should be registered in the public subpackage',
);
assert.match(
  shareModalSource,
  /<!-- #ifndef MP-WEIXIN -->[\s\S]*<canvas-poster[\s\S]*<!-- #endif -->/,
  'the global share modal should exclude the poster renderer from MP-WEIXIN',
);
assert.match(
  shareModalSource,
  /\/\/ #ifndef MP-WEIXIN\s+import canvasPoster/,
  'the global share modal should exclude the poster import from MP-WEIXIN',
);
assert.match(
  shareModalSource,
  /\/pages\/public\/poster/,
  'MP-WEIXIN poster actions should navigate to the public subpackage',
);
assert.match(
  modalStoreSource,
  /posterShareInfo:\s*null/,
  'the modal store should expose transient poster share data',
);
assert.match(
  posterPageSource,
  /import canvasPoster from '\.\/components\/canvas-poster\/index\.vue'/,
  'the public poster page should own the poster renderer import',
);
assert.match(
  posterPageSource,
  /getPoster\(\)/,
  'the public poster page should render the transferred share data',
);
assert.match(
  globalScssSource,
  /\/\* #ifndef MP-WEIXIN \*\/[\s\S]*@font-face\s*\{[\s\S]*font-family:\s*OPPOSANS;[\s\S]*\/\* #endif \*\//,
  'the bundled OPPOSANS face should remain available outside MP-WEIXIN',
);
assert.match(
  globalScssSource,
  /\.font-OPPOSANS\s*\{[^}]*font-family:\s*OPPOSANS,\s*Arial,\s*sans-serif;/,
  'OPPOSANS utility users should retain the branded font with a system fallback',
);

const [subpackagePosterSource, orderVerificationSource] = await Promise.all([
  readProjectFile('pages/public/components/canvas-poster/index.vue'),
  readProjectFile('pages/order/pickUpVerify.vue'),
]);
assert.match(
  subpackagePosterSource,
  /import lPainter from '\.\.\/l-painter\/l-painter\.vue'/,
  'the poster page should use a painter owned by the public subpackage',
);
assert.match(
  orderVerificationSource,
  /import lPainter from '\.\/components\/l-painter\/l-painter\.vue'/,
  'order verification should use a painter owned by the order subpackage',
);

for (const packageRoot of ['pages/public', 'pages/order']) {
  const painterNvueSource = await readProjectFile(`${packageRoot}/components/l-painter/nvue.js`);
  assert.doesNotMatch(
    painterNvueSource,
    /from '\.\.\/\.\.\/package\.json'/,
    `${packageRoot} painter should not import a nonexistent package manifest`,
  );
}

console.log('share poster subpackage checks passed');
