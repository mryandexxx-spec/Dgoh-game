// MD-ULT-1: exercise the real battle action -> cinematic -> resumed battle on phone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { serve } from '../lib/serve.mjs';

const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const out = path.resolve(process.argv[3] || 'dist/md-ult1-shots');
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(fs.existsSync);
const save = fs.readFileSync('tests/fixtures/saves/03-late.json', 'utf8');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const srv = await serve(path.dirname(html));
const records = [];
try {
  for (const [width, height, quality] of [[844, 390, 'med'], [667, 375, 'low']]) {
    for (const [hero, portrait, disableLive] of [['muaddib', false, false], ['muaddib', true, false], ['muaddib', true, true], ['baron_legend', false, false]]) {
      const page = await browser.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: true });
      await page.evaluateOnNewDocument((raw, q) => {
        window.__DGOH_PERF_NO_BAKE__ = true; // The test owns deterministic portrait availability.
        localStorage.setItem('dune-goh-v1', raw);
        localStorage.setItem('dune-gfx', JSON.stringify({ p: q, auto: 0, bad: 0, good: 0, noUp: true }));
        localStorage.setItem('dune-cine-off', 'false');
        try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch {}
      }, save, quality);
      await page.goto(srv.url(path.basename(html)), { waitUntil: 'load', timeout: 120000 });
      await page.evaluate(async () => { if (!await loadB3()) throw Error('3D not available'); });
      if (hero === 'muaddib') await page.waitForFunction(() => !!MODEL_DATA.muaddib, { timeout: 60000 });
      if (portrait) {
        // Bake the genuine authored hero via the existing shared EngineHost before battle.
        await page.waitForFunction(() => !!MODEL_DATA.muaddib, { timeout: 60000 });
        await page.evaluate(async () => {
          const baker = new Baker();
          try {
            const result = await baker.bake(CH.muaddib);
            if (!result?.full || !result?.face) throw Error('Real 3D portrait bake failed');
            BAKED.muaddib = { full: URL.createObjectURL(result.full), face: URL.createObjectURL(result.face) };
          } finally { baker.dispose(); }
        });
      }
      const start = await page.evaluate((id, disableLive) => {
        if (!CH[id]?.gl) throw Error('Missing playable legendary ultimate: ' + id);
        const friends = [id, ...Object.keys(CH).filter(k => k !== id && !CH[k].boss && !CH[k].legendary).slice(0, 4)];
        const enemies = Object.keys(CH).filter(k => !CH[k].boss && !friends.includes(k)).slice(0, 5);
        // The actual normal battle UI and the real GL action, not a synthetic HTML mock.
        launch({ mode: 'camp', dlg: false, scene: 'court', i: 0, title: 'MD-ULT-1 battle smoke',
          desert: false, squad: friends, enemy: enemies.map(k => enemyProg(k, 85, false)) });
        clearTimeout(BT.timer);
        const u = BT.B.units.find(x => x.side === 'A' && x.def.id === id);
        const target = BT.B.units.find(x => x.side === 'B');
        if (!u || !target) throw Error('Real battle hero/target missing');
        const actor = BT.arena?.units[u.uid];
        if (id === 'muaddib' && !actor?.root?._clips?.[actor.root._clipNames?.ult]) throw Error('Muad-Dib spell clip missing');
        // Simulate an unavailable authored model without touching battle mechanics.
        if (disableLive && actor) actor.root._authored = 0;
        u.glOn = true; u.glUsed = false; u.ultM = 100;
        BT.B.active = u; BT.B.actor = u.uid; BT.waiting = u;
        BT.auto = false; BT.speed = 1;
        renderBattle();
        if (!abilityReady(BT.B, u, 'gl')) throw Error('GL is not ready');
        // Visual diagnostics only: keep the *real* authored spell action and
        // close-up camera active through slow SwiftShader screenshot encoding.
        if (id === 'muaddib' && !disableLive && BT.arena) {
          const orig = BT.arena.beginMuadCinematic.bind(BT.arena);
          BT.arena.beginMuadCinematic = (uid, dur) => orig(uid, Math.max(dur, 9000));
        }
        // Heavy SwiftShader screenshot capture can exceed the 2.9s movie. Extend
        // only the overlay-removal timer in the test, never production timing or actShow.
        const nativeTimeout = window.setTimeout;
        window.setTimeout = (fn, ms, ...args) =>
          nativeTimeout(fn, ms === 2900 || ms === 2610 ? 9000 : ms, ...args);
        try { doAct(u, 'gl', target.uid); }
        finally { window.setTimeout = nativeTimeout; }
        const cine = document.querySelector('.ultcine');
        // Freeze a genuine mid-cinematic animation frame for stable PNG capture.
        for (const animation of cine?.getAnimations({ subtree: true }) || []) {
          const duration = animation.effect?.getComputedTiming()?.duration;
          if (Number.isFinite(duration)) animation.currentTime = duration * .5;
          animation.pause();
        }
        if (!cine || BT.B.lastKey !== 'gl' || BT.B.glCast !== u.uid) throw Error('GL action did not start cinematic');
        const fig = cine.querySelector('.ucfig');
        return { id, target: target.def.id, live: cine.classList.contains('muad-live'),
          spellClip: actor?.root?._clipNames?.ult || null,
          hasSvg: !!fig.querySelector('svg'),
          hasImg: !!fig.querySelector('img'), src: fig.querySelector('img')?.getAttribute('src') || '',
          title: cine.querySelector('.uctext b')?.textContent,
          heroName: cine.querySelector('.uctext span')?.textContent,
          rays: !!cine.querySelector('.ucrays'), sand: cine.querySelectorAll('.ucsand i').length,
          bgFrame: BT.arena?.scene?.getFrameId?.() || 0 };
      }, hero, disableLive);
      assert.equal(start.rays, true);
      assert.equal(start.sand, 26);
      assert.ok(start.title);
      assert.ok(start.heroName);
      if (hero === 'muaddib') {
        assert.equal(start.hasSvg, false, 'Muad-Dib must never use procedural figureSVG');
        assert.equal(start.live, !disableLive, 'existing authored model must animate its GL spell');
        assert.equal(start.spellClip, 'mage_soell_cast_1');
        assert.equal(start.hasImg, disableLive && portrait);
        if (disableLive && portrait) assert.match(start.src, /^blob:/, 'genuine baked fallback expected');
      } else {
        assert.equal(start.hasSvg, true, 'Other legendary cinematics stay unchanged');
      }
      // A slow SwiftShader PNG can outlast the actual 2.9s cast.
      // Verify two real sampled poses *before* serializing screenshots; the
      // existing arena _loop is reused to sample the later authored clip.
      await new Promise(resolve => setTimeout(resolve, 320));
      const motion = await page.evaluate(() => {
        const A = BT.arena, C = A?.muadCine, o = C?.o;
        if (!C) return null;
        const clip = o.root._clips[o.root._clipNames.ult];
        // Pick a track with a non-constant quaternion over the chosen phases.
        const tracks = clip.tracks.filter(t => t.path === 'rotation' && t.node && t.values?.length >= 8);
        const changes = t => {
          const v=t.values, last=v.length-4;
          return Math.abs(v[0]-v[last])+Math.abs(v[1]-v[last+1])+
            Math.abs(v[2]-v[last+2])+Math.abs(v[3]-v[last+3]);
        };
        const tr = tracks.sort((a,b)=>changes(b)-changes(a))[0];
        if (!tr) throw Error('No authored animated rotation tracks');
        A._loop();
        const first = tr.node.rotationQuaternion.asArray();
        // Advance this test-only sampled pose along the same action without
        // changing production clocks or the real battle action duration.
        // Hold at mid-gesture through the capture, so the screenshot shows
        // the same framing an iPhone would see without SwiftShader delays.
        C.t0=performance.now()-C.dur*.45;
        o.act.t0=C.t0;
        A._loop();
        const second=tr.node.rotationQuaternion.asArray();
        const center = A.project(o.root.position.add(V3(0, o.h * .5, 0)));
        return { playing:o.root._clip, first, second, trackChange:changes(tr),
          camera:A.camera.position.asArray(), center };
      });
      if (hero === 'muaddib' && !disableLive) {
        assert.equal(motion?.playing, 'ult', 'real spell-cast DGM clip did not play');
        assert.ok(motion.trackChange > .001, 'spell cast has no animated rotation channels');
        assert.notDeepEqual(motion.second, motion.first, 'spell caster bones did not animate');
        assert.ok(motion.center[0] > width * .09 && motion.center[0] < width * .51,
          'Muad-Dib should be fully readable on the left: ' + JSON.stringify(motion.center));
      }
      assert.equal(await page.$('.ultcine') !== null, true, 'cinematic vanished before screenshot');
      const suffix = hero === 'muaddib' ? (disableLive ? 'baked-fallback' : portrait ? 'live-baked' : 'live-unbaked') : 'baron';
      await page.screenshot({ path: path.join(out, `${width}x${height}-${quality}-${suffix}.png`) });
      await new Promise(resolve => setTimeout(resolve, 9200));
      const end = await page.evaluate(() => ({
        overlayGone: !document.querySelector('.ultcine'),
        holdCleared: BT.hold === false,
        battlePresent: !!document.querySelector('#battle'),
        cast: BT.B.glCast,
        muaddibGlUsed: BT.B.units.find(u => u.def.id === 'muaddib')?.glUsed || false,
        unitCount: BT.B.units.length,
        frame: BT.arena?.scene?.getFrameId?.() || 0
      }));
      assert.equal(end.overlayGone, true, 'cinematic did not clean up');
      assert.equal(end.holdCleared, true, 'battle remained held');
      assert.equal(end.battlePresent, true, 'battle destroyed after GL');
      assert.ok(end.unitCount > 2, 'battle units missing');
      if (hero === 'muaddib') assert.equal(end.muaddibGlUsed, true, 'GL use not registered');
      assert.ok(start.bgFrame > 0 || end.frame > 0, 'WebGL did not render');
      assert.deepEqual(errors, [], 'browser JS errors');
      records.push({ width, height, quality, portrait, disableLive, hero, start, end });
      console.log('PASS MD-ULT-1', width, height, quality, hero, portrait ? 'baked' : 'fallback');
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(records, null, 2));
assert.equal(records.length, 8);
