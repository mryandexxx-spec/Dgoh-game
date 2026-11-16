// core/rng.js — выделен из core/util в фазе 3a (REFACTOR_PLAN §2). Правится вручную.
import './dom.js'; // порядок исполнения
import { sRng as pureSRng } from '../data/seeded-rng.js';
// Explicit local alias keeps the historical core/rng ESM bootstrap slot.
const sRng = pureSRng;


export { sRng };
