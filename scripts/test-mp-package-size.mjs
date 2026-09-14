import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'dist/build/mp-weixin');
const appConfig = JSON.parse(await readFile(join(outputRoot, 'app.json'), 'utf8'));
const subPackageRoots = (appConfig.subPackages ?? []).map(({ root }) => `${root}${sep}`);
const packageBlockSize = 2 * 1024;
// WeChat DevTools reports about 196 KB more than the on-disk block estimate
// when the logistics plugin is enabled. Keep a further ~100 KB upload margin.
const mainPackageBudget = 1750 * 1024;

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
const mainPackageFiles = allFiles.filter((file) => {
  const outputPath = relative(outputRoot, file);
  return !subPackageRoots.some((root) => outputPath.startsWith(root));
});
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

console.log(
  `mini program main package estimate: ${(estimatedBytes / 1024).toFixed(0)} KB ` +
    `(${mainPackageFiles.length} files)`,
);
