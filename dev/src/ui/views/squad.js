// ui/views/squad.js — экран «Персонажи» (ростер, пакет 4). Сетка строится один раз при входе;
// фильтр и сортировка (logic/roster.js) только переставляют готовые узлы и меняют hidden — без пересборки innerHTML.
import '../portrait.js'; // порядок исполнения
import { prog } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { SHARDS_NEXT } from '../../logic/economy.js';
import { unitPower } from '../../logic/battle/stats.js';
import { ROSTER_DEF, ROSTER_SIDES, ROSTER_SORTS, rosterView } from '../../logic/roster.js';
import { CH, CHARS } from '../../data/chars.js';
import { FACTIONS, ROLES } from '../../data/fx.js';
import { fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { ptRound, ptShards } from '../portrait.js';

function nextShards(p) { return SHARDS_NEXT[p.stars] ?? null; }
const canStar = id => { const p = prog(id), n = nextShards(p); return !!(p.stars && n && p.shards >= n); };

// выбранные фильтр и сортировка — настройка интерфейса, в localStorage (не в сохранении)
const RKEY = 'dune-roster';
let RO = (() => { try { const o = JSON.parse(localStorage.getItem(RKEY) || 'null'); if (o && typeof o === 'object') return { ...ROSTER_DEF, ...o }; } catch (e) {} return { ...ROSTER_DEF }; })();
const roSave = () => { try { localStorage.setItem(RKEY, JSON.stringify(RO)); } catch (e) {} };

// порядок героев на экране (и для листания в карточке героя)
// The page is presentation only: detail navigation keeps the complete filtered order.
function rosterResult() {
  const v=rosterView(RO);
  return {open:RO.status==='locked'?[]:v.open,locked:RO.status==='open'?[]:v.locked};
}
function rosterList(){const v=rosterResult();return [...v.open,...v.locked].map(id=>CH[id]);}

const SIDE_N = { light: 'Светлые', dark: 'Тёмные', mach: 'Машины' };
const fName = f => f === 'all' ? 'Все' : SIDE_N[f] || (FACTIONS[f] && FACTIONS[f].n) || f;
const rName = r => r === 'all' ? 'Все' : ROLES[r] || r;
const heroes = () => CHARS.filter(c => !c.npc);
// Display-only labels, matching the approved registry's compact nameplates.
const REGISTRY_NAMES = Object.freeze({leto:'Герцог Лето',baron:'Молодой Барон',trooper:'Солдат',shaddam:'Шаддам IV',bashar:'Башар',legion:'Легионер',mohiam:'Мать Мохиам',fenring:'Граф Фенринг',robot:'Боевой робот',erasmus:'Эразм',margot:'Леди Марго',yue:'Доктор Юэ',baron_legend:'Барон Владимир'});
const registryName = d => REGISTRY_NAMES[d.id] || d.n;

let rosterPage = 0;
const rosterPageSize = () => {
  const w = document.documentElement.clientWidth || window.innerWidth || 844;
  return w <= 500 ? 6 : w <= 740 ? 12 : 14;
};
const RSTATUS = { all: 'Все', open: 'Открытые', locked: 'Не открыты' };
const rosterOptions = (items, selected) => items.map(([k,n]) => `<option value="${k}"${k === selected ? ' selected' : ''}>${n}</option>`).join('');
const rosterFilters = () => [RO.status && RO.status !== 'all' ? RSTATUS[RO.status] : '', RO.f !== 'all' ? fName(RO.f) : '', RO.r !== 'all' ? rName(RO.r) : ''].filter(Boolean);
function renderSquad() {
  const all=heroes(), open=all.filter(c=>prog(c.id).stars), lead=S.squad[0];
  const total=open.reduce((s,c)=>s+unitPower(c,prog(c.id)),0);
  const factions=[['all','Все фракции'],...ROSTER_SIDES.map(s=>[s,SIDE_N[s]]),...Object.entries(FACTIONS).map(([k,v])=>[k,v.n])];
  const roles=[['all','Все роли'],...Object.entries(ROLES)];
  let h=`<section class="ros roster-art" aria-label="Имперский реестр"><div class="rregistry"><div class="rhead">
    <span class="rpw"><strong id="roster-count"></strong><small>Мощь ${fmt(total)} · открыто ${open.length}/${all.length}</small></span><span class="ractive" id="roster-active" aria-live="polite"></span>
    <button class="rdd" data-rdd="f" aria-haspopup="dialog" aria-expanded="false" aria-controls="rpop-f"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>Фильтры <span id="roster-filter-count" hidden></span></button>
    <label class="rsort"><span>Сортировка</span><select id="rdd-s" aria-label="Сортировка">${rosterOptions(Object.entries(ROSTER_SORTS),RO.s)}</select></label>
    </div><div class="rgrid" id="rgrid" aria-label="Герои">`;
  for(const d of all){
    const p=prog(d.id),inSq=S.squad.includes(d.id);
    h+=`<button class="hc${p.stars?'':' lockd'}" data-open="${d.id}" data-hc="${d.id}" title="${d.n}">${ptRound(d,p,{lead:d.id===lead,registry:true})}<span class="nm">${inSq?'<i class="sq"></i>':''}${registryName(d)}</span>${ptShards(d,p)}</button>`;
  }
  h+=`<div class="rempty" id="rempty" hidden>Нет героев с такими условиями <button class="btn mini" data-rreset="1">Сбросить</button></div></div>
    <footer class="rfoot"><span class="rdiv" id="rdiv">Не открыты · <span id="rdiv-n"></span></span><div class="rpages" aria-label="Страницы реестра"><button data-rpage="-1" aria-label="Предыдущая страница">‹</button><b id="roster-page" aria-live="polite"></b><button data-rpage="1" aria-label="Следующая страница">›</button></div><button class="rreset" data-rreset="1">Сброс</button></footer></div>
    <div class="rfilter-overlay" hidden><button class="rscrim" data-rdd="0" aria-label="Закрыть фильтры" tabindex="-1"></button><section class="rpop" id="rpop-f" role="dialog" aria-modal="true" aria-labelledby="roster-filter-title" hidden>
    <div class="rfilter-head"><div><small>ИМПЕРСКИЙ РЕЕСТР</small><h2 id="roster-filter-title">Фильтры</h2></div><button data-rdd="0" aria-label="Закрыть фильтры">×</button></div>
    <div class="rstatus">${Object.entries(RSTATUS).map(([k,n])=>`<button class="ropt" data-rstatus="${k}" aria-pressed="${(RO.status||'all')===k}">${n}</button>`).join('')}</div>
    <div class="rfilter-fields"><label>Сторона / фракция<select id="roster-faction" aria-label="Сторона или фракция">${rosterOptions(factions,RO.f)}</select></label><label>Роль<select id="roster-role" aria-label="Роль">${rosterOptions(roles,RO.r)}</select></label></div>
    <div class="rfilter-actions"><button data-rreset="1">Сбросить фильтры</button><button class="rfilter-done" data-rdd="0">Показать героев <b id="roster-filter-result"></b></button></div></section></div></section>`;
  $('#view').innerHTML=h;
  $('#rdd-s').addEventListener('change',e=>rosterSet('s',e.target.value));
  $('#roster-faction').addEventListener('change',e=>rosterSet('f',e.target.value));
  $('#roster-role').addEventListener('change',e=>rosterSet('r',e.target.value));
  rosterApply();
}
// Page and filters are presentation-only. Never write game progress or the wallet.
function rosterApply(){
  const g=$('#rgrid');if(!g)return;
  const v=rosterResult(),ids=[...v.open,...v.locked],size=rosterPageSize(),pages=Math.max(1,Math.ceil(ids.length/size));
  rosterPage=Math.max(0,Math.min(rosterPage,pages-1));
  const shown=ids.slice(rosterPage*size,(rosterPage+1)*size),show=new Set(shown),nodes={};
  for(const el of g.querySelectorAll('[data-hc]')){nodes[el.dataset.hc]=el;el.hidden=!show.has(el.dataset.hc);}
  const emp=$('#rempty');g.append(...shown.map(id=>nodes[id]),emp);emp.hidden=ids.length>0;
  $('#rdiv').hidden=!v.locked.length;$('#rdiv-n').textContent=v.locked.length;
  $('#roster-count').textContent='ГЕРОИ · '+ids.length+' / '+heroes().length;
  $('#roster-page').textContent=(rosterPage+1)+'/'+pages;$('#roster-filter-result').textContent=ids.length;
  document.querySelector('.ros [data-rpage="-1"]').disabled=rosterPage===0;
  document.querySelector('.ros [data-rpage="1"]').disabled=rosterPage>=pages-1;
  const active=rosterFilters(),chips=$('#roster-active');
  chips.replaceChildren(...active.map(n=>{const el=document.createElement('span');el.textContent=n;return el}));
  const count=$('#roster-filter-count');count.hidden=!active.length;count.textContent=active.length;
  document.querySelector('.ros [data-rdd="f"]').classList.toggle('on',!!active.length);
  for(const b of document.querySelectorAll('.ros [data-rstatus]'))b.setAttribute('aria-pressed',String(b.dataset.rstatus===(RO.status||'all')));
  $('#roster-faction').value=RO.f;$('#roster-role').value=RO.r;$('#rdd-s').value=RO.s;
}
window.addEventListener('resize',()=>{if($('#rgrid'))rosterApply()});
function rosterPop(k){
  const overlay=document.querySelector('.ros .rfilter-overlay'),popup=$('#rpop-f'),trigger=document.querySelector('.ros [data-rdd="f"]');
  if(!overlay||!popup||!trigger)return;
  const open=k==='f',wasOpen=!overlay.hidden;overlay.hidden=!open;popup.hidden=!open;
  trigger.setAttribute('aria-expanded',String(open));trigger.classList.toggle('open',open);
  for(const el of document.querySelectorAll('.ros .rhead,.ros .rgrid,.ros .rfoot'))el.inert=open;
  if(open)popup.querySelector('button').focus();else if(wasOpen)trigger.focus();
}
document.addEventListener('keydown',e=>{
  const popup=document.querySelector('.ros #rpop-f:not([hidden])');if(!popup)return;
  if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();rosterPop(null);return;}
  if(e.key!=='Tab')return;
  const focusable=[...popup.querySelectorAll('button:not(:disabled),select:not(:disabled)')],first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
},true);
function rosterSet(k,v){
  if(k==='status'&&!Object.hasOwn(RSTATUS,v))return;
  if(k==='s'&&!Object.hasOwn(ROSTER_SORTS,v))return;
  if(k==='f'&&v!=='all'&&!ROSTER_SIDES.includes(v)&&!Object.hasOwn(FACTIONS,v))return;
  if(k==='r'&&v!=='all'&&!Object.hasOwn(ROLES,v))return;
  RO={...RO,[k]:v};roSave();rosterPage=0;rosterApply();
}
function rosterClick(d){
  if(d.rdd!==undefined){const popup=$('#rpop-f');rosterPop(d.rdd==='f'&&popup?.hidden?'f':null);return true;}
  if(d.rf){rosterSet('f',d.rf);return true;}
  if(d.rr){rosterSet('r',d.rr);return true;}
  if(d.rs){rosterSet('s',d.rs);return true;}
  if(d.rstatus){rosterSet('status',d.rstatus);return true;}
  if(d.rreset){RO={...RO,f:'all',r:'all',status:'all'};roSave();rosterPage=0;rosterApply();return true;}
  if(d.rpage==='1'||d.rpage==='-1'){rosterPage+=Number(d.rpage);rosterApply();return true;}
  return false;
}

export { nextShards, canStar, rosterList, renderSquad, rosterClick };
