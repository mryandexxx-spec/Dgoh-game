// Campaign 2.0 — C2 Каладан + C4.1 Гиеди Прайм; остальные главы пока в старом UI.
// Состояния экрана только в памяти; сохранения, порядок NODES и экономика не меняются.
import { S } from '../../core/state.js';
import { CAMP_DEF, CAMP_KEYS, NODES, ROM7, campNodes, chapNodes, nodeOpen, nodeCost, nodeEn } from '../../data/campaigns.js';
import { chapterMap, nextCampaignNode } from '../../logic/campaign-map.js';
import { campReward, enemyProg, CRY_WIN } from '../../logic/economy.js';
import { reqText, enGet, nodePower, campSquad, prog, sideOk } from '../../logic/progress.js';
import { ITEMS, NODE_ITEMS, COMPLETE_NODE_ITEMS, COMPLETE_RATE, TIER_COL } from '../../logic/gear.js';
import { unitPower } from '../../logic/battle/stats.js';
import { CH } from '../../data/chars.js';
import { fmt, amt } from '../../core/format.js';
import { portrait } from '../../render2d/figures.js';
import { starStr, itemIcon } from '../common.js';
import { mountCampaignMap, focusCampaignNode, closeCampaignMap } from '../../render3d/scenes/campaign-map.js';

