// ARCH-02C-B6a: every market/refill/recycler debit is a verified snapshot.
// Execute against actual compiled PWA AND standalone HTML (no source mocks).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';
import './shop-catalog.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const KEY = 'dune-goh-v1', BACKUP = KEY + '.backup';
const fixture = JSON.stringify(JSON.parse(fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'), 'utf8')));
const passed = [];
function pass(id, description) { passed.push(id); console.log('  ' + id + ' ' + description); }
class Locks {
  constructor() { this.held = false; }
  request(name, options, callback) {
    assert.equal(name, KEY + '.writer');
    assert.equal(options.mode, 'exclusive');
    assert.equal(options.ifAvailable, true);
    if (this.held) return Promise.resolve().then(() => callback(null));
    this.held = true;
    return Promise.resolve().then(() => callback({ name, mode: 'exclusive' }))
      .finally(() => { this.held = false; });
  }
}
async function boot(raw = fixture) {
  const listeners = {}, overlay = { innerHTML: '' }, overlay2 = { innerHTML: '' };
  const g = loadGame(html, { seed: 71, now: Date.UTC(2026, 10, 2, 9),
    onQuerySelector: s => s === '#overlay' ? overlay : s === '#overlay2' ? overlay2 : null,
    onDocumentListener: (type, fn) => { (listeners[type] ??= []).push(fn); }
  });
  g.store.set(KEY, raw);
  g.ctx.navigator = { locks: new Locks() };
  assert.equal((await g.run('start({})')).status, 'started');
  assert.equal(g.run('loadSave.writer.state().status'), 'owned');
  g.listeners = listeners; g.overlay = overlay; g.overlay2 = overlay2;
  return g;
}
const disk = g => JSON.parse(g.store.get(KEY));
const ram = g => JSON.parse(g.run('JSON.stringify(S)'));
const blocked = g => g.run('start.writerLifecycle().blocked');
function click(g, name, value = '1') {
  const button = { tagName: 'BUTTON', dataset: { [name]: String(value) } };
  const event = { target: { closest: selector => selector === 'button, [data-fxu], .unit.tgt, .detail' ? button : null },
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
  for (const fn of g.listeners.click || []) fn(event);
}
function spy(g, injection = null) {
  const original = g.ctx.localStorage.setItem, calls = [];
  g.ctx.localStorage.setItem = (key, value) => {
    calls.push(key);
    if (injection) injection(key, value, original);
    else original(key, value);
  };
  return calls;
}
function assertCommitted(g, before, calls) {
  assert.equal(calls.filter(key => key === KEY).length, 1, 'exactly one primary save write');
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw, before, 'verified prior backup');
  assert.deepEqual(disk(g), ram(g), 'committed and active saves agree');
}
function money(g) {
  g.run('S.solari=1000000;S.cry=5000;S.teeth=5000;S.wring=5000;' +
    'S.buys={d:todayKey(),n:{}};persist()');
}
function failBackup(g) {
  spy(g, (key, value, write) => {
    if (key === BACKUP) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    write(key, value);
  });
}
function release(g) { g.run('loadSave.writer.release()'); }

// B601: market payment, stock and quest counter form one verified commit.
{
  const g = await boot(); money(g);
  const before = g.store.get(KEY), old = ram(g), q = g.run("dly().c.shop || 0"), writes = spy(g);
  click(g, 'buy', 'post:pl');
  const next = disk(g);
  assert.equal(next.solari, old.solari - 6000);
  assert.equal(next.plast, old.plast + 5);
  assert.equal(next.buys.n['post:pl'], 1);
  assert.equal(g.run('dly().c.shop || 0'), q + 1);
  assertCommitted(g, before, writes);
  pass('B601', 'market payment, receipt, day stock and quest share one checkpoint'); release(g);
}
// B602: limit replay never silently purchases a fourth daily item.
{
  const g = await boot(); money(g);
  for (let i = 0; i < 3; i++) click(g, 'buy', 'post:pl');
  const before = g.store.get(KEY), writes = spy(g);
  click(g, 'buy', 'post:pl');
  assert.equal(g.store.get(KEY), before); assert.equal(writes.length, 0);
  assert.equal(disk(g).buys.n['post:pl'], 3);
  pass('B602', 'sold-out daily market offer cannot overcharge or grant again'); release(g);
}
// B603: live shop rendering may NOT reset a saved old-day buy marker.
{
  const g = await boot(); money(g);
  g.run("S.buys={d:'Sun Nov 01 2026',n:{'post:pl':3}};persist()");
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  assert.equal(g.run("shopLeft(findShopItem('post:pl'))"), 3);
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(writes.length, 0);
  click(g, 'buy', 'post:pl');
  assert.equal(disk(g).buys.n['post:pl'], 1);
  assert.equal(disk(g).buys.d, g.run('todayKey()'));
  pass('B603', 'viewing old ledger is read-only; next purchase rolls day atomically'); release(g);
}
// B604: shard conversion UI hooks must not fire before successful IO.
{
  const g = await boot(); money(g);
  g.run("S.roster.paul.stars=7;persist();globalThis.__shardHook=0;" +
    "giveRewards.presentationHooks.shardConv=()=>{globalThis.__shardHook++}");
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'buy', 'sietch:sh:paul');
  assert.equal(g.run('__shardHook'), 1);
  assert.equal(disk(g).wring, old.wring + 50);
  assert.equal(disk(g).teeth, old.teeth - 60);
  assertCommitted(g, before, writes);
  pass('B604', 'market shard conversion emits exactly once after verified debit'); release(g);
}
// B605: quota before primary preserves shard wallet and defers hooks.
{
  const g = await boot(); money(g);
  g.run("S.roster.paul.stars=7;persist();globalThis.__shardHook=0;" +
    "giveRewards.presentationHooks.shardConv=()=>{globalThis.__shardHook++}");
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'buy', 'sietch:sh:paul');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(g.run('__shardHook'), 0); assert.equal(blocked(g), true);
  pass('B605', 'failed market backup rolls back payment and shard presentation');
}
// B606: primary write-then-throw is uncertain and never auto-replayed.
{
  const g = await boot(); money(g);
  const old = ram(g); let hit = false;
  spy(g, (key, value, write) => {
    write(key, value);
    if (key === KEY && !hit) { hit = true; throw Object.assign(new Error('after primary'), { name: 'QuotaExceededError' }); }
  });
  click(g, 'buy', 'post:pl');
  assert.equal(hit, true); assert.equal(blocked(g), true);
  assert.deepEqual(ram(g), old); assert.equal(disk(g).buys.n['post:pl'], 1);
  const re = await boot(g.store.get(KEY));
  assert.equal(disk(re).buys.n['post:pl'], 1);
  pass('B606', 'ambiguous shop write retains committed stock on cold boot'); release(re);
}
// B607: fragment shop token, inventory and daily quest settle together.
{
  const g = await boot(); money(g);
  const id = g.run("Object.values(ITEMS).find(x=>x.t===6).id");
  const spec = 'frag:' + id + ':core:1', key = 'frag:' + id + ':core';
  const before = g.store.get(KEY), old = ram(g), q = g.run('dly().c.shop || 0'), writes = spy(g);
  click(g, 'fbuy', spec);
  assert.equal(disk(g).inv[key], (old.inv[key] || 0) + 1);
  assert.equal(disk(g).teeth, old.teeth - g.run('SHOP_FRAG[6]'));
  assert.equal(g.run('dly().c.shop || 0'), q + 1);
  assertCommitted(g, before, writes);
  pass('B607', 'fragment purchase includes resource debit, item and quest progress'); release(g);
}
// B608: fragment shop quota failure leaves no resources or quest increments.
{
  const g = await boot(); money(g);
  const id = g.run("Object.values(ITEMS).find(x=>x.t===6).id");
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'fbuy', 'frag:' + id + ':core:1');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B608', 'failed fragment purchase cannot leak inventory or quest progress');
}
// B609: water refill debit and counter are one snapshot.
{
  const g = await boot(); money(g);
  g.run('S.water=WMAX()-5;S.refills={d:todayKey(),n:0};persist()');
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'refill', '1'); // exact shipped water button token
  assert.equal(disk(g).cry, old.cry - g.run('refillPrice(0)'));
  assert.equal(disk(g).water, old.water + g.run('REFILL_AMT'));
  assert.equal(disk(g).refills.n, 1);
  assertCommitted(g, before, writes);
  pass('B609', 'water refill commits crystals, water, timestamp and counter'); release(g);
}
// B610: candle refill follows its own count but the same commit gate.
{
  const g = await boot(); money(g);
  g.run('S.crefills={d:todayKey(),n:0};persist()');
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'refill', 'candle');
  assert.equal(disk(g).cry, old.cry - g.run('refillPrice(0)'));
  assert.equal(disk(g).candle, old.candle + g.run('CANDLE_REFILL'));
  assert.equal(disk(g).crefills.n, 1);
  assertCommitted(g, before, writes);
  pass('B610', 'candle refill commits escalating counter and charged credit'); release(g);
}
// B611: capped refills cannot charge further; invalid kinds cannot buy water.
{
  const g = await boot(); money(g);
  g.run('S.refills={d:todayKey(),n:REFILL_MAX};persist()');
  const before = g.store.get(KEY), writes = spy(g);
  click(g, 'refill', 'water'); click(g, 'refill', 'unknown');
  assert.equal(g.store.get(KEY), before); assert.equal(writes.length, 0);
  pass('B611', 'refill cap and forged kind refuse payment'); release(g);
}
// B612: backup quota refuses a refill without changing the active account.
{
  const g = await boot(); money(g);
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'refill', 'candle');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(blocked(g), true);
  pass('B612', 'refill quota failure cannot acknowledge energy or debit');
}
function prepareRecycler(g) {
  return g.run(`(function(){
    const item=Object.values(ITEMS).find(it=>scrapPoint('ix_plate',it.id)>0);
    if(!item)throw Error('missing recyclable item');
    S.squad=[];S.squadD=[];S.squadC=[];S.raidPick=[];
    const count=Math.ceil(SCRAP.ix_plate.threshold/scrapPoint('ix_plate',item.id));
    S.inv[item.id]=count+5;S.scrapLocks={};S.scrapCarry={};
    persist();return {id:item.id,count};
  })()`);
}
// B613: recycler consumes protected inventory and awards plates once.
{
  const g = await boot(), { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]));
  const expected = g.run("scrapQuote(S,'ix_plate',basket)");
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  click(g, 'ixdo');
  assert.equal(disk(g).inv[id], old.inv[id] - count);
  assert.equal(disk(g).ix_plate, old.ix_plate + expected.output);
  assert.equal(disk(g).scrapCarry.ix_plate, expected.remainder);
  assertCommitted(g, before, writes);
  pass('B613', 'recycler stock, carry and artifact output share one commit'); release(g);
}
// B614: recycler quota preserves both materials and confirmation modal.
{
  const g = await boot(), { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]));
  g.overlay2.innerHTML = '<div>Pending recycler confirmation</div>';
  const before = g.store.get(KEY), old = ram(g);
  failBackup(g); click(g, 'ixdo');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(g.overlay2.innerHTML, '<div>Pending recycler confirmation</div>');
  assert.equal(blocked(g), true);
  pass('B614', 'failed recycler write retains items, carry and unacknowledged modal');
}
// B615: stale basket is revalidated, never grants rewards without materials.
{
  const g = await boot(), { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]) + ';S.inv[' + JSON.stringify(id) + ']=0;persist()');
  const before = g.store.get(KEY), writes = spy(g);
  click(g, 'ixdo');
  assert.equal(g.store.get(KEY), before); assert.equal(writes.length, 0);
  pass('B615', 'stale recycler basket is cancelled against current stock'); release(g);
}
// B616: an expired lease prevents all market and recycler writes.
{
  const g = await boot(); money(g);
  const { id, count } = prepareRecycler(g);
  g.run('basket=' + JSON.stringify([{ id, count }]));
  const before = g.store.get(KEY), old = ram(g);
  release(g); const writes = spy(g);
  click(g, 'buy', 'post:pl'); click(g, 'fbuy', 'frag:' + id + ':core:1');
  click(g, 'refill', 'water'); click(g, 'ixdo');
  assert.equal(g.store.get(KEY), before); assert.deepEqual(ram(g), old);
  assert.equal(writes.length, 0); assert.equal(blocked(g), true);
  pass('B616', 'retired Web Locks lease refuses purchases, refills and recycling');
}
// B617: the actual UI catalog reflects source offers, currency, day ledger,
// existing art and live inventory without staging a save or a fake fixture.
{
  const g = await boot(); money(g);
  const before = g.store.get(KEY), old = ram(g), writes = spy(g);
  for (const tab of ['post','sietch','chron','ring']) {
    const projected = JSON.parse(g.run('JSON.stringify(shopCatalog('+JSON.stringify(tab)+'))'));
    const raw = JSON.parse(g.run('JSON.stringify(shopItems('+JSON.stringify(tab)+'))'));
    assert.equal(projected.length, raw.length);
    for (const [i,row] of projected.entries()) {
      const offer = raw[i];
      for(const field of ['key','kind','qty','cur','price']) assert.equal(row[field],offer[field],tab+':'+field);
      assert.equal(row.limit,offer.lim);
      assert.equal(row.id,offer.id ?? null);
      assert.equal(row.route,'buy');
      assert.equal(row.left,g.run('shopLeft(findShopItem('+JSON.stringify(row.key)+'))'));
      assert.equal(row.balance,g.run('getRes('+JSON.stringify(row.cur)+')'));
      assert.ok(row.title && row.subtitle && row.art && row.priceHtml);
    }
  }
  assert.deepEqual(ram(g),old); assert.equal(g.store.get(KEY),before); assert.equal(writes.length,0);
  for(let i=0;i<3;i++) click(g,'buy','post:pl');
  const row=JSON.parse(g.run("JSON.stringify(shopCatalog('post').find(x=>x.key==='post:pl'))"));
  assert.equal(row.left,0); assert.equal(row.sold,true); assert.equal(row.affordable,false);
  assert.equal(row.balance,old.solari-18000); assert.equal(row.owned,old.plast+15);
  assert.deepEqual(disk(g),ram(g));
  pass('B617','live catalog mirrors actual offers, stock and inventory; read-only before purchase'); release(g);
}
// B618: immutable art source manifest is checked rather than merely documented.
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const doc = fs.readFileSync(path.join(root,'docs/SHOP_ART_ASSET_MANIFEST.md'),'utf8');
  const block = doc.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(block,'machine-readable manifest');
  const manifest = JSON.parse(block[1]);
  assert.equal(manifest.files.length,26);
  const dir = path.join(root,'assets/ui/shop');
  // #339 approved an additional subdirectory; preserve the exact original
  // manifest and separately verify the published additions byte-for-byte.
  assert.deepEqual(fs.readdirSync(dir).sort(),[...manifest.files.map(x=>x.name),'postrelease'].sort());
  const additions = [
    {
      "name": "age_resonance.webp",
      "gitBlob": "8cd6109ab95a389a4128d4baf1943da8481ec31f",
      "size": 29570,
      "sha256Prefix": "f7265c69"
    },
    {
      "name": "disk-avenge.webp",
      "gitBlob": "5aa7264127c9f2ea791488838bef4d325ea7aa05",
      "size": 25408,
      "sha256Prefix": "54a872e9"
    },
    {
      "name": "disk-chain.webp",
      "gitBlob": "cde578cbb37e09b94ade576af82481dcd7d99928",
      "size": 27240,
      "sha256Prefix": "070a309e"
    },
    {
      "name": "disk-counter.webp",
      "gitBlob": "1b5e5a64d81514ff47d47a96e7aba71334a0876b",
      "size": 24974,
      "sha256Prefix": "a2da713a"
    },
    {
      "name": "disk-exec.webp",
      "gitBlob": "57a088e173ac4abdc977ace7aad7ddf5ac49ba5b",
      "size": 25366,
      "sha256Prefix": "5b4573c8"
    },
    {
      "name": "disk-fury.webp",
      "gitBlob": "980331bd2f3e6ba509b41b7ce981673d01bd0a47",
      "size": 27158,
      "sha256Prefix": "9a2b794c"
    },
    {
      "name": "disk-ghola.webp",
      "gitBlob": "7c90f26b477838d93989eb49b7e38810478d2ea5",
      "size": 27042,
      "sha256Prefix": "b8a20d83"
    },
    {
      "name": "disk-leech.webp",
      "gitBlob": "0e7b4ddb0651dab94f8eeb5d2c44131a111d31fd",
      "size": 25732,
      "sha256Prefix": "2747cb1d"
    },
    {
      "name": "disk-mach.webp",
      "gitBlob": "598889b59e78f5ecb47e7f616f8ca5c1c81cd09f",
      "size": 24790,
      "sha256Prefix": "a2435b80"
    },
    {
      "name": "disk-poison.webp",
      "gitBlob": "ee74b9254438767180bc29beb806f69c89243608",
      "size": 25314,
      "sha256Prefix": "e581936c"
    },
    {
      "name": "disk-presc.webp",
      "gitBlob": "89d915b6c0dd1448d7163f839f8644ca12b39cc5",
      "size": 27532,
      "sha256Prefix": "210cdb7b"
    },
    {
      "name": "disk-regen.webp",
      "gitBlob": "359858a85f72420d910251dccb8b5678df3b8faa",
      "size": 25402,
      "sha256Prefix": "a7c21613"
    },
    {
      "name": "disk-spice.webp",
      "gitBlob": "6759306c248eb8460b6ad38067988f115c57feb4",
      "size": 25670,
      "sha256Prefix": "471fc1e4"
    },
    {
      "name": "disk-stam.webp",
      "gitBlob": "0e22ec01bdccce6f1ab8320a4eff919415197b97",
      "size": 25196,
      "sha256Prefix": "127af4b9"
    },
    {
      "name": "disk-tm.webp",
      "gitBlob": "aa7a1930725949b4438b3059212bec76148cd57e",
      "size": 25442,
      "sha256Prefix": "45edccbd"
    },
    {
      "name": "disk-voice.webp",
      "gitBlob": "48dd8b4828a991e03646a13b8465421d00ea75ad",
      "size": 27038,
      "sha256Prefix": "0d88cd82"
    },
    {
      "name": "frag.webp",
      "gitBlob": "f98a960f782bedc493f9c110e745ec28a697b98b",
      "size": 6108,
      "sha256Prefix": "76466a80"
    },
    {
      "name": "holtz_conductor.webp",
      "gitBlob": "91d40fdfbe2f98c2ee24a993c631cdab04849fd4",
      "size": 17650,
      "sha256Prefix": "b122fdef"
    },
    {
      "name": "ix_plate.webp",
      "gitBlob": "a4d8e2132c31e52818e5a35005543eeb28cb8dba",
      "size": 20500,
      "sha256Prefix": "b3e24a9d"
    },
    {
      "name": "jt.webp",
      "gitBlob": "02231f5005a4a1e5843c229b249acff8bccf56d1",
      "size": 25900,
      "sha256Prefix": "7a3628d3"
    },
    {
      "name": "legacy_thread.webp",
      "gitBlob": "793461a9a7b9709becc3a29d4df723923126f229",
      "size": 24238,
      "sha256Prefix": "c9c917c9"
    },
    {
      "name": "med.webp",
      "gitBlob": "020421fc90ca8761ed9ca23c85c50385c5870471",
      "size": 21152,
      "sha256Prefix": "1a782a8f"
    },
    {
      "name": "med3.webp",
      "gitBlob": "06aa3e45418d72328645724f8a0aa91085900c33",
      "size": 19922,
      "sha256Prefix": "568479a4"
    },
    {
      "name": "part-core.webp",
      "gitBlob": "d54c4749c6d04f8179134f8e4eb98de720647209",
      "size": 12206,
      "sha256Prefix": "626e01b8"
    },
    {
      "name": "part-fitting.webp",
      "gitBlob": "348427fad37037fa6d14ff3e8fc873e69c864c22",
      "size": 10692,
      "sha256Prefix": "f887a9c7"
    },
    {
      "name": "part-frame.webp",
      "gitBlob": "8fb5c65222045aa062bf6771ff2ba7b5dfa1a7e7",
      "size": 10616,
      "sha256Prefix": "970c9f45"
    },
    {
      "name": "part-lens.webp",
      "gitBlob": "f64288300a4f71ce32dd3fe87a7ea4017cecdb59",
      "size": 11358,
      "sha256Prefix": "9efe0f8f"
    },
    {
      "name": "part-lining.webp",
      "gitBlob": "b2f3d77e0e52a3438f214af61521df6937d11aff",
      "size": 10148,
      "sha256Prefix": "077f32e1"
    },
    {
      "name": "part-seal.webp",
      "gitBlob": "707644810f281a3a9acc54a1182b8a3f70957b5e",
      "size": 9410,
      "sha256Prefix": "855992d2"
    },
    {
      "name": "rid.webp",
      "gitBlob": "a36e93166fd9cc6eb62191d8b950b7b62c215eda",
      "size": 24398,
      "sha256Prefix": "583c486b"
    },
    {
      "name": "teeth.webp",
      "gitBlob": "5282149175cd118fea02a8435a143c72703a715d",
      "size": 14464,
      "sha256Prefix": "a253aa8f"
    },
    {
      "name": "wol.webp",
      "gitBlob": "29ecbeffec2d8bbe467c351c2891fae3d473013d",
      "size": 12968,
      "sha256Prefix": "4236a065"
    },
    {
      "name": "wring.webp",
      "gitBlob": "ad80dc12ea0b719f45524d286c80d7543e944b30",
      "size": 19708,
      "sha256Prefix": "bf6978dd"
    }
  ];
  const addedDir = path.join(dir,'postrelease');
  assert.deepEqual(fs.readdirSync(addedDir).sort(),additions.map(x=>x.name).sort());
  for(const entry of additions){
    const bytes=fs.readFileSync(path.join(addedDir,entry.name));
    assert.equal(bytes.length,entry.size,entry.name);
    assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),entry.gitBlob,entry.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,8),entry.sha256Prefix,entry.name);
  }
  for(const entry of manifest.files){
    const bytes=fs.readFileSync(path.join(dir,entry.name));
    assert.equal(bytes.length,entry.size,entry.name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.name);
  }
  pass('B618','original 26 assets and 33 postrelease additions match approved hashes');
}
// B619: quoted purchase revalidates exact offer and day; invalid token cannot charge.
{
  const g=await boot();money(g);
  const before=g.store.get(KEY),old=ram(g),writes=spy(g);
  g.run("set_view('shop');S.shopTab='post'"); // tab/view is transient for this test
  const q=JSON.parse(g.run("JSON.stringify(postMakeQuote('post:pl'))"));
  assert.ok(q.intent);
  assert.equal(g.run("postQuoteCurrent("+JSON.stringify(q.intent)+",findShopItem('post:pl'))"),true);
  assert.equal(g.run("postQuoteCurrent("+JSON.stringify({...q.intent,epoch:'expired'})+",findShopItem('post:pl'))"),false);
  assert.equal(g.run("postQuoteCurrent("+JSON.stringify({...q.intent,price:1})+",findShopItem('post:pl'))"),false);
  assert.equal(g.run("takePostQuote('post:pl','invalid')"),null);
  assert.equal(g.store.get(KEY),before);assert.equal(writes.length,0);
  assert.equal(ram(g).solari,old.solari);
  pass('B619','post quote rejects stale price/day and forged token without save writes');release(g);
}
assert.equal(passed.length, 19);
console.log(`ARCH-02C-B6a ${passed.length} verified market/recycler scenarios PASS: ${html}`);
