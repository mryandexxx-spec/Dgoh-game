// Ordinary arena labels: screen-space packing, independent of model hit areas.
// Dimensions arrive after layout through ResizeObserver; no per-frame DOM reads.
import './worm.js'; // порядок исполнения

const HUD_GAP = 5;
const clampHud = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hudIntersects = (a, b) => a.x < b.x + b.w + HUD_GAP && a.x + a.w + HUD_GAP > b.x &&
  a.y < b.y + b.h + HUD_GAP && a.y + a.h + HUD_GAP > b.y;

// Deterministic nearest free rectangle. Prefer vertical lift over sideways drift;
// every candidate includes leader, statuses, intention and target arrow bounds.
function packWorldLabels(rows, width, height, insets = { left: 12, right: 12 }) {
  const placed = [], top = 60, bottom = Math.max(top + 60, height - 100);
  const ordered = [...rows].sort((a, b) => b.ay - a.ay || String(a.id).localeCompare(String(b.id)));
  let crowded = false;
  for (const r of ordered) {
    const nx = clampHud(r.ax - r.w / 2, insets.left, width - insets.right - r.w);
    const ny = clampHud(r.ay - r.h, top, bottom - r.h);
    const xs = [nx], ys = [ny, top];
    for (const p of placed) {
      xs.push(clampHud(p.x - r.w - HUD_GAP, insets.left, width - insets.right - r.w),
        clampHud(p.x + p.w + HUD_GAP, insets.left, width - insets.right - r.w));
      ys.push(p.y - r.h - HUD_GAP, p.y + p.h + HUD_GAP);
    }
    let best = null, score = Infinity;
    for (const x of xs) for (const y of ys) {
      if (y < top || y + r.h > bottom) continue;
      const box = { x, y, w: r.w, h: r.h };
      if (placed.some(p => hudIntersects(box, p))) continue;
      const dx = x - nx, dy = y - ny;
      // Keep labels above their own heads whenever possible. Downward fallback
      // is reserved for crowded animated closeups, with a visible anchor line.
      const cost = dx * dx * 2 + dy * dy * (dy > 0 ? 8 : 1);
      if (cost < score) { score = cost; best = box; }
    }
    if (!best) crowded = true;
    r.x = best ? best.x : nx; r.y = best ? best.y : ny;
    placed.push({ x: r.x, y: r.y, w: r.w, h: r.h });
  }
  if (!crowded || !rows.length) return;
  // A growing target arrow can fragment the remaining free space. Repack the
  // whole group into two/three compact shelves instead of accepting an overlap.
  // Ten ordinary labels (including 73px arrows+effects+intentions) fit in the
  // supported landscape phone viewports, even with 59px notch insets.
  const cellW = Math.max(...rows.map(r => r.w)) + HUD_GAP;
  const cols = Math.max(1, Math.floor((width - insets.left - insets.right + HUD_GAP) / cellW));
  const shelves = [...rows].sort((a,b) => a.ay - b.ay || String(a.id).localeCompare(String(b.id)));
  const groups = [];
  for (let start = 0; start < shelves.length; start += cols) groups.push(shelves.slice(start, start + cols));
  const heights = groups.map(group => Math.max(...group.map(r => r.h)));
  const totalH = heights.reduce((sum,h) => sum + h + HUD_GAP, -HUD_GAP);
  if (totalH > bottom - top) return; // unsupported, very narrow viewport
  const y0 = clampHud(rows.reduce((sum,r) => sum + r.ay, 0) / rows.length - totalH / 2, top, bottom - totalH);
  let y = y0;
  groups.forEach((group, k) => {
    const shelf = group.sort((a,b) => a.ax - b.ax || String(a.id).localeCompare(String(b.id)));
    const totalW = shelf.length * cellW - HUD_GAP;
    const x0 = insets.left + (width - insets.left - insets.right - totalW) / 2;
    shelf.forEach((r,i) => { r.x = x0 + i * cellW + (cellW - HUD_GAP - r.w) / 2; r.y = y; });
    y += heights[k] + HUD_GAP;
  });
}

class WorldHudLayout {
  constructor() {
    this.rows = new Map(); this.nodes = new WeakMap(); this.dirty = true;
    if (typeof ResizeObserver !== 'undefined') this.observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const row = this.nodes.get(entry.target); if (!row) continue;
        const size = entry.borderBoxSize && entry.borderBoxSize[0];
        const w = Math.ceil(size ? size.inlineSize : entry.contentRect.width + 24);
        const h = Math.ceil(size ? size.blockSize : entry.contentRect.height);
        if (w !== row.w || h !== row.h) { row.w = w; row.h = h; this.dirty = true; }
      }
      // Repack before this layout is painted, rather than waiting for the next
      // (possibly slow WebGL) frame after statuses/target arrows change size.
      if (this.width) this.place(this.width, this.height);
    });
  }
  begin() { for (const row of this.rows.values()) row.seen = false; }
  track(id, el, ax, ay, dead) {
    const label = el.firstElementChild;
    if (!label || !label.classList.contains('world-label')) return;
    let row = this.rows.get(id);
    if (!row) { row = { id, w: 124, h: 60 }; this.rows.set(id, row); this.dirty = true; }
    row.seen = true;
    if (row.el !== el || row.label !== label) {
      if (this.observer && row.label) this.observer.unobserve(row.label);
      row.el = el; row.label = label; row.dx = row.dy = NaN;
      this.nodes.set(label, row); if (this.observer) this.observer.observe(label);
      this.dirty = true;
    }
    if (row.dead !== dead || Math.abs(ax - row.ax) >= .25 || Math.abs(ay - row.ay) >= .25 || row.ax === undefined) {
      row.ax = ax; row.ay = ay; row.dead = dead; this.dirty = true;
    }
  }
  place(width, height, insets = this.insets || { left: 12, right: 12 }) {
    for (const [id, row] of this.rows) if (!row.seen) {
      if (this.observer) this.observer.unobserve(row.label);
      this.rows.delete(id); this.dirty = true;
    }
    if (width !== this.width || height !== this.height) { this.width = width; this.height = height; this.dirty = true; }
    if (!this.insets || insets.left !== this.insets.left || insets.right !== this.insets.right) { this.insets = insets; this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false;
    const rows = [...this.rows.values()].filter(r => !r.dead);
    packWorldLabels(rows, width, height, insets);
    for (const row of rows) {
      const dx = row.x + row.w / 2 - row.ax, dy = row.y + row.h - row.ay;
      if (Math.abs(dx - row.dx) < .25 && Math.abs(dy - row.dy) < .25) continue;
      row.dx = dx; row.dy = dy;
      const s = row.el.style, length = Math.hypot(dx, dy);
      s.setProperty('--hud-x', dx.toFixed(1) + 'px'); s.setProperty('--hud-y', dy.toFixed(1) + 'px');
      s.setProperty('--hud-link', (length > 4 ? length : 0).toFixed(1) + 'px');
      s.setProperty('--hud-angle', Math.atan2(-dy, -dx).toFixed(4) + 'rad');
    }
  }
  dispose() { if (this.observer) this.observer.disconnect(); this.rows.clear(); this.nodes = new WeakMap(); }
}

export { WorldHudLayout, packWorldLabels };
