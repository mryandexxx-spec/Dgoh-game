// Проход 1 (REFACTOR_PLAN §8): монолит → src/ «как есть». Однократный инструмент; результат — исходники в src/.
//   node tools/extract-pass1.mjs <artifact.html> [<прошлый index.html PWA>]
import fs from 'node:fs';
const [art, pwa] = process.argv.slice(2);
const L = fs.readFileSync(art, 'utf8').split('\n');
while (L.length && !L[0].startsWith('<title>')) L.shift();
const at = (re, from = 0) => { for (let i = from; i < L.length; i++) if (re.test(L[i])) return i; throw new Error('нет ' + re); };
const st0 = at(/^<style>$/), st1 = at(/^<\/style>$/, st0), bab = at(/babylonjs@9\.30\.0\/babylon\.js/), s1 = at(/^<script>$/, bab), s1e = at(/^<\/script>$/, s1), s2 = at(/^<script>$/, s1e), s2e = at(/^<\/script>$/, s2);
const head = L.slice(1, st0);                         // viewport, claude:, Google Fonts — только для артефакта
fs.mkdirSync('src/pwa', { recursive: true }); fs.mkdirSync('src/styles', { recursive: true });
fs.writeFileSync('src/pwa/artifact-head.html', head.join('\n') + '\n');
fs.writeFileSync('src/styles/app.css', L.slice(st0 + 1, st1).join('\n') + '\n');
fs.writeFileSync('src/index.html', [L[0], '<!--@head-->', '<!--@css-->', ...L.slice(st1 + 1, bab), '<!--@babylon-->', '<!--@js-->', ...L.slice(s2e + 1).filter(l => l !== '</body></html>'), '<!--@tail-->', '</body></html>'].join('\n') + '\n');
fs.writeFileSync('src/app.js', L.slice(s1 + 1, s1e).join('\n') + '\n' + L.slice(s2 + 1, s2e).join('\n') + '\n');
fs.writeFileSync('src/main.js', "import './app.js';\n");
if (pwa) {   // <head> и хвост PWA (как в build_pwa.py)
  const r = fs.readFileSync(pwa, 'utf8').split('\n');
  const ti = r.findIndex(l => l.startsWith('<title>')), tj = r.findIndex(l => l.startsWith('<style>'));
  let tk = r.length - 1; while (!r[tk].startsWith('<style>html,body{overscroll')) tk--;
  fs.writeFileSync('src/pwa/doc-head.html', r.slice(0, ti).join('\n') + '\n');
  fs.writeFileSync('src/pwa/pwa-head.html', r.slice(ti + 1, tj).join('\n') + '\n');
  fs.writeFileSync('src/pwa/tail.html', r.slice(tk).join('\n').replace(/\n*$/, '\n'));
}
console.log('src/: css', st1 - st0 - 1, 'строк; js', (s1e - s1 - 1) + (s2e - s2 - 1), 'строк');
