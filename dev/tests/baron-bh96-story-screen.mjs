import assert from 'node:assert/strict';
import { storyEventsHtml } from '../src/ui/views/story-events.js';
import { STORY_UNLOCK_EVENTS } from '../src/data/bh94-unlock-events.js';
const asSave=(lvl=40)=>({acc:{lvl},roster:{},storyEvents:{}});
const locked=asSave(39);
for(const id of ['margot_story','yue_story']){
 const a=storyEventsHtml(locked,'D1',id,0);
 assert.match(a,/40-й уровень/);
 assert.match(a,/data-story-start/);
 assert.match(a,/disabled/);
 assert.ok(a.includes(STORY_UNLOCK_EVENTS[id].title));
 assert.match(a,/Фиксирован|фиксирован/i);
 const missing=storyEventsHtml(asSave(), 'D1',id,0);
 assert.match(missing,/событие закрыто/);
 const save=asSave();
 save.roster[STORY_UNLOCK_EVENTS[id].hero]={stars:1,shards:80};
 const playable=storyEventsHtml(save,'D1',id,0);
 assert.ok(playable.includes('data-story-start="'+id+':0"'));
 assert.match(playable,/В бой/);
 assert.match(playable,/aria-pressed="true"/);
 const stages=STORY_UNLOCK_EVENTS[id].stages;
 for(let stage=0;stage<3;stage++){
  const html=storyEventsHtml(save,'D1',id,stage);
  assert.ok(html.includes(stages[stage].title));
  for(const hero of stages[stage].allies) assert.ok(html.includes(hero) || html.includes(({leto:'Лето',jessica:'Джессика',paul:'Пол',duncan:'Дункан',gurney:'Гурни',shaddam:'Шаддам',mohiam:'Мохиам',fenring:'Фенринг',thufir:'Хават'})[hero]));
 }
 save.storyEvents[id]={done:{0:true,1:true,2:true},day:'D1',dailyWins:5};
 const capped=storyEventsHtml(save,'D1',id,2);
 assert.match(capped,/Лимит на сегодня/);
 const tomorrow=storyEventsHtml(save,'D2',id,2);
 assert.match(tomorrow,/В бой/);
 save.roster[STORY_UNLOCK_EVENTS[id].hero].stars=7;
 assert.match(storyEventsHtml(save,'D2',id,2),/Герой 7★/);
}
assert.ok(storyEventsHtml(asSave(),'D1','INVALID',10).includes('Шёлковые нити'));
console.log('BH9.6 approved shared events screen, 40+ gate, fixed teams, caps and unregistered heroes: PASS');
