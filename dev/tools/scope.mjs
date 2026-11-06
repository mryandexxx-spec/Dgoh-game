// Лёгкий анализ областей видимости для acorn-AST: свободные ссылки и записи в идентификаторы верхнего уровня.
import * as walk from 'acorn-walk';

function patNames(p, out = []) {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach(q => patNames(q.type === 'RestElement' ? q.argument : q.value, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach(e => patNames(e, out));
  else if (p.type === 'AssignmentPattern') patNames(p.left, out);
  else if (p.type === 'RestElement') patNames(p.argument, out);
  return out;
}
// объявления, видимые в блоке (let/const/class/function) и var-объявления функции (без вложенных функций)
function blockDecls(body) {
  const s = new Set();
  for (const n of body) {
    if (n.type === 'VariableDeclaration' && n.kind !== 'var') n.declarations.forEach(d => patNames(d.id).forEach(x => s.add(x)));
    if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) s.add(n.id.name);
  }
  return s;
}
function varDecls(node, s = new Set()) {
  walk.recursive(node, null, {
    Function() {}, // не входим во вложенные функции
    VariableDeclaration(n, st, c) { if (n.kind === 'var') n.declarations.forEach(d => patNames(d.id).forEach(x => s.add(x))); n.declarations.forEach(d => d.init && c(d.init, st)); },
  });
  return s;
}

// visit(stmt) → { refs: Map name→[pos], writes: [{name,start,end,node}] } по свободным идентификаторам
export function analyze(stmts) {
  const refs = new Map(), writes = [];
  const scopes = [];
  const bound = n => scopes.some(s => s.has(n));
  const ref = (id, isWrite, parent) => {
    if (bound(id.name)) return;
    if (!refs.has(id.name)) refs.set(id.name, []);
    refs.get(id.name).push(id.start);
    if (isWrite) writes.push({ name: id.name, id, parent });
  };
  const visitPatternWrite = (p, parent) => { // цель присваивания
    if (!p) return;
    if (p.type === 'Identifier') return ref(p, true, parent);
    if (p.type === 'MemberExpression') return expr(p);
    if (p.type === 'ObjectPattern') return p.properties.forEach(q => { if (q.type === 'RestElement') visitPatternWrite(q.argument, parent); else { if (q.computed) expr(q.key); visitPatternWrite(q.value, parent); } });
    if (p.type === 'ArrayPattern') return p.elements.forEach(e => visitPatternWrite(e, parent));
    if (p.type === 'AssignmentPattern') { visitPatternWrite(p.left, parent); return expr(p.right); }
    if (p.type === 'RestElement') return visitPatternWrite(p.argument, parent);
  };
  const declPattern = p => { // дефолты и вычисляемые ключи в параметрах/деструктуризации
    if (!p) return;
    if (p.type === 'ObjectPattern') p.properties.forEach(q => { if (q.type === 'RestElement') declPattern(q.argument); else { if (q.computed) expr(q.key); declPattern(q.value); } });
    else if (p.type === 'ArrayPattern') p.elements.forEach(declPattern);
    else if (p.type === 'AssignmentPattern') { declPattern(p.left); expr(p.right); }
    else if (p.type === 'RestElement') declPattern(p.argument);
  };
  const fn = n => {
    const s = new Set(); n.params.forEach(p => patNames(p).forEach(x => s.add(x)));
    if (n.type === 'FunctionExpression' && n.id) s.add(n.id.name);
    if (n.body.type === 'BlockStatement') { varDecls(n.body, s); blockDecls(n.body.body).forEach(x => s.add(x)); }
    scopes.push(s); n.params.forEach(declPattern);
    if (n.body.type === 'BlockStatement') n.body.body.forEach(stmt); else expr(n.body);
    scopes.pop();
  };
  const cls = n => { if (n.superClass) expr(n.superClass); n.body.body.forEach(m => { if (m.computed) expr(m.key); if (m.value) (m.value.type.includes('Function') ? fn(m.value) : expr(m.value)); if (m.type === 'StaticBlock') { scopes.push(blockDecls(m.body)); m.body.forEach(stmt); scopes.pop(); } }); };
  const block = (body) => { scopes.push(blockDecls(body)); body.forEach(stmt); scopes.pop(); };
  function stmt(n) {
    if (!n) return;
    switch (n.type) {
      case 'VariableDeclaration': n.declarations.forEach(d => { declPattern(d.id); if (d.init) expr(d.init); }); return;
      case 'FunctionDeclaration': return fn(n);
      case 'ClassDeclaration': return cls(n);
      case 'BlockStatement': return block(n.body);
      case 'ExpressionStatement': return expr(n.expression);
      case 'IfStatement': expr(n.test); stmt(n.consequent); return stmt(n.alternate);
      case 'ForStatement': { const s = new Set(); if (n.init && n.init.type === 'VariableDeclaration' && n.init.kind !== 'var') n.init.declarations.forEach(d => patNames(d.id).forEach(x => s.add(x))); scopes.push(s); if (n.init) (n.init.type === 'VariableDeclaration' ? stmt(n.init) : expr(n.init)); expr(n.test); expr(n.update); stmt(n.body); scopes.pop(); return; }
      case 'ForInStatement': case 'ForOfStatement': { const s = new Set(); if (n.left.type === 'VariableDeclaration') { if (n.left.kind !== 'var') n.left.declarations.forEach(d => patNames(d.id).forEach(x => s.add(x))); } scopes.push(s); if (n.left.type === 'VariableDeclaration') n.left.declarations.forEach(d => declPattern(d.id)); else visitPatternWrite(n.left, n); expr(n.right); stmt(n.body); scopes.pop(); return; }
      case 'WhileStatement': case 'DoWhileStatement': expr(n.test); return stmt(n.body);
      case 'ReturnStatement': case 'ThrowStatement': return expr(n.argument);
      case 'TryStatement': stmt(n.block); if (n.handler) { const s = new Set(patNames(n.handler.param)); scopes.push(s); stmt(n.handler.body); scopes.pop(); } return stmt(n.finalizer);
      case 'SwitchStatement': expr(n.discriminant); scopes.push(blockDecls(n.cases.flatMap(c => c.consequent))); n.cases.forEach(c => { expr(c.test); c.consequent.forEach(stmt); }); scopes.pop(); return;
      case 'LabeledStatement': return stmt(n.body);
      case 'BreakStatement': case 'ContinueStatement': case 'EmptyStatement': case 'DebuggerStatement': return;
      default: throw new Error('stmt ' + n.type);
    }
  }
  function expr(n) {
    if (!n) return;
    switch (n.type) {
      case 'Identifier': return ref(n, false);
      case 'Literal': case 'ThisExpression': case 'Super': case 'MetaProperty': return;
      case 'TemplateLiteral': return n.expressions.forEach(expr);
      case 'TaggedTemplateExpression': expr(n.tag); return expr(n.quasi);
      case 'ArrayExpression': return n.elements.forEach(expr);
      case 'ObjectExpression': return n.properties.forEach(p => { if (p.type === 'SpreadElement') return expr(p.argument); if (p.computed) expr(p.key); if (p.shorthand) return expr(p.value); expr(p.value); });
      case 'FunctionExpression': case 'ArrowFunctionExpression': return fn(n);
      case 'ClassExpression': { if (n.id) { scopes.push(new Set([n.id.name])); cls(n); scopes.pop(); } else cls(n); return; }
      case 'UnaryExpression': case 'SpreadElement': case 'AwaitExpression': case 'YieldExpression': return expr(n.argument);
      case 'UpdateExpression': if (n.argument.type === 'Identifier') return ref(n.argument, true, n); return expr(n.argument);
      case 'BinaryExpression': case 'LogicalExpression': expr(n.left); return expr(n.right);
      case 'AssignmentExpression': visitPatternWrite(n.left, n); if (n.operator !== '=' && n.left.type === 'Identifier') ref(n.left, false); return expr(n.right);
      case 'ConditionalExpression': expr(n.test); expr(n.consequent); return expr(n.alternate);
      case 'CallExpression': case 'NewExpression': expr(n.callee); return n.arguments.forEach(expr);
      case 'MemberExpression': expr(n.object); if (n.computed) expr(n.property); return;
      case 'ChainExpression': return expr(n.expression);
      case 'SequenceExpression': return n.expressions.forEach(expr);
      case 'ParenthesizedExpression': return expr(n.expression);
      case 'ImportExpression': return expr(n.source);
      default: throw new Error('expr ' + n.type);
    }
  }
  // верхний уровень модуля: собственные объявления считаются «внешними» для анализа (их ищет вызывающий)
  scopes.push(new Set());
  stmts.forEach(stmt);
  return { refs, writes };
}
export { patNames };
