// Campaign 2.0 C4.17 — D:3 "Правление Зверя" / "Железная квота".
// Original global missions 100–109. One continuous static Harkonnen extraction valley.
// Geometry is owned by CampaignMapScene: no Engine, rAF, timers, particles, RTT or shadows.
export function buildIronQuota(B3, scene, material, detail=true) {
  const M=B3.MeshBuilder;
  const mat={
    sand:material('quota-bleached-sand','#cba36c'),
    ochre:material('quota-spice-ochre','#a77c48'),
    rock:material('quota-strata','#887058'),
    cliff:material('quota-stone-face','#b7a089'),
    iron:material('quota-harkonnen-iron','#464a49'),
    dark:material('quota-machine-shadow','#303637'),
    rust:material('quota-oxidised-steel','#75534a'),
    hark:material('quota-harkonnen-red','#713a32'),
    pale:material('quota-drained-bone','#d0b99a'),
    fremen:material('quota-fremen-cloth','#52605b'),
    ash:material('quota-burned-stone','#3c3834'),
    spice:material('quota-dense-spice','#c38d48'),
    glass:material('quota-cistern-glass','#6b817d')
  };
  // All drama is conveyed by silhouette and painted surfaces, not live lights.
  mat.spice.emissiveColor=B3.Color3.FromHexString('#2c1709');
  const box=(name,x,y,z,w,h,d,tint,angle=0)=>{
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.rotation.y=angle;o.material=tint;o.isPickable=false;return o;
  };
  const cyl=(name,x,y,z,diam,h,tint,edges=8)=>{
    const o=M.CreateCylinder(name,{diameter:diam,height:h,tessellation:edges},scene);
    o.position.set(x,y,z);o.material=tint;o.isPickable=false;return o;
  };
  const link=(name,a,b,y,width,tint)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1];
    return box(name,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,.09,Math.hypot(dx,dz),
      tint,Math.atan2(-dx,dz));
  };
  const points=[[-61,-22],[-48,-12],[-34,2],[-19,17],[-4,26],
    [9,13],[22,-4],[36,-20],[49,-9],[63,8]];
  const terrain=M.CreateGround('100-109 one continuous occupied Arrakis extraction valley',
    {width:158,height:88,subdivisions:detail?12:6},scene);
  terrain.position.set(0,-.38,3);terrain.material=mat.sand;terrain.isPickable=false;
  // Broad plateau bands join every station in the same physical world.
  box('quota western industrial ballast',-45,-.22,7,58,.33,24,mat.ochre,-.10);
  box('quota central weathered stone ridge',3,-.16,39,72,.45,7,mat.rock,.06);
  box('quota eastern dry salt pan',53,-.22,-18,37,.35,16,mat.pale,.12);
  for(let i=1;i<points.length;i++) {
    link('quota continuous freight road '+i,points[i-1],points[i],-.11,3.6,mat.ochre);
  }
  // 100: Rabban's punishment podium — stern, vertical occupation icon.
  box('100 Beast governor military dais',-61,.8,-10,16,1.6,10,mat.iron);
  box('100 governor blockhouse',-61,3.7,-9,8,5.4,6,mat.rock);
  box('100 governor central lookout',-61,8,-9,4.5,4.8,4.2,mat.dark);
  box('100 governor iron canopy',-61,10.6,-9,10,.65,7,mat.iron);
  for(const x of [-68,-54]){
    box('100 governor pylons '+x,x,4.3,-8,1.3,8.6,2,mat.iron);
    box('100 hanging Harkonnen standard '+x,x,6.5,-9.15,2.2,3.5,.13,mat.hark);
  }
  box('100 prison queue railing',-61,.85,-16,12,1.4,.34,mat.rust);
  // 101: water taxation, deliberately closed and visibly inaccessible.
  cyl('101 requisition cistern main tank',-48,2.7,0,8,5.4,mat.iron,12);
  cyl('101 cistern sealed roof',-48,5.6,0,9,.45,mat.rust,12);
  cyl('101 cistern pressure cap',-48,6.25,0,2.8,.9,mat.dark,10);
  box('101 tax officer control platform',-41,1.3,0,6,2.6,6,mat.rock);
  box('101 locked water pipe',-45,.72,-6,13,1.3,1.5,mat.dark);
  box('101 tax register barrier',-48,.7,-7,10,1.4,.65,mat.hark);
  for(let k=0;k<(detail?4:2);k++)
    cyl('101 empty water vessel '+k,-51+k*1.8,.75,-5,1.1,1.5,mat.pale,7);
  // 102: the industrial centerpiece, much wider than any other structure.
  box('102 colossal spice harvester hull',-34,4.1,14,21,6.3,11,mat.iron);
  box('102 harvester spice hopper',-31,8.2,15,11,2.3,8.5,mat.ochre);
  box('102 harvester cabin',-42,8.3,13,5,3.6,6,mat.dark);
  box('102 harvester copper windscreen',-44.6,8.6,13,0.28,2,4,mat.glass);
  box('102 harvester collecting mouth',-34,1.6,7.2,16,2.3,3,mat.rust);
  for(const x of [-41,-27]){
    const track=box('102 enormous tracked drive '+x,x,1.8,14,4,3.2,13,mat.dark);
    track.rotation.y=.06;
    box('102 crawler armour '+x,x,2.6,14,4.3,1.1,12.6,mat.rust);
  }
  box('102 rear spice discharge boom',-22,6.4,18,10,1.2,2,mat.ochre,-.23);
  box('102 harvester loading gantry',-21,2.2,22,3,4.4,11,mat.iron);
  if(detail){
    for(let k=0;k<3;k++)box('102 harvester rib '+k,-40+k*5,7.5,14,.6,1.4,10,mat.rust);
    box('102 gantry overhead beam',-21,6.3,22,7,.7,2,mat.iron);
  }
  // 103: the first Fremen counterstroke breaks the regimented road.
  for(const x of [-25,-13]){
    box('103 dune ambush concealed stone '+x,x,2.1,29,8,4.2,5.6,mat.rock,.32);
  }
  box('103 wrecked patrol vehicle',-19,1.7,27,9,2.1,4.3,mat.rust,-.42);
  box('103 broken patrol mast',-17.2,3.35,29,.45,4.5,.45,mat.dark,.4);
  box('103 exposed vehicle engine',-23,1.4,26,2.6,1.7,3,mat.dark,-.42);
  if(detail)box('103 ambush detached wheel',-14.3,.7,24,1.5,1.3,1.5,mat.iron);
  // 104: environmental science, not a new water shrine.
  box('104 Kynes survey base',-4,.6,37,12,1.2,7,mat.rock);
  for(const [dx,dz] of [[-4,-2],[4,-2],[0,3]]){
    box('104 Kynes triangulation sensor leg '+dx+dz,-4+dx,3.3,37+dz,.55,5.6,.55,mat.iron);
  }
  box('104 triple sensor crossbar',-4,6.5,37,11,.6,.8,mat.rust);
  box('104 concealed research shelter',-11,1.6,39,5,3.2,5.4,mat.fremen);
  cyl('104 sample collector tower',2,2.3,39,2.1,4.5,mat.pale,8);
  // 105: punishment is shown by blackened, hollow architecture.
  box('105 razed sietch left lip',3,3.8,25,3,7.6,8,mat.ash,.19);
  box('105 razed sietch right lip',15,3.5,25,3.5,7,7.8,mat.ash,-.15);
  box('105 burnt sietch upper arch',9,7.2,25,15,2,6,mat.rock);
  box('105 abandoned sietch dark opening',9,3.2,29,9,5.4,.25,mat.dark);
  box('105 collapsed roof slab',17,1,18,8,1.4,4,mat.ash,.45);
  if(detail){
    for(let k=0;k<3;k++)
      box('105 burned timber '+k,3+k*3,1.2,19,.6,2.5,4.8,mat.rust,.2+k*.19);
  }
  // 106: caravan cargo survives; its tracks vanish into exposed sand.
  box('106 abandoned spice cargo skid',22,.9,8,10,1.8,5.5,mat.rust,.24);
  box('106 torn cargo container',22,2.8,8,6,2,4,mat.ochre,.24);
  box('106 scattered spice load',29,.42,10,6,.85,4,mat.spice,.2);
  link('106 vanished caravan rut left',[22,3],[31,10],.05,.35,mat.dark);
  link('106 vanished caravan rut right',[21,5],[30,12],.05,.35,mat.dark);
  box('106 caravan last signpost',31,2.2,13,.7,4.4,.7,mat.iron);
  // 107: subtle insurgent signs and a natural skyline, no huge worm.
  for(const [i,x,h] of [[0,31,7],[1,37,9],[2,43,6]]){
    box('107 desert resistance standing stone '+i,x,h/2,-8+(i%2)*2,2,h,3.2,mat.rock,.12*i);
  }
  box('107 Fremen cloth signal',37,8.0,-8,4.4,2,.15,mat.fremen,-.18);
  box('107 hidden ridge',36,1,-14,20,2,7,mat.ochre,.17);
  // 108: massive sealed gates, control of water by industrial coercion.
  box('108 water blockade left tower',43,4.0,4,3.5,8,6,mat.iron);
  box('108 water blockade right tower',55,4.0,4,3.5,8,6,mat.iron);
  box('108 water blockade locked gate',49,3.2,4,9,6.4,1,mat.dark);
  box('108 sealed water sluice beam',49,8.3,4,15,1.2,4,mat.rust);
  cyl('108 capped emergency well',49,.8,11,6,1.6,mat.rock,12);
  cyl('108 chained well cover',49,1.7,11,6,.3,mat.dark,12);
  box('108 dry water pipeline',39,1.2,8,14,1.7,1.8,mat.iron,.14);
  if(detail) for(let k=0;k<3;k++)
    box('108 water gate reinforcing spar '+k,46+k*3,3.5,3.3,.4,5.8,.7,mat.rust);
  // 109: Rabban versus Stilgar. Opposing masses, no predetermined victor.
  box('109 final iron defensive crescent',57,1.3,20,15,2.6,7,mat.iron,-.16);
  box('109 Rabban crimson command standard',54,6.8,23,3,6,.15,mat.hark);
  box('109 Rabban fortified beacon',54,4.6,20,2.4,9.2,2.3,mat.dark);
  box('109 Stilgar opposing rock shelf',70,1.0,26,13,2,10,mat.rock,.13);
  box('109 Stilgar high rock blade',73,4.2,29,3,6.5,4,mat.cliff,.12);
  box('109 final contested ground',63,-.07,13,18,.35,10,mat.ochre);
  // Static instanced soldiers: the geometry reads as rival forces at LOW.
  const body=cyl('quota soldier hidden body source',0,1.35,0,.85,1.8,mat.iron,6);
  const head=cyl('quota soldier hidden head source',0,2.5,0,.72,.65,mat.pale,6);
  body.setEnabled(false);head.setEnabled(false);
  const troops=detail?14:7;
  for(let i=0;i<troops;i++){
    const final=i>=troops-6,side=final&&i%2===1;
    const x=final?(side?68:55)+(i%3)*1.8:-66+(i%5)*2.4;
    const z=final?(side?19:15)+(i%3)*1.2:-17+(i%3)*1.65;
    const soldier=body.createInstance('quota stationary guard '+i);
    soldier.position.set(x,1.35,z);soldier.material=side?mat.fremen:mat.iron;
    soldier.isPickable=false;
    const helmet=head.createInstance('quota stationary helmet '+i);
    helmet.position.set(x,2.5,z);helmet.isPickable=false;
  }
}
