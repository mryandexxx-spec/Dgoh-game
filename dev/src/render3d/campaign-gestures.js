// Camera-relative map gestures. Pure mathematics: screen-pixel movement stays
// aligned with the tilted/rotated Babylon camera, independent of world X/Z.
// Exports are deliberately Babylon/DOM-free for deterministic regression tests.
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Pan follows the finger: screen-right terrain motion moves the camera opposite
// the camera's screen-right vector. Vertical ground motion is foreshortened by
// cos(beta), so compensate to keep touch speed consistent in both directions.
export function campaignPanDelta(dx, dy, {alpha, beta, radius, fov, height}) {
  const h = Math.max(1, height);
  const unitsPerPixel = 2 * radius * Math.tan(fov / 2) / h;
  const alongX = -dx * unitsPerPixel;
  const alongGroundUp = dy * unitsPerPixel / Math.max(.32, Math.abs(Math.cos(beta)));
  return {
    x: alongX * Math.sin(alpha) - alongGroundUp * Math.cos(alpha),
    z: -alongX * Math.cos(alpha) - alongGroundUp * Math.sin(alpha),
  };
}
export function campaignPinch(previousDistance, nextDistance, radius) {
  return previousDistance > 8 && nextDistance > 8
    ? radius * previousDistance / nextDistance : radius;
}
export function campaignTwist(previous, next) {
  if (previous === undefined || next === undefined) return 0;
  let angle = next - previous;
  if (angle > Math.PI) angle -= 2 * Math.PI;
  if (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
