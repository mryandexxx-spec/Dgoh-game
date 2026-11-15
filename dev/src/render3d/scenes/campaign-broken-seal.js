// Campaign 2.0 C4.20 — D:6 «Последняя ставка» / «Сломанная печать».
// Canonical global missions 130–139: one physically continuous, static final battlefield.
// Scene-owned Babylon meshes/materials only. No Engine, timers, particles, RTT, shadows or game logic.
// Shared CampaignMapScene owns route pins, v101 gestures, camera, static idle, fallback and dispose.
export function buildBrokenSeal(B3, scene, material, detail = true) {
  const M = B3.MeshBuilder;
  const mat = {
    ground: material('seal-ground-vertex', '#ffffff'),
    slate: material('seal-command-slate', '#445159'),
    dark: material('seal-command-shadow', '#29343a'),
    stone: material('seal-weathered-stone', '#837969'),
    sand: material('seal-desert-sand', '#bd9466'),
    pale: material('seal-last-dawn', '#e7d6b4'),
    ash: material('seal-atom-ash', '#6f665d'),
    black: material('seal-burned-iron', '#292c2d'),
    steel: material('seal-sardaukar-steel', '#707f82'),
    red: material('seal-imperial-bordeaux', '#782f3b'),
    gold: material('seal-aged-gold', '#a88a60'),
    brass: material('seal-bright-seal', '#d8b581'),
    worm: material('seal-worm-furrow', '#6f5342')
  };
  const box = (name,x,y,z,w,h,d,tint,angle=0) => {
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.rotation.y=angle;o.material=tint;o.isPickable=false;return o;
  };
  const cyl = (name,x,y,z,d,h,tint,edges=8,top=d) => {
    const o=M.CreateCylinder(name,{diameterBottom:d,diameterTop:top,height:h,tessellation:edges},scene);
    o.position.set(x,y,z);o.material=tint;o.isPickable=false;return o;
  };
  const join = (name,a,b,y,width,tint) => {
    const dx=b[0]-a[0],dz=b[1]-a[1];
    return box(name,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,.13,Math.hypot(dx,dz),
      tint,Math.atan2(-dx,dz));
  };
  const nodes = [[-60,-18],[-44,-18],[-28,-18],[-28,-1],[-12,4],
    [4,4],[20,4],[20,20],[40,20],[60,20]];
  // One terrain for all 10 markers. The west-to-east shift from imperial slate
  // to dawn-lit sand is baked into vertex colors, not animated or postprocessed.
  const ground=M.CreateGround('130-139 broken seal continuous imperial command ground',
    {width:170,height:112,subdivisions:detail?26:16,updatable:true},scene);
  ground.position.set(0,-.42,8);
  const positions=ground.getVerticesData(B3.VertexBuffer.PositionKind),colors=[];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],z=positions[i+2]+8;
    positions[i+1]=.022*Math.sin(x*.17+z*.22)+.02*Math.cos(x*.37-z*.11);
    const t=clamp((x+39)/89,0,1);
    const base=[.27+.46*t,.33+.25*t,.35+.13*t];
    const dust=.06*Math.sin(x*.12-z*.25)+.03*Math.cos(z*.36);
    const scorch=clamp(1-Math.abs(x+28)/15,0,1)*.12;
    colors.push(clamp(base[0]+dust-scorch,0,1),
      clamp(base[1]+dust*.65-scorch,0,1),
      clamp(base[2]+dust*.45-scorch,0,1),1);
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind,positions);
  const normals=[];B3.VertexData.ComputeNormals(positions,ground.getIndices(),normals);
  ground.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  ground.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  ground.useVertexColors=true;ground.material=mat.ground;ground.isPickable=false;

  // Exactly nine broad, contiguous world-space walkways beneath the shared thin routes.
  for(let i=1;i<nodes.length;i++){
    join('seal connected defense route segment '+i,nodes[i-1],nodes[i],
      -.12,i<3?4.4:4.1,i<3?mat.slate:i<7?mat.stone:mat.sand);
  }
  // Only a distant, damaged horizon silhouette of the Shield Wall. The wall is
  // NEVER the playable subject here (unlike Light VII «Шрам Защитной стены»).
  box('seal distant wall left massif',-55,5.1,41,24,10.2,6,mat.slate);
  box('seal distant wall broken flank',-27,3.1,43,18,6.2,6,mat.stone,.11);
  box('seal distant wall far splinter',-11,2.5,45,7,5,5,mat.ash,-.23);
  box('seal distant ash horizon',9,.75,48,30,1.5,6,mat.ash);

  // 130: total imperial certainty — military orders, triad of standards.
  box('130 Shaddam immutable strategic table',-60,2.35,-6,10,1.0,5,mat.slate);
  box('130 gold engraved order plane',-60,2.9,-6,9,.15,4.1,mat.gold);
  box('130 table iron foot',-60,1.1,-6,3,2.1,2.2,mat.black);
  cyl('130 command order seal',-60,3.03,-6,2,.18,mat.brass,10);
  for(let i=0;i<2;i++){
    const x=-66+i*12;
    box('130 perfect military standard pole '+i,x,4.9,-3,.38,9.8,.38,mat.steel);
    box('130 imperial fixed crimson standard '+i,x+1.8,7.1,-3,3.3,4.7,.2,mat.red);
  }

  // 131: the storm blinds the command line. Static leaning sensor and sand.
  box('131 wind observation footing',-44,.43,-7,7,.85,6,mat.slate);
  const sensor=box('131 blind storm observation mast',-44,5.1,-7,.65,9.4,.68,mat.steel);
  sensor.rotation.z=.31;
  box('131 jammed signal blade',-43.3,8.2,-7,6,.37,.5,mat.brass,.19);
  box('131 storm buried signal desk',-40.5,.6,-6,5,1.2,2.4,mat.ash,.32);

  // 132: atomic strike consequences, not a simulated explosion.
  box('132 dead radio transmitter plinth',-28,.7,-6,8,1.4,6,mat.ash);
  const mast=box('132 broken transmitter tower',-28,5.1,-5,.9,10.2,1,mat.black);
  mast.rotation.z=.38;
  box('132 burnt communication arm',-24.5,3.2,-5,7,.38,.5,mat.steel,.4);
  box('132 melted sand fault',-28,.11,0,13,.2,2,mat.pale,-.2);
  if(detail)box('132 collapsed warning signal',-34,.55,1,8,.25,.6,mat.red,.39);

  // 133: three worm scars rip through tent anchors; no circular jaws.
  for(let i=0;i<3;i++){
    const x=-36+i*6.5;
    join('133 worm in camp deep sand furrow '+i,[x,-1],[x+5,13],.02,
      2.1,mat.worm);
    join('133 worm in camp raised sand lip '+i,[x-2,1],[x+3,15],.27,
      .7,mat.sand);
  }

  // 134: last Sardaukar stand in front of a compact, damaged court pavilion.
  box('134 last guard left shield line',-17,1.4,13,2.4,2.8,8,mat.steel,.18);
  box('134 last guard right shield line',-7,1.4,13,2.4,2.8,8,mat.steel,-.18);
  box('134 shattered padishah pavilion body',-12,2.7,21,13,5.4,6,mat.red);
  const canopy=box('134 collapsing pavilion pale canopy',-12,6.1,21,15,.8,7,mat.pale);
  canopy.rotation.z=.12;
  box('134 court crest above last guard',-12,5.2,17.5,4,1.2,.25,mat.gold);
  const guard=cyl('seal hidden Sardaukar body source',0,1.25,0,.85,2.0,mat.slate,6,.7);
  const helm=cyl('seal hidden Sardaukar helmet source',0,2.67,0,.8,.65,mat.steel,6,.6);
  guard.setEnabled(false);helm.setEnabled(false);
  for(let i=0;i<(detail?4:2);i++){
    const x=-16+i*(detail?2.7:8);
    const body=guard.createInstance('134 final Sardaukar still standing '+i);
    body.position.set(x,1.28,9);body.isPickable=false;
    const head=helm.createInstance('134 last guard helmet '+i);
    head.position.set(x,2.69,9);head.isPickable=false;
  }

  // 135: Harkonnen survival — a grounded evacuation sled, not a throne.
  box('135 Baron evacuation sled broken hull',4,1.4,15,12,2.8,5,mat.black,.16);
  box('135 Baron sled red keel',4,2.65,14.7,7,.45,5,mat.red,.16);
  box('135 Baron escape ramp',10,.44,13,6,.5,2.7,mat.steel,.29);
  for(let i=0;i<(detail?3:1);i++)
    box('135 discarded evacuation cargo '+i,-1+i*3.5,.85,19,2,1.7,2.3,mat.stone,.18*i);
  box('135 torn Harkonnen evacuation crest',5,4.3,19,4.5,2.3,.3,mat.red,-.25);

  // 136: a choice between two political shadows, not a second playable fork.
  box('136 Fenring judgment left stone',15.1,4.5,15,2,9,2,mat.dark);
  box('136 Fenring judgment right stone',24.9,4.5,15,2,9,2,mat.stone);
  box('136 Fenring shadow between factions',20,.20,16,7,.18,4,mat.ash);
  const knife=box('136 Fenring unclaimed dagger',21,.66,13,4.5,.18,.35,mat.steel,.36);
  knife.rotation.z=.06;

  // 137: sharp diamond silhouette, never a repeat of Feyd's circular arena.
  const duel=cyl('137 heir diamond duel ground',20,.32,30,12,.45,mat.pale,4);
  duel.rotation.y=Math.PI/4;
  const b1=box('137 duel steel diagonal one',18,1.2,30,.45,2.3,11,mat.steel,.65);
  b1.rotation.z=.25;
  const b2=box('137 duel steel diagonal two',22,1.2,30,.45,2.3,11,mat.dark,-.65);
  b2.rotation.z=-.25;
  box('137 duel Harkonnen oath standard',20,4.3,36,4,7,.3,mat.red,.2);

  // 138: the final parade is an emptied formation, not C4.14's triumphant ranks.
  box('138 last parade empty assembly lane',40,.2,32,14,.4,8,mat.sand);
  for(let i=0;i<2;i++){
    const x=33+i*14;
    box('138 last crimson standard pole '+i,x,4.8,31,.45,9.3,.45,mat.black);
    const flag=box('138 last imperial falling standard '+i,x+1.7,6.3,31,3.4,4,.2,mat.red);
    flag.rotation.z=i===0?-.3:.23;
  }
  if(detail)box('138 last parade empty shield rack',40,1.1,39,10,2.2,1.3,mat.steel);

  // 139: political and military authority broken in two, NO literal throne.
  box('139 toppled command cart',61,1.05,29,12,2.1,6,mat.dark,.23);
  const upper=box('139 fractured imperial decree tabletop',60,2.25,29,11,.45,7,mat.slate,.18);
  upper.rotation.z=.19;
  cyl('139 broken imperial seal left half',56.7,.9,25.3,5.6,.65,mat.gold,7);
  cyl('139 broken imperial seal right half',62.5,.75,25.8,5.6,.65,mat.brass,7);
  box('139 open fracture between seal halves',59.6,.52,25.4,1.4,.24,6.2,mat.black,.38);
  box('139 fallen imperial staff',64,.43,35,10,.45,.65,mat.steel,.56);
  box('139 final crimson banner pole in dust',66.3,.54,33.5,7.4,.45,.4,mat.black,.32);
  const flag=box('139 last torn imperial proclamation',67,.8,36,5.5,.15,2.6,mat.red,.38);
  flag.rotation.z=-.14;
  if(detail)box('139 abandoned military command map',60,2.65,29,8,.12,4,mat.pale,.18);
}
