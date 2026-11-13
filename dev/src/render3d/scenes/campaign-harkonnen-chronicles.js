// C4.5 — House Harkonnen: Gurney's escape from the slave pits.
// Static Babylon geometry, shared materials, no particles/shadows/independent loop.
// Scene is geographical: a vast pit, sewage escape, smuggler canyon, arena,
// burned village, Atreides refuge and Rabban's final blockade.
export function buildHarkonnenChronicles(B3, scene, material) {
  const M=B3.MeshBuilder;
  const rock=material('gurney-rock','#515956');
  const cliff=material('gurney-cliff','#323d40');
  const abyss=material('gurney-abyss','#18252c');
  const iron=material('gurney-iron','#656e6b');
  const ash=material('gurney-ash','#373738');
  const sand=material('gurney-road','#696a5c');
  const ember=material('gurney-embers','#b36b42');
  const gold=material('gurney-lanterns','#d1a56a');
  const hide=material('gurney-hide','#766653');
  const atrey=material('gurney-atreides','#65817a');
  const stone=material('gurney-stone','#9c9a88');
  const box=(name,x,y,z,w,h,d,mat)=>{
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.material=mat;o.isPickable=false;return o;
  };
  const cyl=(name,x,y,z,d,h,mat,t=10)=>{
    const o=M.CreateCylinder(name,{diameter:d,height:h,tessellation:t},scene);
    o.position.set(x,y,z);o.material=mat;o.isPickable=false;return o;
  };
  const arch=(name,x,z,w,h,mat)=>{
    box(name+' left',x-w/2,.5+h/2,z,1,h,1.5,mat);
    box(name+' right',x+w/2,.5+h/2,z,1,h,1.5,mat);
    box(name+' lintel',x,h+.7,z,w+1,1.2,1.8,mat);
  };
  // A shared topological terrain, not C:0 museum plinths or D:0 factories.
  box('Harkonnen bedrock',0,-1.1,3,110,1.6,55,cliff);
  // Broken foreground ledges reveal the pit's immense scale instead of a
  // vacant flat canvas below the markers. Low polygon count, fully static.
  for(let i=0;i<19;i++){
    const x=-52+i*5.8, z=-7.5-(i%4)*1.35;
    const h=.5+(i%5)*.25;
    const ledge=box('fractured near stone terrace',x,h/2-.06,z,5.1,h,3.5,i%3?rock:ash);
    ledge.rotation.y=(i%5-2)*.075;
  }
  for(let i=0;i<12;i++){
    const x=-49+i*8.5,z=-15+(i%3)*1.8;
    const h=2.2+(i%4)*.85;
    const shard=M.CreateCylinder('foreground basalt monolith',{diameterTop:.45,diameterBottom:3.2,height:h,tessellation:5},scene);
    shard.position.set(x,h/2-.35,z);shard.rotation.z=(i%3-1)*.09;
    shard.material=i%3?cliff:rock;shard.isPickable=false;
  }
  // Terraced excavation in the opening sector. The pit remains visibly hollow
  // from above: progressively smaller dark horizontal depths and stacked rims.
  box('pit outer stone rim',-38,.15,10,30,.8,25,rock);
  box('pit upper hollow',-38,.62,10,25,.18,20,cliff);
  box('pit middle dark bowl',-38,.78,10,19,.13,14,abyss);
  for(let tier=0;tier<3;tier++){
    const w=23-tier*4.1,d=18-tier*3.4,y=1.02+tier*.13;
    for(const sign of [-1,1]){
      box('pit inner terraced wall',-38+sign*w/2,y,10,.9,.45,d,iron);
      box('pit inner rim',-38,y,10+sign*d/2,w,.32,.7,rock);
    }
  }
  box('pit bottom cavity',-38,.85,10,13,.12,8,ash);
  for(const [x,z,w,d] of [[-53,10,2,25],[-23,10,2,25],[-38,-2.5,30,2],[-38,22.5,30,2]]){
    box('pit monumental retaining wall',x,2.4,z,w,4.5,d,rock);
  }
  // Cell blocks and the overseer's bridge, one silhouette higher than ground.
  for(let i=0;i<5;i++){
    box('slave barracks',-48+i*4.6,1.3,16,3.5,2.4,4,ash);
    box('slave barred roof',-48+i*4.6,2.6,16,3.8,.3,4.2,iron);
  }
  box('Rabban punishment bridge',-34,3.7,4,13,.45,2.3,iron);
  for(const x of [-40,-36,-32,-28])cyl('bridge guard post',x,4.4,4,.45,1.1,iron,6);
  // Sewage escape: visually a pair of huge cylindrical drains in rock.
  box('tunnel escarpment',-22,2,11,11,5.3,14,cliff);
  for(const z of [7,14]) {
    const t=cyl('escape drain',-23,2.2,z,4.1,1.2,iron,14);
    t.rotation.z=Math.PI/2;
    const mouth=cyl('drain black mouth',-22.25,2.2,z,2.9,1.3,abyss,14);
    mouth.rotation.z=Math.PI/2;
  }
  box('tunnel catwalk',-19,.2,2,13,.35,2,iron);
  // A relief corridor becomes an illicit valley, NOT a repeated factory skyline.
  for(let i=0;i<7;i++){
    const x=-17+i*5.1,z=15+(i%2)*2.4;
    const height=3.5+(i%3)*1.8;
    const crag=M.CreateCylinder('smuggler canyon crag',{diameterTop:1.2,diameterBottom:5,height,tessellation:5},scene);
    crag.position.set(x,height/2,z);crag.rotation.y=i*.6;crag.material=i%2?rock:cliff;crag.isPickable=false;
  }
  for(let i=0;i<5;i++){
    const x=-15+i*4.1,z=6+(i%2)*3;
    box('hidden market stall',x,.9,z,3,1.7,2.8,hide);
    box('market awning',x,2,z,4.3,.19,3.7,ash);
    box('lantern at market',x+1.3,2.25,z-.8,.34,.5,.3,gold);
  }
  box('Piter surveillance tower',2,4.4,15,4.1,8.8,4.3,ash);
  box('mentat tower top',2,9,15,6,.8,6,iron);
  for(const y of [2.5,4.5,6.5])box('mentat slit',2,y,12.8,2,.2,.18,ember);
  // Slave arena: concentric stone structure, amphitheatre tiers, not D:0 Feyd stadium.
  cyl('slave arena foundation',11,.65,13,19,1.3,rock,20);
  cyl('slave arena stepped gallery',11,1.5,13,16,1.15,iron,20);
  cyl('slave arena sand fighting floor',11,2.12,13,11,.12,sand,20);
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10;
    cyl('arena broken colonnade',11+8.5*Math.cos(a),3.25,13+8.5*Math.sin(a),.65,2.3,cliff,6);
  }
  arch('revenge gate',22,12,5,5.8,ash);
  box('revenge court',22,.35,15,11,.55,9,cliff);
  // Scorched village. No particle emitter: coal spots and ruined roofs only.
  for(let i=0;i<7;i++){
    const x=26+(i%4)*3.6,z=10+Math.floor(i/4)*5;
    box('burned village wall',x,1.3,z,2.6,2.4,2.8,ash);
    box('charred broken gable',x,2.55,z,3,.4,2.8,i%3?rock:ember);
    box('cold ember patch',x+1.3,.11,z+1.4,.7,.1,.5,ember);
  }
  // An actual contrasting refuge with a pale gateway and a road to freedom.
  box('Atreides hill base',40,.5,13,15,1.2,14,rock);
  arch('Atreides refuge gate',40,10,7,6.5,stone);
  box('Atreides banner',40,5.3,9.1,2.1,3.3,.2,atrey);
  for(const x of [35,45])box('refuge parapet',x,2.2,16,2.3,4.3,3.2,stone);
  // Rabban closes the gorge AFTER the apparent safe exit (node ten).
  for(const x of [44,49])box('blockade cliff',x,2.4,18,2.4,4.9,10,cliff);
  arch('Rabban blockade',47,10,7,5.8,iron);
  for(const x of [43.5,47,50.5]){
    box('blockade barricade',x,1.1,5,2.8,2.2,1.3,ash);
    box('blockade warning lantern',x,2.4,5,.5,.7,.45,ember);
  }
  // A single continuous narrow traversable foreground corridor connects ten
  // true 3D marker locations. Existing shared renderer owns mission rings.
  box('Gurney escape road',1,-.02,0,104,.24,2.8,sand);
  // Worn road is partly overrun by rock and iron grates. Broken silhouette,
  // no brightly colored continuous highway across the diorama.
  for(let i=0;i<14;i++){
    const x=-48+i*7.1;
    box('road drainage grating',x,.115,0,1.2,.09,2.3,i%3?iron:ash);
  }
  for(let i=0;i<25;i++)box('road broken slab',-49+i*4.2,.15,(i%3-1)*1.15,1.6,.13,.32,rock);
}
