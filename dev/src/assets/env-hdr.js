// assets/env-hdr.js — строки 2381–2383 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../render3d/characters/mocap.js'; // порядок исполнения

// ===================== 3D stages outside battle: hero showcase + camp lobby =====================
// Persistent canvases: the UI re-renders its HTML often, so each stage keeps its <canvas> and is re-inserted into the new layout.
// Фаза 5: окружение — файл dev/assets/env/desert.hdr; путь (PWA) или data-URI (артефакт) ставит загрузчик assets/models.js.
let ENV_HDR = null;
function setEnvHdr(u) { ENV_HDR = u; }

export { ENV_HDR, setEnvHdr };
