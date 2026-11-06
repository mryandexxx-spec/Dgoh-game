// core/rng.js — выделен из core/util в фазе 3a (REFACTOR_PLAN §2). Правится вручную.
import './dom.js'; // порядок исполнения
function sRng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }


export { sRng };
