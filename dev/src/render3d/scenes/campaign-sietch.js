// Campaign 2.0 · C4.12 «Сиетч Табр» — «Сердце воды».
// Original Light-IV missions 30–39, a single inhabited rock-cut sietch
// transitioning through sealed passages to sunlit desert. Static geometry only.
// Shared EngineHost/GameScene owns rendering, gestures, profiles and disposal.
export function buildSietchTabr(B3, scene, material, detail = true) {
  const M=B3.MeshBuilder;
  const mat={
    floor:material('tabr-vertex-floor','#ffffff'),
    rock:material('tabr-deep-slate','#26383c'),
    wall:material('tabr-cave-walls','#354848'),
    cut:material('tabr-carved-rock','#68716a'),
    arch:material('tabr-worn-stone','#817967'),
    vein:material('tabr-stone-veins','#aa9471'),
    dark:material('tabr-cave-shadow','#172b32'),
    water:material('tabr-sacred-water','#245867'),
    shimmer:material('tabr-baked-water-highlights','#688e93'),
    bronze:material('tabr-lamp-bronze','#b18c58'),
    warm:material('tabr-fremen-lamplight','#d7ae78'),
    cloth:material('tabr-fremen-cloth','#5a5847'),
    dune:material('tabr-dawn-sand','#b78f60'),
    sunrise:material('tabr-sunlit-rim','#f0c38c'),
    ash:material('tabr-raided-ash','#4a4541'),
    enemy:material('tabr-harkonnen-metal','#56565b'),
    warning:material('tabr-raider-beacon','#9a5045'),
  };
  mat.warm.emissiveColor=B3.Color3.FromHexString('#352615');
  mat.shimmer.emissiveColor=B3.Color3.FromHexString('#172d32');
  mat.warning.emissiveColor=B3.Color3.FromHexString('#301815');
  mat.sunrise.emissiveColor=B3.Color3.FromHexString('#4f321c');
  const box=(name,x,y,z,w,h,d,tint,rot=0)=>{
    const mesh=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);mesh.rotation.y=rot;mesh.material=tint;
    mesh.isPickable=false;return mesh;
  };
  const cyl=(name,x,y,z,diameter,height,tint,sides=8,top=diameter)=>{
    const mesh=M.CreateCylinder(name,{
      diameterBottom:diameter,diameterTop:top,height,tessellation:sides},scene);
    mesh.position.set(x,y,z);mesh.material=tint;mesh.isPickable=false;return mesh;
  };
  const sphere=(name,x,y,z,d,tint)=>{
    const mesh=M.CreateSphere(name,{diameter:d,segments:detail?9:6},scene);
    mesh.position.set(x,y,z);mesh.material=tint;mesh.isPickable=false;return mesh;
  };
  const line=(name,ax,az,bx,bz,y,width,tint)=>{
    const dx=bx-ax,dz=bz-az;
    return box(name,(ax+bx)/2,y,(az+bz)/2,width,.08,
      Math.hypot(dx,dz),tint,Math.atan2(-dx,dz));
  };
  const cliff=(name,x,z,w,d,h,tint,angle=0)=>{
    // One closed, low-poly faceted outcrop, not a flat-topped city block.
    const pos=[
      -w*.54,-.55,-d*.48, w*.53,-.55,-d*.46,
      w*.48,-.55,d*.52,-w*.48,-.55,d*.51,
      -w*.36,h*.82,-d*.27,w*.26,h,-d*.34,
      w*.34,h*.73,d*.21,-w*.24,h*.92,d*.28,
    ];
    const faces=[0,2,1,0,3,2,4,5,6,4,6,7];
    for(let i=0;i<4;i++){const j=(i+1)%4;
      faces.push(i,j,i+4,j,j+4,i+4);}
    const data=new B3.VertexData();data.positions=pos;data.indices=faces;
    data.normals=[];B3.VertexData.ComputeNormals(pos,faces,data.normals);
    const mesh=new B3.Mesh(name,scene);data.applyToMesh(mesh);
    mesh.convertToFlatShadedMesh();
    mesh.position.set(x,0,z);mesh.rotation.y=angle;mesh.material=tint;
    mesh.isPickable=false;return mesh;
  };

  // A continuous landform with nearly level ground at every world-space marker.
  // The northern ridge forms the sliced-off cave roof; the southern side opens
  // into the player's camera. No occluding complete ceiling and no RTT/shadows.
  const nodes=[[-48,-19],[-41,-4],[-29,10],[-14,16],[-1,4],
    [12,-9],[25,-20],[39,-12],[52,2],[66,11]];
  const ground=M.CreateGround('Tabr continuous cave-to-dawn terrain',{
    width:176,height:88,subdivisions:detail?36:23,updatable:true},scene);
  const v=ground.getVerticesData(B3.VertexBuffer.PositionKind);
  const ids=ground.getIndices(),colors=[];
  const clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const palette=[[.11,.20,.23],[.22,.30,.30],[.39,.37,.30],
    [.59,.46,.32],[.78,.59,.40]];
  for(let i=0;i<v.length;i+=3){
    const x=v[i],z=v[i+2];
    const near=Math.min(...nodes.map(([nx,nz])=>Math.hypot(x-nx,z-nz)));
    const rough=.28*Math.sin(x*.16+z*.27)+.18*Math.cos(x*.31-z*.12);
    v[i+1]=-.32+rough*clamp((near-3.5)/6,0,1)
      +.14*clamp((x-13)/30,0,1)*Math.sin(z*.26+x*.17);
    // Rich cave interior slowly becomes dusty ochre and finally dawn sand.
    const p=clamp((x+70)/148,0,.999)*4;
    const k=Math.floor(p),t=p-k;
    for(let c=0;c<3;c++)colors.push(clamp(lerp(palette[k][c],
      palette[k+1][c],t)+.018*Math.sin(x*.35+z*.42),0,1));
    colors.push(1);
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind,v);
  const normals=[];B3.VertexData.ComputeNormals(v,ids,normals);
  ground.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  ground.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  ground.useVertexColors=true;ground.material=mat.floor;ground.isPickable=false;

  // Cave's northern silhouette and eroded southern supporting teeth. Keep
  // major roof silhouettes behind/away from tap targets, even with twist.
  for(let i=0;i<9;i++){
    const x=-65+i*9.7,z=29+2*Math.sin(i*.9);
    cliff('Tabr sliced roof north '+i,x,z,10.2,8.5,
      6.6+i%3*2.1,i%3===0?mat.dark:mat.rock,(i%3-1)*.15);
    if(detail&&i%2===0)
      cliff('Tabr pale rim '+i,x+2.2,z-1.3,3.1,2.8,3.5,mat.cut,.2);
  }
  for(let i=0;i<5;i++){
    const x=-62+i*12,z=-34+(i%2)*1.7;
    cliff('Tabr outer cave lip '+i,x,z,8.5,5.1,2.5+i%3*.8,mat.wall,-.2);
  }
  for(const [j,x,z,h] of [[0,-53,24,7.2],[1,-33,25,6.4],
    [2,-15,27,5.9],[3,1,27,5.4]]){
    cyl('Tabr living-hall carved column '+j,x,h/2,z,2.3,h,mat.arch,7,1.55);
    box('Tabr beam '+j,x+3.1,h*.87,z,6.2,.55,1.5,mat.cut,-.1);
    if(detail)box('Tabr lamp '+j,x+2,h*.55,z-2,.9,.22,.3,mat.warm);
  }

  // 30 — Jamis's circle: stepped spectator ledges, no named NPC model.
  cyl('30 Jamis stone duelling circle',-48,.02,-19,9.5,.40,mat.arch,18);
  const ring=M.CreateTorus('30 law circle incised edge',{
    diameter:9.1,thickness:.23,tessellation:detail?26:16},scene);
  ring.position.set(-48,.30,-19);ring.material=mat.vein;ring.isPickable=false;
  for(let j=0;j<4;j++){
    box('30 witness terrace '+j,-57+j*4.3,.34,-27.4,
      3.8,.65,2.1,mat.cut);
    if(detail)box('30 seated Fremen '+j,-57+j*4.3,1.05,-27.4,
      .55,.9,.44,mat.cloth);
  }

  // 31 — Sacred sealed reservoir: still water and pre-baked highlights only.
  // Reservoir is beyond the walkway, not beneath mission 31 or 32.
  const water=M.CreateCylinder('31 immense sacred water cistern',{
    diameter:25,height:.18,tessellation:detail?34:18},scene);
  water.position.set(-47,.18,14);water.scaling.z=.59;
  water.material=mat.water;water.isPickable=false;
  const rim=M.CreateTorus('31 cistern carved stone lip',{
    diameter:25.4,thickness:1.0,tessellation:detail?32:18},scene);
  rim.position.set(-47,.33,14);rim.scaling.z=.59;
  rim.material=mat.arch;rim.isPickable=false;
  if(detail){
    for(let i=0;i<3;i++)line('31 static water reflection '+i,
      -56+i*4,12+i*.7,-52+i*5,12.4+i*.7,.30,.13,mat.shimmer);
  }
  for(let i=0;i<3;i++){
    cyl('31 sealed water-vessel '+i,-48+i*3.4,.85,-9,1.3,1.7,
      i===1?mat.bronze:mat.arch,8,.85);
    box('31 vessel lid '+i,-48+i*3.4,1.8,-9,1.65,.20,1.65,mat.cut);
  }
  // Patrol outside the side gate: the ritual and the threat coexist.
  box('31 side gate shadow',-35,1.5,-7,3.3,2.8,.45,mat.dark,.15);
  if(detail)for(let i=0;i<2;i++)
    box('31 attacking patrol silhouette '+i,-33+i*2,1.1,-11,
      .6,1.8,.53,mat.enemy);

  // 32 — Chani's knife-training gallery with worn target posts.
  box('32 training floor',-28,.10,17,10,.25,6.2,mat.arch,.16);
  for(let i=0;i<3;i++){
    cyl('32 training column '+i,-31+i*3.2,1.45,19.2,.78,2.8,mat.cut,7,.4);
    if(detail)line('32 crysknife training mark '+i,
      -31+i*3.2,19.1,-30.4+i*3.2,19.4,2.7,.14,mat.vein);
  }
  box('32 closed knife cabinet',-24,1.2,23,3,2.2,.8,mat.cloth);

  // 33 — Dew traps, slanted condenser vanes and sealed feed pipes.
  for(let i=0;i<5;i++){
    const x=-20+i*2.8;
    box('33 dew vane '+i,x,1.3,25.5,2.1,2.25,.18,mat.cut,-.20);
    cyl('33 sealed dew tank '+i,x,1.0,28.5,1.0,1.65,mat.bronze,6,.6);
  }
  line('33 poisoned feed investigation',-15,22,-7,22,.26,.26,mat.warning);
  box('33 waterworks hatch',-8,.9,18,2.8,1.5,.5,mat.dark);

  // 34 — An inner airlock reveals the exit and captured supplies.
  box('34 lock chamber',-2,1.7,19,7.8,3.4,5.1,mat.wall,.17);
  box('34 masked stone gate',-2,1.5,16.3,2.7,3.0,.4,mat.dark,.17);
  for(let i=0;i<5;i++){
    box('34 recovered Harkonnen crate '+i,3+(i%3)*1.7,.55+(i%2)*.8,
      11+(i%2)*2,1.6,1.0,1.4,i%3?mat.arch:mat.enemy,.08);
  }
  line('34 cargo track',-6,9,7,8,.24,.35,mat.vein);

  // 35 — The thumper is visible on a rock saddle, not a working animation.
  cliff('35 worm-calling rock platform',13,1,10.5,9,3.5,mat.cut,-.10);
  cyl('35 maker-calling thumper',12,2.8,1.5,1.0,5.1,mat.bronze,7,.5);
  sphere('35 thumper capped head',12,5.5,1.5,1.4,mat.arch);
  for(let i=0;i<3;i++)line('35 approaching worm sand pulse '+i,
    15+i*2,-.6,17+i*2,5,.20,.25,mat.dune);

  // 36 — Rabban's raids: a small damaged settlement, not the city of Arrakeen.
  for(let i=0;i<4;i++){
    box('36 burned desert shelter '+i,20+i*3.3,.7,-32+(i%2)*2.0,
      2.5,1.45,2.1,mat.ash,(i%3-1)*.2);
    if(detail)cyl('36 extinguished beacon '+i,19+i*3.5,1.5,
      -29+i%2,1,2.6,mat.warning,6,.45);
  }
  line('36 punitive vehicle scar',23,-29,35,-27,.18,.52,mat.ash);
  line('36 second vehicle scar',24,-30.5,36,-28.5,.18,.52,mat.ash);

  // 37 — Fake trail forks away from the concealed sietch.
  for(let i=0;i<5;i++){
    const x=34+i*2.8;
    box('37 false footsteps '+i,x,.19,-24+i*.75,.85,.11,
      1.0,mat.ash,(i%2?-.23:.21));
  }
  cliff('37 false cave door tooth',45,-25,9,7,5.5,mat.rock,.12);
  box('37 deliberately false doorway',44.5,1.25,-27.4,2.3,2.5,.3,
    mat.dark,.14);
  line('37 misleading fork',35,-14,45,-25,.22,.22,mat.vein);

  // 38 — Prophecy inscriptions and a hidden listening grille.
  for(let i=0;i<4;i++){
    box('38 ancestors carved slab '+i,47+i*3.2,2.0,18.0,
      2.4,3.9,.62,i%2?mat.cut:mat.arch,-.06);
    if(detail)for(let j=0;j<2;j++)
      box('38 incised heritage glyph '+i+' '+j,47+i*3.2,
        1.6+j*.9,17.62,1.0,.12,.08,mat.vein);
  }
  box('38 spy ventilation slot',56,2.25,15.4,3.0,.60,.25,mat.dark);
  if(detail)for(let i=0;i<3;i++)
    box('38 spy grille '+i,54.8+i*1.1,2.25,15.1,.11,.58,.18,mat.enemy);

  // 39 — Paul's new name: witnesses around a sunrise stone terrace.
  // Boss button remains on the approach, fully below the high background ridge.
  cliff('39 final natural witness terrace',69,24,21,12,5.5,mat.arch,.10);
  box('39 open sunlit step',67,.46,18,13.5,.82,4.6,mat.cut,.05);
  cyl('39 tribal oath platform',70,1.10,23.2,8.0,.65,mat.arch,12);
  for(const [i,x,z] of [[0,64,22],[1,66,27],[2,73,27],[3,76,22]]){
    cyl('39 still Fremen witness '+i,x,1.85,z,.74,1.8,mat.cloth,6,.43);
    sphere('39 witness head '+i,x,3.01,z,.78,mat.cloth);
  }
  cyl('39 Paul silhouette',70,2.38,23.2,.90,2.0,mat.dark,7,.58);
  sphere('39 Paul head',70,3.63,23.2,.94,mat.dark);
  box('39 sun edge behind terrace',73,4.3,29,12,.24,.65,mat.sunrise,.11);
  // The raid is contextual: distant crates and silhouettes, NOT a second boss.
  for(let i=0;i<3;i++){
    box('39 distant raid cargo '+i,78+i*3.4,.65,6+i*3,
      2.0,1.25,2.1,mat.enemy);
  }
}
