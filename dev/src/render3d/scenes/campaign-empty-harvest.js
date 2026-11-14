// Campaign 2.0 · C4.13 «Годы в пустыне» — «Кольцо пустой жатвы».
// Original Light-V mission IDs 40–49 on one connected industrial spice basin.
// Static meshes/materials: no particles, shadow maps, timers or additional Engine.
// Navigation, selection, lifecycle and profiles belong to the shared CampaignMapScene.
export function buildEmptyHarvestRing(B3, scene, material, detail = true) {
  const M = B3.MeshBuilder;
  const mat = {
    terrain: material('harvest-terrain-vertex-colour', '#ffffff'),
    sand: material('harvest-sand', '#b99662'),
    pale: material('harvest-pale-sand', '#dfbc81'),
    spice: material('harvest-spice', '#d4a45e'),
    dark: material('harvest-dark-sand', '#665541'),
    ash: material('harvest-ash', '#3d4143'),
    iron: material('harvest-old-iron', '#55595a'),
    rust: material('harvest-rust', '#925d3e'),
    steel: material('harvest-edge-steel', '#8d9189'),
    ochre: material('harvest-old-stone', '#9d8869'),
    stone: material('harvest-ruin-stone', '#716d62'),
    banner: material('harvest-harkonnen-banner', '#9a4032'),
    ember: material('harvest-baked-embers', '#ce7346'),
    storm: material('harvest-storm-front', '#56626a'),
    stormBack: material('harvest-storm-back', '#3c4c57'),
    worm: material('harvest-maker-hide', '#6c6555'),
    wormRidge: material('harvest-maker-ridges', '#a08d6e'),
    fremen: material('harvest-fremen-cloth', '#475754'),
    atreides: material('harvest-atreides-banner', '#688678'),
    life: material('harvest-water-life-slit', '#73a8a4'),
  };
  mat.ember.emissiveColor = B3.Color3.FromHexString('#582510');
  mat.life.emissiveColor = B3.Color3.FromHexString('#254543');
  const box = (name,x,y,z,w,h,d,tint,rotation=0) => {
    const mesh=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.material=tint;mesh.isPickable=false;
    return mesh;
  };
  const cyl = (name,x,y,z,diam,height,tint,sides=7,top=diam) => {
    const mesh=M.CreateCylinder(name,{diameterBottom:diam,diameterTop:top,height:height,tessellation:sides},scene);
    mesh.position.set(x,y,z);mesh.material=tint;mesh.isPickable=false;
    return mesh;
  };
  const line = (name,x1,z1,x2,z2,y,width,tint) => {
    const dx=x2-x1,dz=z2-z1;
    return box(name,(x1+x2)/2,y,(z1+z2)/2,width,.10,Math.hypot(dx,dz),tint,Math.atan2(-dx,dz));
  };
  const coords=[[-58,-10],[-46,-21],[-31,-27],[-16,-25],[-2,-16],
    [10,-4],[21,10],[35,19],[51,13],[64,2]];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ground=M.CreateGround('40-49 connected spice basin',{width:174,height:106,subdivisions:detail?48:28,updatable:true},scene);
  const positions=ground.getVerticesData(B3.VertexBuffer.PositionKind);
  const indices=ground.getIndices();
  const colors=[];
  const stages=[[.78,.61,.38],[.56,.45,.34],[.42,.43,.43],[.68,.49,.31]];
  for(let i=0;i<positions.length;i+=3) {
    const x=positions[i],z=positions[i+2];
    let dist2=Infinity,progress=0;
    for(let j=0;j<coords.length-1;j++){
      const [ax,az]=coords[j], [bx,bz]=coords[j+1];
      const dx=bx-ax,dz=bz-az;
      const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);
      const r=(x-ax-t*dx)**2+(z-az-t*dz)**2;
      if(r<dist2){dist2=r;progress=(j+t)/9;}
    }
    const near=Math.min(...coords.map(([nx,nz])=>Math.hypot(x-nx,z-nz)));
    const basin=clamp(1-Math.hypot((x-8)/66,(z+27)/41),0,1);
    const wave=.39*Math.sin(x*.18+z*.21)+.23*Math.cos(x*.32-z*.12);
    positions[i+1]=-.36+clamp((near-3.7)/7,0,1)*wave-.62*basin;
    const p=progress*3,j=Math.min(2,Math.floor(p)),t=p-j;
    for(let k=0;k<3;k++)colors.push(clamp(stages[j][k]*(1-t)+stages[j+1][k]*t
      -(basin*.075)+.017*Math.sin(x*.32+z*.21),0,1));
    colors.push(1);
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind,positions);
  const normals=[];B3.VertexData.ComputeNormals(positions,indices,normals);
  ground.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  ground.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  ground.useVertexColors=true;ground.material=mat.terrain;ground.isPickable=false;
  // One central excavated basin, with a low industrial scar and no navigation island.
  for(let j=0;j<7;j++) {
    const x=-43+j*17,z=29+3*Math.sin(j*.7);
    const ridge=box('background long dune crest '+j,x,.5,z,16,1.4,3.3,
      j%2?mat.dark:mat.sand,.18*Math.cos(j));
    ridge.scaling.y=1+j%3*.25;
  }
  for(let j=0;j<6;j++) {
    const x=-27+j*17,z=-34+(j%2)*2.2;
    line('basin ancient mining trench '+j,x,z,x+10,z+2,.02,.6,j%2?mat.ash:mat.dark);
  }
  // ID40 / #1: Gurney's smuggler convoy: this is NOT the reunion with Paul.
  box('40 smuggler shelter',-59,1.5,0,11,3,6,mat.dark,-.14);
  box('40 shelter canvas',-59,3.05,0,12,.45,6.7,mat.fremen,-.14);
  for(const x of [-64,-57,-51])cyl('40 spice transport canister '+x,x,1.2,6,2.6,2.4,mat.rust,7);
  box('40 incoming Feyd convoy chassis',-44,1.15,6,11,2.3,4.5,mat.iron,.12);
  box('40 incoming Feyd convoy cabin',-48,2.65,6,3.2,1.6,3.5,mat.steel,.12);
  for(const x of [-48,-39]) for(const z of [3.5,8.5])cyl('40 convoy wheel '+x+' '+z,x,.7,z,2,1.2,mat.ash,8);
  box('40 Feyd convoy pennant',-43,4.6,6,.28,3,.24,mat.banner);
  // ID41 / #2: perfectly even Sardaukar tracks betray their formation.
  for(let k=0;k<5;k++)for(const side of [-1,1])
    box('41 marching footprints '+k+' '+side,-53+k*2.8,.11,-8+side*.95,1.2,.13,.36,mat.ash,.19);
  for(const x of [-50,-46,-42])cyl('41 imperial lookout '+x,x,2.8,-9,1.45,5.6,mat.iron,5,.68);
  box('41 shattered imperial watchplate',-46,1.1,-7,7,.4,2.2,mat.steel,.15);
  // ID42 / #3: three distinct progressively destroyed harvesters.
  for(let k=0;k<3;k++){
    const x=-41+k*11.3,z=-12+(k%2)*3;
    const h=2.6+k*.65;
    box('42 wreck harvester hull '+k,x,h/2,z,8.9,h,5.2,k===1?mat.ash:mat.rust,.10*k);
    box('42 harvesting cylinder '+k,x+3,1.1,z+4.4,5.3,2.1,2.5,mat.iron,.33);
    for(const side of [-1,1])
      box('42 heavy broken tread '+k+' '+side,x,.5,z+side*3.1,8,.9,1.25,mat.ash);
    if(detail) {
      box('42 ruptured smokestack '+k,x-2.5,h+1.2,z,1.2,2.5,1.3,mat.iron).rotation.z=.16*(k+1);
      cyl('42 frozen flame '+k,x+2.4,h+1.3,z,1.15,2.5,mat.ember,5,.2);
    }
  }
  // ID43 / #4: wind gauge and the frozen Coriolis front far BEHIND the path.
  const mast=cyl('43 tilted wind tower',-16,6,2.5,.68,12,mat.steel,6,.4);
  mast.rotation.z=.14;
  for(let i=0;i<3;i++)box('43 dead anemometer vane '+i,-16+i*1.3,12.1,2.5,2.4,.18,.5,mat.iron,i*.7);
  for(let k=0;k<3;k++) {
    const x=-33+k*17;
    box('43 static Coriolis silhouette '+k,x,7.2+k*.8,34+k*1.2,20,14+k*1.6,3.7,
      k===1?mat.stormBack:mat.storm,.2);
  }
  // ID44 / #5: Baron caravan halt in ancient, collapsed ruins.
  for(const x of [-9,-3,3]){
    cyl('44 old ruin column '+x,x,3.6,0,2.7,7.2,mat.stone,6,2.3);
    box('44 shattered lintel '+x,x,7.3,0,4.9,.65,2.3,mat.ochre,.12);
  }
  line('44 ambush cover north',-14,6,8,6,.5,1.3,mat.dark);
  box('44 decoy Baron caravan cargo',-1,1,8,9,2,4.4,mat.rust,.10);
  // ID45 / #6: concealed spice vault with breached doors.
  box('45 buried spice store',9,2.7,10,15,5.4,9.2,mat.iron,.13);
  box('45 giant spice store blast door',9,2.4,5,7,4.8,.7,mat.steel,.13);
  for(const x of [4,9,14])box('45 spice cache sealed container '+x,x,1.5,18,3.5,3,4,mat.spice);
  box('45 half buried roof dune',9,5.6,10,16,1.1,10,mat.dark,.13);
  // ID46 / #7: worm as an iconic background transport, not a moving boss.
  const wormBody=cyl('46 maker rising back',20,2.5,28,12.5,5.2,mat.worm,12,9);
  wormBody.rotation.z=-.42;
  for(let k=0;k<7;k++) {
    const x=14+k*2.3;
    cyl('46 maker raised dorsal plate '+k,x,5.4+(k%3)*.30,28+(k%2)*.45,
      1.3,2.7,mat.wormRidge,6,.35).rotation.z=-.38;
  }
  for(let k=0;k<3;k++) {
    const x=16+k*3.5;
    cyl('46 fedaykin standing rider '+k,x,8.1,28,.65,2.4,mat.fremen,6,.38);
    cyl('46 fedaykin rider head '+k,x,9.6,28,.85,.85,mat.fremen,7);
  }
  for(let k=0;k<4;k++)line('46 worm sand wake '+k,6+k*6,35,14+k*6,36.5,.1,.65,mat.pale);
  // ID47 / #8: smuggler yard and the later true reunion with Paul.
  box('47 old cargo platform',34,.45,29,14,.9,9,mat.iron,.12);
  box('47 Atreides broken cargo sigil',29,3,28,1.2,5,.35,mat.atreides,.15);
  box('47 smuggler cabin',38,2.6,32,6.5,5.2,5.1,mat.rust);
  for(let k=0;k<3;k++)cyl('47 reunion yard cargo '+k,28+k*4,1,35,2.1,2,mat.spice,6);
  // ID48 / #9: Water of Life rite is WITHIN; outside is the defending cordon.
  for(const x of [45,52,59]) {
    box('48 sealed rock approach '+x,x,3.2,25,5,6.4,9,mat.stone,.1);
  }
  box('48 sacred sealed door',52,2.9,19.9,4,5.8,.5,mat.ash);
  box('48 static life-water slit',52,4.3,19.55,.42,3.3,.17,mat.life);
  for(const x of [45,59])box('48 fremen defence wall '+x,x,.65,13,6,1.3,1,mat.fremen);
  // ID49 / #10: Rabban's final extraction line, not Arrakeen or the emperor.
  box('49 last harvester giant body',65,5.2,17,22,10.4,12,mat.iron,.13);
  box('49 final extraction deck',64,10.7,17,27,1.2,15,mat.rust,.13);
  for(const x of [56,73]) {
    box('49 broken extraction tower '+x,x,9,27,3.8,18,4.3,mat.ash);
    box('49 Rabban red standard '+x,x,16,23.6,3.9,6.4,.32,mat.banner);
  }
  box('49 final processing arm',53,6.2,12,19,2,3.4,mat.steel,.35);
  for(const z of [12,21])for(const x of [58,64,70]) {
    box('49 fortress static barricade '+x+' '+z,x,1,z,4,2,1.8,mat.ash);
  }
  if(detail)for(let k=0;k<4;k++) {
    const x=59+k*4;
    cyl('49 frozen distant beacon '+k,x,15.1,17,1.3,1.2,mat.ember,5,.3);
  }
  // The physical route lives in the shared scene; keep tap planes clear.
  // No active animators; after interaction the host switches to static idle.
}
