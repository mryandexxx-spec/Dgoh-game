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
  box('continuous imperial land',0,-1.05,1,150,1.6,84,basalt);
  // Full-width ceremonial foreground eliminates a flat void at the
  // right-hand edge of the Lion Throne and fills mobile crops with depth.
  for(let i=0;i<19;i++){
    const x=-70+i*8;
    box('processional foreground stone',x,-.13,-16,7.7,.14,19,i%4===0?salusa:stone);
    box('imperial outer border',x,.03,-24.5,7.6,.25,.46,i%3===0?gold:bronze);
    box('foreground angled masonry',x,.23,-29,5.4,.42,2.3,basalt);
  }
  for(let i=0;i<17;i++){
    const x=-68+i*8.5;
    box('rear imperial foundation',x,.55,35,7.9,1.2,17,i%4===0?salusa:stone);
    box('rear parapet',x,1.7,42,7.9,1.1,1.3,basalt);
  }
  box('imperial processional causeway',0,.03,-2.3,108,.28,9,stone);
  for(let i=0;i<55;i++){
    const x=-53+i*2;
    box('inlaid dynastic seam',x,.192,-2.3,.14,.05,7.5,i%5===0?gold:bronze);
  }
  for(const z of [-7.3,2.8]){
    box('continuous gold curb',0,.45,z,108,.55,.38,bronze);
  }
  // Kaitain: broad open ceremonial terraces rather than a tall flat wall.
  // The dominant silhouette is a staggered triple-crown facade which fits a
  // shallow 390px phone viewport from the actual mission camera.
  box('Kaitain paved forecourt',-37,.22,8.5,40,.4,20,stone);
  for(const x of [-54,-46]){
    box('Elrood memorial wing',x,3.6,12,7,6.6,8,basalt);
    box('mourning roof cornice',x,7.1,12,8,.55,9,pale);
    box('mourning stepped pediment',x,8.1,12,5.5,1.4,6,bronze);
  }
  cylinder('Elrood cenotaph',-49,1.1,6,3.5,2.2,voidMat,8);
  for(const x of [-55,-50,-45])column(x,5.8,5.5,pale);
  // Open facade: empty bays between pillars create strong visible depth.
  for(const x of [-41,-36,-31,-26,-21])column(x,8.9,8.3,pale);
  box('coronation cornice',-31,10.3,9.2,28,1,3,bronze);
  box('coronation architrave',-31,11.5,10.5,21,1.5,5,pale);
  box('coronation palace rear core',-31,6.2,16.5,21,11.9,8,basalt);
  box('coronation central gold gable',-31,13.1,15.6,14,2.6,6,bronze);
  // A shallow tiered crown reads as a palace roof, not a skyscraper.
  for(const [w,y,d] of [[12,14.7,4.7],[8,16.0,3.4],[4.5,17.0,2.1]]){
    box('stepped dynastic crown',-31,y,15.6,w,1.2,d,gold);
  }
  for(const x of [-42,-20]){
    box('low dynastic tower',x,9.3,17,3.6,17,4.2,stone);
    box('tower battlement',x,18.1,17,5.2,.65,5.2,bronze);
    box('tower inset',x,9.8,14.8,1.1,9.3,.18,basalt);
  }
  for(let i=0;i<5;i++){
    box('ascending coronation stair',-32,.31+i*.33,3.3+i*1.05,21-i*.8,.26,1.06,i%2?pale:stone);
  }
  // Banners on short stone pylons, avoiding the former 23-unit masts.
  for(const x of [-45,-18]){
    box('banner pylon',x,3.7,3.9,1.2,7.3,1.2,stone);
    box('banner finial',x,7.8,3.9,1.9,.55,1.9,gold);
    const banner=box('imperial crimson standard',x+1.2,5.4,3.85,2.4,3.7,.16,velvet);
    banner.rotation.z=.05;
    box('standard gold lion mark',x+1.1,5.2,3.7,.8,.95,.22,gold);
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
  // Kaitain finale: a roofless nave in the near field. The lion throne must
  // be a readable object, not a distant heraldic panel against a roof slab.
  box('Kaitain lion throne forecourt',45,.46,9,25,.75,21,stone);
  for(const x of [35.5,54.5]){
    for(const z of [7,13,19])column(x,z,7.8,pale);
  }
  for(let i=0;i<4;i++){
    box('throne approach stair',45,1.1+i*.42,8.5+i*1.5,15-i*.9,.38,1.6,pale);
  }
  // Three open-sided frames reveal the throne from every local mission zoom.
  for(const z of [14,19,24])arch('lion throne nave arch',45,z,19,11.2,basalt);
  box('nave low gilded entablature',45,12.4,20,24,.85,9,bronze);
  box('nave rear apse',45,7.0,27.5,19,13,2,basalt);
  box('dynastic golden rib',45,13.8,27.1,15,.75,2,gold);
  // Throne is deliberately advanced to z=17, under the open arches.
  box('Lion throne grand dais',45,3.45,16.5,12,1.3,9,bronze);
  box('Lion throne crimson carpet',45,4.18,14.8,6.9,.12,10,velvet);
  box('Lion throne seat',45,5.2,18,5.4,1.7,3.3,gold);
  box('Lion throne high back',45,9.3,19.65,6.6,8.1,1.35,gold);
  box('Lion throne back dark relief',45,9.5,18.91,4.4,5.8,.12,velvet);
  box('Lion crown crossbar',45,13.9,19.7,8.2,1.1,1.8,bronze);
  for(const x of [40,50]){
    cylinder('golden lion pedestal',x,5.4,17,2.5,3,bronze,8);
    cylinder('golden lion head',x,7.6,16.6,2.7,2.3,gold,10);
    for(const dx of [-.46,.46]){
      cylinder('lion glint eye',x+dx,7.85,15.25,.28,.24,basalt,6);
    }
    box('lion cheek relief',x,6.65,15.2,1.5,.65,.32,gold);
  }
  for(const x of [35,55]){
    box('nave banner',x,8.4,23,2.6,5.7,.16,velvet);
    box('banner gold symbol',x,8.5,22.8,1.3,1.7,.22,gold);
  }
  // A route-side gateway frames the final mission without blocking its pin.
  for(const x of [39,51]){
    box('entrance torch plinth',x,1.65,4.4,1.2,3,1.2,basalt);
    cylinder('entrance bronze beacon',x,3.45,4.4,1.3,.6,ember,8);
  }
  // No emissive animated shaders, dynamic shadows, particles, render targets, or timers.
}