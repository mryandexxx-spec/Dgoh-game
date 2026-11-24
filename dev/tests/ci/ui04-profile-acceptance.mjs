import assert from 'node:assert/strict';
import { loadGame } from '../lib/load.mjs';
const g=loadGame(process.argv[2]||'dist/pwa/index.html'), run=s=>g.run(s);
run('set_S(newSave())');
for(const id of ['hawk','baron','eye','spice','lion','knife','sietch']){
  const html=run('avatarHtml("emb:'+id+'","gold",76)');
  assert.match(html,/fr-gold/);
  assert.match(html,/stroke=/);
  assert.ok(html.length>500,'artwork must have layered shapes');
}
assert.match(run('avatarHtml("emb:worm","basic")'),/<image href=/);
assert.equal(run('unlocked("frame","basic")'),true);
assert.equal(run('unlocked("frame","gold")'),false);
console.log('UI-04 heraldry and entitlements PASS');
