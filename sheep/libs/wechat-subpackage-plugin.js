import { posix as path } from 'node:path';

const componentFiles = ['js', 'json', 'wxml', 'wxss'];
const featureChunk = /^(?:sheep\/(?:api|helper|components|ui)\/|uni_modules\/|utils\/)/;

function resolveReference(file, reference) {
  return reference.startsWith('/')
    ? reference.slice(1)
    : path.normalize(path.join(path.dirname(file), reference));
}

function relativeReference(file, target) {
  const relative = path.relative(path.dirname(file), target);
  return relative.startsWith('.') ? relative : './' + relative;
}

function collectRequires(ast, references) {
  if (!ast || typeof ast !== 'object') return;
  if (Array.isArray(ast)) {
    for (const node of ast) collectRequires(node, references);
    return;
  }
  if (ast.type === 'CallExpression' && ast.callee.name === 'require') {
    const [argument] = ast.arguments;
    if (
      argument?.type === 'Literal' &&
      typeof argument.value === 'string' &&
      /^(?:\.\.?\/|\/)/.test(argument.value)
    ) {
      references.push(argument);
    }
  }
  for (const value of Object.values(ast)) collectRequires(value, references);
}

function readModules(bundle, parse) {
  const modules = new Map();
  for (const [file, entry] of Object.entries(bundle)) {
    if (entry.type !== 'chunk' || !file.endsWith('.js')) continue;

    const requires = [];
    collectRequires(parse(entry.code), requires);
    requires.sort((left, right) => right.start - left.start);
    const jsonFile = bundle[file.slice(0, -3) + '.json'];
    const config = jsonFile && JSON.parse(jsonFile.source);
    const components = Object.entries(config?.usingComponents ?? {})
      .filter(([, reference]) => !reference.includes('://'))
      .map(([name, reference]) => [name, resolveReference(file, reference) + '.js']);
    const dependencies = [
      ...requires.map(({ value }) => resolveReference(file, value)),
      ...components.map(([, target]) => target),
    ];
    modules.set(file, { requires, config, components, dependencies });
  }
  return modules;
}

function canRelocate(file, module, bundle) {
  if (!featureChunk.test(file)) return false;
  if (!module.config) return true;
  if (!module.config.component) return false;
  const base = file.slice(0, -3);
  // A component with WXS, a relative asset, or a stylesheet/template import
  // needs its resource paths handled as well. Leave it in the main package.
  if (bundle[base + '.wxs']) return false;
  const template = bundle[base + '.wxml']?.source ?? '';
  const styles = bundle[base + '.wxss']?.source ?? '';
  return !/<(?:wxs|include|import)\b|\bsrc=["']\.{1,2}\//.test(template) &&
    !/@import\b|url\(["']?\.{1,2}\//.test(styles);
}

function assignPackages(modules, bundle, app, packages, packageOf) {
  const owners = new Map();
  function visit(file, root) {
    const module = modules.get(file);
    if (!module) return;
    const roots = owners.get(file) ?? new Set();
    if (roots.has(root)) return;
    roots.add(root);
    owners.set(file, roots);
    for (const dependency of module.dependencies) visit(dependency, root);
  }

  visit('app.js', '');
  for (const component of Object.values(app.usingComponents ?? {})) {
    visit(resolveReference('app.json', component) + '.js', '');
  }
  for (const page of app.pages) visit(page + '.js', '');
  for (const { root, pages } of packages) {
    for (const page of pages) visit(path.join(root, page) + '.js', root);
  }

  // Anything retained in main must be able to load its dependencies from main.
  // This includes shared runtime state and components with local resources.
  for (const [file, module] of modules) {
    if (!packageOf(file) && owners.has(file) && !canRelocate(file, module, bundle)) {
      visit(file, '');
    }
  }
  return owners;
}

export default function wechatSubpackagePlugin() {
  return {
    name: 'shopro:wechat-subpackages',
    apply: (_, { mode }) => process.env.UNI_PLATFORM === 'mp-weixin' && mode === 'production',
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        if (!bundle['app.json']) return;
        const app = JSON.parse(bundle['app.json'].source);
        const packages = app.subPackages ?? [];
        const packageOf = (file) => packages.find(({ root }) => file.startsWith(root + '/'))?.root ?? '';
        const modules = readModules(bundle, (code) => this.parse(code));
        const owners = assignPackages(modules, bundle, app, packages, packageOf);
        const unreachable = [...modules.keys()].filter((file) => !owners.has(file));
        const relocated = new Map(
          [...owners].filter(([file, roots]) => !packageOf(file) && !roots.has('')),
        );
        const outputPath = (file, root) => relocated.has(file) ? path.join(root, file) : file;

        for (const [file, module] of modules) {
          const destinations = relocated.get(file) ?? [packageOf(file)];
          const chunk = bundle[file];
          for (const root of destinations) {
            const destination = outputPath(file, root);
            let code = chunk.code;
            for (const { start, end, value } of module.requires) {
              const target = resolveReference(file, value);
              if (!modules.has(target) || (destination === file && !relocated.has(target))) continue;
              const reference = relativeReference(destination, outputPath(target, root));
              code = code.slice(0, start) + JSON.stringify(reference) + code.slice(end);
            }
            if (destination === file) {
              chunk.code = code;
            } else {
              this.emitFile({ type: 'asset', fileName: destination, source: code });
            }

            if (!module.config || (destination === file && !module.components.some(([, target]) => relocated.has(target)))) {
              continue;
            }
            const base = destination.slice(0, -3);
            const config = { ...module.config, usingComponents: { ...module.config.usingComponents } };
            for (const [name, target] of module.components) {
              if (destination === file && !relocated.has(target)) continue;
              config.usingComponents[name] = relativeReference(destination, outputPath(target, root)).slice(0, -3);
            }
            const json = JSON.stringify(config);
            if (destination === file) {
              bundle[base + '.json'].source = json;
            } else {
              this.emitFile({ type: 'asset', fileName: base + '.json', source: json });
              for (const extension of ['wxml', 'wxss']) {
                const original = bundle[file.slice(0, -3) + '.' + extension];
                if (original) this.emitFile({ type: 'asset', fileName: base + '.' + extension, source: original.source });
              }
            }
          }
        }

        for (const file of relocated.keys()) {
          const base = file.slice(0, -3);
          for (const extension of componentFiles) delete bundle[base + '.' + extension];
        }

        for (const file of unreachable) {
          const base = file.slice(0, -3);
          for (const extension of componentFiles) delete bundle[base + '.' + extension];
        }

        const referencedFiles = new Set();
        for (const module of modules.values()) {
          for (const dependency of module.dependencies) referencedFiles.add(dependency);
        }
        for (const [file, asset] of Object.entries(bundle)) {
          if (
            asset.type === 'asset' &&
            file.endsWith('.js') &&
            !referencedFiles.has(file) &&
            /^\s*["']use strict["'];?\s*$/.test(String(asset.source))
          ) {
            delete bundle[file];
          }
        }
      },
    },
  };
}
