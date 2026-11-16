// ARCH-01B2 — чистые счётчики прогресса; не зависят от UI и не управляют порядком загрузки.
// Вынесено из logic/stats.js; ссылка на S сохраняет семантику и ключи статистики.
import { S } from '../core/state.js';

function statInc(k, n = 1) { S.stats[k] = (S.stats[k] || 0) + n; }

export { statInc };
