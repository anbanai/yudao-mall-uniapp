import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { parseAst } from 'rollup/parseAst';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'dist/build/mp-weixin');
const appConfig = JSON.parse(await readFile(join(outputRoot, 'app.json'), 'utf8'));
const subPackageRoots = (appConfig.subPackages ?? []).map(({ root }) => `${root}${sep}`);
const packageBlockSize = 2 * 1024;
// WeChat DevTools' code-quality check uses a 1.5 MB main-package threshold.
const mainPackageBudget = 1500 * 1024;

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : path;
    }),
  );
  return files.flat();
}

const allFiles = await listFiles(outputRoot);
const packageOf = (file) => subPackageRoots.find(
  (root) => relative(outputRoot, file).startsWith(root),
);
const mainPackageFiles = allFiles.filter((file) => !packageOf(file));
const sizes = await Promise.all(mainPackageFiles.map((file) => stat(file).then(({ size }) => size)));
const estimatedBytes = sizes.reduce(
  (total, size) => total + Math.ceil(size / packageBlockSize) * packageBlockSize,
  0,
);

assert.ok(
  estimatedBytes <= mainPackageBudget,
  `estimated main package size ${(estimatedBytes / 1024).toFixed(0)} KB exceeds ` +
    `${mainPackageBudget / 1024} KB budget`,
);

function resolveReference(file, reference) {
  return reference.startsWith('/')
    ? join(outputRoot, reference.slice(1))
    : resolve(dirname(file), reference);
}

const reachable = new Set();
const files = new Set(allFiles);
const queue = [join(outputRoot, 'app.js')];
for (const page of appConfig.pages ?? []) queue.push(join(outputRoot, page + '.js'));
for (const { root, pages = [] } of appConfig.subPackages ?? []) {
  for (const page of pages) queue.push(join(outputRoot, root, page.path + '.js'));
}
for (const [name, component] of Object.entries(appConfig.usingComponents ?? {})) {
  if (!component.includes('://')) queue.push(resolveReference(join(outputRoot, 'app.json'), component) + '.js');
}

while (queue.length) {
  const file = queue.pop();
  if (reachable.has(file) || !files.has(file)) continue;
  reachable.add(file);

  const configFile = file.slice(0, -3) + '.json';
  if (files.has(configFile)) {
    const config = JSON.parse(await readFile(configFile, 'utf8'));
    for (const component of Object.values(config.usingComponents ?? {})) {
      if (!component.includes('://')) queue.push(resolveReference(configFile, component) + '.js');
    }
  }

  const ast = parseAst(await readFile(file, 'utf8'));
  checkRequires(file, ast, (reference) => queue.push(resolveReference(file, reference)));
}

const unreferencedMainJs = mainPackageFiles.filter(
  (file) => file.endsWith('.js') && !reachable.has(file),
);
assert.deepEqual(
  unreferencedMainJs.map((file) => relative(outputRoot, file)),
  [],
  'the main package must not contain JavaScript unreachable from any app or subpackage page',
);

console.log(
  `mini program main package estimate: ${(estimatedBytes / 1024).toFixed(0)} KB ` +
    `(${mainPackageFiles.length} files)`,
);

const orderPackage = appConfig.subPackages.find(({ root }) => root === 'pages/order');
assert.equal(orderPackage?.plugins?.logisticsPlugin, undefined);
assert.equal(appConfig.plugins?.logisticsPlugin, undefined);
assert.equal(
  (appConfig.subPackages ?? []).some(({ plugins }) => plugins?.logisticsPlugin),
  false,
  'the mini program should not package the oversized logistics plugin',
);

const addressApi = 'sheep/api/member/address.js';
assert.ok(!files.has(join(outputRoot, addressApi)), 'subpackage-only API must leave the main package');
for (const root of ['pages/goods', 'pages/order', 'pages/user']) {
  assert.ok(files.has(join(outputRoot, root, addressApi)), `missing address API in ${root}`);
}

function assertReference(file, reference) {
  const target = reference.startsWith('/')
    ? join(outputRoot, reference.slice(1))
    : resolve(dirname(file), reference);
  assert.ok(files.has(target), `${relative(outputRoot, file)} points to missing ${reference}`);
  const targetPackage = packageOf(target);
  assert.ok(
    !targetPackage || targetPackage === (packageOf(file) ?? ''),
    `${relative(outputRoot, file)} synchronously loads ${reference} from another subpackage`,
  );
}

function checkRequires(file, node, onReference = () => {}) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.name === 'require') {
    const [argument] = node.arguments;
    if (typeof argument?.value === 'string' && /^(?:\.\.?\/|\/)/.test(argument.value)) {
      assertReference(file, argument.value);
      onReference(argument.value);
    }
  }
  for (const child of Object.values(node)) checkRequires(file, child, onReference);
}

for (const file of allFiles) {
  const outputPath = relative(outputRoot, file);
  if (file.endsWith('.js')) {
    checkRequires(file, parseAst(await readFile(file, 'utf8')));
  } else if (file.endsWith('.json')) {
    const config = JSON.parse(await readFile(file, 'utf8'));
    for (const component of Object.values(config.usingComponents ?? {})) {
      if (!component.includes('://')) {
        assertReference(file, component + '.json');
      }
    }
  }
}

console.log('mini program package references and plugin placement passed');
