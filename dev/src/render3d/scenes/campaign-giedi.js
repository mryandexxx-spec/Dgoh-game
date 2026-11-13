// Campaign 2.0 C4.1: Giedi Prime industrial diorama, scene-owned static meshes.
// Pure factory: uses the caller's Babylon Scene/EngineHost, no loops or DOM.
export function buildGiediPrime(B3, scene, material) {
  const M=B3.MeshBuilder;
  const iron=material('giedi-iron','#333a3b'),tower=material('giedi-tower','#444646');
  const black=material('giedi-black','#1b2527'),ash=material('giedi-ash','#5a584e');
  const concrete=material('giedi-concrete','#777467'),amber=material('giedi-lamp','#d19c50');
  const rust=material('giedi-rust','#8a5841'),pit=material('giedi-pits','#182225');
  const box=(name,x,y,z,w,h,d,mat,angle=0)=>{
    const mesh=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);mesh.rotation.y=angle;mesh.material=mat;mesh.isPickable=false;
    return mesh;
  };
  const disc=(name,x,y,z,diameter,height,mat,tessellation=18)=>{
    const mesh=M.CreateCylinder(name,{diameter,height,tessellation},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;
    return mesh;
  };
  // Wide industrial slab, sunken excavation on the west, no water/coast.
  const land=M.CreateGround('Giedi industrial plateau',{width:86,height:63,subdivisions:2},scene);
  land.position.y=-.18;land.material=iron;land.isPickable=false;
  box('main factory causeway',0,.12,-1,67,.45,3.8,ash,-.09);
  box('cargo corridor',-5,.24,8,50,.45,2.5,black,-.12);
  box('dock forecourt',17,.08,12,25,.4,15,concrete);
  box('lower excavation',-20,-.28,-9,17,.35,11,pit);
  for(let i=0;i<5;i++) box('excavation ribs',-27+i*3.5,.28,-9,1,.75,10,rust);
  // Fortress: recognizable bastion on skyline with stepped towers.
  box('Harkonnen citadel',-4,4.3,-22,17,8.8,8,black);
  box('citadel upper block',-4,10.3,-23,10,4.7,6,tower);
  for(const x of [-11,3]){
    box('citadel watch tower',x,8.8,-23,3.3,10.5,3.3,concrete);
    box('citadel crown',x,14.2,-23,4.4,.7,4.4,iron);
  }
  // Shipyard: skeletal loading frames, freight containers, crane beams.
  for(const x of [12,20,28]){
    box('shipyard drydock bay',x,.18,12,5.2,.65,12,black);
    box('loading gantry',x,4.6,7.2,.85,9,.85,concrete);
    box('gantry beam',x,9.15,12.5,1.3,.75,12,concrete);
    box('cargo block',x,1.15,17.4,3,1.9,3,rust);
  }
  box('terminal tower',29,5.2,3,3.2,10,3.2,iron);
  box('terminal roof',29,10.5,3,5,.6,5,ash);
  // Arena of Feyd: oval approximation from nested circular terraces.
  disc('Feyd arena foundation',4,.2,2,15,1,black,32);
  disc('arena spectator terrace',4,.78,2,12.8,.55,concrete,32);
  disc('arena fighting floor',4,1.1,2,9,.13,rust,32);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    const x=4+Math.cos(a)*6,z=2+Math.sin(a)*6;
    box('arena battlement',x,1.55,z,.85,.85,.95,iron,a);
  }
  // Dense brutalist factories at the rear, clear enough to read on low-end phones.
  for(let i=0;i<12;i++){
    const x=-33+i*5.6,z=-27-(i%3)*2.2;
    box('industrial factory',x,2.2+(i%3),z,4,4.4+(i%3)*2,5.2,i%2?iron:tower);
  }
  // Instanced chimneys: no individual draw calls for each smokestack.
  const chimney=disc('Giedi chimney master',0,0,0,1.2,8,black,8);
  chimney.setEnabled(false);
  const top=disc('Giedi chimney cap master',0,0,0,1.55,.65,ash,8);
  top.setEnabled(false);
  for(let i=0;i<14;i++){
    const x=-30+(i*11%60),z=-29-(i%4)*1.4;
    const shaft=chimney.createInstance('giedi smokestack '+i);
    shaft.position.set(x,7+(i%3)*1.2,z);
    const cap=top.createInstance('giedi smokestack cap '+i);
    cap.position.set(x,11.2+(i%3)*2.4,z);
    shaft.scaling.y=1+(i%3)*.3;
  }
  // Sparse static amber lights. No particles, bloom, shadowmaps or animated FX.
  for(const [x,z] of [[-25,-13],[-16,-10],[-8,-1],[5,9],[17,11],[28,11]]){
    box('warning beacon housing',x,.85,z,.75,1.7,.75,black);
    box('amber navigation marker',x,1.8,z,.85,.42,.85,amber);
  }
  // Burned shipyard clue: physical silhouette, never a particle effect.
  box('scorched drydock',27,.32,16,6,.4,5,pit);
  for(const x of [24,27,30])box('collapsed shipyard spar',x,1.25,16,.55,2.2,5.5,rust,.17);
}
