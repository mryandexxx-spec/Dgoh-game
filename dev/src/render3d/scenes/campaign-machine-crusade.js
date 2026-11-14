// C4.8 «Крестовый поход машин» — «Конвой непокорённых».
// Three floating fragments of different worlds united by an interstellar convoy.
// Symbolic military chronicle, not a single planet or the C4.7 history scar.
// Pure static scene geometry: existing EngineHost/GameScene owns rendering and disposal.
// detail is supplied by the existing render3d/quality.js profile (HIGH/MED vs LOW).
export function buildMachineCrusade(B3, scene, material, detail = true) {
  const M = B3.MeshBuilder;
  const mats = {
    void: material('crusade-void', '#0c1624'),
    hull: material('crusade-hull', '#405662'),
    dark: material('crusade-dark', '#182631'),
    steel: material('crusade-steel', '#8199a0'),
    blue: material('crusade-blue', '#65a2b7'),
    mind: material('crusade-mind', '#aedfe7'),
    spice: material('crusade-spice', '#ce8c43'),
    dune: material('crusade-dune', '#93714b'),
    ivory: material('crusade-ivory', '#d5c19b'),
    rock: material('crusade-rock', '#5b6364'),
    red: material('crusade-threat', '#a4483e'),
    banner: material('crusade-banner', '#b68a58'),
    plague: material('crusade-plague', '#7a966f'),
  };
  const box = (name, x, y, z, w, h, d, mat) => {
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.material=mat;o.isPickable=false;return o;
  };
  const cyl = (name,x,y,z,d,h,mat,sides=10,top=d) => {
    const o=M.CreateCylinder(name,{diameterBottom:d,diameterTop:top,height:h,tessellation:sides},scene);
    o.position.set(x,y,z);o.material=mat;o.isPickable=false;return o;
  };
  const sphere = (name,x,y,z,d,mat,seg=10) => {
    const o=M.CreateSphere(name,{diameter:d,segments:seg},scene);
    o.position.set(x,y,z);o.material=mat;o.isPickable=false;return o;
  };
  const span = (name,x1,z1,x2,z2,y,width,mat,thickness=.3) => {
    const dx=x2-x1,dz=z2-z1;
    const o=box(name,(x1+x2)/2,y,(z1+z2)/2,width,thickness,Math.hypot(dx,dz),mat);
    o.rotation.y=Math.atan2(-dx,dz);return o;
  };
  // A cheap sculpted spacecraft silhouette. No animated ships or transparent effects.
  const ship = (name,x,y,z,length,mat,heading=0) => {
    const hull=cyl(name+' wedge',x,y,z,3.6,length,mat,3,.45);
    hull.rotation.z=Math.PI/2;hull.rotation.y=heading;
    box(name+' bridge',x,y+.92,z,2.2,.8,1.5,mats.steel);
    const port=box(name+' port wing',x-.6,y-.18,z-2.9,length*.42,.26,1.6,mat);
    const star=box(name+' starboard wing',x-.6,y-.18,z+2.9,length*.42,.26,1.6,mat);
    port.rotation.y=heading;star.rotation.y=heading;
  };
  const torch=(name,x,z,tint=mats.ivory)=>{
    cyl(name+' post',x,2.4,z,.36,4.5,mats.steel,6);
    cyl(name+' beacon',x,4.85,z,1.1,.35,tint,6);
  };
  // Three mutually distinctive floating volumes; spaces between are open void.
  // Act I: ochre planetoid, Act II: blue shield-carrier, Act III: warship wreck.
  cyl('act I broken ochre disc',-50,-1.5,8,47,2.3,mats.dune,9);
  cyl('act I dark cut stone',-50,-2.7,8,42,.7,mats.dark,9);
  box('act I narrow human landing ledge',-62,-.13,-3,18,.3,8,mats.ivory);
  box('act I Ginaz cliff shelf',-36,.1,13,17,.9,17,mats.rock);
  // MED/LOW review: the opening camera looks past x=-62. Complete the
  // machine-ship silhouette beyond the first node without inventing missions.
  box('180 outer broken machine hull',-82,-.95,6,36,.55,25,mats.dark);
  box('180 derelict battleship superstructure',-84,4.3,19,17,8,9,mats.hull);
  for(const x of [-94,-87,-80,-73]){
    const rib=box('180 giant ship dorsal frame',x,9.2,22,1.8,11.5,4,mats.steel);
    rib.rotation.z=(x+85)*.018;
    box('180 derelict ship signal',x,8.4,19.75,.3,5.2,.12,mats.blue);
  }

  box('act II narrow shield carrier',-2,-.9,9,52,1.3,26,mats.hull);
  box('act II upper steel flight deck',-2,-.12,7,49,.25,18,mats.steel);
  box('act II aft wing',-23,-.45,20,15,.35,13,mats.dark);
  box('act II forward wing',19,-.45,21,15,.35,13,mats.dark);
  box('act II underside keel',-2,-2.15,9,38,1.4,12,mats.dark);
  for(const x of [-25,25])span('shield carrier outer spar',x,-2,x,24,-.28,.8,mats.blue,.25);

  box('act III forward shattered war deck',47,-.92,9,43,1.3,24,mats.dark);
  box('act III armoured centre ridge',48,.05,17,38,.7,11,mats.hull);
  box('act III offset command deck',59,.15,21,17,.7,15,mats.steel);
  for(const x of [30,41,52,65])box('act III broken rail',x,1.7,27,4.2,3.3,.9,mats.hull);
  // This distant machine carrier fills the side beyond mission 189; it is
  // clearly fleet architecture, NOT the final Omnius throne or another level.
  box('189 extended fleet carrier deck',80,-.85,9,41,.55,27,mats.dark);
  box('189 distant carrier spinal hull',82,1.1,23,34,3.2,9,mats.hull);
  for(const x of [70,81,92]){
    box('189 distant capital ship fin',x,6.3,26,3,8.5,4.2,mats.hull);
    box('189 distant red warning slit',x,7,23.7,1.1,5,.22,mats.red);
  }

  // The route crosses actual gaps, but does not fill them with one continuous terrain.
  span('convoy bridge from Ginaz',-29,-1,-25,2,.04,.85,mats.ivory,.14);
  span('convoy bridge toward broken fleet',25,0,30,1,.04,.85,mats.blue,.14);
  // Three large planet silhouettes are scenery, well behind the interactive lane.
  sphere('Arrakis distant amber planet',-48,16,34,17,mats.spice,detail?14:8);
  sphere('Ginaz pale horizon',-32,18,39,11,mats.rock,8);
  sphere('red machine frontier',76,15,42,16,mats.red,detail?14:8);

  // 180 — Vorian: a split machine vessel faces a little warm human bridge.
  const wreck=box('180 machine ship broken spine',-66,6.5,17,11,12,12,mats.dark);
  wreck.rotation.z=-.23;
  for(const x of [-69,-65,-61]) {
    const rib=box('180 angular machine rib',x,12,15,1.2,12,3,mats.hull);
    rib.rotation.z=(x+65)*.07;
  }
  box('180 breach cold bulkhead',-61,3.9,10,6,7,.55,mats.blue);
  span('180 the choice bridge',-67,3,-56,7,.33,2.4,mats.steel,.55);
  for(const x of [-57,-54])torch('180 human landing flame',x,7,mats.ivory);
  box('180 human resistance tent',-55,1.1,12,6,2.1,4,mats.banner);

  // 181 — Spice: an open sunlit resource crater, NOT another fortress.
  cyl('181 gold spice basin',-49,.35,16,18,.42,mats.spice,13);
  cyl('181 inner spice seam',-49,.59,16,10,.15,mats.ivory,11);
  for(let k=0;k<6;k++){
    const a=k*Math.PI/3;
    const dune=cyl('181 dune crest',-49+8.6*Math.cos(a),1.05,16+7*Math.sin(a),4.5,1.8,mats.dune,5,1.2);
    dune.rotation.z=a*.12;
  }
  box('181 spice scout shelter',-54,1.4,7,4,2.5,3.5,mats.banner);

  // 182 — Ginaz: white fighting ring and tall swordlike training monoliths.
  cyl('182 Ginaz duelling circle',-36,.78,16,15,.8,mats.ivory,14);
  cyl('182 raised centre',-36,1.23,16,8,.18,mats.rock,12);
  for(const a of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
    const x=-36+8.5*Math.cos(a),z=16+8.5*Math.sin(a);
    cyl('182 stone sword monolith',x,5.1,z,1.7,8.7,mats.steel,5,.3);
  }
  span('182 blade practice bench',-40,11,-32,11,1.45,.6,mats.hull,.4);

  // 183 — Holtzman: unmistakable segmented arches, not costly translucent shield RT.
  box('183 Holtzman generator plinth',-22,1,17,17,1.7,14,mats.dark);
  for(let i=0;i<3;i++){
    const x=-27+i*5.1;
    for(const side of [-1,1]) {
      const leg=box('183 shield arc leg',x+side*1.6,5.6,17,.7,8.4,.8,mats.blue);
      leg.rotation.z=-side*.22;
    }
    box('183 blue shield arc crown',x,10.1,17,4.4,.65,.85,mats.blue);
    box('183 field projector',x,1.8,13,1.9,2.3,2.7,mats.steel);
  }

  // 184 — Navigators: a vertical orbital ring and HUMAN-piloted wedge ships.
  box('184 navigator observatory',-8,2.1,21,14,3.6,9,mats.hull);
  cyl('184 navigation table',-8,4.2,17,5.7,.45,mats.ivory,12);
  for(let k=0;k<12;k++){
    const a=k*Math.PI/6;
    const cx=-8+7.7*Math.cos(a), cy=10+7.7*Math.sin(a);
    const segment=box('184 orbital astrolabe segment',cx,cy,22,.65,2,.65,mats.blue);
    segment.rotation.z=-a;
  }
  ship('184 first human navigator ship',-12,7,28,7.5,mats.steel);
  if(detail)ship('184 second navigator ship',-2,5.8,29,5.5,mats.ivory);

  // 185 — Omnius plague: quarantined transport, no graphic suffering.
  box('185 infected transport hull',6,3.2,18,15,5.3,10,mats.hull);
  for(const x of [0,6,12]){
    box('185 quarantined closed hatch',x,3.3,12.8,3.1,4.7,.3,mats.dark);
    box('185 warning stripe',x,5.9,12.6,2.6,.5,.15,mats.plague);
  }
  for(const x of [1,11])torch('185 quarantine light',x,8,mats.plague);
  box('185 isolated module roof',6,6.2,18,16,.7,11,mats.red);

  // 186 — Arrakis at night: a warm human sanctuary under blue cliffs.
  box('186 desert night refuge',19,.9,16,15,1.6,17,mats.dune);
  for(const x of [13,19,25]){
    const shelter=cyl('186 canvas refuge',x,2.6,13,4.7,3.5,mats.ivory,4,.2);
    shelter.rotation.y=Math.PI/4;
    cyl('186 warm doorway',x,1.2,10.2,1.5,.65,mats.spice,5);
  }
  for(const x of [12,27]){
    cyl('186 rock cliff',x,5.3,23,5.2,9.5,mats.rock,5,1.2);
  }
  cyl('186 water reservoir',19,1.3,22,4,.85,mats.hull,10);
  torch('186 hope beacon',21,10,mats.ivory);

  // 187 — Betrayal: the broken pact is a broken bridge with opposing banners.
  box('187 left war council approach',29,.55,16,7,.7,11,mats.steel);
  box('187 right broken war approach',35,.55,16,7,.7,11,mats.dark);
  const split=box('187 severed steel span',32,1.05,15,1.8,1.3,13,mats.red);
  split.rotation.z=.16;
  for(const [x,c] of [[28,mats.banner],[36,mats.red]]){
    box('187 faction standard mast',x,5.8,22,.35,10,.3,mats.steel);
    box('187 opposing banner',x+1.1,8,22,2.3,3.2,.18,c);
  }

  // 188 — Void Frontier: human capital bow and an unmistakable fleet echelon.
  box('188 flagship long bow',45,2.4,17,16,3.7,18,mats.steel);
  const nose=cyl('188 forward flagship prow',45,3.2,7.2,9.5,8,mats.hull,3,.15);
  nose.rotation.x=Math.PI/2;
  box('188 human bridge',45,5.6,23,7,3.3,4,mats.ivory);
  for(let k=0;k<(detail?6:3);k++){
    const x=32+k*5,z=29+(k%2)*4;
    ship('188 allied escort '+k,x,6+(k%3),z,5.2,mats.steel,.08);
  }
  box('188 distant opposing machine line',48,10.2,38,22,1.5,1.2,mats.red);

  // 189 — Agamemnon: a towering CYMEK (human mind in a machine), not Omnius.
  box('189 command balcony',59,1.1,13,16,1.3,11,mats.hull);
  for(const x of [52,66]){
    box('189 damaged command beam',x,4.7,15,1.8,8.4,3,mats.dark);
    box('189 threat stripe',x,5.8,12.9,.35,6,.16,mats.red);
  }
  box('189 Agamemnon chest',59,12,22,8,5.5,5.5,mats.steel);
  box('189 Agamemnon armoured spine',59,7.8,22,4,5,3,mats.hull);
  // The cyan human brain capsule must read as a distinct rounded silhouette,
  // rather than another rectangular machine turret in the mobile framing.
  sphere('189 human brain capsule',59,16.7,17,5.4,mats.mind,12);
  for(const x of [55.6,62.4])
    box('189 cymek capsule guard',x,16.5,17.6,.9,5.5,1.6,mats.dark);
  box('189 human brain lens',59,15.9,14.4,3.8,.55,.35,mats.mind);
  box('189 helmet shell',59,18.35,21,5.5,1.2,4.3,mats.dark);
  for(let i=0;i<6;i++){
    const side=i<3?-1:1, row=i%3;
    const hipX=59+side*3.9, footX=59+side*(7.4+row*.6);
    const z=19+row*4.2;
    const upper=box('189 cymek upper leg',hipX+side*.8,7.8,z,1.55,7.5,1.7,mats.steel);
    upper.rotation.z=-side*.4;
    const lower=box('189 cymek lower leg',footX,3.3,z,1.65,6.3,1.7,mats.dark);
    lower.rotation.z=side*.14;
    cyl('189 foot',footX,.65,z,2.8,1.1,mats.hull,6);
  }
  for(const x of [54,64])box('189 cymek arm',x,11,19,1.9,7.5,2.1,mats.hull);
  // Vorian's deliberately small human position sets up the father-son confrontation.
  box('189 Vorian human stand',59,.35,4,5,.4,3.4,mats.ivory);
  torch('189 Vorian human lamp',55,5,mats.ivory);
  // Enemy fleet remains visible: defeat of Omnius belongs to C:5 «Battle of Corrin».
  for(let k=0;k<(detail?4:2);k++){
    box('189 threatening fleet silhouette',45+k*7,10.5+(k%2)*2.4,38,5.7,1.9,2.3,mats.dark);
    box('189 machine fleet signal',45+k*7,10.4+(k%2)*2.4,36.8,3.2,.26,.18,mats.red);
  }
  // Genuine 844/667 WebGL review: the tall cymek head was cut by the HUD.
  // Shorten Agamemnon only, preserving the boss marker and the existing camera.
  // Geometry is adjusted once during construction, never on the frame loop.
  for(const mesh of scene.meshes)if(
    /^(189 Agamemnon|189 human brain|189 helmet|189 cymek|189 foot)/.test(mesh.name)
  ){
    mesh.position.y *= .73;
    mesh.scaling.y *= .73;
  }
}
