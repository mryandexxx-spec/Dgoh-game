// assets/mocap-data.js — строки 2333–2336 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../render3d/characters/pose-baron.js'; // порядок исполнения

// ===================== mocap clips (Mixamo → retargeted in Blender to the game rig, mirrored for the weapon hand) =====================
// Joint order: hips, spine, head, shR, elR, handR, shL, elL, handL, hipR, kneeR, ankR, hipL, kneeL, ankL. Rotations are local to the
// canonical rest pose (limbs straight down, feet forward) shared by the procedural heroes and the Blender models.
// Фаза 5: клипы — файл dev/assets/anim/mocap.json (тот же объект); грузит assets/models.js вместе с чанком Babylon.
let MOCAP = null;
function setMocap(m) { MOCAP = m; }

export { MOCAP, setMocap };
