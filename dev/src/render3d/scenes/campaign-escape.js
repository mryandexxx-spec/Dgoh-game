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
  // Distinctive jagged cliffs bound the canyon on both sides. The foreground
  // cliffs remain low so they cannot hide the interactive route on a phone.
  for(let i=0;i<12;i++){
    const x=-63+i*10.5,z=20+3.1*Math.sin(i*.92),h=7+(i%4)*2.1;
    const rock=box('north canyon broken wall '+i,x,h*.47-.4,z,7.7,h,5.4,
      i%3?mat.stone:mat.cliff,(i%3-1)*.13);
    if(detail)cyl('moonlit north cliff crown '+i,x+.8,h-.1,z,4,2.9,
      mat.rim,5,.9).rotation.z=(i%3-1)*.12;
  }
  for(let i=0;i<7;i++){
    const x=-60+i*12.2,z=-24+1.5*Math.sin(i),h=3.5+(i%3)*1.1;
    box('low south canyon ledge '+i,x,h*.45-.45,z,8,h,4.7,mat.cliff,.1*(i%3-1));
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

  // 23 — Tight canyon ambush: two visibly opposing asymmetric rock masses.
  box('23 upper canyon overhang',-22,7.5,14,10.2,14.9,6.5,mat.cliff,.13);
  cyl('23 fractured pinnacle',-16,8.8,13,5.1,17,mat.stone,5,1.3);
  box('23 south canyon jaw',-20,3.0,-13,9.1,5.7,4.6,mat.stone,-.24);
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

  // 29 — Basin encircled by Sardaukar. Fremens rise on the rock ridge ABOVE.
  // Boss marker at (53,8) is deliberately left clear.
  ridge('29 surrounding dry basin',54,16,21,19,2.0,mat.sand,.1);
  for(const [i,x,z] of [[0,45,2],[1,50,-3],[2,59,1],[3,63,6]]){
    cyl('29 Sardaukar legion body '+i,x,1.25,z,1.15,2.2,mat.enemy,6,.75);
    sphere('29 Sardaukar helmet '+i,x,2.75,z,1.12,mat.rim);
    box('29 legion weapon '+i,x+.86,1.95,z,.22,3,.24,mat.shadow).rotation.z=-.16;
  }
  cyl('29 Bashar commander',48,1.6,6,1.7,2.7,mat.enemy,7,1.08);
  sphere('29 Bashar helmet',48,3.4,6,1.45,mat.rim);
  // Jagged crescent ridge makes the rescue readable in wide / narrow iPhone crops.
  for(let i=0;i<5;i++){
    const x=42+i*5.7,z=28+(i%2)*2.5,h=5+(i%3)*1.2;
    box('29 rising Fremen watch ridge '+i,x,h*.5-.3,z,8,h,5.5,
      i%2?mat.cliff:mat.stone,(i%3-1)*.11);
  }
  const fremen=detail?[[47,28,6.6],[52,30.4,9.4],[57,28,7.7],[62,31,8.2],[65,29,7]]:[
    [47,28,6.6],[52,30.4,9.4],[59,30,7.9]];
  for(const [i,figure] of fremen.entries()){
    const [x,z,y]=figure,isStilgar=i===1;
    cyl('29 Fremen emerging silhouette '+i,x,y+.85,z,1.15,isStilgar?2.7:2.15,
      mat.shadow,5,.62);
    sphere('29 Fremen headwrap '+i,x,y+2.35,z,isStilgar?1.2:1.02,mat.cloth);
    box('29 Fremen crysknife silhouette '+i,x+.75,y+1.65,z,.2,1.9,.23,mat.rim)
      .rotation.z=-.24;
  }
}
