// Babylon 9 / WebGL shield visuals: Fresnel rim on HIGH, pooled hit ripples on all profiles.
// Presentation only. Uses the existing arena Scene, FX pool and frame scheduler.
import { B3 } from '../base.js';
import { gfx } from '../quality.js';
import { withCtx } from '../ctx.js';
import { V3 } from '../materials.js';
import { bTorus } from '../geometry.js';
import { shieldQuality, acceptShieldRipple } from './shield-rules.js';

export function configureShieldBubble(material, Q) {
  if (!shieldQuality(Q).fresnel) return;
  // StandardMaterial's opacity Fresnel is supported on Babylon 9 WebGL.
  // Keep the centre transparent so silhouettes and health cues remain legible.
  const edge = new B3.FresnelParameters();
  edge.leftColor = B3.Color3.White();
  edge.rightColor = new B3.Color3(.12, .12, .12);
  edge.power = 2.2;
  material.opacityFresnelParameters = edge;
}

export function shieldImpactFX(arena, unit, now = performance.now()) {
  if (!arena?.alive || !unit?.root ||
      (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      !acceptShieldRipple(unit, now)) return false;

  const { rings } = shieldQuality(gfx(arena.small));
  const normal = unit.hitDir ? unit.hitDir.scale(-1) : V3(unit.side === 'A' ? -1 : 1, 0, 0);
  normal.y = 0;
  if (normal.lengthSquared() < .0001) normal.set(0, 0, 1);
  normal.normalize();
  const offset = normal.scale(.56);
  const facing = new B3.Quaternion();
  B3.Quaternion.FromUnitVectorsToRef(V3(0, 0, 1), normal, facing);

  withCtx({ scene: arena.scene }, () => {
    for (let i = 0; i < rings; i++) {
      const delay = i * 55, life = 450 + delay;
      const ripple = arena.fx('shieldRipple', () => bTorus(.48, .035, 28), i ? '#a4e6ff' : '#68cfff', 0,
        unit.root.position.x, unit.root.position.y + 1, unit.root.position.z);
      ripple.rotationQuaternion = facing.clone();
      ripple.material.disableDepthWrite = true;
      // Fade and travel follow the visual model, not the world-space spawn point.
      arena.fade(ripple, life, (mesh, k) => {
        const elapsed = k * life - delay;
        if (elapsed <= 0 || unit.root.isDisposed?.()) { mesh.material.alpha = 0; return; }
        const progress = Math.min(1, elapsed / (life - delay));
        mesh.position.copyFrom(unit.root.position).addInPlace(offset);
        mesh.position.y += 1.05;
        mesh.scaling.setAll(.58 + progress * 1.85);
        mesh.material.alpha = progress < 1 ? .78 * (1 - progress) ** 2 : 0;
      });
    }
  });
  return true;
}
