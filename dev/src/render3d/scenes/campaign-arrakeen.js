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
    v[i+1]=exposure*(.36*Math.sin(x*.23+z*.14)+.23*Math.sin(x*.47-z*.22));
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
  for(let i=0;i<76;i++){
    const x=-30+(i*17%38),z=-17+(i*13%24);
    if ((x < -15 && z < -7) || (Math.abs(x+13)<3 && z>0)
      || Math.hypot(x+6,z-4)<4 || Math.hypot(x+25,z-4)<4)continue;
    const h=2+(i%4)*.65;
    const house=base.createInstance('Arrakeen block '+i);
    house.position.set(x,.08+h/2,z);house.scaling.y=h/3;
    const cap=roof.createInstance('Arrakeen roof '+i);
    cap.position.set(x,.11+h,z);
  }
  // Palace of House Atreides, elevated behind the densely built city.
  box('Atreides palace platform',-24,1.1,-14,17,2,11,rock);
  box('Atreides main residence',-24,4.2,-14,14,5,8,palace);
  box('Atreides palace upper terrace',-24,7.1,-14,10,1,6,light);
  box('Atreides audience hall',-24,9,-14,6,3.3,4,palace);
  for(const x of [-31,-17]) {
    box('Palace bastion',x,5.6,-14,2.7,8,3,wall);
    box('Palace bastion cornice',x,9.8,-14,3.4,.45,3.6,light);
    box('Atreides banner',x,8,-12.25,1.2,3,.12,green);
  }
  // A sheltered banquet courtyard and arched passage, tied to chapter beats.
  box('Banquet court',-14,.92,-1,9,.4,7,light);
  for(const x of [-18,-10])for(const z of [-4,2])cyl('Banquet colonnade',x,2.1,z,.65,3.1,palace);
  box('Duncan last stand passage',-19,2.3,7,4,4.2,9,wall);
  box('Duncan gateway',-16.9,1.45,7,.25,2.4,2.3,dark);
  // Streets: irregular, broken up by fixed orientation landmarks.
  box('Arrakeen spice bazaar',-4,.85,4,8,1.2,5,rock);
  for(let i=0;i<4;i++)box('Spice market awning',-7+i*2,.95,5.4,1.7,.2,2,spice);
  box('Old Harkonnen palace wing',-12,3.6,-13,5,5.4,5,dark);
  box('Imperial landing platform',-26,.85,5,9,.65,6,light);
  cyl('Landing beacon',-29,1.8,7,.8,2.1,green);
  // Harvester and worm-trace are visible silhouettes, not costly animated actors.
  box('Spice harvester body',27,1.6,-1,10,3,6,dark,.15);
  box('Spice harvester hood',27,3.35,-1,7,.7,5,wall,.15);
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
  // Shield generator presents a distinct silhouette for mission nine.
  cyl('Shield generator',5,1.75,8,3,3,green,10);
  cyl('Shield generator crown',5,3.45,8,4,.45,light,10);
}