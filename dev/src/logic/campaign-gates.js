// ARCH-01C2b: live campaign-unlock selector belongs to logic, not declarative data.
import { NODES, bindNodeOpenRuntime } from '../data/campaigns.js';
import { S } from '../core/state.js';

// Exact v127 expression; S.cleared is read lazily, at call time, never at bootstrap.
function nodeOpenRule(i) { const n = NODES[i], prev = i - 1; return (prev < 0 || NODES[prev].camp !== n.camp) ? true : !!S.cleared[prev]; }

// Register only a function reference: no save access, no DOM, no eager unlock mutations.
bindNodeOpenRuntime(nodeOpenRule);
