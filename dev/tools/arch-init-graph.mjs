// ARCH-01B diagnostic: report static ESM cycles without changing build/boot ordering.
// This intentionally does NOT fail CI on existing cycles; see docs/ARCH01_BOOTSTRAP_ORDER_RISK_2026_11_16.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

export function stronglyConnected(graph) {
  const nodes = [...new Set([...Object.keys(graph), ...Object.values(graph).flat()])].sort();
  const index = new Map(), low = new Map(), stack = [], onStack = new Set(), components = [];
  let nextIndex = 0;
  function visit(node) {
    index.set(node, nextIndex);
    low.set(node, nextIndex++);
    stack.push(node); onStack.add(node);
    for (const neighbor of [...new Set(graph[node] || [])].sort()) {
      if (!index.has(neighbor)) {
        visit(neighbor);
        low.set(node, Math.min(low.get(node), low.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        low.set(node, Math.min(low.get(node), index.get(neighbor)));
      }
    }
    if (low.get(node) === index.get(node)) {
      const component = [];
      let member;
      do { member = stack.pop(); onStack.delete(member); component.push(member); } while (member !== node);
      components.push(component.sort());
    }
  }
  for (const node of nodes) if (!index.has(node)) visit(node);
  return components.filter(c => c.length > 1 || (graph[c[0]] || []).includes(c[0]))
    .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

export function importEdges(source, from) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  const edges = [];
  const add = (node, target, kind) => {
    if (typeof target !== 'string' || !target.startsWith('.')) return;
    const to = path.posix.normalize(path.posix.join(path.posix.dirname(from), target));
    edges.push({ from, to, kind, line: node.loc.start.line });
  };
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' ||
      (node.type === 'ExportNamedDeclaration' && node.source)) {
      add(node, node.source.value, 'static');
    }
  }
  walk.simple(ast, {
    ImportExpression(node) {
      if (node.source.type === 'Literal' && typeof node.source.value === 'string')
        add(node, node.source.value, 'dynamic');
    },
  });
  return edges;
}

function sourceFiles(root) {
  const out = [];
  function visit(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, e.name);
      if (e.isDirectory()) visit(filename);
      else if (e.isFile() && e.name.endsWith('.js')) out.push(filename);
    }
  }
  visit(root);
  return out.sort();
}

export function analyzeTree(root) {
  const src = path.join(root, 'src');
  const files = sourceFiles(src);
  const known = new Set(files.map(f => path.relative(src, f).split(path.sep).join('/')));
  const edges = [];
  const unresolved = [];
  for (const filename of files) {
    const relative = path.relative(src, filename).split(path.sep).join('/');
    for (const edge of importEdges(fs.readFileSync(filename, 'utf8'), relative)) {
      // All static relative imports should point to a source module.
      if (known.has(edge.to)) edges.push(edge);
      else unresolved.push(edge);
    }
  }
  const graph = Object.fromEntries([...known].sort().map(file => [file, []]));
  for (const edge of edges) if (edge.kind === 'static') graph[edge.from].push(edge.to);
  const cycles = stronglyConnected(graph);
  const cyclicalEdges = edges.filter(e => e.kind === 'static' &&
    cycles.some(c => c.includes(e.from) && c.includes(e.to)));
  return {
    modules: files.length,
    staticImports: edges.filter(e => e.kind === 'static').length,
    dynamicImports: edges.filter(e => e.kind === 'dynamic').length,
    unresolved,
    cycles,
    cyclicalEdges,
  };
}

function main() {
  const root = process.cwd(); // dev/
  const result = analyzeTree(root);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('ARCH-01B topology: ' + result.modules + ' source modules, ' +
      result.staticImports + ' static imports, ' +
      result.dynamicImports + ' dynamic imports, ' +
      result.cycles.length + ' static cyclic components');
    for (const [i, group] of result.cycles.slice(0, 10).entries()) {
      const edges = result.cyclicalEdges.filter(e => group.includes(e.from) && group.includes(e.to));
      console.log('  SCC #' + (i + 1) + ' (' + group.length + ' modules, ' + edges.length +
        ' edges): ' + group.slice(0, 6).join(', ') + (group.length > 6 ? ', …' : ''));
    }
    if (result.unresolved.length) console.log('Unresolved relative imports: ' +
      result.unresolved.map(e => e.from + ':' + e.line + ' -> ' + e.to).join(', '));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
