// Campaign 2.0 · C4.14 «Прибытие императора» — «Зеркало Падишаха».
// Light VI original IDs 50–59. One uninterrupted salt flat at the intact Shield Wall.
// All scenery is static, scene-owned Babylon geometry; no engine, animation, RTT or timers.
// Route/HUD/camera/dispose are owned exclusively by shared CampaignMapScene.
export function buildImperialSaltMirror(B3, scene, material, detail = true) {
  const M=B3.MeshBuilder;
  const mat={
    salt:material('padishah-vertex-salt','#ffffff'),
    crust:material('padishah-salt-crust','#e9d5af'),
    bright:material('padishah-white-salt','#f2e5c8'),
    seam:material('padishah-salt-cracks','#a39178'),
    rock:material('padishah-shield-rock','#4b505a'),
    rockLight:material('padishah-shield-edge','#76747c'),
    storm:material('padishah-distant-storm','#565765'),
    stormDark:material('padishah-storm-shadow','#414956'),
    iron:material('padishah-hull-dark','#505861'),
    steel:material('padishah-hull-light','#8e9697'),
    gold:material('padishah-brushed-gold','#c6a16c'),
    bronze:material('padishah-old-bronze','#86694c'),
    red:material('padishah-imperial-crimson','#772e43'),
    wine:material('padishah-bene-gesserit','#342f40'),
    shadow:material('padishah-stone-shadow','#807665'),
    linen:material('padishah-pavilion-linen','#dbbfa4'),
    guard:material('padishah-sardaukar','#3c4550'),
    watch:material('padishah-watch-signals','#b5885b'),
  };
  const box=(name,x,y,z,w,h,d,tint,angle=0)=>{
    const m=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    m.position.set(x,y,z);m.rotation.y=angle;m.material=tint;m.isPickable=false;return m;
  };
  const cyl=(name,x,y,z,d,h,tint,sides=7,top=d)=>{
    const m=M.CreateCylinder(name,{diameterBottom:d,diameterTop:top,height:h,tessellation:sides},scene);
    m.position.set(x,y,z);m.material=tint;m.isPickable=false;return m;
  };
  const line=(name,x1,z1,x2,z2,y,w,tint)=>{
    const dx=x2-x1,dz=z2-z1;
    return box(name,(x1+x2)/2,y,(z1+z2)/2,w,.09,Math.hypot(dx,dz),tint,Math.atan2(-dx,dz));
  };
  const wedge=(name,x,y,z,w,h,d,tint)=>{
    // Six-faced, flat-shaded tapered ship hull / ceremonial canopy.
    const p=[-w/2,-h/2,-d/2, w/2,-h/2,-d/2,
      w/2,-h/2,d/2, -w/2,-h/2,d/2,
      -w*.38,h/2,-d*.36, w*.24,h/2,-d*.36,
      w*.24,h/2,d*.36, -w*.38,h/2,d*.36];
    const f=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
    const positions=[],indices=[];
    f.forEach(face=>{const q=positions.length/3;face.forEach(i=>positions.push(...p.slice(i*3,i*3+3)));indices.push(q,q+1,q+2,q,q+2,q+3);});
    const data=new B3.VertexData();data.positions=positions;data.indices=indices;data.normals=[];
    B3.VertexData.ComputeNormals(positions,indices,data.normals);
    const mesh=new B3.Mesh(name,scene);data.applyToMesh(mesh);
    mesh.position.set(x,y,z);mesh.material=tint;mesh.isPickable=false;return mesh;
  };
  // One continuous salt terrain with muted, baked colour zones. Flat at the mission buttons.
  const ground=M.CreateGround('50-59 unbroken salt-flat world',{width:230,height:146,subdivisions:detail?40:26,updatable:true},scene);
  const positions=ground.getVerticesData(B3.VertexBuffer.PositionKind),cols=[];
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],z=positions[i+2];
    const storm=clamp((x-11)/94,0,.47);
    const wave=.024*Math.sin(x*.23+z*.17)+.012*Math.cos(x*.41-z*.21);
    positions[i+1]=-.38+wave;
    const trace=.028*Math.sin(x*.13+z*.21)+.018*Math.cos(x*.36-z*.19);
    cols.push(clamp(.89-storm*.41+trace,.45,1),clamp(.83-storm*.37+trace,.43,1),
      clamp(.70-storm*.26+trace,.42,1),1);
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind,positions);
  const normals=[];B3.VertexData.ComputeNormals(positions,ground.getIndices(),normals);
  ground.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  ground.setVerticesData(B3.VertexBuffer.ColorKind,cols);
  ground.useVertexColors=true;ground.material=mat.salt;ground.isPickable=false;

  // Broad seams and shallow plating imply a reflective, dried salt mirror;
  // no dynamic reflection probes, glass, shader effects or moving water.
  for(let i=0;i<(detail?17:8);i++){
    const x=-79+i*(detail?9.5:21.5),z=-25+(i*13%16);
    line('salt fracture '+i,x,z,x+6-(i%3)*1.3,z+2.8+(i%3),-.25,.12,mat.seam);
    if(detail&&i%2===0)line('salt fracture branch '+i,x+3,z+1.4,x+4,z-1.2,-.24,.09,mat.seam);
  }
  for(let i=0;i<(detail?7:4);i++){
    const x=-72+i*(detail?23:48);
    box('salt evaporite plate '+i,x,-.26,31-(i%2)*5,13,.04,5,i%2?mat.crust:mat.bright,.12);
  }
  // A low uninterrupted escarpment anchors the horizon INSIDE 844/667
  // landscape viewports. Taller monoliths rise immediately behind the shelf;
  // their crests remain visible rather than being cropped above the canvas.
  box('shield-wall-unbroken-continuous-foot',0,2.2,43,214,5.0,9,mat.rock);
  for(let i=0;i<(detail?13:9);i++){
    const x=-91+i*(detail?15.3:22.8),h=7+(i*5%6);
    wedge('unbroken Shield Wall massif '+i,x,5.3+h*.36,50+(i%3)*1.6,
      detail?20:27,h,14,i%3===0?mat.rockLight:mat.rock);
    if(detail&&i%2===0)
      box('shield wall sunlit weathered ledge '+i,x,4.6,38,11,.42,1.6,mat.rockLight,.06);
  }
  for(let i=0;i<(detail?7:5);i++){
    const x=-71+i*(detail?25:37);
    wedge('static approaching storm shelf '+i,x,13+(i%3)*1.5,74,detail?32:40,10+(i%3)*2,11,
      i%2?mat.storm:mat.stormDark);
  }

  // ID50: landing ceremony on open salt, unlike the Kaitain palace/throne.
  box('50 reception dais',-61,.16,3,20,.50,10,mat.crust);
  for(const x of [-69,-61,-53])box('50 gilded aisle seam '+x,x,.45,-2,.25,.08,11,mat.gold);
  for(const x of [-71,-51]){
    cyl('50 reception standard mast '+x,x,5,4,.45,10,mat.bronze,6);
    box('50 imperial hanging standard '+x,x+1.1,7.1,4,2.2,4.5,.22,mat.red);
    box('50 lion device '+x,x+1.1,7.3,3.8,.7,1.2,.25,mat.gold);
  }
  // ID51: monumental ship aligned with the actual MOBILE camera, rather
  // than hidden above the steep horizon. Its landed prow stands to the right
  // of the open ID50 reception square; interactive route stays unobstructed.
  wedge('51 padishah great transport armored hull',-40,6.2,9,42,7.4,16,mat.steel);
  box('51 imperial gilded dorsal spine',-40,10.8,9,31,2.2,5,mat.gold,.04);
  wedge('51 prow of the Padishah transport',-17,5.8,9,18,5,9,mat.iron);
  box('51 dark stern hangar opening',-61.5,4.9,8,2.8,5.1,8,mat.wine);
  for(const x of [-54,-29]){
    box('51 heavy landing support '+x,x,3.3,3.2,3.4,6.6,3.5,mat.iron);
    box('51 planted golden landing foot '+x,x,.44,3.2,8,.88,7,mat.bronze);
  }
  for(const [i,z] of [[0,-.5],[1,19]]){
    const fin=wedge('51 crimson swept imperial wing '+i,-44,8.25,z,23,3.5,5,mat.red);
    fin.rotation.z=i?-.13:.13;
    box('51 gilded wing-edge '+i,-43,9.3,z,15,.42,.72,mat.gold);
  }
  for(const x of [-52,-40,-28]){
    wedge('51 imperial tall dorsal fin '+x,x,11.65,9,5.8,4.5,3.4,mat.red);
    box('51 gold heraldic vertical inset '+x,x,12.7,7.3,.42,2.3,.20,mat.gold);
  }
  box('51 immense plated waist',-40,7.0,.8,28,1.3,.42,mat.gold);
  if(detail){
    for(const x of [-54,-47,-40,-33,-26])
      box('51 gold-set side plating '+x,x,8,.48,4.6,.72,.24,mat.iron);
  }
  // A few remote orbiting silhouettes, static as they would be in a painting.
  for(let i=0;i<(detail?4:2);i++){
    const remote=wedge('51 distant imperial orbital ship '+i,-28+i*22,26+i%2*2,68,
      6.8,1.5,3,mat.steel);remote.rotation.y=.17;
  }
  // ID52: temporary capital in two ranks, with clear slots between roofs.
  const tent=(id,x,z,w,tint)=>{
    box(id+' tent dark footing',x,.12,z,w+.5,.24,6.5,mat.shadow);
    wedge(id+' high fabric roof',x,4,z,w,5.9,7,tint);
    box(id+' broad open doorway',x,1.1,z-3.58,w*.45,2.2,.36,mat.wine);
    for(const sx of [-1,1])cyl(id+' awning post '+sx,x+sx*w*.34,2.7,z-3.8,.25,5.4,mat.bronze,6);
  };
  for(const [i,x,z] of [[0,-41,22],[1,-32,24],[2,-24,22]]){
    tent('52 imperial field pavilion '+i,x,z,7.6,i%2?mat.linen:mat.red);
  }
  if(detail)for(const [i,x,z] of [[0,-39,36],[1,-27,36]])tent('52 rear palace pavilion '+i,x,z,6.5,mat.linen);
  // ID53: Fenring's quiet intelligence corridor at the rear of the court.
  for(const x of [-23,-16,-9])box('53 privacy screen '+x,x,2.2,16,5,4.4,.6,mat.shadow,.10);
  box('53 concealed courier watch',-19,3.5,26,6,7,5,mat.iron);
  line('53 secret courier track',-27,10,-11,10,.05,.4,mat.bronze);
  // ID54: gom jabbar / an isolated, light-starved Bene Gesserit trial tent.
  tent('54 gom jabbar enclosed chamber',-7,25,11,mat.wine);
  box('54 red warning slit',-7,3.3,21.25,.34,4,.18,mat.red);
  box('54 ritual box silhouette',-3.6,1.45,16.7,2.2,2.9,2.7,mat.iron);
  // ID55: guardians trained on Salusa — rigid watch platforms and sentry lines.
  for(const x of [3,12]){
    box('55 Salusa watchtower '+x,x,4.7,22,3.4,9.4,3.4,mat.iron);
    box('55 Salusa lookout crown '+x,x,9.8,22,5.4,.8,5.4,mat.gold);
  }
  box('55 guard courtyard',8,.22,31,19,.44,12,mat.shadow);
  // ID56: Mohiam's plotting pavillion, two conflicting oblique roofs.
  tent('56 reverend mother antechamber',20,23,12,mat.wine);
  wedge('56 overlapping maternal veil',23,6.1,27,11,3,5,mat.red);
  box('56 static counterlight',20,1.5,18,.38,2.9,.14,mat.gold);
  // ID57: an open Landsraad circle, one ring of competing houses.
  cyl('57 Landsraad round assembly',34,.29,20,20,.58,mat.crust,16);
  cyl('57 empty negotiating centre',34,.38,20,9,.18,mat.shadow,16);
  for(let i=0;i<(detail?7:5);i++){
    const a=(i/(detail?7:5))*Math.PI*2,x=34+12.8*Math.cos(a),z=20+10*Math.sin(a);
    cyl('57 house herald mast '+i,x,3.3,z,.32,6.6,mat.bronze,6);
    box('57 feudal house device '+i,x+.62,4.5,z,1.4,2.5,.18,
      i%3===0?mat.red:i%3===1?mat.steel:mat.gold);
  }
  // ID58: Fremen observation beyond court surveillance; the weather turns.
  wedge('58 far desert lookout rock',47,2.5,19,15,5,9,mat.rockLight);
  cyl('58 wind bearing instrument',46,6.8,15,.48,9.5,mat.steel,6);
  for(let i=0;i<(detail?3:1);i++)box('58 still storm wind vane '+i,46+i*.3,11.1,15,4,.22,.4,mat.watch,i*1.04);
  for(let i=0;i<3;i++)box('58 distant Fremen screen '+i,43+i*5,.7,32,3,1.4,.8,mat.shadow);
  // ID59: a grand legion review, not the invasion. Static regiment, intact Wall.
  // Bring the sardaukar forward so they read as figures, not tiny horizon dots.
  box('59 panoramic imperial parade square',62,.10,17.5,31,.40,27,mat.shadow);
  for(const x of [48.6,75.4]){
    box('59 monumental imperial pillar '+x,x,4.8,26,2.8,9.6,2.8,mat.rock);
    box('59 golden pillar capital '+x,x,9.75,26,4.1,.7,4.1,mat.gold);
    box('59 blood-crimson long hanging flag '+x,x+1.63,6.5,25.9,2.9,5.1,.27,mat.red);
  }
  box('59 imperial triumphal arch lintel',62,9.95,26,30,1.3,2.4,mat.gold);
  box('59 imperial crimson arch inlay',62,9.72,24.62,21,.65,.22,mat.red);
  box('59 imperial command dais',62,1.25,31,18,2.5,7,mat.crust);
  box('59 massive golden command dais face',62,2.2,27.4,17,.82,.24,mat.gold);
  if(detail){
    for(let i=0;i<4;i++)box('59 sunlit gilded processional tile '+i,
      53+i*6,.37,4,3.8,.10,1.1,mat.gold);
  }
  // One mesh per body part TEMPLATE, many instances: silhouette remains
  // readable on mobile without one draw call or material per soldier.
  const soldier=cyl('padishah-sardaukar-body-template',0,1.16,0,1.08,2.35,mat.guard,6,.72);
  const helm=cyl('padishah-sardaukar-helm-template',0,2.82,0,1.08,.86,mat.steel,6,.66);
  const pike=cyl('padishah-sardaukar-ceremonial-pike-template',0,2,0,.11,3.95,mat.gold,5);
  soldier.setEnabled(false);helm.setEnabled(false);pike.setEnabled(false);
  const rows=detail?6:4,columns=detail?11:8;
  for(let r=0;r<rows;r++)for(let k=0;k<columns;k++){
    const x=50.3+k*(detail?2.36:3.35),z=7.2+r*(detail?2.7:4.1);
    const b=soldier.createInstance('59 Sardaukar full regiment '+r+' '+k);
    b.position.set(x,1.29,z);b.isPickable=false;
    const h=helm.createInstance('59 Sardaukar helmet '+r+' '+k);
    h.position.set(x,2.93,z);h.isPickable=false;
    const p=pike.createInstance('59 Sardaukar upright gilded standard '+r+' '+k);
    p.position.set(x+.68,1.97,z);p.isPickable=false;
  }
  if(detail)for(let i=0;i<6;i++){
    const x=51+i*4.4;
    line('59 parade orderly golden procession line '+i,x,4.1,x,5.8,.35,.15,mat.gold);
  }
  // EngineHost puts the scene into static after the camera/HUD settle.
}
