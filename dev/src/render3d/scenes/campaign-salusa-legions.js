// C4.19 D:5 «Легионы Салусы» — «Марш, стёртый ветром».
// Original world nodes 120–129. A single connected, static Arrakis battle atlas.
// All geometry/materials are scene-owned; no Engine, timers, particles, RTT or rAF.
export function buildSalusaWindMarch(B3, scene, material, detail = true) {
  const M=B3.MeshBuilder;
  const mat={
    ground:material('salusa-vertex-sand','#ffffff'),
    salt:material('salusa-matte-salt','#a79c84'),
    sand:material('salusa-storm-sand','#ad855e'),
    sandDeep:material('salusa-deep-dune','#8a6046'),
    track:material('salusa-soft-wind-erased-track','#95866c'),
    basalt:material('salusa-black-landing-metal','#30383e'),
    rock:material('salusa-canyon-brown','#6d5a4d'),
    shadow:material('salusa-cave-shadow','#242a2d'),
    flag:material('salusa-broken-crimson','#a9473d'),
    iron:material('salusa-dull-steel','#777f7c'),
    water:material('salusa-secret-water','#577c84'),
    light:material('salusa-pale-sunlight','#e4c99b'),
  };
  const box=(name,x,y,z,w,h,d,tint,angle=0)=>{
    const m=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    m.position.set(x,y,z);m.rotation.y=angle;m.material=tint;m.isPickable=false;return m;
  };
  const cyl=(name,x,y,z,diam,height,tint,edges=10)=>{
    const m=M.CreateCylinder(name,{diameter:diam,height,tessellation:edges},scene);
    m.position.set(x,y,z);m.material=tint;m.isPickable=false;return m;
  };
  const spire=(name,x,y,z,diam,height,tint,lean=0)=>{
    const m=M.CreateCylinder(name,{
      diameterBottom:diam,diameterTop:diam*.12,height,tessellation:5
    },scene);
    m.position.set(x,y,z);m.rotation.z=lean;m.rotation.y=.16;
    m.material=tint;m.isPickable=false;return m;
  };
  const join=(name,a,b,y,width,tint)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1];
    return box(name,(a[0]+b[0])/2,y,(a[1]+b[1])/2,
      width,.16,Math.hypot(dx,dz),tint,Math.atan2(-dx,dz));
  };
  const points=[
    [-60,-20],[-47,-17],[-34,-14],[-21,-11],[-8,-6],
    [5,0],[18,6],[31,10],[44,14],[58,18],
  ];
  // One connected land surface, color-baked from salt to dunes. There are
  // no isolated islands, mission screens or camera-dependent missing paths.
  const land=M.CreateGround('salusa one connected wind eroded ground',
    {width:222,height:148,subdivisions:detail?32:20,updatable:true},scene);
  const positions=land.getVerticesData(B3.VertexBuffer.PositionKind),colors=[];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],z=positions[i+2],t=clamp((x+58)/124,0,1);
    const pathZ=-20+(x+60)*.303;
    const away=clamp((Math.abs(z-pathZ)-5)/22,0,1);
    const dune=(Math.sin(x*.088+z*.15)+1)*.9+
      (Math.cos(x*.06-z*.12)+1)*.68;
    const ripples=.08*Math.sin(x*.29+z*.33);
    positions[i+1]=-.48+away*dune*(.65+t*.7)+ripples;
    const v=.029*Math.sin(x*.12+z*.19);
    // Regional color shifts without extra lighting passes: salt -> storm ->
    // warm open desert. Color, not a screen transition, links the three acts.
    colors.push(.50+.20*t+v,.48+.10*t+v,.43-.10*t+v,1);
  }
  land.updateVerticesData(B3.VertexBuffer.PositionKind,positions);
  const normals=[];B3.VertexData.ComputeNormals(positions,land.getIndices(),normals);
  land.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  land.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  land.useVertexColors=true;land.material=mat.ground;land.isPickable=false;
  // Nine wide, physically joined stretches lie on the same land surface.
  // The thin native CampaignMapScene path is an additional route cue.
  for(let i=1;i<points.length;i++){
    join('salusa contiguous march segment '+i,points[i-1],points[i],-.34,
      i<3?4.1:2.8,mat.track);
  }
  // Wind has a diagonal grammar, quite unlike the imperial palace mirror and
  // the industrial valley. All sheets remain static and behind interactive pins.
  for(let i=0;i<(detail?8:5);i++){
    const x=-49+i*15,z=-3+i*4.2;
    const crest=box('salusa crosswind raised seam '+i,x,.45,z,1.3,.8,15,
      i<3?mat.salt:mat.sandDeep,-.44);
    crest.rotation.z=i%2?.07:-.11;
  }

  // 120: three black triangular transport wedges, aligned into a landfall
  // rather than an imperial port, plus three distinct drop ramps.
  for(let i=0;i<3;i++){
    const x=-66+i*5.6,z=-10+(i%2)*3.1;
    const hull=M.CreateCylinder('120 black triangular drop wedge '+i,
      {diameterTop:1.6,diameterBottom:5.6,height:1.7,tessellation:3},scene);
    hull.position.set(x,1.05,z);hull.rotation.y=.52;hull.material=mat.basalt;hull.isPickable=false;
    box('120 opened landing ramp '+i,x,.28,z-4,2.2,.35,6.6,mat.iron,.18);
  }
  box('120 rigid landing command mast',-59,4.3,-8,.7,8,.65,mat.basalt);
  box('120 first unbroken red standard',-58,6.4,-8.3,2.8,2.7,.16,mat.flag);

  // 121: ranks of shield bars retain an inhumanly regular spacing.
  for(let i=0;i<6;i++){
    box('121 unbroken sardaukar shield rank '+i,-51+i*1.7,.88,-4.5,
      .85,1.7,5.4,mat.basalt,-.10);
  }
  box('121 formation alignment pole',-47,3.6,0,.5,7.1,.5,mat.iron);
  box('121 first sand cut across formation',-46,.61,3.2,13,.65,1.5,mat.sand,.28);

  // 122: first Fremen victory; a V-shaped military line has a missing wing.
  join('122 broken military V left',[-40,-5],[-35,3],.35,.8,mat.basalt);
  join('122 broken military V right',[-35,3],[-29,-2],.35,.8,mat.basalt);
  box('122 first blood fallen red standard',-35,.56,1,9,.29,.6,mat.flag,.43);
  box('122 abandoned helmet',-31,.85,-3,1.4,1.1,1.4,mat.iron);
  if(detail)box('122 scattered shield',-39,.4,-2,3,.25,1.3,mat.basalt,.42);

  // 123: the silence of a captive, not a torture animation.
  for(const x of [-24,-18])box('123 captive holding frame post '+x,x,3.3,0,.65,6.5,.75,mat.basalt);
  box('123 captive holding frame lintel',-21,6.7,0,6.7,.7,.8,mat.iron);
  box('123 silent Fremen cloak',-21,2.3,-.15,1.8,3.7,.75,mat.shadow);
  cyl('123 prisoner human head',-21,4.5,-.15,1.25,1.3,mat.sand,8);
  for(const x of [-25.5,-16.5])box('123 watching sentry '+x,x,2.35,-2.5,1,4.2,.9,mat.basalt);

  // 124: immense sloping, frozen Coriolis sand walls sever the ranks.
  for(let i=0;i<5;i++){
    const x=-16+i*3.5,h=3.6+i*.7;
    spire('124 coriolis slanted dune blade '+i,x,h/2,8+i*1.5,
      4.8,h,mat.sandDeep,-.23+i*.035);
  }
  if(detail){
    const shear=box('124 coriolis diagonal sand wall',-6,2.1,13,
      1.3,4.2,20,mat.sand,-.42);
    shear.rotation.z=-.31;
  }
  if(detail)box('124 torn storm military marker',-9,2.6,1,.6,5.1,.65,mat.flag,-.13);

  // 125: a narrow tooth-walled passage, sculpted as one part of the
  // surrounding terrain. Gaps keep the local pin rays unobstructed.
  for(let i=0;i<4;i++){
    const x=.5+i*3.1,z=14+(i%2)*1.8,h=6.3+i*1.0;
    spire('125 death gorge upper fang '+i,x,h/2,z,
      4.8,h,mat.rock,i%2?.16:-.14);
  }
  for(let i=0;i<3;i++){
    const x=2+i*4.2,h=4.2+i*.9;
    spire('125 death gorge lower fang '+i,x,h/2,-6.5,
      4.6,h,mat.shadow,.20);
  }
  box('125 gorge broken lintel',7,4.5,17,7.3,1.05,2.0,mat.rock,-.18);

  // 126: visible cave cut, a single cold water glint and solid roof.
  box('126 secret sietch cave black mouth',18,3.0,18,10,6.0,.5,mat.shadow);
  for(const x of [12.2,23.8])
    box('126 secret sietch carved jamb '+x,x,3.2,18.2,2.4,6.3,3.3,mat.rock);
  box('126 secret sietch roof',18,7.0,18.2,14,1.7,4,mat.rock);
  box('126 hidden water blue slit',18,.9,17.8,5.2,.48,.48,mat.water);
  if(detail)box('126 sietch hidden water lip',18,.45,15,8,.28,2,mat.salt);

  // 127: two huge parallel worm scars; no animated worm or reused round maw.
  for(let i=0;i<2;i++){
    join('127 sandworm horizon deep furrow '+i,[24+i*3.8,17],[38+i*2.5,25],
      .37,2.7,mat.shadow);
    join('127 sandworm horizon raised lip '+i,[22+i*3.8,19],[36+i*2.5,27],
      .63,1.6,mat.sandDeep);
  }
  for(let i=0;i<2;i++){
    const ridge=M.CreateSphere('127 distant worm emerging back '+i,
      {diameter:6,segments:detail?5:4},scene);
    ridge.position.set(30+i*7,1.25,29+i*3);
    ridge.scaling.set(1.15,.69,1.8);
    ridge.material=i?mat.rock:mat.sandDeep;ridge.isPickable=false;
    if(detail)for(let k=0;k<2;k++)
      box('127 worm armor rib '+i+' '+k,29+i*7+k*2,3.1,27+i*3,
        .75,1.3,6,mat.rock,-.2);
  }

  // 128: first retreat in centuries, figures FACE THE PREVIOUS NODE.
  for(let i=0;i<4;i++){
    const x=41+i*2.5;
    box('128 retreating sardaukar silhouette '+i,x,2.1,22+(i%2)*2,
      1,3.8,1.1,mat.basalt,.42);
  }
  box('128 fallen retreat pole',42,.55,29,10,.4,.6,mat.iron,.35);
  box('128 torn retreat flag',41.5,.92,29,4.2,.15,1.4,mat.flag,.35);
  if(detail)box('128 lost spear of the legion',47,.45,18,7,.28,.38,mat.iron,.57);

  // 129: the prophet remains HUMAN scale. Negative space is the monument.
  // This final dune is not a throne, castle or supernatural glowing statue.
  for(let i=0;i<3;i++){
    const crest=M.CreateSphere('129 empty muad dib dune horizon '+i,
      {diameter:7,segments:detail?5:4},scene);
    crest.position.set(54+i*4,1.3+i*.42,31+i*2.5);
    crest.scaling.set(2.15-i*.2,.51,1.1);
    crest.material=mat.sand;crest.isPickable=false;
  }
  const cloak=box('129 lone human muad dib cloak',59,5.4,33.5,1.75,4.0,.85,mat.shadow,.10);
  cloak.rotation.z=-.06;
  cyl('129 lone human muad dib head',59,8.1,33.5,1.15,1.2,mat.shadow,8);
  box('129 lone human silhouette ground shadow',59,3.27,31.5,3.1,.16,2.8,mat.sandDeep,.1);
}
