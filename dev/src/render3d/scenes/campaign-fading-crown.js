// Campaign 2.0 C4.16 — D:2 "Ночь длинных ножей" / "Гаснущая корона".
// Original global missions 90–99. One static, contiguous night-time Arrakeen.
// All Babylon resources belong to CampaignMapScene; no Engine, rAF, particles or RTT.
export function buildFadingCrown(B3,scene,material,detail=true) {
  const M=B3.MeshBuilder;
  const mat={
    night:material('knives-night-stone','#414653'),
    basalt:material('knives-bastion','#44464c'),
    wall:material('knives-sandstone','#8b7e6e'),
    light:material('knives-cut-stone','#c0ab91'),
    inner:material('knives-internal-shadow','#30363f'),
    pavement:material('knives-courtyard','#68645f'),
    bronze:material('knives-burnt-bronze','#806454'),
    iron:material('knives-harkonnen-iron','#424a52'),
    atred:material('knives-atreides-green','#48665c'),
    hark:material('knives-harkonnen-wine','#633941'),
    shield:material('knives-dead-shield','#65c5bd'),
    fire:material('knives-static-fire','#c97848'),
    ember:material('knives-ember','#e0a067'),
    sand:material('knives-dune','#876c50'),
  };
  // The lights are baked/emissive colour accents, never dynamic point lights.
  mat.shield.emissiveColor=B3.Color3.FromHexString('#174541');
  mat.fire.emissiveColor=B3.Color3.FromHexString('#6d2b13');
  mat.ember.emissiveColor=B3.Color3.FromHexString('#6a3216');
  const box=(name,x,y,z,w,h,d,tint,angle=0)=>{
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.rotation.y=angle;o.material=tint;o.isPickable=false;
    return o;
  };
  const cyl=(name,x,y,z,d,h,tint,sides=8)=>{
    const o=M.CreateCylinder(name,{diameter:d,height:h,tessellation:sides},scene);
    o.position.set(x,y,z);o.material=tint;o.isPickable=false;return o;
  };
  const line=(name,x1,z1,x2,z2,y,width,tint)=>{
    const dx=x2-x1,dz=z2-z1;
    return box(name,(x1+x2)/2,y,(z1+z2)/2,width,.085,Math.hypot(dx,dz),tint,Math.atan2(-dx,dz));
  };
  // Unified world ground, flat under every clickable mission; no detached arenas.
  const ground=M.CreateGround('90-99 unified night invasion courtyard',
    {width:156,height:84,subdivisions:detail?16:8,updatable:true},scene);
  ground.position.y=-.35;ground.material=mat.pavement;ground.isPickable=false;
  // A single continuous physical path complements the common mission route.
  const points=[[-60,-13],[-47,-5],[-34,5],[-20,15],[-5,22],[9,12],[23,1],[36,-8],[49,-17],[62,-5]];
  for(let i=1;i<points.length;i++){
    line('night-invasion-stone-road-'+i,...points[i-1],...points[i],.04,3.8,mat.night);
    // Paired stone edges show the path without an expensive new shader.
  }
  // Framing wall: intact city defences, not L:6's atomically breached Shield Wall.
  box('night city continuous rear wall',-18,2.1,37,111,4.2,1.4,mat.wall);
  for(const x of [-69,-48,-29,-10,11,31]){
    box('night rear battlement '+x,x,4.65,37,4.4,1,2.2,mat.basalt);
  }

  // ACT I, 90: murdered defensive power. The emitter banks are physically dark;
  // a few residual teal segments are static evidence of shields failing.
  box('90 shield generator plinth',-60,.55,-1,15,1.25,9,mat.basalt);
  for(let i=0;i<3;i++){
    const x=-65+i*5;
    box('90 silent generator frame '+i,x,3.15,-1,3.2,5,2.3,mat.iron);
    box('90 interrupted shield bus '+i,x,5.75,-1,2.5,.32,1.7,
      i===1?mat.inner:mat.shield);
  }
  box('90 severed conduit',-60,.4,-7,11,.48,.75,mat.bronze);
  // 91: breach through *opened* urban gates, not a destroyed mountain wall.
  for(const x of [-52,-42]){
    box('91 outer gate pylon '+x,x,4.9,5,3.5,9.8,5.8,mat.wall);
    box('91 guard slit '+x,x,6.1,1.98,1,2.7,.12,mat.inner);
  }
  box('91 gate lintel',-47,10.3,5,14,1.6,5.8,mat.light);
  box('91 open gate left leaf',-50,2.1,2.4,.8,4.3,4,mat.iron,-.55);
  box('91 open gate right leaf',-44,2.1,2.4,.8,4.3,4,mat.iron,.55);
  // 92: a U-shaped barracks with a broad unobstructed inner courtyard.
  for(const x of [-42,-26]){
    box('92 barracks wing '+x,x,3.0,17,4.8,6,11,mat.wall);
    box('92 barracks dark window '+x,x,4.5,11.44,2.5,1.4,.12,mat.inner);
  }
  box('92 barracks rear block',-34,4.1,22,19,8.2,3.2,mat.light);
  for(let i=0;i<(detail?5:2);i++){
    box('92 abandoned arms crate '+i,-39+i*2.3,.45,10+(i%2)*2,1.2,.9,1.3,mat.bronze,i*.19);
  }

  // ACT II, 93: Duncan's corridor is roofless on the camera-facing side.
  // Broken architrave and three pairs of columns preserve a clear mobile sightline.
  box('93 Duncan gallery rear wall',-20,3.0,28,26,6,.9,mat.wall);
  for(let i=0;i<4;i++){
    const x=-30+i*6.7;
    cyl('93 Duncan gallery standing column '+i,x,3.2,25,1.3,6.4,mat.light,7);
    box('93 Duncan gallery shadow foot '+i,x,.4,25,2.1,.6,2.1,mat.basalt);
  }
  box('93 Duncan shattered lintel',-18,6.45,26,10,.7,3,mat.bronze,-.14);
  box('93 narrow defence barricade',-20,.75,19,5,1.2,.9,mat.iron,.25);
  // 94: large, instantly recognisable ornithopter silhouette on a rooftop apron.
  box('94 hangar raised flight apron',-5,.28,34,27,.65,16,mat.basalt);
  box('94 hangar rear hangar frame',-5,6.2,42,23,12.4,1.3,mat.wall);
  for(const x of [-17,7]){
    box('94 hangar side column '+x,x,5.4,34,1.6,10.8,12,mat.wall);
  }
  box('94 ornithopter fuselage',-5,2.2,31,8,2.1,2.6,mat.iron);
  box('94 ornithopter cockpit',-9,2.7,31,3.4,1.5,2.7,mat.light);
  for(const s of [-1,1]){
    box('94 folded ornithopter wing '+s,-4,2.5,31+s*5,13,.28,2,mat.bronze,s*.22);
  }
  // 95: Hawat's captured archive, a slit-open enclosure.
  box('95 mentat archive back',9,3.9,22,17,7.8,1.2,mat.wall);
  for(const x of [2,16])box('95 mentat archive side '+x,x,2.8,19,1,5.6,8,mat.wall);
  box('95 tactical data desk',9,1.1,18,6,1.6,2.4,mat.bronze);
  for(let i=0;i<(detail?3:1);i++)
    box('95 extinguished intelligence console '+i,4+i*5,3.2,21.2,2.8,2.4,.18,
      i===1?mat.shield:mat.inner);

  // ACT III, 96: octagonal star hall, faceted without a blocking solid roof.
  cyl('96 star hall ceremonial dais',23,.48,12,19,.95,mat.wall,8);
  for(let i=0;i<8;i++){
    const a=(i+.5)*Math.PI/4,x=23+Math.cos(a)*9,z=12+Math.sin(a)*9;
    cyl('96 damaged star hall column '+i,x,3.7,z,1.2,7.4,mat.light,6);
    if(i%2===0)
      box('96 fractured skylight segment '+i,x,7.65,z,3,.55,2.1,mat.bronze,a);
  }
  cyl('96 burning star hall central sigil',23,1.0,12,5.6,.25,mat.fire,8);
  for(let i=0;i<(detail?7:3);i++){
    const x=17+(i*7%13),z=7+(i*3%11);
    box('96 frozen fire silhouette '+i,x,1.1+(i%3)*.4,z,
      1.15,1.5+(i%3),.65,i%2?mat.ember:mat.fire,(i*.35));
  }
  // 97: a descending stair visually marks custody, but the marker stays at y~1.
  box('97 captive duke upper landing',36,.28,3,15,.65,11,mat.basalt);
  for(let i=0;i<4;i++)
    box('97 stair down '+i,36,.2-i*.25,8+i*1.65,7,.45,1.7,mat.wall);
  box('97 detention lintel',36,5,13,12,1.5,2,mat.light);
  for(const x of [30.5,41.5])
    box('97 detention post '+x,x,2.7,13,1.1,5.4,2.4,mat.wall);
  box('97 guarded cell darkness',36,2.4,14.2,9,4.5,.2,mat.inner);
  // 98: side escape threshold leads outward to barren sand, not L:6's invasion.
  box('98 sand threshold',49,.32,-8,15,.65,10,mat.basalt);
  box('98 secret escape gate',49,3,-5.3,11,6,1.2,mat.wall);
  box('98 night postern opening',49,2.1,-5.97,5.8,4.1,.18,mat.inner);
  for(let i=0;i<(detail?6:3);i++){
    const x=42+i*3.4,z=-23-(i%2)*2;
    box('98 silent desert dune '+i,x,.4,z,7.2,.75,3.5,mat.sand,.11*i);
  }
  // 99: final protected inner bastion, not a new imperial throne.
  box('99 last-order courtyard',62,.22,5,18,.55,14,mat.pavement);
  for(const x of [54,70]){
    box('99 last-order inner bastion '+x,x,4.7,12,3,9.4,5,mat.wall);
    box('99 last-order crest '+x,x,9.8,12,3.6,.8,5.5,mat.light);
  }
  box('99 last-order architrave',62,9.1,12,15,1.4,5,mat.light);
  box('99 last-order barred gate',62,3.3,14.6,8,6.6,.35,mat.iron);
  box('99 torn green Atreides banner',65,6.3,14.95,2.2,3.5,.2,mat.atred,-.11);
  // Stationary silhouettes suggest Sardaukar advance without NPC animation.
  const troopBody=cyl('night siege soldier source body',0,1.2,0,.8,2.1,mat.iron,6);
  const troopHead=cyl('night siege soldier source helm',0,2.65,0,.8,.8,mat.light,6);
  troopBody.setEnabled(false);troopHead.setEnabled(false);
  for(let i=0;i<(detail?18:8);i++){
    const anchor=i<6?[-48,-1]:i<12?[19,5]:[57,2],j=i%6;
    const x=anchor[0]+j*1.5,z=anchor[1]+(j%2)*2.1;
    const b=troopBody.createInstance('night siege sardaukar '+i);
    b.position.set(x,1.2,z);b.isPickable=false;
    const h=troopHead.createInstance('night siege helm '+i);
    h.position.set(x,2.65,z);h.isPickable=false;
  }
  // Low-poly terrain lights are material-only and static even when hidden.
  if(detail){
    for(let i=0;i<8;i++){
      const [x,z]=points[(i+1)%points.length];
      box('night frozen alarm strip '+i,x+3,.4,z+5,2.2,.12,.3,i>3?mat.fire:mat.shield);
    }
  }
}
