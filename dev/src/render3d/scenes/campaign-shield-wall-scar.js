// Campaign 2.0 · C4.15 «Битва за Арракин» — «Шрам Защитной стены».
// Light VII original missions 60–69. One static, connected desert-to-throne diorama.
// Only this scene owns the meshes; no Engine/rAF/timers/RTT/particles or battle logic.
export function buildShieldWallScar(B3, scene, material, detail = true) {
  const M=B3.MeshBuilder;
  const mat={
    sand:material('scar-desert-vertex-sand','#ffffff'),
    ash:material('scar-dark-ash','#57565b'),
    storm:material('scar-coriolis-front','#414650'),
    stormEdge:material('scar-dust-rim','#777170'),
    rock:material('scar-shield-basalt','#514f51'),
    fracture:material('scar-blasted-rock','#a28a73'),
    fractureLight:material('scar-atom-lit-crack','#d8b17e'),
    dune:material('scar-wind-sculpted-sand','#b78a57'),
    city:material('scar-arrakeen-stone','#9a7a5c'),
    shadow:material('scar-city-shadow','#62554d'),
    worm:material('scar-shai-hulud-hide','#635348'),
    wormRib:material('scar-worm-ribs','#9e7e5d'),
    maw:material('scar-worm-maw','#2f2d2c'),
    tooth:material('scar-worm-teeth','#c6aa88'),
    iron:material('scar-legion-steel','#404b52'),
    helm:material('scar-legion-helm','#899092'),
    banner:material('scar-imperial-crimson','#762f3b'),
    darkBanner:material('scar-harkonnen-wine','#372b37'),
    tent:material('scar-imperial-tent','#a66e5c'),
    brass:material('scar-antique-gold','#c6a46d'),
    dust:material('scar-dust-amber','#d5ab72'),
  };
  const box=(name,x,y,z,w,h,d,tint,angle=0)=>{
    const o=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    o.position.set(x,y,z);o.rotation.y=angle;o.material=tint;o.isPickable=false;return o;
  };
  const cyl=(name,x,y,z,d,h,tint,sides=8,top=d)=>{
    const o=M.CreateCylinder(name,{diameterBottom:d,diameterTop:top,height:h,tessellation:sides},scene);
    o.position.set(x,y,z);o.material=tint;o.isPickable=false;return o;
  };
  const wedge=(name,x,y,z,w,h,d,tint)=>{
    const positions=[
      -w/2,-h/2,-d/2, w/2,-h/2,-d/2, w/2,-h/2,d/2,-w/2,-h/2,d/2,
      -w*.36,h/2,-d*.4,w*.28,h/2,-d*.35,w*.28,h/2,d*.4,-w*.36,h/2,d*.4
    ];
    const faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
    const verts=[],indices=[];
    for(const f of faces){const n=verts.length/3;for(const i of f)verts.push(...positions.slice(3*i,3*i+3));indices.push(n,n+1,n+2,n,n+2,n+3);}
    const data=new B3.VertexData();data.positions=verts;data.indices=indices;data.normals=[];
    B3.VertexData.ComputeNormals(verts,indices,data.normals);
    const o=new B3.Mesh(name,scene);data.applyToMesh(o);
    o.position.set(x,y,z);o.material=tint;o.isPickable=false;return o;
  };
  const line=(name,x1,z1,x2,z2,y,width,tint)=>{
    const dx=x2-x1,dz=z2-z1;
    return box(name,(x1+x2)/2,y,(z1+z2)/2,width,.08,Math.hypot(dx,dz),tint,Math.atan2(-dx,dz));
  };
  // Continuous ground, flat beneath world-space mission markers.
  // Sand colour and darkened storm flank are baked into vertex colours.
  const ground=M.CreateGround('60-69 single Arrakeen battlefield',
    {width:248,height:156,subdivisions:detail?40:22,updatable:true},scene);
  const positions=ground.getVerticesData(B3.VertexBuffer.PositionKind),colors=[];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],z=positions[i+2];
    const wave=.045*Math.sin(x*.19+z*.22)+.025*Math.cos(x*.39-z*.18);
    positions[i+1]=-.4+wave;
    const storm=clamp((-x-21)/72,0,.55),warm=clamp((x+10)/110,0,.24);
    const trace=.025*Math.cos(x*.23+z*.12);
    colors.push(clamp(.70-storm*.35+warm+trace,.24,1),
      clamp(.52-storm*.23+warm*.45+trace,.25,1),
      clamp(.35-storm*.07+warm*.12+trace,.25,1),1);
  }
  ground.updateVerticesData(B3.VertexBuffer.PositionKind,positions);
  const normals=[];B3.VertexData.ComputeNormals(positions,ground.getIndices(),normals);
  ground.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  ground.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  ground.useVertexColors=true;ground.material=mat.sand;ground.isPickable=false;

  // 60: Coriolis sky shelf and wind-carved dunes, all static low-poly shapes.
  for(let i=0;i<(detail?7:4);i++){
    const x=-104+i*(detail?16:30);
    wedge('60 Coriolis dark cloud '+i,x,14+i%3*1.8,68,detail?22:36,8+i%2*3,11,
      i%2?mat.ash:mat.storm);
  }
  for(let i=0;i<(detail?8:5);i++){
    const x=-103+i*(detail?10:17);
    wedge('60 standing dune '+i,x,.7,11+(i%3)*9,16,2.1,10,i%2?mat.dune:mat.dust);
  }
  wedge('60 Fremen lookout crest',-72,2.1,13,13,5.3,12,mat.rock);
  line('60 wind-shear line',-88,7,-60,16,.06,.23,mat.dust);

  // 61: TWO physically separated Shield Wall shoulders. A 24-unit open gap
  // is preserved between z=-9 and z=15: the worm route genuinely crosses it.
  // Short broken shoulders frame a navigable opening without becoming a
  // foreground blind wall when viewed from the existing south-facing camera.
  box('61 shield-scar-left-foot',-49,1.0,-18,7.5,2.6,5.5,mat.rock);
  box('61 shield-scar-right-foot',-49,2.0,24,13,4.9,16,mat.rock);
  for(const [side,zBase] of [['left',-16],['right',24]]){
    const n=detail?3:2;
    for(let i=0;i<n;i++){
      const z=zBase+(i-(n-1)/2)*(detail?6:9);
      wedge('61 shield-scar-'+side+'-broken-spire-'+i,-49,
        (side==='left'?4.4:6.4)+(i%3)*1.5,z,
        side==='left'?8.5:14,side==='left'?7.3:11+(i%3)*3,
        side==='left'?4.8:(detail?7.5:10),i%2?mat.rock:mat.fracture);
    }
  }
  for(const [i,z] of [[0,-3],[1,17]]){
    wedge('61 atom-broken wall face '+i,-48,i?4.2:2.4,z,i?12:7,i?8:4.8,i?7:5,mat.fractureLight);
    for(let j=0;j<(detail?4:2);j++){
      wedge('61 shattered wall boulder '+i+'-'+j,-48+(j%2)*6,1.1,z+(i?1:-1)*j*3,
        4.5,2.8,5,j%2?mat.rock:mat.fracture);
    }
  }
  for(let i=0;i<(detail?8:4);i++){
    const x=-58+i*3.5;
    line('61 atom-blast sand furrow '+i,x,-10-(i%2)*1.4,x+7,5+i%3,.1,.16,mat.fractureLight);
  }

  // 62: giant worm, partly hidden behind dunes. Segmented silhouette but
  // no skinning/animation. The maw is a readable dark circle on the near side.
  // An ascending organic arc, emerging from the dune, replaces the straight
  // cylinder train: Shai-Hulud must NEVER read as an industrial pipe.
  const wormPath=[
    new B3.Vector3(-56,.3,38),new B3.Vector3(-48,1.2,34),
    new B3.Vector3(-42,3.4,30),new B3.Vector3(-37,6.7,26),
    new B3.Vector3(-33,10.3,22),new B3.Vector3(-32,7,17),
  ];
  const wormBody=M.CreateTube('62 Shai-Hulud colossal rising body',{
    path:wormPath,radius:5.5,tessellation:detail?12:7,
    cap:B3.Mesh.CAP_ALL
  },scene);
  wormBody.material=mat.worm;wormBody.isPickable=false;
  for(let i=0;i<(detail?4:2);i++){
    const p=wormPath[i+1];
    wedge('62 organic dune-backed dorsal plate '+i,p.x,p.y+4.2,p.z,
      5.4,1.65,7.8,mat.wormRib);
  }
  const mouth=cyl('62 Shai-Hulud circular maw',-32,7,15.6,11.8,.8,mat.maw,detail?14:9);
  mouth.rotation.x=Math.PI/2;
  const mawRim=M.CreateTorus('62 Shai-Hulud mouth rim',
    {diameter:12.1,thickness:1.28,tessellation:detail?18:11},scene);
  mawRim.position.set(-32,7,15.2);mawRim.rotation.x=Math.PI/2;
  mawRim.material=mat.wormRib;mawRim.isPickable=false;
  const nTeeth=detail?14:8;
  for(let i=0;i<nTeeth;i++){
    const a=i*Math.PI*2/nTeeth;
    const fang=cyl('62 inward-pointing worm fang '+i,
      -32+4.7*Math.cos(a),7+4.7*Math.sin(a),14.65,
      1.6,2.55,mat.tooth,5,0);
    fang.rotation.z=a+Math.PI/2;
  }
  for(const [i,x,z] of [[0,-46,7],[1,-23,11],[2,-5,16]]){
    wedge('62 static displaced sand wave '+i,x,1.1,z,17,3.1,7,mat.dust);
  }
  // Additional remote worm is merely a silhouette: no full second mesh.
  for(let i=0;i<(detail?3:2);i++)wedge('62 distant worm silhouette '+i,
    -20+i*11,8+i%2*2,55,15,5,7,mat.worm);

  // 63: recognizable Arrakeen approaches, not the old intact city/palace.
  for(let i=0;i<(detail?11:6);i++){
    const x=-34+i*(detail?4:7),z=detail?29+i%3*7:31+i%3*8;
    box('63 ruined Arrakeen terrace '+i,x,1.8,z,5,3.6+(i%3)*2.2,5,mat.city);
    if(i%3===0)wedge('63 collapsed city crown '+i,x,5.1,z,7,2.1,5,mat.shadow);
  }
  for(let i=0;i<(detail?8:4);i++){
    const x=-31+i*5.3;
    box('63 defeated legion fallen barricade '+i,x,.42,12+(i%2)*5,5,.62,1.8,mat.iron,.23*i);
    if(i%2===0)line('63 legion dropped standard '+i,x,12,x+3,15,.28,.15,mat.brass);
  }
  // Cheap reused body/helmet meshes; many troops still read as a broken army.
  const body=cyl('63 Sardaukar source body',0,1.25,0,.98,2.4,mat.iron,6,.65);
  const head=cyl('63 Sardaukar source helmet',0,2.86,0,1.0,.73,mat.helm,6,.75);
  body.setEnabled(false);head.setEnabled(false);
  for(let i=0;i<(detail?28:12);i++){
    const x=-30+(i%7)*4.8,z=21+Math.floor(i/7)*3.5+(i%3);
    const b=body.createInstance('63 broken legion trooper '+i);
    b.position.set(x,1.25,z);b.rotation.z=i%6===0?.42:0;b.isPickable=false;
    const h=head.createInstance('63 broken legion helmet '+i);
    h.position.set(x,2.86,z);h.rotation.z=i%6===0?.42:0;h.isPickable=false;
  }

  const tent=(name,x,z,w,d,height,tint)=>{
    box(name+' raised plinth',x,.24,z,w,.48,d,mat.shadow);
    // Four sloping faces with a high crest: an unmistakable imperial tent,
    // not the long red warehouse silhouette of the first WebGL candidate.
    const canopy=cyl(name+' massive sloping roof',x,height*.78,z,w,
      height*.95,tint,4,2.8);
    canopy.scaling.z=d/w;canopy.rotation.y=Math.PI/4;
    cyl(name+' gilded rooftop finial',x,height*1.46,z,.38,height*.36,mat.brass,5,.12);
    for(const side of [-1,1]){
      box(name+' banner '+side,x+side*w*.37,height*.52,z-d*.3,
        w*.13,height*.66,.25,mat.banner);
    }
  };
  // 64: Shaddam's field command tent, with a large readable frontage.
  tent('64 Padishah colossal battle tent',-7,26,29,23,14,mat.banner);
  box('64 huge imperial entrance',-7,3.0,14.4,9,5.7,.48,mat.darkBanner);
  for(const x of [-18,4])cyl('64 bronze standard '+x,x,5,14,.45,10,mat.brass,6);
  // 65: Harkonnen debts, distinctly smaller and dark, inside the SAME camp.
  tent('65 Harkonnen broken pavilion',8,28,14,13,7,mat.darkBanner);
  wedge('65 toppled Harkonnen crest',8,.85,16,7,1.5,5,mat.banner);
  box('65 abandoned Baron dais',8,.47,20,8,.9,4,mat.brass);
  // 66: Fenring's choice is a narrow corridor of shadows, not an extra arena.
  for(const x of [17,24]){
    box('66 Fenring silent colonnade '+x,x,3.9,25,1.25,7.8,1.25,mat.rock);
    box('66 shadowed hanging silk '+x,x+.8,4,25,1.7,5.5,.18,mat.darkBanner);
  }
  line('66 Fenring unchosen path',18,16,24,19,.08,.26,mat.brass);

  // 67: crisp open knife duel ring, no 3D characters or new combat mechanics.
  cyl('67 Feyd Muaddib open knife ring',35,.13,19,20,.36,mat.fracture,18);
  cyl('67 knife duel sand circle',35,.36,19,14,.13,mat.dust,18);
  for(let i=0;i<(detail?8:4);i++){
    const a=i*Math.PI*2/(detail?8:4),x=35+12*Math.cos(a),z=19+9*Math.sin(a);
    cyl('67 torn duel standard '+i,x,2.6,z,.3,5,mat.iron,5);
  }
  // 68: last guarded threshold; the throne is visible behind it.
  for(const x of [45,57]){
    box('68 last Sardaukar gate '+x,x,5.2,27,2.6,10.5,2.8,mat.rock);
    box('68 faded imperial battle flag '+x,x+1,6.5,25,2.1,5,.2,mat.banner);
  }
  box('68 royal gate lintel',51,10,27,15,1.25,2.5,mat.brass);
  for(let i=0;i<(detail?6:3);i++){
    const x=46+i*(detail?2:4);
    const b=body.createInstance('68 final royal guard '+i);
    b.position.set(x,1.25,20.8);b.isPickable=false;
    const h=head.createInstance('68 final royal helmet '+i);
    h.position.set(x,2.86,20.8);h.isPickable=false;
  }
  // 69: field throne after the fall. No Kaitain hall or intact L:5 parade.
  box('69 deserted imperial throne plinth',64,.83,20.5,17,1.8,12,mat.fracture);
  box('69 empty golden throne seat',64,2.6,21,8,2.3,5.0,mat.brass);
  box('69 empty golden throne back',64,7.4,23.2,9,9.7,1.9,mat.brass);
  for(const x of [60.6,67.4]){
    box('69 throne gilt corner '+x,x,12.15,23.1,1.05,2.2,2.2,mat.fractureLight);
    cyl('69 field throne lion standard '+x,x,4.9,25.2,2.6,9,mat.brass,5,1.5);
  }
  box('69 broken crimson imperial standard',74,4.0,27,1,8,.8,mat.banner,.29);
  wedge('69 torn standard fallen cloth',75,1.1,28,9,2.4,5.4,mat.banner);
  for(let i=0;i<(detail?5:3);i++)
    line('69 throne dust and trailing footprints '+i,59+i*2,14,60+i*2,19,.08,.16,mat.dust);
  // Shared CampaignMapScene owns route, HUD, gestures, wake/static, and disposal.
}
