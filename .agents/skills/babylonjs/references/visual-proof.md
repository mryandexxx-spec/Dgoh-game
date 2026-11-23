# Visual proof for Dune GoH (Babylon WebGL)

Workflow adapted from [Godogen Babylon.js engine guide](https://github.com/htdt/godogen/blob/master/engines/babylon.md) and the existing Dune GoH smoke suites. **Use the game's own build/server, not Godogen's Vite project scaffold.** This file documents a test *method*, not a new mandatory CI job.

## One-screen visual comparison

1. Select one reproducible scene and hero; fix quality (HIGH/MED/LOW), viewport, camera position, hero/action and time in the scene. Capture before and after under equivalent settings.
2. Run the actual built PWA or artifact in a real browser. Wait until scene is active, shaders warmed and expected model/texture assets resolved. Avoid capturing a placeholder or a partly loaded texture.
3. Check browser WebGL renderer string and explicitly label runs on SwiftShader, llvmpipe or other software renderer. A software-rendered screenshot is helpful for layout but **not** proof of mobile GPU performance or real-time visual fidelity.
4. Make one screenshot for each relevant profile/viewport; for animation, use a short ordered sequence or video. Review clipping, faces, weapon grips, shadow quality, silhouette, HUD legibility, exposure and alpha artifacts. Save comparison captures in PR evidence or an explicitly temporary location; avoid shipping recordings as game assets.
5. Measure frame time/p95 in the established `engine-host.js`/`quality.js` reporting path, including warmup exclusions. Compare on the same device and quality profile. GPU time requires suitable GPU profiling support: do not label CPU timing as GPU timing.
6. Check scene release/re-entry, device orientation and context loss when changes affect owners, GPU resources or loaders. Confirm assets and fallback on offline PWA when the asset manifest, KTX2 or SW-related code changes.

## Targeted tests (choose based on actual diff)

- **Docs only:** CI policy/selection contract, strict architecture boundary. Do not manually request full visual regressions.
- **Material/lighting/3D scene JS:** normal build + relevant 3D/mobile arena/hero smoke and a captured visual comparison. Use existing repository scripts and CI classification.
- **Character animation/rig:** character-focused WebGL smoke plus clip/attachment validation and repeated scene mount; inspect battle outcome only if any combat code is touched.
- **PWA model, KTX2 or environment asset:** existing asset validity/build checks, browser texture fallback and PWA offline smoke; check performance on LOW phone.
- **UI/camera overlay:** UI/HUD browser smoke and visual sweep for the affected viewports.

Passing CI proves automated contracts, not that an artistic change meets the visual target. Record what was actually viewed and measured; don't mark a visual test as passed without running it.
