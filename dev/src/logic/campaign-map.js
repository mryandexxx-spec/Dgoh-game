// Campaign 2.0 · C2 — чистая проекция миссий на географию главы.
// Без DOM/Babylon/состояния приложения: пригодна для Node/golden-тестов.
import { campaignMapPreset } from '../data/campaign-map-presets.js';
import { NODES, chapNodes } from '../data/campaigns.js';

export function chapterMap(side, chapter, cleared = []) {
  const preset = campaignMapPreset(side, chapter);
  if (!preset) return null;
  const ids = chapNodes(side, chapter);
  if (ids.length !== 10 || preset.nodes.length !== ids.length) {
    throw new Error('Campaign 2.0: некорректная глава ' + side + ':' + chapter);
  }
  return {
    preset,
    nodes: ids.map((id, k) => {
      const n = NODES[id], prev = id - 1;
      const open = !NODES[prev] || NODES[prev].camp !== n.camp || !!cleared[prev];
      return { id, number: k + 1, title: n.n, x: preset.nodes[k][0],
        z: preset.nodes[k][1], stars: cleared[id] || 0,
        open, boss: k === 9, scene: n.scene };
    }),
  };
}
export function nextCampaignNode(map) {
  return map?.nodes.find(n => n.open && n.stars === 0)
    || map?.nodes.filter(n => n.open).at(-1) || null;
}
