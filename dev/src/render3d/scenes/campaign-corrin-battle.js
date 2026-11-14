// C4.9 «Битва за Коррин»: «Разорванный венец».
// One besieged planet, one continuous terrain, one remaining Omnius core.
// All geometry is static and non-pickable; EngineHost owns rendering and disposal.
export function buildCorrinBattle(B3, scene, material, detail = true) {
  const M=B3.MeshBuilder;
  const mat={
    soil:material('corrin-soil','#303c44'),
    bed:material('corrin-bed','#1b2832'),
    slag:material('corrin-slag','#485057'),
    black:material('corrin-black','#151f29'),
    wall:material('corrin-wall','#445763'),
    steel:material('corrin-steel','#667a83'),
    rim:material('corrin-rim','#89999a'),
    human:material('corrin-human','#d7b78a'),
    brass:material('corrin-brass','#b38758'),
    red:material('corrin-failure','#a64f4c'),
    energy:material('corrin-omnius','#83c3cb'),
    center:material('corrin-core','#c6e5e2'),
    ash:material('corrin-ash','#d7c8ae'),
  };
  mat.energy.emissiveColor=B3.Color3.FromHexString('#23464c');
  mat.center.emissiveColor=B3.Color3.FromHexString('#547b7d');
  const box=(name,x,y,z,w,h,d,m)=>{
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.material=m;o.isPickable=false;return o;
  };
  const cyl=(name,x,y,z,d,h,m,sides=8,top=d)=>{
    const o=M.CreateCylinder(name,{diameterBottom:d,diameterTop:top,height:h,tessellation:sides},scene);
    o.position.set(x,y,z);o.material=m;o.isPickable=false;return o;
  };
  const sphere=(name,x,y,z,d,m,seg=8)=>{
    const o=M.CreateSphere(name,{diameter:d,segments:seg},scene);
    o.position.set(x,y,z);o.material=m;o.isPickable=false;return o;
  };
  const span=(name,x1,z1,x2,z2,y,w,m,h=.35)=>{
    const o=box(name,(x1+x2)/2,y,(z1+z2)/2,w,h,Math.hypot(x2-x1,z2-z1),m);
    o.rotation.y=Math.atan2(x1-x2,z2-z1);return o;
  };
  const mast=(name,x,z,h,tint=mat.human)=>{
    cyl(name+' shaft',x,h/2,z,.7,h,mat.steel,6);
    box(name+' light',x,h+.1,z,1.6,.6,1.6,tint);
  };
  // Terrain forms ONE continuous excavation basin. No islands or starship decks.
  box('Corrin continuous planetary crust',1,-1.5,6,151,2.8,84,mat.soil);
  for(let i=0;i<10;i++){
    const x=-67+i*15.3;
    box('Corrin industrial excavation '+i,x,-.12,24+i%3*5,17,.35,19,mat.bed);
    if(detail||i%2===0)
      box('Corrin scar ridge '+i,x,1.5,-22-i%2*3,11,3.4,5,mat.slag).rotation.y=(i%3-1)*.12;
  }
  for(let i=0;i<7;i++){
    const x=-58+i*21;
    box('Corrin distant horizon '+i,x,3.5,38,8,7+i%3*3,4,mat.black);
    box('Corrin distant signal '+i,x,7+i%3*3,35.8,3,.45,.35,i>3?mat.red:mat.steel);
  }
  // Hrethgir is a chain of ORBITAL freight modules with warm hostage windows.
  // Its arc stretches above the siege; it is NOT a literal ground bridge.
  for(let i=0;i<11;i++){
    // The orbital chain is torn above 197. Its far end must not cross the final brain.
    const t=i/13,x=-60+t*123,y=11.5+3.5*Math.sin(Math.PI*t),z=18+4*Math.sin(Math.PI*t);
    box('Hrethgir orbital hostage capsule '+i,x,y,z,6,1.5,2.6,mat.wall)
      .rotation.z=.18*Math.cos(Math.PI*t);
    box('Hrethgir warm window '+i,x,y+.17,z-1.36,3.1,.42,.12,mat.human);
    box('Hrethgir linking truss '+i,x+4.2,y,z,2.8,.65,1,mat.steel);
    if(i%3===0)box('Hrethgir cold coupling '+i,x+3.3,y,z,1.15,1.8,1.5,mat.steel);
  }
  box('Hrethgir severed spar',35,16,23,5,.7,1.8,mat.red).rotation.z=-.38;
  // Concentric walls of the single massive machine citadel.
  for(const [d,h,m] of [[58,2.8,mat.black],[45,3.5,mat.wall],[32,4.5,mat.black]])
    cyl('Corrin machine defensive belt '+d,58,h/2,27,d,h,m,12);
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5,x=58+27*Math.cos(a),z=27+26*Math.sin(a);
    if(x>74||x<-67||z>45||z<-28)continue;
    box('Corrin wall buttress '+i,x,6,z,3,12,3,mat.wall).rotation.y=-a;
    if(i%2===0)box('Corrin fortress warning '+i,x,11,z-1.6,1.4,.45,.3,mat.red);
  }
  // 190: fleet assembly and human landing beacons.
  box('190 League fleet apron',-56,-.1,-2,21,.32,15,mat.slag);
  for(const x of [-63,-56,-49]){
    mast('190 League beacon '+x,x,5,6);
    cyl('190 distant fleet silhouette '+x,x,11,12,5,8,mat.rim,3,.7)
      .rotation.z=Math.PI/2;
  }
  box('190 field command',-56,1.2,9,7,2.5,5,mat.brass);
  // 191: living shield, distant orbit capsules are human lives, not battle targets.
  box('191 hostage signal foot',-43,-.12,7,14,.4,11,mat.black);
  cyl('191 orbital hostage anchor',-43,6.4,11,5.1,12,mat.steel,6,2.3);
  box('191 human distress light',-43,13,10,3,.85,1,mat.human);
  for(const x of [-49,-37])mast('191 rescue beacon '+x,x,3,3.4);
  // 192: Abulurd chooses; two static, divergent command lines.
  box('192 divided command bastion',-30,.75,11,16,1.8,12,mat.wall);
  span('192 line toward captives',-30,8,-36,20,2.3,1.3,mat.human);
  span('192 line toward bombardment',-30,8,-24,20,2.3,1.3,mat.red);
  box('192 stopped control desk',-30,3,11,5,1.7,3,mat.black);
  for(const x of [-37,-23])box('192 cold inactive gun '+x,x,4.1,18,1.5,6,4,mat.steel);
  // 193: fire from the planetary orbital batteries and battered landing pads.
  box('193 burned drop zone',-19,-.1,21,17,.35,19,mat.bed);
  for(const x of [-26,-18,-10]){
    cyl('193 landing blast crater '+x,x,.06,24,6,.28,mat.slag,10);
    box('193 silent orbital cannon '+x,x,4,30,2.3,7,3.1,mat.black)
      .rotation.z=(x+18)*.03;
  }
  if(detail)for(const x of [-22,-15])mast('193 drop beacon '+x,x,12,3);
  // 194: Erasmus' watchful eye; architecturally unlike military factories.
  cyl('194 Erasmus observation tower',-6,7.1,19,7.4,13.7,mat.black,8,5.3);
  sphere('194 Erasmus machine eye',-6,13.8,15.8,4.8,mat.energy,10);
  cyl('194 Erasmus iris pupil',-6,13.8,13.25,1.6,.22,mat.center,10).rotation.x=Math.PI/2;
  for(const x of [-12,0])box('194 observation alcove '+x,x,3,21,3,5,7,mat.wall);
  // 195: the last giant cymek warframes, left empty and hanging in their racks.
  box('195 last cymek factory',7,1,13,19,2.1,17,mat.wall);
  for(const x of [1,7,13]){
    box('195 towering empty exoskeleton rack '+x,x,8.4,20,1.4,14,2,mat.steel);
    box('195 capsule hanger '+x,x,12.7,20,4.2,.85,2.3,mat.black);
    if(detail)span('195 inert metal limb '+x,x,16,x+2.4,9,5,.85,mat.slag,.8);
  }
  // 196: collapse of the EXTERNAL distributed overmind network.
  // The central autonomous brain survives until the 199 finale.
  box('196 collapsed overmind exchange',21,.3,17,22,.8,17,mat.black);
  for(const [x,h,tilt] of [[13,13,-.25],[20,17,.20],[29,11,-.32]]){
    box('196 fallen network pillar '+x,x,h/2,20,3,h,3,mat.wall).rotation.z=tilt;
    box('196 severed transmission '+x,x,h*.78,18.4,1.8,.8,.3,mat.red);
    box('196 dead signal plate '+x,x,h+1.2,21,5,.5,3,mat.black).rotation.z=tilt;
  }
  for(const x of [16,25])span('196 snapped data conduit '+x,x,9,x+4,25,.24,.55,mat.red,.15);
  // 197: battle of Hrethgir, an orbital-chain command terminal on the ground.
  box('197 Hrethgir ground terminal',34,.7,23,17,1.8,15,mat.slag);
  for(const x of [28,40]){
    box('197 orbital anchor tower '+x,x,7,28,2.7,12,4,mat.wall);
    box('197 torn tether mount '+x,x,12.5,26.2,4,1,.9,mat.red);
  }
  if(detail)for(const x of [29,34,39])mast('197 rescue torch '+x,x,16,3);
  // 198: the price of victory is silence, not a festival.
  box('198 memorial terrace',45,.2,15,15,.7,13,mat.ash);
  cyl('198 cenotaph',45,1,18,7.6,1.35,mat.wall,8);
  box('198 vow against thinking machines',45,5.5,19,2.4,8.5,1.8,mat.ash);
  for(const x of [40,50])mast('198 memorial lamp '+x,x,12,2.6);
  // 199: original machine intelligence as a huge sealed iris and geometric core.
  // No cymek body, no person-shaped head, no rematch of the network towers.
  cyl('199 inner citadel floor',58,2.4,30,24,3.6,mat.black,12);
  cyl('199 armored lip',58,4.5,30,19,1.1,mat.steel,12);
  cyl('199 dark core aperture',58,5.14,30,15,.35,mat.bed,12);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,x=58+8.6*Math.sin(a),z=30+8.6*Math.cos(a);
    // Front blades are broken down: never cover the actual mind silhouette.
    const front=Math.cos(a)<-.2;
    const blade=box('199 enormous iris blade '+i,x,front?6.5:9.1,z,front?2.2:2.7,front?4.4:9,1.7,mat.wall);
    blade.rotation.y=a;blade.rotation.z=.13*Math.cos(a);
    box('199 iris silver seam '+i,x,front?8.8:13.6,z,1.5,.7,.5,mat.rim).rotation.y=a;
  }
  sphere('199 autonomous Omnius polyhedral intelligence',58,9.5,26,9.6,mat.energy,detail?10:6);
  cyl('199 central crystalline optic',58,9.5,20.9,4.7,2.5,mat.center,6,1.2)
    .rotation.x=Math.PI/2;
  for(const [x,z] of [[49,23],[67,23],[49,37],[67,37]]){
    box('199 protected mind conduit '+x+' '+z,x,4.6,z,2.1,6.7,2.1,mat.black);
    if(detail)box('199 last living signal '+x+' '+z,x,7.1,z-1.13,.9,1.6,.2,mat.energy);
  }
  box('199 last human foothold',58,.16,19,9,.4,5,mat.ash);
  mast('199 final human light',51,17,3.5);
}