let page = 'home', detail = false, tab = 'story', chapterPicker = false, legacy = false;
let rewardPage = 0, storyPage = 0;
let selected = null;
const esc = x => String(x ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function campaign20Action(d) {
  if (d.c20legacy) { legacy=true;return true; }
  if (d.c20 === 'home') { page='home'; detail=false;chapterPicker=false; return true; }
  if (d.c20 === 'story') { page='map';S.campTab=S.campTab==='D'?'D':'L';detail=false;return true; }
  if (d.c20 === 'chron') { page='map';S.campTab='C';detail=false;return true; }
  if (d.c20 === 'back') { detail=false;chapterPicker=false;return true; }
  if (d.c20 === 'detail') { detail=true;tab='story';rewardPage=0;storyPage=0;return true; }
  if (d.c20 === 'chapters') { chapterPicker=!chapterPicker;return true; }
  if (d.c20tab) { tab=d.c20tab;return true; }
  if (d.c20rewardpage!==undefined) { rewardPage=Math.max(0,Number(d.c20rewardpage)||0);return true; }
  if (d.c20storypage!==undefined) { storyPage=Math.max(0,Number(d.c20storypage)||0);return true; }
  if (d.c20side) { S.campTab=d.c20side;selected=null;detail=false;chapterPicker=false;return true; }
  if (d.c20chapter!==undefined) { const c=Number(d.c20chapter);if(nodeOpen(chapNodes(S.campTab,c)[0])){S.campCh[S.campTab]=c;selected=null;detail=false;chapterPicker=false;}return true; }
  if (d.c20dir){const ck=S.campTab,now=S.campCh[ck]||0,step=Number(d.c20dir),next=now+step;if(next>=0&&next<7&&nodeOpen(chapNodes(ck,next)[0])){S.campCh[ck]=next;selected=null;}return true;}
  if (d.c20node!==undefined){selected=Number(d.c20node);detail=false;rewardPage=0;storyPage=0;return true;}
  return false;
}
export function campaign20Start() { closeCampaignMap(); page='home';legacy=false;selected=null;detail=false;chapterPicker=false; }
export function campaign20Legacy() { closeCampaignMap(); legacy=true;detail=false;chapterPicker=false; }
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
// Mission loot comes from GE2 farm tables, not a duplicated rewards economy.
function missionLoot(i) {
  const n=NODES[i];
  return [
    ...n.drops.map((id,k)=>({key:'shard:'+id,icon:portrait(CH[id],30),
      title:'Осколки · '+CH[id].sn, note:k===0?(n.camp==='C'?'до 2 · 60%':'до 2 · 50%'):(n.camp==='C'?'до 1 · 23,4%':'до 1 · 24%')})),
    ...NODE_ITEMS[i].map(key=>{
      const part=key.startsWith('frag:'),it=ITEMS[part?key.split(':')[1]:key];
      return it?{key:part?'gefrag:'+key:'frag:'+key,icon:itemIcon(it,29).replace(/ data-info="[^"]*"/,''),
        title:(part?'Компонент · ':'Фрагменты · ')+it.n,note:'18% за бой'}:null;
    }).filter(Boolean),
    ...COMPLETE_NODE_ITEMS[i].map(key=>{
      const it=ITEMS[key];return it?{key:'gegear:'+key,icon:itemIcon(it,29).replace(/ data-info="[^"]*"/,''),
        title:'Готовое · '+it.n,note:(COMPLETE_RATE[it.t]*100).toLocaleString('ru-RU',{maximumFractionDigits:2})+'% за бой'}:null;
    }).filter(Boolean)
  ];
}
function modalPager(kind,p,count) {
  return count<=1?'':`<div class="c20-pages"><button data-c20${kind}page="${Math.max(0,p-1)}" ${p===0?'disabled':''}>‹</button>
    <span>${p+1}/${count}</span><button data-c20${kind}page="${Math.min(count-1,p+1)}" ${p>=count-1?'disabled':''}>›</button></div>`;
}
function modalHtml(ck,n,i){
  if(!detail)return '';
  const rw=campReward(i,3,true);
  const loot=missionLoot(i),count=Math.max(1,Math.ceil(loot.length/3));
  rewardPage=Math.min(rewardPage,count-1);
  const chunks=(n.story||'История не указана').match(/.{1,220}(?:\s|$)/gu)||[n.story||''];
  storyPage=Math.min(storyPage,chunks.length-1);
  const squad=campSquad(i).filter(id=>prog(id).stars&&sideOk(ck,id));
  const ownPower=squad.reduce((a,id)=>a+unitPower(CH[id],prog(id)),0);
  const requirements=`<div class="c20-conditions"><span>Ур. ${n.lvl}</span>
    <span>${ck==='L'?'Светлая сторона':ck==='D'?'Тёмная сторона':'Любые герои'}</span>
    ${reqText(i)?`<span>${esc(reqText(i))}</span>`:''}
    <span>Враг ${fmt(nodePower(n))} · отряд ${fmt(ownPower)}</span></div>`;
  const bodies={
    story:`<div class="c20-storytext">${esc(chunks[storyPage])}</div>
      ${modalPager('story',storyPage,chunks.length)}
      <div class="c20-inlineactions">${n.dlg?`<button class="btn mini" data-dlgview="${i}">Диалог</button>`:''}
      <label class="c20-check"><input type="checkbox" data-dlgtoggle="1" ${S.skipDlg?'':'checked'}> Диалоги перед боем</label></div>`,
    foes:`${requirements}<div class="c20-foes">${n.enemy.slice(0,5).map(id=>{
      const p=enemyProg(id,n.lvl,n.m===9);
      return `<div>${portrait(CH[id],32,TIER_COL[p.gear])}<span>${esc(CH[id].sn)}</span>
        <small>★${p.stars} · ур.${p.lvl} · сн.${p.gear}</small></div>`;
    }).join('')}</div>`,
    rewards:`<div class="c20-earn">За победу: ${amt('sol',rw.sol)} · ${amt('pl',rw.pl)} · ${amt('folio',rw.folio)}
      ${ck==='C'?' · '+amt('rid','8–15'):''} · ${amt('cry',CRY_WIN)}</div>
      <div class="c20-loot">${loot.slice(rewardPage*3,(rewardPage+1)*3).map(row=>
        `<div class="c20-lootrow"><span class="c20-looticon" data-info="${esc(row.key)}">${row.icon}</span>
        <span>${esc(row.title)}<small>${esc(row.note)}</small></span>
        <button class="btn mini" data-c20item="${esc(row.key)}">Найти</button></div>`).join('')}</div>
      ${modalPager('reward',rewardPage,count)}`
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
  const map=chapterMap(ck,c,S.cleared);
  const nodes=chapNodes(ck,c);
  const chosen=nodes.includes(selected)?selected:map?(nextCampaignNode(map)?.id??nodes[0]):(nodes.find(i=>!S.cleared[i])??nodes.at(-1));
  selected=chosen;
  const n=NODES[chosen],stars=S.cleared[chosen]||0,open=nodeOpen(chosen),cost=nodeCost(chosen),en=nodeEn(chosen);
  const side=ck!=='C'?`<span class="c20-sides"><button class="${ck==='L'?'on light':''}" data-c20side="L">Светлые</button><button class="${ck==='D'?'on dark':''}" data-c20side="D">Тёмные</button></span>`:'';
  const picker=chapterPicker?`<div class="c20-picker">${chapters.map((ch,j)=>`<button data-c20chapter="${j}" ${nodeOpen(chapNodes(ck,j)[0])?'':'disabled'} class="${j===c?'on':''}">${ROM7[j]} · ${esc(ch.t)}</button>`).join('')}</div>`:'';
  const markers=map?map.nodes.map(p=>`<button class="c20-pin ${p.open?'':'locked'} ${p.boss?'boss':''} ${p.stars?'passed':''} ${p.id===selected?'on':''}"
    style="--px:${map.preset.theme==='empty-harvest'?(p.x+70)/148*100:map.preset.theme==='sietch-water'?(p.x+65)/145*100:map.preset.theme==='escape-rift'?(p.x+66)/132*100:map.preset.theme==='sandworms-rebirth'?(p.x+62)/120*100:map.preset.theme==='corrin-siege'?(p.x+68)/140*100:map.preset.theme==='machine-crusade'?(p.x+72)/144*100:map.preset.theme==='butlerian-jihad'?(p.x+63)/128*100:map.preset.theme==='corrino-chronicles'?(p.x+57)/114*100:(p.x+28)/56*100}%;--py:${map.preset.theme==='empty-harvest'?(p.z+38)/74*100:map.preset.theme==='sietch-water'?(p.z+38)/70*100:map.preset.theme==='escape-rift'?(p.z+27)/60*100:map.preset.theme==='sandworms-rebirth'?(p.z+40)/82*100:map.preset.theme==='corrin-siege'?(p.z+30)/72*100:map.preset.theme==='machine-crusade'?(p.z+25)/57*100:map.preset.theme==='butlerian-jihad'?(p.z+25)/58*100:map.preset.theme==='corrino-chronicles'?(p.z+27)/59*100:(p.z+18)/36*100}%"
    data-c20node="${p.id}" title="${esc(p.title)}" aria-label="Миссия ${p.number}: ${esc(p.title)}">
    <b>${p.number}</b><small>${p.stars?'★'.repeat(p.stars):p.open?'◆':'⌑'}</small></button>`).join(''):'';
  const old=map?'':`<p class="c20-pending">3D-карта этой главы пока готовится. Можно продолжать играть через прежнюю кампанию.</p><button class="btn" data-c20legacy="1">Открыть классическую карту</button>`;
  const enough=enGet(en)>=cost;
  const actions=open?`<button class="btn go ${enough?'':'lack'}" data-node="${chosen}">В бой <small>${amt(en,cost)}</small></button>
    ${stars===3?`<button class="btn ${enough?'':'lack'}" data-sim="${chosen}">Симуляция <small>${amt(en,cost)}</small></button>`:'<span class="c20-locked">Симуляция после 3★</span>'}`:
    '<span class="c20-locked">Сначала пройдите предыдущую миссию</span>';
  const html=`<div class="c20 c20-map">
    <div class="c20-head"><button class="c20-back" data-c20="home">‹ ${ck==='C'?'Хроники':'Сюжет'}</button>${side}<span class="c20-progress">★ ${nodes.reduce((a,i)=>a+(S.cleared[i]||0),0)}/30</span></div>
    <div class="c20-chapbar"><button data-c20dir="-1" aria-label="Предыдущая глава">‹</button><button data-c20="chapters">ГЛАВА ${ROM7[c]} · ${esc(chapters[c].t)} ⌄</button><button data-c20dir="1" aria-label="Следующая глава">›</button></div>
    ${picker}
    <div class="c20-world ${map?map.preset.theme:'no-map'}" id="c20world">${markers}${old}${map?'<button class="c20-recenter" data-c20focus="1" aria-label="Центрировать текущую миссию" title="К текущей миссии">◎</button>':''}</div>
    <div class="c20-card"><div><strong>${n.m+1}. ${esc(n.n)}</strong><small>Ур. ${n.lvl} · ${starStr(stars,3)}</small></div><button class="btn" data-c20="detail">Подробнее</button><div class="c20-card-actions">${actions}</div></div>
    ${modalHtml(ck,n,chosen)}
  </div>`;
  return {html,map,chosen};
}
// C2.2: refresh the selected-mission HUD without tearing down the Babylon canvas.
// The engine, camera and 3D scene remain mounted across taps and modal changes.
function replacePart(current, fresh, selector) {
  const a=current.querySelector(selector),b=fresh.querySelector(selector);
  if(a&&b)a.replaceWith(b);
  else if(a&&!b)a.remove();
  else if(b)current.append(b);
}
export function renderCampaign20(setSel) {
  if(legacy){closeCampaignMap();return false;}
  const view=document.querySelector('#view');
  if(page==='home'){closeCampaignMap();view.innerHTML=homeHtml();return true;}
  const {html,map,chosen}=mapHtml(setSel);
  const current=view.querySelector('.c20-map');
  if(map && current && current.dataset.map===map.preset.id) {
    const template=document.createElement('div');
    template.innerHTML=html;
    const fresh=template.firstElementChild;
    const oldSelection=current.querySelector('.c20-pin.on')?.dataset.c20node;
    for(const selector of ['.c20-head','.c20-chapbar','.c20-card','.c20-picker','.c20-modal'])
      replacePart(current,fresh,selector);
    for(const pin of current.querySelectorAll('.c20-pin'))
      pin.classList.toggle('on',Number(pin.dataset.c20node)===chosen);
    if(Number(oldSelection)!==chosen)focusCampaignNode(chosen);
    return true;
  }
  closeCampaignMap();
  view.innerHTML=html;
  if(map){
    const container=document.getElementById('c20world');
    const root=view.querySelector('.c20-map');
    if(root)root.dataset.map=map.preset.id;
    mountCampaignMap(container,map,i=>{setSel(i);selected=i;detail=false;renderCampaign20(setSel);},
      ()=>container?.classList.add('c20-fallback'));
  }
  return true;
}
export function campaign20FocusCurrent() {
  const ck=S.campTab,chapter=S.campCh[ck]||0;
  const map=chapterMap(ck,chapter,S.cleared);
  const node=map?.nodes.find(x=>x.id===selected)||nextCampaignNode(map);
  if(node)focusCampaignNode(node.id);
}

// Farm deeplink selects the original mission without mutating progress or rewards.
export function campaign20JumpToMission(id) {
  const n=NODES[id];if(!n)return false;
  page='map';legacy=false;detail=false;tab='rewards';
  S.campTab=n.camp;S.campCh[n.camp]=n.c;
  selected=id;rewardPage=0;storyPage=0;chapterPicker=false;
  return true;
}
