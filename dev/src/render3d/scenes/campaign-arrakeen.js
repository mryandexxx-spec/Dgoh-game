// Campaign 2.0 C4.2 — Arrakeen: sheltered stone city and exposed spice desert.
// Scene-owned static geometry; shared EngineHost/GameScene supplies lifecycle.
export function buildArrakeen(B3, scene, material) {
  const M=B3.MeshBuilder;
  const sand=material('arrakis-sand','#bc8954');
  const dune=material('arrakis-dunes','#daa764');
  const light=material('arrakis-sunlit','#f0c98c');
  const rock=material('arrakis-rock','#8b6548');
  const city=material('arrakeen-buildings','#c5a073');
  const wall=material('arrakeen-ramparts','#d5b184');
  const palace=material('atreides-palace','#ead3a4');
  const dark=material('arrakeen-shade','#5d554d');
  const green=material('atreides-banner','#365d4d');
  const spice=material('spice-traces','#a55d37');
  const shadow=material('arrakeen-roof-shadow','#94714f');
  const sandstone=material('arrakeen-ochre','#ac8258');
  const bright=material('arrakeen-palace-inlay','#f6dda7');
  const box=(name,x,y,z,w,h,d,mat,rotation=0)=>{
    const mesh=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.material=mat;
    mesh.isPickable=false;return mesh;
  };
  const cyl=(name,x,y,z,diameter,height,mat,tessellation=8)=>{
    const mesh=M.CreateCylinder(name,{diameter,height,tessellation},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;return mesh;
  };
  // Level desert floor: no separate engine, postprocessing, or particle emitters.
  const ground=M.CreateGround('Arrakis desert',{width:100,height:86,subdivisions:16,updatable:true},scene);
  ground.position.y=-.4;ground.material=sand;ground.isPickable=false;
  const v=ground.getVerticesData(B3.VertexBuffer.PositionKind),idx=ground.getIndices();
  for(let i=0;i<v.length;i+=3) {
    const x=v[i],z=v[i+2];
    const exposure=Math.max(0,Math.min(1,(x-10)/16));
    // Long diagonal crests are readable in the wide overview, without textures/FX.
    const crest=Math.max(0,Math.sin(x*.20+z*.13));
    v[i+1]=exposure*(1.15*crest*crest+.45*Math.sin(x*.12-z*.24));
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind,v);
  const normals=[];B3.VertexData.ComputeNormals(v,idx,normals);
  ground.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  // The Shield Wall: monumental landform behind a tight, gridded city.
  const ridge=M.CreateGround('Shield Wall mesas',{width:82,height:15,subdivisions:12,updatable:true},scene);
  ridge.position.set(-10,.22,-27);ridge.material=rock;ridge.isPickable=false;
  const rv=ridge.getVerticesData(B3.VertexBuffer.PositionKind),ri=ridge.getIndices();
  for(let i=0;i<rv.length;i+=3){
    const x=rv[i]-10,z=rv[i+2]-27;
    rv[i+1]=1.1+4.2*Math.pow(Math.max(0,1-Math.abs(z+27)/8),.85)
      +.55*Math.sin(x*.41)*Math.cos(z*.35);
  }
  ridge.updateVerticesData(B3.VertexBuffer.PositionKind,rv);
  const rn=[];B3.VertexData.ComputeNormals(rv,ri,rn);
  ridge.updateVerticesData(B3.VertexBuffer.NormalKind,rn);
  // Nested defended terraces; outside eastern gate the terrain opens into dunes.
  box('Arrakeen city plinth',-12,-.20,-5,42,.4,31,rock);
  for(const z of [-20,10])box('Arrakeen fortified wall',-12,1.35,z,44,3,1.3,wall);
  box('Western fortified wall',-34,1.35,-5,1.3,3,31,wall);
  for(const z of [-18,-10,-2,6]) {
    box('Eastern defensive curtain',10,1.35,z,1.5,3,6.2,wall);
  }
  for(const [x,z] of [[-33,-20],[-11,-20],[10,-20],[-33,10],[-12,10],[10,10]]) {
    cyl('Shield Wall defensive tower',x,2.25,z,3.5,5.2,wall,10);
    cyl('Shield Wall tower cap',x,5.05,z,4.1,.65,light,10);
  }
  box('Eastern fortified gate',10,3.05,-5,3.1,6.5,7,wall);
  box('gate portal shadow',11.7,1.7,-5,.25,3.8,3.4,dark);
  box('gate lintel',11.9,4.1,-5,.9,1.2,5.1,light);
  // City is a dense collection of roof blocks, with deliberate clear streets and mission anchors.
  const base=M.CreateBox('Arrakeen flat-roof house master',{width:2.7,height:3,depth:2.4},scene);
  base.material=city;base.isPickable=false;base.setEnabled(false);
  const roof=M.CreateBox('Arrakeen roof master',{width:3.2,height:.23,depth:2.8},scene);
  roof.material=light;roof.isPickable=false;roof.setEnabled(false);
  const roofAlt=M.CreateBox('Arrakeen darker roof master',{width:3.05,height:.2,depth:2.65},scene);
  roofAlt.material=shadow;roofAlt.isPickable=false;roofAlt.setEnabled(false);
  for(let i=0;i<76;i++){
    const x=-30+(i*17%38),z=-17+(i*13%24);
    if ((x < -15 && z < -7) || (Math.abs(x+13)<3 && z>0)
      || Math.hypot(x+6,z-4)<4 || Math.hypot(x+25,z-4)<4)continue;
    const h=2+(i%4)*.65;
    const house=base.createInstance('Arrakeen block '+i);
    house.position.set(x,.08+h/2,z);house.scaling.y=h/3;
    const cap=(i%3===0?roofAlt:roof).createInstance('Arrakeen roof '+i);
    cap.position.set(x,.11+h,z);
  }
  // Palace silhouette: three distinct terraces, a raised audience hall, two
  // monumental flanking pylons, and a central ceremonial gate. Visible in overview.
  box('Atreides palace rock podium',-24,1.2,-14,21,2.2,15,rock);
  box('Atreides public colonnade',-24,3.45,-11.5,18,2.8,6,wall);
  box('Atreides main residence',-24,6.1,-15,16,6.4,10,palace);
  box('Atreides terrace dark reveal',-24,9.45,-15,17,.6,11,shadow);
  box('Atreides upper terrace',-24,10,-15,14,.8,9,bright);
  box('Atreides audience hall',-24,12.3,-16,9.5,4.3,6,palace);
  box('Atreides audience hall cornice',-24,14.7,-16,10.8,.6,6.9,bright);
  box('Atreides central royal crest',-24,12.2,-12.95,2.6,3.3,.22,green);
  for(const x of [-33.2,-14.8]) {
    box('Palace monumental pylon',x,8.4,-15,3.4,14.1,5,wall);
    box('Palace pylon recessed face',x,10.6,-12.42,1.6,5.6,.16,shadow);
    box('Palace pylon crown',x,15.65,-15,4.7,.85,5.9,bright);
    box('Atreides tall banner',x,11.2,-12.24,1.25,4.6,.14,green);
  }
  for(const z of [-11.1,-9.3,-7.5]) {
    box('Palace ceremonial staircase',-24,2.4+(z+11.1)*.45,z,6.3,.5,1.55,bright);
  }
  for(const x of [-29.5,-26.5,-21.5,-18.5]) {
    box('Palace rhythm of columns',x,3.8,-8.22,.72,3.5,.72,palace);
    box('Column capital',x,5.65,-8.22,1.12,.3,1.12,bright);
  }
  // Mission five: reception banquet in the outer gate courtyard; inner court
  // and palace remain behind the walls for the later story beats.
  box('Banquet reception court',5,.3,-5,7,.34,6,light);
  for(const x of [2.4,7.6])for(const z of [-7.5,-2.5])
    cyl('Banquet reception columns',x,1.7,z,.62,2.5,palace);
  box('Duncan last stand passage',-19,2.3,7,4,4.2,9,wall);
  box('Duncan gateway',-16.9,1.45,7,.25,2.4,2.3,dark);
  // Distinct urban texture in the overview: sunlit streets, stepped blocks and
  // a few civic roofs between the uniform instanced low-rise buildings.
  for(const [x,z,w,d] of [[-10,0,6,3.6],[-1,-9,5,4],[3,0,4,6],[-20,1,5,3]]) {
    box('Urban courtyard foundation',x,.12,z,w,.18,d,sandstone);
    box('Urban shaded arcade',x,1.3,z,w*.76,2.1,d*.56,shadow);
    box('Urban raised cornice',x,2.52,z,w*.88,.28,d*.7,bright);
  }
  // Missions 1-4: a readable desert approach runs from the arrival relay
  // towards the harvester and the city's east gate. Low static silhouettes only.
  for(let i=0;i<5;i++) {
    const x=39-i*3.4,z=13-i*3;
    box('Desert approach road',x,.07,z,4.6,.16,2.2,sandstone,-.26);
  }
  box('Approach relay shelter',38,.75,14,3.2,1.7,2.6,wall);
  box('Outer settlements',33,1.05,6,3.4,2.1,3,city);
  box('Arrival waystone',38,1.3,11,1.1,2.5,.8,bright);
  // Streets: irregular, broken up by fixed orientation landmarks.
  box('Arrakeen spice bazaar',-4,.85,4,8,1.2,5,rock);
  for(let i=0;i<4;i++)box('Spice market awning',-7+i*2,.95,5.4,1.7,.2,2,spice);
  box('Old Harkonnen palace wing',-12,3.6,-13,5,5.4,5,dark);
  box('Imperial landing platform',-26,.85,5,9,.65,6,light);
  cyl('Landing beacon',-29,1.8,7,.8,2.1,green);
  // Harvester is a true unmistakable machine silhouette with an articulated
  // intake and an elevated cockpit; no skeletal animation or particle FX.
  box('Spice harvester body',27,2.25,-1,11.5,3.8,6.5,dark,.15);
  box('Spice harvester upper deck',27,4.48,-1,8,.6,5.8,wall,.15);
  box('Spice harvester control cabin',23.9,5.8,-1,3.4,2.1,4,palace,.15);
  box('Harvester cockpit visor',22.1,5.8,-1,.16,1.1,2.8,shadow,.15);
  box('Harvester extractor neck',34,1.4,-1,4,.9,2.1,rock,.15);
  for(const x of [23,31])for(const z of [-3.4,1.4])cyl('Harvester crawler wheel',x,.65,z,2.4,1,rock,8);
  box('Harvester intake',33,.8,-1,4,.7,3,spice,.15);
  for(let i=0;i<6;i++){
    const x=13+i*5;
    box('Spice bloom',x,.12,13+(i%3)*3,2.2,.12,3.1,i%2?spice:dune,.34);
  }
  for(let i=0;i<5;i++){
    const x=19+i*5.3;
    box('Sandworm rising trail',x,.17,11+Math.sin(i*.75)*4,3.1,.3,1.2,rock,.42);
  }
  // Mission four: worm evacuation trace heading back to the outer defenses.
  for(let i=0;i<5;i++){
    const x=19+i*2.1,z=-5-i*.9;
    box('Evacuation churned sand',x,.2,z,2.4,.22,1.5,spice,.25);
  }
  // Mission nine: defenses just outside the Duncan gallery, before the finale.
  cyl('Shield generator',-17,1.75,-1,3,3,green,10);
  cyl('Shield generator crown',-17,3.45,-1,4,.45,light,10);
}