// BATTLE-REENTRY: preferences-only BT after retreat is NOT an active battle.
// Compiled PWA/artifact test under the normal owned Web Locks writer.
// Prevents a silent "Battle" button dead end without weakening transactions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const fixture = JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '../fixtures/saves/01-legacy-v1.json'),'utf8')));
const KEY = 'dune-goh-v1';
class Locks {
  constructor(){this.held=false;}
  request(name, options, callback){
    assert.equal(name,KEY+'.writer');
    assert.equal(options.mode,'exclusive');
    assert.equal(options.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>callback(null));
    this.held=true;
    return Promise.resolve().then(()=>callback({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
const g=loadGame(html, {seed:77});
g.store.set(KEY,fixture);
g.ctx.navigator={locks:new Locks()};
assert.equal((await g.run('start({})')).status,'started');
assert.equal(g.run('loadSave.writer.state().status'),'owned');
assert.equal(g.run('loadSave.writer.check().ok'),true);
const water=()=>g.run('S.water');
const onDisk=()=>JSON.parse(g.store.get(KEY)).water;
const first=water();
g.run('startBattle(3)');
assert.equal(g.run('!!BT?.B && !BT.done'),true,'initial battle must launch');
const debited=water();
assert.ok(debited<first,'first verified entry consumes energy');
assert.equal(debited,onDisk(),'first entry is durably checkpointed');
g.run('startBattle(3)');
assert.equal(water(),debited,'double tap during a real battle may not spend twice');

// Real settings "Отступить" route: mark defeat, verified settlement, leave.
// No reward generation, no fabricated battle result, no writer reset.
g.run("BT.B.over='B'; finish();");
assert.equal(g.run('BT.done'),true,'retreat must finalize the same battle');
const settled=water();
assert.equal(settled,onDisk(),'retreat refund was checkpointed');
g.run('leaveBattle()');
assert.equal(g.run('!!BT && !BT.B'),true,'saved preferences are not a battle');
assert.equal(g.run('loadSave.writer.check().ok'),true,'writer retained across retreat');

// Both routes must work again: direct campaign entry and squad selector.
g.run('startBattle(3)');
assert.equal(g.run('!!BT?.B && !BT.done'),true,'direct re-entry must not be blocked by preferences');
const second=water();
assert.ok(second<settled,'second entry debits exactly once');
assert.equal(second,onDisk());
g.run('startBattle(3)');
assert.equal(water(),second,'repeated second launch does not duplicate debit');
g.run("BT.B.over='B'; finish(); leaveBattle();");
g.run("openSquadSel('camp', 3); sqGo();");
assert.equal(g.run('!!BT?.B && !BT.done'),true,'squad Battle click must open after retreat');
assert.equal(g.run('loadSave.writer.check().ok'),true);
assert.equal(water(),onDisk(),'squad entry remains transactional');
g.run('loadSave.writer.release()');
console.log('PASS battle re-entry: active dedupe, verified retreat, preserved preferences, direct + squad relaunch');
