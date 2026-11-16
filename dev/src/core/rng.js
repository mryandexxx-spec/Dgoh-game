// core/rng.js — выделен из core/util в фазе 3a (REFACTOR_PLAN §2). Правится вручную.
import './dom.js'; // порядок исполнения
import { sRng as pureSRng } from '../data/seeded-rng.js';
// Hoisted adapter: render2d/scenes.js calls sRng during early module evaluation.
// Keep the historical callable function binding before the core/rng module slot.
function sRng(seed) { return pureSRng(seed); }


export { sRng };
