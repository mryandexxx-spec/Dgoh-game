// Campaign 2.0 C4.7: The Scar of Liberation. One connected historical war atlas.
// Earth, League and Rossak are different worlds: this is an artistic chronicle.
// Static meshes only; no separate engine, timers, shadow passes or particles.
export function buildButlerianJihad(B3, scene, material) {
  const M=B3.MeshBuilder;
  const voidstone=material('jihad-void','#151e28');
  const rock=material('jihad-bedrock','#303943');
  const machine=material('jihad-machine','#435662');
  const steel=material('jihad-steel','#7b8c94');
  const cold=material('jihad-cold','#71abb5');
  const stone=material('jihad-stone','#b4a78e');
  const ash=material('jihad-ash','#56504d');
  const clay=material('jihad-clay','#886d5b');
  const ember=material('jihad-ember','#cb8958');
  const flag=material('jihad-flag','#a9684f');
  const rossak=material('jihad-rossak','#696076');
  const dark=material('jihad-dark','#242a32');
  const ivory=material('jihad-ivory','#d4c7ae');
  const box=(name,x,y,z,w,h,d,mat)=>{
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.material=mat;o.isPickable=false;return o;
  };
  const cyl=(name,x,y,z,d,h,mat,n=8,top=d)=>{
    const o=M.CreateCylinder(name,{diameterBottom:d,diameterTop:top,height:h,tessellation:n},scene);
    o.position.set(x,y,z);o.material=mat;o.isPickable=false;return o;
  };
  const span=(name,x1,z1,x2,z2,y,w,h,mat)=>{
    const dx=x2-x1,dz=z2-z1;
    const o=box(name,(x1+x2)/2,y,(z1+z2)/2,w,h,Math.hypot(dx,dz),mat);
    o.rotation.y=Math.atan2(-dx,dz);return o;
  };
  // Shared continuous terrain: the long fracture is a single navigational spine.
  box('historic scar foundation',0,-1.5,5,138,2.5,62,voidstone);
  for(let i=0;i<11;i++){
    const x=-61+i*12.2,z=i%3===0?-.6:i%3===1?1.3:0;
    const mat=i<2?machine:i<5?ash:i<8?rock:stone;
    const section=box('fragmented but continuous ground',x,-.15,z,12.35,.34,26,mat);
    section.rotation.y=(i%3-1)*.017;
    box('near edge masonry',x,-.01,-13,11.8,.16,2.1,i<3?steel:i<6?clay:rock);
    box('rear strata',x,-.34,18,12.1,.44,25,i<2?machine:i<5?ash:i<8?rock:dark);
  }
  span('north edge of history scar',-62,-7,62,-5,.11,.3,.08,dark);
  span('ember fracture line',-62,5,62,6,.14,.22,.08,ember);
  for(let i=0;i<16;i++){
    const o=box('fracture fragments',-61+i*8.1,.07,-8.6+(i%4)*.8,4.7,.10,.55,i%4?dark:ash);
    o.rotation.y=.16+(i%3)*.21;
  }

  // 1: Omnius. An inhuman ordered megacity, NOT Giedi factories.
  box('machine observation avenue',-55,.2,9,22,.4,16,machine);
  for(let i=0;i<7;i++){
    const x=-64+(i%4)*5.4,z=13+Math.floor(i/4)*9,h=10+(i%4)*3.2;
    box('precise machine skyscraper',x,h/2,z,3.8,h,5.2,i%2?machine:dark);
    box('vertical data seam',x+1.84,h*.5,z-2.8,.16,h*.8,.18,cold);
    box('machine cap',x,h+.28,z,4.2,.55,5.6,steel);
  }
  box('Omnius control block',-55,11.3,29,14,22.6,6,voidstone);
  box('Omnius sealed face',-55,11.5,25.85,8,14,.25,machine);
  for(let i=0;i<4;i++)box('Omnius cold signal slit',-55,7+i*3.2,25.67,6.6,.24,.12,cold);
  cyl('Omnius antenna needle',-55,27.6,29,3.8,11,cold,6,.45);
  for(let i=0;i<5;i++)box('human captivity quarter',-65+i*4,.9,4.7,3.2,1.7,2.2,ash);
  span('surveillance viaduct',-64,11,-46,11,7.4,1.2,.52,steel);

  // 2: League. Rough human fort, not a dynastic palace.
  box('League refuge terrace',-44,.35,15,15,.55,17,clay);
  box('League outer barricade',-44,2.3,22,16,4,1.4,stone);
  for(const x of [-51,-37]){
    cyl('League beacon bastion',x,4.4,20,4.5,8,ash,6,3.7);
    cyl('League warm warning fire',x,8.9,20,1.5,.7,ember,6);
  }
  for(let i=0;i<4;i++)box('League irregular dwelling',-49+i*3.1,1.5,12.5,2.7,2.6,3,stone);
  box('League banner staff',-43,5.4,10,.3,9.9,.35,steel);
  box('League banner',-41.9,7.3,10,2.3,3,.12,flag);

  // 3: Earth's fall. A hollow molten crater cuts across the old road.
  cyl('Earth crater scar',-33,.25,17,18,.5,ash,18);
  cyl('Earth crater inner ring',-33,.54,17,14,.16,dark,18);
  cyl('Earth epicenter void',-33,.65,17,8,.08,voidstone,18);
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9,x=-33+8.7*Math.cos(a),z=17+8.7*Math.sin(a);
    const debris=box('Earth radial debris',x,.9,z,2.7,1.6,1.2,i%3?machine:clay);
    debris.rotation.y=a+.25;
  }
  for(const [x,z,h,r] of [[-40,24,9,-.34],[-27,25,7,.22],[-40,11,5,.2]]){
    const tower=box('Earth broken highrise',x,h/2,z,3,h,3.5,ash);
    tower.rotation.z=r;
  }

  // 4: Cymeks. Giant splayed mechanical limbs and armored mind capsules.
  box('cymek weapons deck',-22,.26,15,18,.38,18,machine);
  box('cymek containment wall',-22,5.1,25,17,9.5,4,voidstone);
  for(const [cx,cz,k] of [[-28,15,1],[-17,19,1.17]]){
    box('cymek angular body',cx,7.5*k,cz,3.8*k,3.6*k,3*k,steel);
    cyl('cymek mind capsule',cx,10.25*k,cz,2.7*k,2*k,cold,8);
    box('cymek armored spine',cx,4.5*k,cz,1.7*k,4.6*k,1.8*k,machine);
    for(const side of [-1,1]){
      const thigh=box('cymek splayed leg',cx+side*2.6*k,4.3*k,cz,1.1*k,5*k,1.2*k,steel);
      thigh.rotation.z=side*.35;
      const ankle=box('cymek lower armored leg',cx+side*4.3*k,1.9*k,cz+1,
        1.4*k,3.8*k,1.5*k,machine);
      ankle.rotation.z=-side*.18;
    }
  }
  for(let i=0;i<3;i++)box('stored cymek shell',-29+i*6,1.5,26,4,2.7,3.5,ash);

  // 5: Exodus. Wedges and a clear gangway; no costly animated spacecraft.
  box('exodus departure deck',-11,.22,15,19,.5,18,steel);
  for(const x of [-18,-4])box('evacuation gantry',x,3.4,20,1.8,6.6,2.1,ash);
  for(const [x,z,r] of [[-14,20,-.3],[-6,25,.2]]){
    const ship=cyl('evacuation vessel wedge',x,2.7,z,4.8,9,machine,3,.25);
    ship.rotation.z=Math.PI/2+r;
    box('evacuation cockpit',x,3.1,z-1.9,2.1,.65,1.1,cold);
    box('evacuation ship stabiliser',x-3.7,2.4,z,1.7,3.9,.6,steel);
  }
  span('refugees embarkation gangway',-15,8,-9,16,.65,3.1,.4,stone);
  for(let i=0;i<6;i++)box('abandoned refugee supply',-19+i*2.3,.75,10,1.4,1.3,1.2,clay);

  // 6: Rebellion. Fractured occupation district and quiet liberation lights.
  box('liberated district',2,.25,15,20,.5,18,ash);
  for(let i=0;i<7;i++){
    const x=-6+(i%4)*4.4,z=13+Math.floor(i/4)*7.2,h=2.5+(i%3)*2.4;
    const ruin=box('shattered machine wall',x,h/2,z,3.8,h,3.1,i%2?rock:steel);
    ruin.rotation.z=(i%3-1)*.1;
    box('liberation rubble',x+1.7,.48,z-1.4,3,.7,1.9,clay);
  }
  for(const x of [-1,6]){
    box('rebel standard staff',x,4.2,7,.25,7.8,.27,stone);
    box('rebel standard',x+1.1,6.2,7,2.2,2.4,.12,flag);
  }
  cyl('resistance hearth',2,.6,11,2,.28,ember,6);

  // 7: Proto-mentat scholarship, not a modern Mentat academy.
  box('human knowledge terrace',15,.35,16,18,.55,17,stone);
  for(let t=0;t<3;t++)
    box('thinking steps',15,1+t*.65,19+t*2.5,16-t*2,.7,2.3,ivory);
  for(const x of [9,15,21]){
    box('stone calculation desk',x,1.8,14,3.1,.3,1.7,ash);
    for(const dx of [-1,0,1])box('human calculation tablet',x+dx,2.05,14,.5,.1,.9,clay);
  }
  cyl('human memory vault',15,2.5,26,5.8,.45,rock,10);
  box('mnemonic monolith',15,4.3,26,3.6,3.8,.55,stone);

  // 8: Rossak: sculpted slate needles and an open cave for the proto-sisterhood.
  box('Rossak mountain plateau',28,1,20,23,1.8,22,rossak);
  for(let i=0;i<8;i++){
    const x=19+i*2.65,z=20+(i%3)*4.2,h=8+(i%4)*3.3;
    const tip=cyl('Rossak slate spire',x,h/2+.6,z,4.7,h,rossak,5,.25);
    tip.rotation.z=(i%3-1)*.13;
  }
  box('Rossak hidden cave opening',28,3.2,13.4,5.7,5.7,.3,dark);
  for(const x of [24,32]){
    const pillar=box('Rossak cave rock',x,4.9,13.3,2,8.5,3,rossak);
    pillar.rotation.z=x<28?-.14:.14;
  }
  box('Rossak sisters cave entrance',28,.25,9,12,.5,6,ivory);

  // 9: Serena's memorial, defined by the missing human figure.
  box('Serena memorial ground',41,.2,15,21,.42,19,stone);
  cyl('Serena open round memorial',41,.52,17,13,.58,ivory,14);
  cyl('Serena absent center',41,.87,17,8,.12,ash,14);
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10;
    cyl('memorial stone witness',41+5.4*Math.cos(a),1.45,17+5.4*Math.sin(a),
      1.1,1.3,i%3?stone:clay,5);
  }
  box('Serena fallen flagstaff',41,4.3,17.5,.35,7.5,.3,rock);
  box('Serena torn banner',42.2,6,17.5,2.5,2.9,.15,flag);
  span('mourning earth fissure',39,8,48,27,.19,.57,.11,dark);

  // 10: Omnius' army; threat of the next battle, NOT Omnius' final death.
  box('Omnius legion parade field',55,.05,16,24,.3,25,machine);
  for(const x of [46.5,63.5]){
    box('Synchronization gate monolith',x,9.8,19,4.5,19.5,6.4,voidstone);
    box('Synchronization cold vertical line',x,10,15.6,.45,17.6,.19,cold);
    box('Synchronization upper cap',x,20.1,19,6,1.2,7.3,steel);
  }
  box('Synchronization gate top',55,20.2,19,18,2.6,6,dark);
  box('legion staging void',55,7,24.5,11,13,1.2,voidstone);
  for(let i=0;i<4;i++)box('command machine data slit',55,8+i*3.1,23.75,7,.25,.18,cold);
  for(let row=0;row<3;row++)for(let i=0;i<5;i++){
    const x=48+i*3.5,z=28+row*3.1,h=2.4+row*.65;
    cyl('machine army legionary',x,h/2,z,1.35,h,machine,5);
    box('machine legion eye',x,h*.82,z-.73,.65,.19,.14,cold);
  }
  box('Omnius command war engine',55,8.5,36,7,10,6,steel);
  cyl('Omnius war engine crest',55,15.3,36,5.5,4.7,dark,6,.3);
}
