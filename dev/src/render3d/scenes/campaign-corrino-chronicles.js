// C4.6 · House Corrino — the price of the imperial crown.
// A continuous ceremonial axis stitches together stylized historical worlds:
// Kaitain mourning/coronation, Salusa discipline, Ix intrigue/war and the Lion Throne.
// Static low-poly Babylon meshes only; EngineHost/GameScene owns the render loop.
export function buildCorrinoChronicles(B3, scene, material) {
  const M=B3.MeshBuilder;
  const basalt=material('corrino-basalt','#252a35');
  const stone=material('corrino-stone','#777b83');
  const pale=material('corrino-pale','#a5a6a2');
  const bronze=material('corrino-bronze','#b59860');
  const gold=material('corrino-gold','#ddbd77');
  const velvet=material('corrino-velvet','#623943');
  const salusa=material('corrino-salusa','#444e56');
  const iron=material('corrino-iron','#566e7a');
  const ix=material('corrino-ix','#638b94');
  const voidMat=material('corrino-void','#111b2b');
  const ember=material('corrino-beacon','#bf8963');
  const box=(name,x,y,z,w,h,d,mat)=>{
    const mesh=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;
    return mesh;
  };
  const cylinder=(name,x,y,z,d,h,mat,t=10)=>{
    const mesh=M.CreateCylinder(name,{diameter:d,height:h,tessellation:t},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;
    return mesh;
  };
  const column=(x,z,h=9,mat=pale)=>{
    cylinder('imperial column',x,h/2,z,1.25,h,mat,8);
    box('column capital',x,h+.2,z,2.4,.65,2.4,bronze);
    box('column foot',x,.45,z,2.6,.9,2.6,stone);
  };
  const arch=(name,x,z,w,h,mat=stone)=>{
    box(name+' pier west',x-w/2,h/2,z,1.5,h,2,mat);
    box(name+' pier east',x+w/2,h/2,z,1.5,h,2,mat);
    box(name+' immense lintel',x,h+.4,z,w+2,.95,2.8,mat);
  };
  // Two immense connected layers, not museum plinths for individual missions.
  box('continuous imperial land',0,-1.05,1,112,1.6,54,basalt);
  box('imperial processional causeway',0,.03,-2.3,108,.28,9,stone);
  for(let i=0;i<55;i++){
    const x=-53+i*2;
    box('inlaid dynastic seam',x,.192,-2.3,.14,.05,7.5,i%5===0?gold:bronze);
  }
  for(const z of [-7.3,2.8]){
    box('continuous gold curb',0,.45,z,108,.55,.38,bronze);
  }
  // Kaitain I — funeral wing and coronation basilica: one readable colossal mass.
  box('Kaitain palace terrace',-37,.75,13,35,1.5,27,stone);
  box('Elrood memorial chamber',-49,5.2,17,10,9,8,basalt);
  box('Elrood mourning pediment',-49,10.2,17,12,1.4,10,pale);
  for(const x of [-53,-49,-45]) column(x,11,7,stone);
  cylinder('memorial cenotaph',-49,1.9,15,3.1,2.2,voidMat,8);
  const throneHall=box('great coronation hall',-32,7.3,18,19,14.5,15,stone);
  box('coronation gold roof',-32,14.9,18,23,1.2,19,bronze);
  box('gold dome lower tier',-32,17.3,18,14,3.7,12,gold);
  cylinder('dynastic spire',-32,24,18,2.9,10,gold,8);
  for(const x of [-41,-36,-31,-26,-21])column(x,8.9,10,pale);
  for(const x of [-39,-25]){
    box('palace dynastic tower',x,12,25,4.2,23,4.2,stone);
    box('tower gilded crown',x,23.5,25,6,.8,6,gold);
  }
  for(let i=0;i<6;i++){
    box('ascending coronation stair',-33, .35+i*.42,6+i*.95,21-i*.6,.38,1.05,pale);
  }
  for(const x of [-45,-18]){
    cylinder('imperial banner mast',x,12.5,3.8,.3,23,bronze,6);
    const flag=box('corrino banner',x+1.5,19,3.8,3.1,6,.18,velvet);
    flag.rotation.z=.07;
    box('lion standard',x+1.3,19,3.7,1.1,1.2,.22,gold);
  }
  // Salusa Secundus — a harsh cliff-backed drill ground, distinct from Kaitain.
  box('Salusa fortress ridge',-8,3.4,15,20,6.4,19,salusa);
  box('Salusa parade ground',-8,.4,4,18,.6,9,iron);
  for(const x of [-16,-10,-4,2]) {
    box('Salusa bastion',x,8.3,23,3.2,11,4,salusa);
    box('Salusa battlement',x,14,23,4.1,.85,5,pale);
  }
  for(let i=0;i<25;i++){
    const x=-14+(i%5)*3,z=5+Math.floor(i/5)*2.4;
    cylinder('sardaukar rank helmet',x,1.05,z,.64,1.4,basalt,6);
    cylinder('sardaukar rank body',x,.42,z,.78,.92,stone,6);
  }
  for(const x of [-15,0])arch('Salusa fortress gate',x,14,5.5,8,salusa);
  // Ix — giant suspended machinery, artificial spice experiments, occupation.
  box('Ix lower abyss',19,-.7,15,25,.35,23,voidMat);
  for(const x of [10,18,26]){
    box('Ix high bridge',x,3.7,13,3.4,.7,20,iron);
    box('Ix arcology tower',x,9.4,24,4.7,17.8,5.2,stone);
    box('Ix vertical light slit',x,10,21.3,.62,12,.18,ix);
  }
  for(let i=0;i<6;i++){
    const x=10+(i%3)*8,z=10+Math.floor(i/3)*10;
    cylinder('Amal reactor casing',x,2.7,z,3.2,5.2,iron,10);
    cylinder('Amal experimental core',x,5.5,z,1.55,.55,ix,10);
  }
  arch('Fenring concealed corridor',31,9,8,6.2,basalt);
  for(const x of [30,34,38]){
    box('Ix ruined war wall',x,2.6,23,3.3,5.2,6,salusa);
    box('Ix breach',x+1,5.3,23,2.8,1.3,4,stone);
  }
  // Return to Kaitain: secret pact galleries and the climactic Lion Throne.
  box('Kaitain final ceremonial approach',45,.8,13,21,1.5,26,stone);
  for(const z of [8,15,22])for(const x of [37,53])column(x,z,9,stone);
  box('Throne hall western wall',35,8.5,24,2.7,17,13,basalt);
  box('Throne hall eastern wall',55,8.5,24,2.7,17,13,basalt);
  box('great throne hall roof',45,17,24,24,2.3,16,bronze);
  box('final apse',45,8.1,29,19,15,3.5,basalt);
  for(let i=0;i<5;i++){
    box('ascension steps',45,1.35+i*.58,20+i*1.5,16-i*1.5,.46,1.75,stone);
  }
  box('Lion Throne plinth',45,5.1,28,10,1.4,8,bronze);
  box('Lion Throne seat',45,6.4,27,5.4,1.5,3,gold);
  box('Lion Throne tall back',45,11.2,29.1,6.8,10.7,1.7,gold);
  for(const x of [40.7,49.3]){
    cylinder('golden lion guardian',x,7,27.8,2.4,4.4,bronze,8);
    cylinder('lion head',x,9.9,27.8,2.65,2.1,gold,8);
  }
  for(const x of [37,53])box('inner imperial banner',x,11,29.5,2.6,8,.24,velvet);
  // No emissive animated shaders, dynamic shadows, particles, render targets, or timers.
}