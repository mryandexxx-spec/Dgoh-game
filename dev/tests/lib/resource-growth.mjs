// One complete roster/battle pass warms caches; compare two distinct later passes.
export function resourceGrowth(cycles, warmup = 1) {
  const measured = cycles.slice(warmup);
  if (!Number.isInteger(warmup) || warmup < 0 || measured.length < 2) return { ok: false, reason: 'Need at least two measured cycles after warm-up', warmup, measured: measured.length };
  const values = measured.map(c => c.after);
  if (values.some(v => !v || ['meshes','textures'].some(k => !Number.isFinite(v[k]) || v[k] < 0))) return { ok: false, reason: 'Missing/invalid resource sample', warmup, measured: measured.length };
  const baseline = values[0];
  const deltas = values.slice(1).map(v => ({ meshes: v.meshes - baseline.meshes, textures: v.textures - baseline.textures }));
  return { ok: deltas.every(d => d.meshes <= 0 && d.textures <= 0), warmup, measured: measured.length, baseline, deltas };
}
