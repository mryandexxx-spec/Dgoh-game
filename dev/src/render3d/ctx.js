// render3d/ctx.js — контекст построения 3D: сцена, генератор теней, PBR (фаза 3b, шаг 2; заменил глобалы SC/SHG/PBR_ON).
// withCtx(c, fn): на время fn подменяет заданные поля (undefined — наследуются), после выхода (в т.ч. по исключению)
// восстанавливает прежние. fn синхронна: async/Promise внутри запрещён — контекст снят бы до продолжения.
// Внутри fn поля можно менять напрямую (CTX.shadows = …) — откатятся вместе с кадром withCtx.
import './base.js'; // порядок исполнения

const CTX = { scene: null, shadows: null, pbr: false };
function withCtx(c, fn) {
  const s = CTX.scene, h = CTX.shadows, p = CTX.pbr;
  if (c) { if (c.scene !== undefined) CTX.scene = c.scene; if (c.shadows !== undefined) CTX.shadows = c.shadows; if (c.pbr !== undefined) CTX.pbr = !!c.pbr; }
  try {
    const r = fn(CTX);
    if (r && typeof r.then === 'function') throw new Error('withCtx: async внутри запрещён');
    return r;
  } finally { CTX.scene = s; CTX.shadows = h; CTX.pbr = p; }
}


export { CTX, withCtx };
