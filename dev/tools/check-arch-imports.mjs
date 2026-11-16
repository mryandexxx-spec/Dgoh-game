// ARCH-01: AST gate for forbidden imports. The temporary baseline is a shrinking debt ledger,
// not an exemption for new edges. See docs/ARCH01_IMPORT_BOUNDARIES_2026_11_16.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const CHECKED = ['data', 'logic', 'core'];
const ALLOWED_LOGIC = new Set(['data', 'logic', 'core']);

function violationFor(from, specifier, line, kind) {
  const layer = from.split('/')[0];
  if (!CHECKED.includes(layer)) return null;
  if (typeof specifier !== 'string') {
    return { from, to: '<dynamic>', line, kind, edge: from + ' -> <dynamic>' };
  }
  // The data/logic layers may not import Babylon directly even via a package specifier.
  if (!specifier.startsWith('.')) {
    if (/^(?:@babylonjs\/|babylonjs(?:\/|$))/.test(specifier) && layer !== 'core') {
      return { from, to: specifier, line, kind, edge: from + ' -> ' + specifier };
    }
    return null;
  }
  const to = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  const destLayer = to.split('/')[0];
  const forbidden = layer === 'data'
    ? destLayer !== 'data'
    : layer === 'logic'
      ? !ALLOWED_LOGIC.has(destLayer)
      : from !== 'core/boot.js' && destLayer === 'ui';
  return forbidden ? { from, to, line, kind, edge: from + ' -> ' + to } : null;
}

export function analyzeSource(source, from) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  const problems = [];
  function check(specifier, node, kind) {
    const issue = violationFor(from, specifier, node.loc.start.line, kind);
    if (issue) problems.push(issue);
  }
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' ||
        (node.type === 'ExportNamedDeclaration' && node.source)) {
      check(node.source.value, node, node.type);
    }
  }
  walk.simple(ast, {
    ImportExpression(node) {
      // Computed paths are not auditable: forbid them until resolved to a literal specifier.
      const specifier = node.source.type === 'Literal' && typeof node.source.value === 'string'
        ? node.source.value : null;
      check(specifier, node, 'ImportExpression');
    },
  });
  return problems;
}

export function compareWithBaseline(violations, baseline) {
  const seen = new Set(violations.map(v => v.edge));
  const approved = new Set(baseline);
  return {
    introduced: violations.filter(v => !approved.has(v.edge)),
    legacy: violations.filter(v => approved.has(v.edge)),
    stale: [...approved].filter(edge => !seen.has(edge)),
  };
}

function sourceFiles(root) {
  const files = [];
  function visit(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) visit(full);
      else if (item.isFile() && item.name.endsWith('.js')) files.push(full);
    }
  }
  for (const dir of CHECKED) visit(path.join(root, 'src', dir));
  return files.sort();
}

function main() {
  const root = process.cwd(); // Run from dev/.
  const baselineFile = path.join(root, 'tools', 'arch-import-baseline.json');
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8')).legacy;
  if (!Array.isArray(baseline) || new Set(baseline).size !== baseline.length) {
    throw new Error('ARCH-01: invalid or duplicate baseline edges');
  }
  const violations = [];
  for (const file of sourceFiles(root)) {
    const relative = path.relative(path.join(root, 'src'), file).split(path.sep).join('/');
    violations.push(...analyzeSource(fs.readFileSync(file, 'utf8'), relative));
  }
  const { introduced, legacy, stale } = compareWithBaseline(violations, baseline);
  for (const v of introduced) console.error('NEW ' + v.from + ':' + v.line + ' -> ' + v.to + ' (' + v.kind + ')');
  for (const edge of stale) console.error('STALE BASELINE ' + edge + ' (remove after cleanup)');
  console.log('ARCH-01 imports: ' + violations.length + ' forbidden, ' +
    legacy.length + ' existing baseline, ' + introduced.length + ' new, ' + stale.length + ' stale');
  if (process.argv.includes('--strict') && violations.length) {
    console.error('ARCH-01 strict: all forbidden imports must be removed before enabling strict CI.');
  }
  if (introduced.length || stale.length || (process.argv.includes('--strict') && violations.length)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
