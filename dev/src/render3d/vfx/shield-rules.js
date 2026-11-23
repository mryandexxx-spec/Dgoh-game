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

// Restrict overlapping visual flashes without touching ability cooldowns or combat state.
export function acceptShieldRipple(unit, now) {
  if (!unit?.root || unit.dead || unit.boss || !Number.isFinite(now)) return false;
  if (unit.root.isDisposed?.()) return false;
  if (Number.isFinite(unit._shieldRippleAt) && now - unit._shieldRippleAt < 180) return false;
  unit._shieldRippleAt = now;
  return true;
}
