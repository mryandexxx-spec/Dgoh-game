// Visual-only shield tuning: pure helpers allow fast tests without creating WebGL contexts.
// LOW keeps the established material and one cheap pulse; MED adds a second pulse,
// HIGH may use a Fresnel edge. Neither config affects combat simulation.
export const shieldQuality = Q => ({
  fresnel: !!Q?.ssao && Q?.shadowQ !== 'low',
  rings: Q?.shadowQ === 'low' ? 1 : 2,
});

export function shieldOpacity(ratio, seconds, phase = 0, hit = 0) {
  const amount = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  if (!amount) return 0;
  const k = Number.isFinite(seconds) ? seconds : 0;
  const p = Number.isFinite(phase) ? phase : 0;
  const h = Math.max(0, Math.min(1, Number.isFinite(hit) ? hit : 0));
  return amount * (0.095 + Math.sin(k * 2.7 + p) * 0.018) +
    Math.min(1, amount * 2) * h * 0.20;
}

// Babylon StandardMaterial opacity Fresnel can still draw the bubble when
// material.alpha === 0. Actually disable the mesh whenever there is no
// *living* shield, then re-enable on revive/reapplication. No combat changes.
export function syncShieldBubble(unit, seconds = 0, hit = 0) {
  const bubble = unit?.bubble;
  if (!bubble || bubble.isDisposed?.()) return false;
  const alpha = unit.dead || unit.root?.isDisposed?.()
    ? 0 : shieldOpacity(unit.shieldK, seconds, unit.phase, hit);
  const visible = alpha > 0;
  bubble.material.alpha = alpha;
  if (bubble._shieldVisible !== visible) {
    bubble.setEnabled(visible);
    bubble._shieldVisible = visible;
  }
  return visible;
}

// Restrict overlapping visual flashes without touching ability cooldowns or combat state.
export function acceptShieldRipple(unit, now) {
  if (!unit?.root || unit.dead || unit.boss || !(unit.shieldK > 0) || !Number.isFinite(now)) return false;
  if (unit.root.isDisposed?.()) return false;
  if (Number.isFinite(unit._shieldRippleAt) && now - unit._shieldRippleAt < 180) return false;
  unit._shieldRippleAt = now;
  return true;
}
