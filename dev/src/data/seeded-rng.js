// ARCH-01C2c: pure deterministic seeded RNG, byte-for-byte v127 core/rng algorithm.
// Must have no imports or global state: NODES are generated at data evaluation.
function sRng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export { sRng };
