// CI-OPT-02: conservative proof that a PR modifies ONLY player-facing copy.
// No filename-only exemption. Any unknown, renamed, mixed, syntactically changed,
// numeric, attribute, interpolation, state, save or economy edit fails closed.
import { parse } from 'acorn';
import { execFileSync } from 'node:child_process';
import { changedPaths } from './ci-inputs.mjs';

const VERSION = 'dev/version.json';
const EXTRA_DISPLAY = new Set([
  'dev/src/data/campaigns.js',
  'dev/src/logic/economy.js',
  'dev/src/logic/rewards.js',
]);
export const copyCandidate = p =>
  p === VERSION || /^dev\/src\/ui\/[\w/-]+\.js$/.test(p) || EXTRA_DISPLAY.has(p);
const getKey = node =>
  node?.type === 'Identifier' ? node.name :
  node?.type === 'Literal' ? String(node.value) : null;
const declared = chain => chain.find(n => n.type === 'VariableDeclarator')?.id?.name;
const prop = chain => [...chain].reverse().find(n => n.type === 'Property');

function safeText(before, after) {
  if (!before || !after || before === after) return false;
  // Values that are also amounts, timing, identifiers, HTML entities or JS
  // delimiters must not be disguised as "copy" to escape behaviour tests.
  if (/[\x00-\x1f<>&{}$\\]/.test(before + after) ||
      (before + after).includes(String.fromCharCode(96))) return false;
  if (JSON.stringify(before.match(/\p{Nd}+(?:[.,]\p{Nd}+)*/gu) || []) !==
      JSON.stringify(after.match(/\p{Nd}+(?:[.,]\p{Nd}+)*/gu) || [])) return false;
  return /\p{L}/u.test(before) && /\p{L}/u.test(after);
}
function visibleMarkupOnly(before, after) {
  if (!before.includes('<') || !after.includes('<')) return false;
  // Treat only complete, unchanged tags as structure. Partial interpolated
  // tags and anything that could modify an HTML attribute always fall back.
  const re = /(<[^<>]*>)/g, a = before.split(re), b = after.split(re);
  if (a.length !== b.length || a.length < 3) return false;
  if (a.join('') !== before || b.join('') !== after) return false;
  let changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (i % 2 === 1) {
      if (a[i] !== b[i]) return false; // no tag or attribute changes
    } else if (a[i] !== b[i]) {
      // Raw-text/script and option contents may have executable or form
      // semantics even when their surrounding HTML tags are identical.
      const prev = a[i - 1].toLowerCase();
      if (i === 0 || !prev.endsWith('>') ||
          /^<(?:script|style|textarea|option|title|code|pre)\b/.test(prev) ||
          /[<>]/.test(a[i] + b[i]) || !safeText(a[i], b[i])) return false;
      changed++;
    }
  }
  return changed > 0;
}
function toastCall(chain) {
  return chain.some(n => n.type === 'CallExpression' &&
    n.callee?.type === 'Identifier' && n.callee.name === 'toast');
}
function approvedStringSite(file, chain, node) {
  const root = declared(chain), property = prop(chain);
  if (property?.value !== node) return false;
  const k = getKey(property.key);
  if (file === 'dev/src/logic/economy.js')
    return root === 'RW_NAME' && k !== null;
  if (file === 'dev/src/data/campaigns.js')
    return root === 'CAMP_DEF' && k === 'desc' &&
      chain.some(n => n.type === 'Property' && getKey(n.key) === 'C');
  if (!file.startsWith('dev/src/ui/')) return false;
  return (root === 'RW_TITLE' && k !== null) ||
    (root === 'RES_INFO' && ['n', 'n2', 'd'].includes(k)) ||
    (root === 'SHOPS' && ['n', 'd'].includes(k));
}
function approvedTemplateSite(file, chain, oldRaw, newRaw) {
  if (file.startsWith('dev/src/ui/') && visibleMarkupOnly(oldRaw, newRaw))
    return true;
  if (!safeText(oldRaw, newRaw)) return false;
  if (file.startsWith('dev/src/ui/')) return toastCall(chain);
  if (file === 'dev/src/logic/rewards.js') {
    return chain.some(n => n.type === 'ArrayExpression' &&
      n.elements?.[0]?.type === 'Literal' && n.elements[0].value === 'energy') &&
      chain.some(n => n.type === 'CallExpression' &&
        n.callee?.type === 'MemberExpression' &&
        getKey(n.callee.property) === 'push' &&
        n.callee.object?.name === 'un');
  }
  return false;
}
function literalSlots(source) {
  const root = parse(source, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true });
  const out = [];
  function visit(node, chain = []) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child, chain);
      return;
    }
    if (typeof node.type !== 'string') return;
    if (node.type === 'Literal' || node.type === 'TemplateElement')
      out.push({ node, chain, raw: source.slice(node.start, node.end) });
    for (const [key, child] of Object.entries(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'raw' ||
          key === 'value' && node.type === 'TemplateElement') continue;
      if (child && typeof child === 'object') visit(child, [...chain, node]);
    }
  }
  visit(root);
  return out;
}
export function compareCopySource(before, after, file) {
  if (!copyCandidate(file) || before === after) return false;
  const a = literalSlots(before), b = literalSlots(after);
  if (a.length !== b.length) return false;
  const slotsA = [], slotsB = [];
  let edits = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i].node.type !== b[i].node.type) return false;
    if (a[i].raw === b[i].raw) continue;
    const left = a[i], right = b[i];
    if (left.node.type === 'Literal') {
      if (typeof left.node.value !== 'string' || typeof right.node.value !== 'string' ||
          !approvedStringSite(file, left.chain, left.node) ||
          !approvedStringSite(file, right.chain, right.node) ||
          !safeText(left.node.value, right.node.value)) return false;
      // No changing quote style or introducing escapes.
      if (left.raw[0] !== right.raw[0] ||
          !["'", '"'].includes(left.raw[0]) ||
          left.raw.slice(1, -1).includes('\\') ||
          right.raw.slice(1, -1).includes('\\')) return false;
    } else if (!approvedTemplateSite(file, left.chain, left.raw, right.raw) ||
               !approvedTemplateSite(file, right.chain, left.raw, right.raw)) {
      return false;
    }
    slotsA.push([left.node.start, left.node.end]);
    slotsB.push([right.node.start, right.node.end]);
    edits++;
  }
  if (!edits) return false;
  const skeleton = (source, slots) => {
    let last = 0, output = '';
    for (let i = 0; i < slots.length; i++) {
      const [start, end] = slots[i];
      if (start < last) throw Error('Overlapping copy slots');
      output += source.slice(last, start) + '[UI_COPY_' + i + ']';
      last = end;
    }
    return output + source.slice(last);
  };
  // All executable JS, whitespace, comments, interpolation expressions,
  // imported paths and unchanged literals must remain byte-for-byte identical.
  return skeleton(before, slotsA) === skeleton(after, slotsB);
}
// A normal shipping PR can also increment the public app version.
// Prove exactly one numeric bump with otherwise byte-identical JSON.
// Version-only changes remain classified as "release", never "ui-copy".
export function compareCopyVersion(before, after) {
  const re = /^(\s*\{\s*"v"\s*:\s*)(\d+)(\s*\}\s*)$/;
  const a = before.match(re), b = after.match(re);
  return !!a && !!b && a[1] === b[1] && a[3] === b[3] &&
    Number.isSafeInteger(Number(a[2])) &&
    Number.isSafeInteger(Number(b[2])) &&
    Number(b[2]) === Number(a[2]) + 1;
}
const git = (args, cwd) => execFileSync('git', args, {
  cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024
});
export function verifyUiCopy(base, head, cwd = process.cwd()) {
  try {
    const paths = changedPaths(base, head, cwd);
    if (!paths.some(p => p !== VERSION) || paths.some(p => !copyCandidate(p))) return false;
    return paths.every(p => {
      const before = git(['show', base + ':' + p], cwd);
      const after = git(['show', head + ':' + p], cwd);
      return p === VERSION ? compareCopyVersion(before, after) : compareCopySource(before, after, p);
    });
  } catch {
    // Missing git object, deleted/added file, parse error or ambiguity: full.
    return false;
  }
}
