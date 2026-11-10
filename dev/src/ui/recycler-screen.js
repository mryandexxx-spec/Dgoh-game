// Отдельный экран Утилизатора Икса. Вход временно из Лавок.
import { S, set_view } from '../core/state.js';
import { persist } from '../core/save.js';
import { MEM_MATS, SCRAP, scrapPoint, scrapAvailable, protectedStock, scrapQuote, scrapCommit, scrapAutoPick } from '../logic/recycler.js';
import { ITEMS } from '../logic/gear.js';
import { fmt, ic } from '../core/format.js';
import { $ } from '../core/dom.js';
import { toast } from './common.js';

const kinds = Object.keys(SCRAP);
let tab = 'work', kind = 'ix_plate', basket = [], selected = null;
const styled = `<style>
.ixpage{height:calc(100dvh - 102px);max-height:calc(100dvh - 102px);display:flex;flex-direction:column;gap:7px;overflow:hidden;color:var(--bone)}
.ixhead{display:flex;align-items:center;gap:10px}.ixhead h2{font:24px var(--f-display);margin:0}
.ixhead .sub{margin:0}.ixhead .btn{padding:5px 9px}.ixtabs{display:flex;gap:5px}
.ixgrid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:9px;min-height:0;flex:1}
.ixpanel{background:var(--ridge);border:1px solid var(--line);border-radius:4px;padding:9px;min-width:0;min-height:0;overflow:auto}
.ixsmall{color:var(--dust);font-size:11px}.ixkinds{display:flex;gap:5px;overflow:auto;padding:2px 0 6px}
.ixkinds button{font:12px var(--f-body);white-space:nowrap;border:1px solid var(--line-hi);background:var(--dune);color:var(--bone);padding:7px;border-radius:3px}
.ixkinds button.on{border-color:var(--spice);color:var(--spice)}
.ixitem{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
.ixitem button{padding:4px 8px;min-height:29px}.ixitem b{font-size:12px}.ixitem small{display:block;color:var(--dust);font-size:10px}
.ixprog{height:8px;border:1px solid var(--line-hi);background:var(--night);border-radius:6px;overflow:hidden}
.ixprog i{display:block;background:var(--spice);height:100%}.ixnum{font:600 19px var(--f-mono)}
.ixactions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.ixactions button{padding:6px 8px}
.ixrates{flex:1;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;overflow:auto}
.ixrate{padding:10px;border:1px solid var(--line);background:var(--ridge)}.ixrate b{color:var(--sand)}
.ixfoot{display:flex;align-items:center;gap:10px}.ixbadge{background:var(--dune);border:1px solid var(--line);padding:5px 8px}
.ixmodal{position:fixed;inset:0;z-index:9999;background:#000b;display:grid;place-items:center}
.ixmodal .panel{background:var(--dune);border:1px solid var(--sand-deep);padding:18px;max-width:min(95vw,490px);max-height:85vh;overflow:auto}
@media(max-width:740px){.ixhead h2{font-size:19px}.ixpage{gap:4px}.ixhead .sub{display:none}.ixpanel{padding:6px}.ixitem{gap:4px;padding:3px 0}.ixitem small{font-size:9px}.ixgrid{gap:5px}.ixkinds button{padding:5px;font-size:11px}.ixactions{margin:4px 0}.ixactions button{padding:4px}.ixnum{font-size:16px}}
</style>`;
function itemPool() {
  const reserve = protectedStock(S);
  const out = Object.values(ITEMS).filter(it => scrapPoint(kind, it.id)).map(it => ({
    id: it.id, label: it.n, tier: it.t, p: scrapPoint(kind, it.id),
    total: S.inv?.[it.id] || 0, safe: scrapAvailable(S, it.id, null, reserve),
    held: reserve[it.id] || 0,
  }));
  for (const it of Object.values(ITEMS)) if (it.t >= 6) {
    const ids = Object.keys(S.gearParts || {}).filter(id => id.startsWith('part:' + it.id + ':'));
    for (const partId of ids) if (scrapPoint(kind, it.id, partId)) out.push({
      id: it.id, partId, label: it.n + ' · готовая деталь', tier: it.t,
      p: scrapPoint(kind, it.id, partId), total: S.gearParts[partId] || 0,
      safe: scrapAvailable(S, it.id, partId), held: reserve[partId] || 0,
    });
  }
  return out.filter(x => x.total > 0).sort((a, b) => (b.safe > 0) - (a.safe > 0) || a.tier - b.tier || a.label.localeCompare(b.label));
}
const keyOf = x => x.partId || x.id;
function addSelection(item, n) {
  const used = basket.find(x => keyOf(x) === keyOf(item));
  const amount = Math.min(item.safe, Math.max(0, (used?.count || 0) + n));
  basket = basket.filter(x => keyOf(x) !== keyOf(item));
  if (amount) basket.push({ id: item.id, ...(item.partId ? { partId: item.partId } : {}), count: amount });
}
const qtyName = k => MEM_MATS[k]?.n || k;
function summary() {
  const q = scrapQuote(S, kind, basket), threshold = SCRAP[kind].threshold;
  const carry = S.scrapCarry?.[kind] || 0;
  const pts = basket.reduce((n, x) => n + scrapPoint(kind, x.id, x.partId) * x.count, 0);
  const count = Math.floor((carry + pts) / threshold), remain = (carry + pts) % threshold;
  return `<h3 style="margin:0 0 7px">${qtyName(kind)}</h3>
    <div class="ixsmall">Порог: ${threshold} очков за 1 артефакт</div>
    <div class="ixprog"><i style="width:${Math.min(100,(carry + pts) / threshold * 100)}%"></i></div>
    <div class="ixactions"><span class="ixbadge">Перенесено: ${carry}</span><span class="ixbadge">Корзина: +${pts}</span></div>
    <div class="ixnum">Получите: ${count} шт.</div><div class="ixsmall">Остаток очков после обмена: ${remain}</div>
    <div class="ixsmall">В запасе: ${fmt(S[kind] || 0)}</div>
    <div class="ixactions"><button class="btn" data-ixauto="1">Бережно подобрать</button><button class="btn" data-ixclear="1">Очистить</button></div>
    <div class="ixsmall">Выбрано позиций: ${basket.length}. Фрагменты для незавершённого снаряжения активных отрядов защищены автоматически.</div>
    <div class="ixactions"><button class="btn ${q.ok?'go':'lack'}" data-ixconfirm="1" ${q.ok?'':'disabled'}>Переработать ${count} шт.</button></div>`;
}
function renderRecycler() {
  const root = $('#view'); if (!root) return;
  root.innerHTML = styled + `<section class="ixpage">
  <div class="ixhead"><button class="btn" data-ixback="1">‹ Лавки</button><h2>Утилизатор Икса</h2><span class="sub">Мастерская по переработке излишков снаряжения</span></div>
  <div class="ixtabs"><button class="btn ${tab==='work'?'go':''}" data-ixtab="work">Мастерская</button><button class="btn ${tab==='rates'?'go':''}" data-ixtab="rates">Курсы</button><button class="btn ${tab==='stock'?'go':''}" data-ixtab="stock">Склад</button></div>
  ${tab==='work'? `<div class="ixkinds">${kinds.map(k=>`<button class="${kind===k?'on':''}" data-ixkind="${k}">${qtyName(k)} · ${fmt(S[k]||0)}</button>`).join('')}</div>
    <div class="ixgrid"><div class="ixpanel"><b>Снаряжение для переработки</b><div class="ixsmall">Безопасное количество отображается после защиты экипировки</div>
      ${itemPool().map(it=>`<div class="ixitem"><span><b>${it.label}</b><small>На складе ${it.total} · резерв ${it.held} · свободно ${it.safe} · ${it.p} оч./шт.</small></span>
      <button class="btn" data-ixlock="${keyOf(it)}" title="Блокировка">${S.scrapLocks?.[keyOf(it)]?'🔒':'🔓'}</button>
      <button class="btn ${it.safe?'go':''}" data-ixselect="${keyOf(it)}" ${it.safe?'':'disabled'}>Выбрать</button></div>`).join('')||'<p>Подходящих фрагментов пока нет. Добывайте снаряжение в кампании и рейде.</p>'}</div>
      <div class="ixpanel">${summary()}<b>Корзина</b>${basket.map(x=>`<div class="ixitem"><span>${ITEMS[x.id].n}${x.partId?' · деталь':''}<small>${x.count} × ${scrapPoint(kind,x.id,x.partId)} оч.</small></span><button class="btn" data-ixremove="${keyOf(x)}">Убрать</button></div>`).join('')}</div></div>`
  :tab==='rates'? `<div class="ixrates">${kinds.map(k=>`<div class="ixrate"><b>${qtyName(k)}</b><p>1 шт. = ${SCRAP[k].threshold} очков</p><div class="ixsmall">${Object.entries(SCRAP[k].base).map(([tier,point])=>`Тир ${tier}: ${point} базовых очков`).join(' · ')}</div><p class="ixsmall">Коэффициент типа: 0,8–1,3; готовая деталь: ×1,05. XII можно использовать в двух схемах.</p><button class="btn" data-ixkind="${k}">К переработке</button></div>`).join('')}</div>`
  : `<div class="ixpanel"><h3>Склад наследия</h3>${Object.entries(MEM_MATS).map(([k,v])=>`<div class="ixitem"><b>${v.n}</b><span>${fmt(S[k]||0)}</span><span class="ixsmall">${v.family==='artifact'?'Утилизатор / рейд / лавки':'Кампания / Хроники / Джихад'}</span></div>`).join('')}<h3>Очки, ожидающие переработки</h3>${kinds.map(k=>`<div>${qtyName(k)}: ${S.scrapCarry?.[k]||0}/${SCRAP[k].threshold}</div>`).join('')}</div>`}
  </section>`;
}
function modal(html) { $('#overlay2').innerHTML = `<div class="ixmodal"><div class="panel">${html}</div></div>`; }
function recyclerClick(d) {
  if (d.ixback) { basket = []; set_view('shop'); return true; }
  if (d.ixtab) { tab=d.ixtab; renderRecycler(); return true; }
  if (d.ixkind) { kind=d.ixkind; tab='work'; basket=[]; renderRecycler(); return true; }
  if (d.ixclear) { basket=[]; renderRecycler(); return true; }
  if (d.ixauto) { basket=scrapAutoPick(S,kind); renderRecycler(); return true; }
  if (d.ixlock) { S.scrapLocks ??= {}; S.scrapLocks[d.ixlock]=!S.scrapLocks[d.ixlock]; basket=[]; persist(); renderRecycler(); return true; }
  if (d.ixremove) { basket=basket.filter(x=>keyOf(x)!==d.ixremove); renderRecycler(); return true; }
  if (d.ixselect) {
    selected=itemPool().find(x=>keyOf(x)===d.ixselect);
    if (!selected?.safe) return true;
    modal(`<h3>${selected.label}</h3><p>Свободно: ${selected.safe}. Курс: ${selected.p} оч./шт.</p>
    <div class="ixactions">${[1,5,10,selected.safe].map((n,i)=>`<button class="btn" data-ixadd="${i===3?selected.safe:n}">${i===3?'Максимум':'+'+n}</button>`).join('')}</div><button class="btn" data-ixcancel="1">Отмена</button>`);
    return true;
  }
  if (d.ixcancel) { $('#overlay2').innerHTML=''; return true; }
  if (d.ixadd) { if(selected) addSelection(selected,+d.ixadd); $('#overlay2').innerHTML=''; renderRecycler(); return true; }
  if (d.ixconfirm) {
    const q=scrapQuote(S,kind,basket);
    if(!q.ok) return true;
    modal(`<h3>Подтвердите переработку</h3><p>${basket.map(x=>ITEMS[x.id].n+' ×'+x.count).join('; ')}</p><p>Получите: ${q.output} × ${qtyName(kind)}. Остаток очков: ${q.remainder}.</p><div class="ixactions"><button class="btn go" data-ixdo="1">Переработать</button><button class="btn" data-ixcancel="1">Отмена</button></div>`);
    return true;
  }
  if (d.ixdo) {
    const q=scrapCommit(S,kind,basket);
    $('#overlay2').innerHTML='';
    if(!q.ok) { toast('Материалы изменились. Проверьте корзину.'); basket=[]; renderRecycler(); return true; }
    persist(); toast('Получено: '+q.output+' × '+qtyName(kind)); basket=[]; renderRecycler(); return true;
  }
  return false;
}
export { renderRecycler, recyclerClick };
