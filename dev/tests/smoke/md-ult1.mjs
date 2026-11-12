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
    for (const [hero, portrait] of [['muaddib', false], ['muaddib', true], ['baron_legend', false]]) {
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
      const start = await page.evaluate(id => {
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
        u.glOn = true; u.glUsed = false; u.ultM = 100;
        BT.B.active = u; BT.B.actor = u.uid; BT.waiting = u;
        BT.auto = false; BT.speed = 1;
        renderBattle();
        if (!abilityReady(BT.B, u, 'gl')) throw Error('GL is not ready');
        // Heavy SwiftShader screenshot capture can exceed the 2.9s movie. Extend
        // only the overlay-removal timer in the test, never production timing or actShow.
        const nativeTimeout = window.setTimeout;
        window.setTimeout = (fn, ms, ...args) =>
          nativeTimeout(fn, ms === 2900 ? 9000 : ms, ...args);
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
        return { id, target: target.def.id, hasSvg: !!fig.querySelector('svg'),
          hasImg: !!fig.querySelector('img'), src: fig.querySelector('img')?.getAttribute('src') || '',
          title: cine.querySelector('.uctext b')?.textContent,
          heroName: cine.querySelector('.uctext span')?.textContent,
          rays: !!cine.querySelector('.ucrays'), sand: cine.querySelectorAll('.ucsand i').length,
          bgFrame: BT.arena?.scene?.getFrameId?.() || 0 };
      }, hero);
      assert.equal(start.rays, true);
      assert.equal(start.sand, 26);
      assert.ok(start.title);
      assert.ok(start.heroName);
      if (hero === 'muaddib') {
        assert.equal(start.hasSvg, false, 'Muad-Dib must never use procedural figureSVG');
        assert.equal(start.hasImg, portrait);
        if (portrait) assert.match(start.src, /^blob:/, 'genuine baked portrait expected');
      } else {
        assert.equal(start.hasSvg, true, 'Other legendary cinematics stay unchanged');
      }
      // Capture while actual .ultcine exists and is fully visible, not after its timeout.
      await new Promise(resolve => setTimeout(resolve, 150));
      assert.equal(await page.$('.ultcine') !== null, true, 'cinematic vanished before screenshot');
      const suffix = hero === 'muaddib' ? (portrait ? 'baked' : 'missing') : 'baron';
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
      records.push({ width, height, quality, portrait, hero, start, end });
      console.log('PASS MD-ULT-1', width, height, quality, hero, portrait ? 'baked' : 'fallback');
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(records, null, 2));
assert.equal(records.length, 6);
