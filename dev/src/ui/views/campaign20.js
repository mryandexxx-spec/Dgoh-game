// Campaign 2.0 — единый экран, C2: 3D-пилот Каладана; остальные главы пока в старом UI.
// Состояния экрана только в памяти; сохранения, порядок NODES и экономика не меняются.
import { S } from '../../core/state.js';
import { CAMP_DEF, CAMP_KEYS, NODES, ROM7, campNodes, chapNodes, nodeOpen, nodeCost, nodeEn } from '../../data/campaigns.js';
import { chapterMap, nextCampaignNode } from '../../logic/campaign-map.js';
import { campReward, enemyProg } from '../../logic/economy.js';
import { reqText } from '../../logic/progress.js';
import { CH } from '../../data/chars.js';
import { fmt, amt } from '../../core/format.js';
import { portrait } from '../../render2d/figures.js';
import { starStr } from '../common.js';
import { mountCampaignMap } from '../../render3d/scenes/campaign-map.js';

let page = 'home', detail = false, tab = 'story', chapterPicker = false, legacy = false;
let selected = null;
const esc = x => String(x ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function campaign20Action(d) {
  if (d.c20legacy) { legacy=true;return true; }
  if (d.c20 === 'home') { page='home'; detail=false;chapterPicker=false; return true; }
  if (d.c20 === 'story') { page='map';S.campTab=S.campTab==='D'?'D':'L';detail=false;return true; }
  if (d.c20 === 'chron') { page='map';S.campTab='C';detail=false;return true; }
  if (d.c20 === 'back') { detail=false;chapterPicker=false;return true; }
  if (d.c20 === 'detail') { detail=true;tab='story';return true; }
  if (d.c20 === 'chapters') { chapterPicker=!chapterPicker;return true; }
  if (d.c20tab) { tab=d.c20tab;return true; }
  if (d.c20side) { S.campTab=d.c20side;selected=null;detail=false;chapterPicker=false;return true; }
  if (d.c20chapter!==undefined) { const c=Number(d.c20chapter);if(nodeOpen(chapNodes(S.campTab,c)[0])){S.campCh[S.campTab]=c;selected=null;detail=false;chapterPicker=false;}return true; }
  if (d.c20dir){const ck=S.campTab,now=S.campCh[ck]||0,step=Number(d.c20dir),next=now+step;if(next>=0&&next<7&&nodeOpen(chapNodes(ck,next)[0])){S.campCh[ck]=next;selected=null;}return true;}
  if (d.c20node!==undefined){selected=Number(d.c20node);detail=false;return true;}
  return false;
}
export function campaign20Start() { page='home';legacy=false;selected=null;detail=false;chapterPicker=false; }
function homeHtml(){
  const completed=ck=>campNodes(ck).filter(i=>!!S.cleared[i]).length;
  return `<div class="c20 c20-home">
    <div class="c20-head"><button data-v="lobby">‹ Лагерь</button><span class="c20-crumb">АРХИВ ИМПЕРИУМА / КАМПАНИИ</span></div>
    <div class="c20-choices">
      <button class="c20-cover c20-cover-story" data-c20="story" aria-label="Открыть сюжет">
        <span class="c20-art c20-sun">✦</span><span class="c20-copy"><strong>СЮЖЕТ</strong><span>Путь Атрейдесов и интриги Харконненов</span><small>Светлые / Тёмные · вода · ${completed('L')+completed('D')}/140 миссий</small></span>
      </button>
      <button class="c20-cover c20-cover-chron" data-c20="chron" aria-label="Открыть хроники">
        <span class="c20-art c20-moon">✧</span><span class="c20-copy"><strong>ХРОНИКИ</strong><span>Забытые эпохи и великие войны</span><small>Все герои · свечи · ${completed('C')}/70 миссий</small></span>
      </button>
    </div>
  </div>`;
}
function modalHtml(ck,n,i){
  if(!detail)return '';
  const rw=campReward(i,3);
  const bodies={
    story:`<p>${esc(n.story)}</p>${n.dlg?`<button class="btn mini" data-dlgview="${i}">Диалог миссии</button>`:''}
       <label class="c20-check"><input type="checkbox" data-dlgtoggle="1" ${S.skipDlg?'':'checked'}> Диалоги перед первым боем</label>`,
    foes:`<p>Уровень ${n.lvl}. ${esc(reqText(i)||CAMP_DEF[ck].desc)}</p><div class="c20-foes">${n.enemy.map(id=>{
      const p=enemyProg(id,n.lvl,n.m===9);
      return `<div>${portrait(CH[id],37)}<span>${esc(CH[id].sn)}</span><small>★ ${p.stars} · ур. ${p.lvl}</small></div>`;
    }).join('')}</div>`,
    rewards:`<div class="c20-rewards">${n.drops.map(id=>`<span>${portrait(CH[id],35)}${esc(CH[id].sn)}</span>`).join('')}</div>
      <p>${amt('sol',rw.sol)} · ${amt('pl','1–3')} · ${amt('folio',rw.folio)}</p>`
  };
  return `<div class="c20-modal"><div class="c20-dialog" role="dialog" aria-modal="true" aria-label="Миссия">
    <header><strong>${esc(n.n)}</strong><button class="btn" data-c20="back">✕</button></header>
    <nav>${[['story','История'],['foes','Противники'],['rewards','Награды']].map(([k,v])=>`<button data-c20tab="${k}" class="${tab===k?'on':''}">${v}</button>`).join('')}</nav>
    <section>${bodies[tab]}</section>
  </div></div>`;
}
function mapHtml(setSel){
  const ck=CAMP_DEF[S.campTab]?S.campTab:'L';
  const chapters=CAMP_DEF[ck].chapters, ids=campNodes(ck);
  const first=ids.find(i=>!S.cleared[i])??ids.at(-1);
  let c=S.campCh[ck];
  if(!Number.isInteger(c)||!nodeOpen(chapNodes(ck,c)[0]))c=NODES[first].c;
  const map=chapterMap(ck,c);
  const nodes=chapNodes(ck,c);
  const chosen=nodes.includes(selected)?selected:map?(nextCampaignNode(map)?.id??nodes[0]):(nodes.find(i=>!S.cleared[i])??nodes.at(-1));
  selected=chosen;
  const n=NODES[chosen],stars=S.cleared[chosen]||0,open=nodeOpen(chosen),cost=nodeCost(chosen),en=nodeEn(chosen);
  const side=ck!=='C'?`<span class="c20-sides"><button class="${ck==='L'?'on light':''}" data-c20side="L">Светлые</button><button class="${ck==='D'?'on dark':''}" data-c20side="D">Тёмные</button></span>`:'';
  const picker=chapterPicker?`<div class="c20-picker">${chapters.map((ch,j)=>`<button data-c20chapter="${j}" ${nodeOpen(chapNodes(ck,j)[0])?'':'disabled'} class="${j===c?'on':''}">${ROM7[j]} · ${esc(ch.t)}</button>`).join('')}</div>`:'';
  const markers=map?map.nodes.map(p=>`<button class="c20-pin ${p.open?'':'locked'} ${p.boss?'boss':''} ${p.stars?'passed':''} ${p.id===selected?'on':''}"
    style="--px:${(p.x+28)/56*100}%;--py:${(p.z+18)/36*100}%"
    data-c20node="${p.id}" title="${esc(p.title)}" aria-label="Миссия ${p.number}: ${esc(p.title)}">
    <b>${p.number}</b><small>${p.stars?'★'.repeat(p.stars):p.open?'◆':'⌑'}</small></button>`).join(''):'';
  const old=map?'':`<p class="c20-pending">3D-карта этой главы будет подготовлена после Каладана. Можно продолжать играть через прежнюю кампанию.</p><button class="btn" data-c20legacy="1">Открыть классическую карту</button>`;
  const actions=open?`<button class="btn go" data-node="${chosen}">В бой <small>${amt(en,cost)}</small></button>
    ${stars===3?`<button class="btn" data-sim="${chosen}">Симуляция <small>${amt(en,cost)}</small></button>`:''}`:'<span class="c20-locked">Сначала пройдите предыдущую миссию</span>';
  const html=`<div class="c20 c20-map">
    <div class="c20-head"><button class="c20-back" data-c20="home">‹ ${ck==='C'?'Хроники':'Сюжет'}</button>${side}<span class="c20-progress">★ ${nodes.reduce((a,i)=>a+(S.cleared[i]||0),0)}/30</span></div>
    <div class="c20-chapbar"><button data-c20dir="-1" aria-label="Предыдущая глава">‹</button><button data-c20="chapters">ГЛАВА ${ROM7[c]} · ${esc(chapters[c].t)} ⌄</button><button data-c20dir="1" aria-label="Следующая глава">›</button></div>
    ${picker}
    <div class="c20-world ${map?'caladan':'no-map'}" id="c20world">${markers}${old}</div>
    <div class="c20-card"><div><strong>${n.m+1}. ${esc(n.n)}</strong><small>Ур. ${n.lvl} · ${starStr(stars,3)}</small></div><button class="btn" data-c20="detail">Подробнее</button><div class="c20-card-actions">${actions}</div></div>
    ${modalHtml(ck,n,chosen)}
  </div>`;
  return {html,map,chosen};
}
export function renderCampaign20(setSel) {
  if(legacy) return false;
  if(page==='home'){document.querySelector('#view').innerHTML=homeHtml();return true;}
  const {html,map}=mapHtml(setSel);
  document.querySelector('#view').innerHTML=html;
  if(map){
    const container=document.getElementById('c20world');
    mountCampaignMap(container,map,i=>{setSel(i);selected=i;detail=false;renderCampaign20(setSel);},()=>container?.classList.add('c20-fallback'));
  }
  return true;
}
