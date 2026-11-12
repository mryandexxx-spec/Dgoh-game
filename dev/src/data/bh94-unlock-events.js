// BH9.4 agreed event parameters. Staged: no public event routes/shard sources yet.
// Five allied heroes are scripted loaners for each fight and do not touch roster.
// Never require Margot, Yue or legendary Baron to unlock their own prerequisite event.
const STORY_UNLOCK_EVENTS = Object.freeze({
  margot_story: {
    hero: 'margot', title: 'Шёлковые нити', minAccountLevel: 40,
    firstClearShards: [20, 30, 50], repeat: { stage: 2, winsPerDay: 5, shardsPerWin: 2 },
    stages: [
      { title:'Приём при дворе', scene:'court',
        allies:['fenring','shaddam','mohiam','jessica','thufir'],
        enemies:['piter','trooper','trooper'], lvl:45, gear:8 },
      { title:'Шёпот Бене Гессерит', scene:'court',
        allies:['fenring','shaddam','thufir','gurney','duncan'],
        enemies:['mohiam','jessica','legion'], lvl:60, gear:10 },
      { title:'Нити судьбы', scene:'court',
        allies:['jessica','mohiam','thufir','leto','gurney'],
        enemies:['fenring','shaddam','piter','legion'], lvl:75, gear:12 },
    ],
  },
  yue_story: {
    hero: 'yue', title: 'Цена клятвы', minAccountLevel: 40,
    firstClearShards: [20, 30, 50], repeat: { stage: 2, winsPerDay: 5, shardsPerWin: 2 },
    stages: [
      { title:'Врачебный долг', scene:'caladan',
        allies:['leto','jessica','duncan','gurney','paul'],
        enemies:['trooper','trooper','rabban'], lvl:45, gear:8 },
      { title:'Нарушенная печать', scene:'arrakeen',
        allies:['leto','jessica','thufir','duncan','gurney'],
        enemies:['piter','legion','bashar'], lvl:60, gear:10 },
      { title:'Цена решения', scene:'arrakeen',
        allies:['leto','jessica','paul','duncan','gurney'],
        enemies:['baron','piter','feyd','rabban'], lvl:75, gear:12 },
    ],
  },
});
for (const event of Object.values(STORY_UNLOCK_EVENTS)) {
  Object.freeze(event.firstClearShards);
  Object.freeze(event.repeat);
  for (const stage of event.stages) {
    Object.freeze(stage.allies); Object.freeze(stage.enemies); Object.freeze(stage);
  }
  Object.freeze(event.stages); Object.freeze(event);
}
const STORY_EVENT_IDS = Object.freeze(Object.keys(STORY_UNLOCK_EVENTS));
function validateStoryEvents(events=STORY_UNLOCK_EVENTS) {
  const errs=[];
  if (!events || Object.keys(events).length !== 2 || STORY_EVENT_IDS.some(id => !events[id])) return ['Exactly two events required'];
  for (const id of STORY_EVENT_IDS) {
    const e=events[id];
    if (e.hero!== (id==='margot_story'?'margot':'yue') || e.minAccountLevel!==40 ||
      !Array.isArray(e.stages) || e.stages.length!==3 || e.firstClearShards?.join(',')!=='20,30,50' ||
      e.repeat?.stage!==2 || e.repeat?.winsPerDay!==5 || e.repeat?.shardsPerWin!==2) errs.push(id+' contract mismatch');
    for(const [i,stage] of (e.stages||[]).entries()) {
      if (!Array.isArray(stage.allies) || stage.allies.length!==5 || new Set(stage.allies).size!==5 ||
        stage.allies.some(hero => hero==='margot'||hero==='yue'||hero==='baron_legend') ||
        !Array.isArray(stage.enemies) || stage.enemies.length<1 || stage.enemies.length>5 ||
        stage.enemies.some(enemy=>enemy==='baron_legend'||enemy==='margot'||enemy==='yue') ||
        !Number.isInteger(stage.lvl) || !Number.isInteger(stage.gear))
        errs.push(id+' invalid stage '+i);
    }
  }
  return errs;
}
export { STORY_UNLOCK_EVENTS, STORY_EVENT_IDS, validateStoryEvents };
