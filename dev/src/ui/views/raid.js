// ui/views/raid.js — строки 3951–3991 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../overlays/squad-select.js'; // порядок исполнения
import { unlockedIds } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { RAID_FRAGS } from '../../logic/gear.js';
import { RAID_REWARD, RAID_SCENES } from '../../logic/economy.js';
import { RAID_TIERS } from '../../data/boss.js';
import { CH } from '../../data/chars.js';
import { amt, fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { glyph, thumb } from '../common.js';

function raidPct() { return S.raid ? 1 - S.raid.hp / S.raid.maxHp : 0; }
function raidReward(tier, pct, killed) {
  const r = RAID_REWARD[tier];
  return { teeth: Math.round(r.teeth * pct) + (killed ? r.kill : 0), pl: Math.round(r.pl * pct), sol: Math.round(r.sol * pct), cry: Math.round(r.cry * pct) + (killed ? r.cryK : 0), folio: Math.round(r.folio * pct), seal: killed ? r.sealK : Math.floor(pct * r.sealK * .6), wol: killed ? r.wolK : 0 };
}
function renderRaid() {
  let html = `<h2>Рейд «Шаи-Хулуд»</h2><p class="sub">Общий запас здоровья червя сохраняется между попытками, а каждый персонаж атакует один раз за рейд — как в рейде на ранкора. Рейд заканчивается, когда червь убит или когда вы забираете награду. Награда растёт с нанесённым уроном.</p>`;
  if (!S.raid) {
    html += `<div class="tiers">` + RAID_TIERS.map((T, t) => { const open = t === 0 || S.raidKills[t - 1];
      return `<div class="tier ${S.raidKills[t] ? 'done' : ''}">${thumb(RAID_SCENES[t], t + 1)}<div><h4>${T.n}</h4><div class="meta" style="color:var(--dust);font-size:12px;margin-top:2px">Здоровье ${fmt(T.hp)} · урон червя ${T.dmg} · ${open ? (S.raidKills[t] ? 'червь побеждён' : 'доступен') : 'нужна победа на Т' + t}</div></div>
        <div class="go-cell"><button class="btn go" data-raidstart="${t}" ${open ? '' : 'disabled'}>Начать рейд</button></div></div>`; }).join('') + `</div>`;
    html += `<div class="panel" style="margin-top:16px"><h3>Как устроен червь</h3><div class="kv">
      <span>Фаза 1 · 100–75%</span><div>«Удар пасти» по бойцу со щитом; каждый третий ход — «Песчаный вал» по всем и −15% шкалы хода.</div>
      <span>Фаза 2 · 75–50%</span><div>«Песчаная буря» по всем через ход, срывает Скрытность.</div>
      <span>Фаза 3 · 50–25%</span><div>«Поглощение»: боец ниже 40% здоровья погибает мгновенно, провокация не спасает.</div>
      <span>Фаза 4 · 25–0%</span><div>«Ярость»: удар по всем каждый ход, сила растёт быстрее.</div>
      <span>Щиты</span><div>Пульсация щита бесит червя: он бьёт щитоносцев первыми и на 30% сильнее.</div>
      <span>Фримены</span><div>+50% урона по червю (крючья подателей), ритма не создают.</div>
      <span>Ритм</span><div>На 100 червь бросается вне очереди с ударом +50%.</div>
      <span>Иммунитеты</span><div>Яд, Страх, Голос и казнь не действуют.</div>
    </div></div>`;
  } else {
    const R = S.raid, T = RAID_TIERS[R.tier], pct = raidPct(), used = new Set(R.used);
    const elig = unlockedIds().filter(id => !used.has(id));
    S.raidPick = S.raidPick.filter(id => elig.includes(id));
    const rw = raidReward(R.tier, pct, false);
    html += `<div class="grid2"><div class="panel"><h3>${T.n}</h3>
      <div class="pool"><i style="width:${(1 - pct) * 100}%"></i><b style="left:25%"></b><b style="left:50%"></b><b style="left:75%"></b></div>
      <div class="poolnums"><span>${fmt(R.hp)} / ${fmt(R.maxHp)}</span><span>пройдено ${(pct * 100).toFixed(1)}% · фаза ${R.hp / R.maxHp > .75 ? 1 : R.hp / R.maxHp > .5 ? 2 : R.hp / R.maxHp > .25 ? 3 : 4}</span></div>
      <div class="kv"><span>Награда сейчас</span><div>${amt('teeth', rw.teeth)} ${amt('pl', rw.pl)} ${amt('sol', rw.sol)} ${amt('cry', rw.cry)} ${amt('folio', rw.folio)} ${amt('seal', rw.seal)} ${amt('frag', Math.round(RAID_FRAGS[R.tier].n * pct))}</div><span>За убийство</span><div>+${amt('teeth', RAID_REWARD[R.tier].kill)} ${amt('seal', RAID_REWARD[R.tier].sealK)}${RAID_REWARD[R.tier].wolK ? ' ' + amt('wol', RAID_REWARD[R.tier].wolK) : ''}</div></div>
      <div class="alog">${R.log.length ? R.log.map(a => `<div><span>${a.squad.map(id => CH[id].sn).join(', ')}</span><span class="mono">${fmt(a.dmg)}</span></div>`).join('') : '<div>Попыток ещё не было.</div>'}</div>
      <div class="acts" style="margin-top:0"><button class="btn" data-raidend="1">Забрать награду и закончить</button></div>
    </div>
    <div class="panel"><h3>Отряд на попытку</h3>
      <p class="sub" style="margin:0">Каждый герой атакует один раз за рейд. Свободно бойцов: ${elig.length}. Отряд собирается на экране выбора.</p>
      <div class="chips">${elig.slice(0, 14).map(id => glyph(CH[id])).join('')}${elig.length > 14 ? `<span class="lockd">+${elig.length - 14}</span>` : ''}</div>
      <button class="btn go" data-raidgo="1" ${elig.length ? '' : 'disabled'}>${elig.length ? 'Выбрать отряд и атаковать' : 'Все герои уже атаковали'}</button>
    </div></div>`;
  }
  $('#view').innerHTML = html;
}

export { raidPct, raidReward, renderRaid };
