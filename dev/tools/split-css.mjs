// Проход 2: src/styles/app.css → файлы по разделам (границы — комментарии-маркеры), порядок каскада сохраняется
// списком @import в src/styles/index.css. Проверка: склейка (tools/build.mjs) байт-в-байт равна исходному app.css.
//   node tools/split-css.mjs
import fs from 'node:fs';
const CSS = [[1, 'base.css'], [107, 'battle.css'], [181, 'shops.css'], [237, 'lobby.css'], [260, 'battle-side.css'], [382, 'polish.css'],
  [438, 'map.css'], [494, 'battle3d.css'], [505, 'popups.css'], [650, 'hero.css'], [689, 'meta.css'], [765, 'battle-fx.css'],
  [804, 'notifications.css'], [852, 'rewards.css'], [877, 'celebrate.css'], [915, 'gauges.css'], [927, 'stages3d.css'], [938, 'cinematic.css'],
  [965, 'campaigns.css'], [1027, 'landscape.css'], [1109, 'v30.css'], [1171, 'conquest.css'], [1270, 'releases.css']];
const src = fs.readFileSync('src/styles/app.css', 'utf8'), L = src.split('\n'); L.pop();
CSS.forEach(([from, f], i) => fs.writeFileSync('src/styles/' + f, L.slice(from - 1, (CSS[i + 1] ? CSS[i + 1][0] : L.length + 1) - 1).join('\n') + '\n'));
fs.writeFileSync('src/styles/index.css', CSS.map(([, f]) => `@import "${f}";`).join('\n') + '\n');
console.log('файлов CSS:', CSS.length);
