// Campaign 2.0 · C4.11 «Бегство»: «Разлом Бури».
// Original Light-III missions 20–29 in a SINGLE night-time canyon-to-dunes landscape.
// All geometry is static/non-pickable: the shared GameScene/EngineHost owns render,
// camera gestures, quality, context recovery and disposal. No gameplay changes.
export function buildEscapeRift(B3, scene, material, detail = true) {
  const M=B3.MeshBuilder;
  const mat={
    terrain:material('escape-night-terrain','#ffffff'),
    stone:material('escape-cold-rock','#293e4b'),
    cliff:material('escape-cliff-shadow','#1b303e'),
    rim:material('escape-moonlit-rim','#63747a'),
    dust:material('escape-storm-dust','#8f7768'),
    drift:material('escape-wind-drift','#a58a71'),
    sand:material('escape-open-sand','#756a60'),
    gold:material('escape-safe-light','#d8ba88'),
    metal:material('escape-station-metal','#47545a'),
    cloth:material('escape-stillsuit-cloth','#29343d'),
    enemy:material('escape-sardaukar','#5e6266'),
    enemyEye:material('escape-sardaukar-light','#b66e4c'),
    vision:material('escape-prescient-light','#887f9d'),
    shadow:material('escape-night-shadow','#101c2a'),
  };
  mat.gold.emissiveColor=B3.Color3.FromHexString('#51402b');
  mat.vision.emissiveColor=B3.Color3.FromHexString('#343044');
  mat.enemyEye.emissiveColor=B3.Color3.FromHexString('#4c231e');
  const box=(name,x,y,z,w,h,d,tint,rot=0)=>{
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.rotation.y=rot;o.material=tint;o.isPickable=false;return o;
  };
  const cyl=(name,x,y,z,d,h,tint,sides=7,top=d)=>{
    const o=M.CreateCylinder(name,{diameterBottom:d,diameterTop:top,height:h,tessellation:sides},scene);
    o.position.set(x,y,z);o.material=tint;o.isPickable=false;return o;
  };
  const sphere=(name,x,y,z,d,tint)=>{
    const o=M.CreateSphere(name,{diameter:d,segments:detail?8:6},scene);
    o.position.set(x,y,z);o.material=tint;o.isPickable=false;return o;
  };
  const strip=(name,ax,az,bx,bz,y,width,tint)=>{
    const o=box(name,(ax+bx)/2,y,(az+bz)/2,width,.13,Math.hypot(bx-ax,bz-az),tint);
    o.rotation.y=Math.atan2(ax-bx,bz-az);return o;
  };
  // Faceted tapering geological outcrops, not flat-topped building boxes.
  // Shared single material, static mesh, no additional textures or GPU passes.
  const rock=(name,x,z,w,d,h,tint,angle=0)=>{
    const pts=[
      -w*.5,-.45,-d*.5, w*.5,-.45,-d*.5,
       w*.5,-.45, d*.5,-w*.5,-.45, d*.5,
      -w*.37,h*.70,-d*.25, w*.22,h*1.04,-d*.29,
       w*.37,h*.62, d*.24,-w*.19,h*.87, d*.34,
    ];
    const faces=[0,2,1,0,3,2,4,5,6,4,6,7];
    for(let j=0;j<4;j++){
      const n=(j+1)%4;
      faces.push(j,n,n+4,j,n+4,j+4);
    }
    const data=new B3.VertexData();
    data.positions=pts;data.indices=faces;data.normals=[];
    B3.VertexData.ComputeNormals(pts,faces,data.normals);
    const mesh=new B3.Mesh(name,scene);
    data.applyToMesh(mesh);
    mesh.convertToFlatShadedMesh();
    mesh.position.set(x,0,z);mesh.rotation.y=angle;
    mesh.material=tint;mesh.isPickable=false;
    return mesh;
  };
  const nodes=[[-56,-10],[-44,-1],[-33,-8],[-21,3],[-9,8],
    [3,2],[15,6],[27,-5],[40,0],[53,8]];
  // Terrain is one continuous rock-and-sand surface, not ten floating islands.
  // Keep the ground under all world-space mission markers almost level.
  const ground=M.CreateGround('Escape continuous night desert',{
    width:146,height:73,subdivisions:detail?44:28,updatable:true},scene);
  const verts=ground.getVerticesData(B3.VertexBuffer.PositionKind);
  const indices=ground.getIndices(),colors=[];
  const clamp01=n=>Math.max(0,Math.min(1,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const palettes=[[.115,.19,.23],[.22,.28,.30],[.40,.35,.32],[.54,.43,.34]];
  for(let i=0;i<verts.length;i+=3){
    const x=verts[i],z=verts[i+2];
    const nearest=Math.min(...nodes.map(([nx,nz])=>Math.hypot(x-nx,z-nz)));
    const rough=.27*Math.sin(x*.24+z*.19)+.22*Math.sin(x*.15-z*.29);
    const open=clamp01((x-11)/35);
    verts[i+1]=-.34+rough*clamp01((nearest-3.4)/5.5)
      +open*.34*Math.sin(x*.14+z*.31);
    const p=clamp01((x+65)/130)*3,k=Math.min(2,Math.floor(p)),f=p-k;
    for(let c=0;c<3;c++)colors.push(clamp01(lerp(palettes[k][c],palettes[k+1][c],f)
      +.025*Math.sin(x*.41+z*.37)));
    colors.push(1);
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind,verts);
  const normals=[];B3.VertexData.ComputeNormals(verts,indices,normals);
  ground.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  ground.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  ground.useVertexColors=true;ground.material=mat.terrain;ground.isPickable=false;
  // Jagged north wall breaks into gaps; beyond Kynes' diversion it opens to
  // free dunes, a crucial contrast with the tight canyon and C4.10 salt basin.
  for(let i=0;i<8;i++){
    const x=-63+i*11.2,z=20+3.1*Math.sin(i*.92),h=6.4+(i%4)*1.7;
    rock('north canyon fractured escarpment '+i,x,z,10.5,8.4,h,
      i%3?mat.stone:mat.cliff,(i%3-1)*.13);
    if(detail&&i%2===0)rock('moon rim on broken cliff '+i,x+3,z+1,
      2.1,2.6,h*.72,mat.rim,.16);
  }
  for(let i=0;i<6;i++){
    const x=-60+i*12.2,z=-24+1.5*Math.sin(i),h=3.7+(i%3)*1.2;
    rock('low south canyon teeth '+i,x,z,10.4,6.2,h,mat.cliff,(i%3-1)*.11);
  }
  // A low wind-shaped dune, used on the exposed third act and the worm trace.
  const ridge=(name,x,z,width,length,height,tint,angle=0)=>{
    const rows=detail?10:6,cols=detail?7:4,positions=[],faces=[];
    for(let j=0;j<=rows;j++){
      const t=j/rows,fade=Math.sin(Math.PI*t);
      for(let i=0;i<=cols;i++){
        const u=2*i/cols-1;
        positions.push(u*width*.5*fade,-.28+height*fade*fade*(1-u*u),
          (t-.5)*length);
      }
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const a=j*(cols+1)+i,b=a+cols+1;
      faces.push(a,b,a+1,a+1,b,b+1);
    }
    const data=new B3.VertexData();
    data.positions=positions;data.indices=faces;data.normals=[];
    B3.VertexData.ComputeNormals(positions,faces,data.normals);
    const mesh=new B3.Mesh(name,scene);data.applyToMesh(mesh);
    mesh.position.set(x,0,z);mesh.rotation.y=angle;
    mesh.material=tint;mesh.isPickable=false;return mesh;
  };
  for(let i=0;i<7;i++){
    const x=19+i*7.4,z=15+5*Math.sin(i*.73);
    ridge('open desert wind crest '+i,x,z,7+i%2*2,17,1.7+i%3*.3,
      i%3?mat.sand:mat.drift,-.23+i*.05);
  }

  // 20 — Ornithopter by moonlight. Model stays behind, not on, its marker.
  const body=cyl('20 departing ornithopter fuselage',-55,7.8,1,1.1,6.3,mat.metal,6,.54);
  body.rotation.x=Math.PI/2;
  box('20 left ornithopter wing',-59.4,8.1,1,9.1,.16,1.1,mat.rim,-.18).rotation.z=.16;
  box('20 right ornithopter wing',-50.6,8.1,1,9.1,.16,1.1,mat.rim,.18).rotation.z=-.16;
  box('20 retreating shadow',-55,.15,2,12,.11,2.2,mat.cliff);

  // 21 — Storm breaking against the Shield Wall; the lost pursuit fades away.
  for(let i=0;i<4;i++){
    const x=-51+i*4.3,h=5+i%2*2;
    box('21 storm spilling over wall '+i,x,8,16,1.5,4.8,8+i*2,
      i%2?mat.dust:mat.drift,-.31);
    if(detail)strip('21 windblown storm plume '+i,x-3,8,x+4,9,3+i*.43,
      .38,mat.dust);
  }
  for(let i=0;i<3;i++)box('21 fading distant pursuer '+i,-51+i*4,.7,9,
    1.15,1.2,1.4,mat.enemy);
  
  // 22 — Kynes' covert ecological station, buried into a defensive berm.
  ridge('22 buried station windbreak',-33,-17,15,13,2.1,mat.stone,.19);
  cyl('22 ecologist station dome',-33,1.35,-16.5,8.1,2.3,mat.metal,10,5.9);
  box('22 station sealed entrance',-33,.96,-12.55,2.5,1.9,.6,mat.shadow);
  box('22 station slit of light',-33,1.45,-12.18,1.25,.2,.12,mat.gold);
  for(let i=0;i<3;i++){
    cyl('22 water condenser '+i,-38.1+i*5.1,1.2,-18.3,.7,2.2,mat.rim,6,.55);
    box('22 condenser cap '+i,-38.1+i*5.1,2.35,-18.3,1.6,.35,1.3,mat.metal);
  }

  // 23 — Tight canyon ambush with asymmetric true-rock silhouettes.
  rock('23 upper canyon overhang',-22,14,12.1,8.5,12,mat.cliff,.13);
  rock('23 fractured pinnacle',-16,14,6.5,6.3,15,mat.stone,-.22);
  rock('23 south canyon jaw',-20,-14,10.2,6.1,6.1,mat.stone,-.24);
  for(let i=0;i<3;i++)box('23 hidden sentry silhouette '+i,-24+i*3.5,1.1,11,
    .65,2.0,.5,mat.enemy);

  // 24 — Singing sand / a worm approaching UNDER a crest, never a full worm.
  for(let i=0;i<3;i++)
    ridge('24 subterranean worm wave '+i,-15+i*4.7,15+i*.8,4.8,17,
      1.8+i*.55,i===1?mat.drift:mat.sand,-.33+i*.08);
  for(let i=0;i<4;i++)box('24 sand rhythm ripples '+i,-15+i*3,.18,11.8,
    2.1,.12,.45,mat.gold,.24);

  // 25 — Paul's prescience is only an isolated visual impression, not new story.
  const vision=M.CreateTorus('25 restrained spice vision',{
    diameter:8,thickness:.21,tessellation:detail?20:12},scene);
  vision.position.set(3,.52,13.5);vision.rotation.x=Math.PI/2;
  vision.material=mat.vision;vision.isPickable=false;
  if(detail)for(let i=0;i<3;i++)
    strip('25 glimpse of branching futures '+i,3,13.5,
      3+(i-1)*5.4,19.2,.21,.20,mat.vision);

  // 26 — Kynes' last refuge and the decisive diversion of the enemy's trail.
  box('26 isolated ecologist shelter',16,1.3,17,6.6,2.4,4.7,mat.metal,.28);
  box('26 shelter light',16,1.4,14.5,2,.35,.2,mat.gold);
  cyl('26 diversion beacon mast',20,4.1,20.2,.35,8,mat.rim,6,.2);
  sphere('26 diversion signal',20,8.2,20.2,.95,mat.gold);
  strip('26 off-route decoy trail',18,18.3,26,28,.2,.42,mat.dust);

  // 27 — Small storm shelter, no city or visible sietch.
  ridge('27 sheltered dune',27,-15,14,18,2.2,mat.sand,.24);
  cyl('27 stilltent four-sided fabric',27,1.6,-13.1,6,3.2,mat.cloth,4,.28)
    .rotation.y=Math.PI/4;
  box('27 tent dark entrance',27,.9,-10.9,1.8,1.8,.14,mat.shadow);
  cyl('27 condensate collector',31,1.15,-14,.8,2.1,mat.metal,6,.48);
  if(detail)strip('27 tether line',27,-13,32,-17,.26,.11,mat.rim);

  // 28 — Footprints expose the fugitives on the open dune; threat is close.
  for(let i=0;i<7;i++){
    box('28 alternating exposed footprints '+i,33+i*1.8,.13,-6+(i%2)*.7,
      .65,.12,1.05,mat.shadow,.15);
  }
  for(let i=0;i<3;i++){
    cyl('28 approaching Sardaukar '+i,43+i*3,.98,-13-i%2*1.5,
      1.1,1.65,mat.enemy,6,.76);
    sphere('28 search lamp '+i,43+i*3,2.1,-13-i%2*1.5,.75,mat.enemyEye);
  }

  // 29 — Desert encirclement BELOW a broken crescent of Fremen rock.
  // No visible sietch: the open sand and elevated human silhouettes carry
  // the resolution. Boss marker (53,8) remains unobstructed.
  ridge('29 surrounding dry basin',54,17,23,19,1.55,mat.sand,.1);
  for(const [i,x,z] of [[0,45,2],[1,50,-3],[2,59,1],[3,63,6]]){
    cyl('29 Sardaukar legion body '+i,x,1.25,z,1.15,2.2,mat.enemy,6,.75);
    sphere('29 Sardaukar helmet '+i,x,2.75,z,1.12,mat.rim);
    box('29 legion weapon '+i,x+.86,1.95,z,.22,3,.24,mat.shadow).rotation.z=-.16;
  }
  cyl('29 Bashar commander',43,1.6,11,1.7,2.7,mat.enemy,7,1.08);
  sphere('29 Bashar helmet',43,3.4,11,1.45,mat.rim);
  // Three/five cliffs, all naturally angled, with one high central pinnacle.
  const teeth=[
    [43,26,8,6.3,5.8],[48,28,10,7.2,7.3],[54,26,9,8,10.1],
    [60,28,10,7.8,6.8],[66,26,8.5,6.5,5.9],
  ];
  for(const [i,[x,z,w,d,h]] of teeth.entries()){
    rock('29 Fremen natural rock crescent '+i,x,z,w,d,h,
      i%2?mat.cliff:mat.stone,(i-2)*.1);
    // A thin cold moonlit edge separates the ridge from the night sky.
    if(detail)strip('29 faint rim of the Fremen ridge '+i,x-w*.28,z-d*.34,
      x+w*.18,z-d*.22,h*.77,.24,mat.rim);
  }
  const fremen=detail?[[45,26,5.9],[49,28,7.3],[54,26,10.4],
    [60,28,6.9],[66,26,6.0]]:[[45,26,5.9],[54,26,10.4],[66,26,6.0]];
  for(const [i,[x,z,y]] of fremen.entries()){
    const isStilgar=x===54,coat=isStilgar?3.75:3.05;
    cyl('29 Fremen rising cloak '+i,x,y+coat*.5,z,isStilgar?2.2:1.7,
      coat,mat.cloth,5,.7);
    sphere('29 Fremen wrapped head '+i,x,y+coat+.33,z,
      isStilgar?1.55:1.32,mat.rim);
    box('29 Fremen moonlit cloak edge '+i,x+.69,y+coat*.51,z-.52,
      .18,coat*.76,.18,mat.rim).rotation.z=-.1;
    box('29 Fremen crysknife '+i,x+1.17,y+coat*.65,z-.25,
      .17,2.05,.2,mat.gold).rotation.z=-.30;
  }
}
