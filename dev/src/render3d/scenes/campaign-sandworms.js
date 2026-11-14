// Campaign 2.0 · C4.10 «Песчаные черви Дюны»: «Пульс глубин».
// A SINGLE living desert basin, not C4.7's historical war strip, C4.8's
// floating convoy islands or C4.9's Corrin siege citadel.
// Static geometry, no timers/extra Engine/render loop, no gameplay changes.
export function buildSandworms(B3,S,material,detail=true){
  const M=B3.MeshBuilder;
  const mat={
    ground:material('pulse-earth','#ffffff'),salt:material('pulse-salt','#8e8a90'),
    dark:material('pulse-black','#242936'),machine:material('pulse-machine','#3b4552'),
    metal:material('pulse-metal','#756f92'),edge:material('pulse-edge','#a6a2bc'),
    ash:material('pulse-ash','#965d49'),glass:material('pulse-fused-sand','#654e56'),
    dune:material('pulse-dune','#9f845f'),gold:material('pulse-gold','#c7a36e'),
    ivory:material('pulse-ivory','#aaa092'),olive:material('pulse-sandtrout','#a0a98a'),
    memory:material('pulse-memory','#6b6b83'),human:material('pulse-human','#f0d5a4'),
    red:material('pulse-red','#aa614d'),
  };
  mat.machine.emissiveColor=B3.Color3.FromHexString('#141b25');
  mat.human.emissiveColor=B3.Color3.FromHexString('#554128');
  const box=(n,x,y,z,w,h,d,m)=>{
    const a=M.CreateBox(n,{width:w,height:h,depth:d},S);
    a.position.set(x,y,z);a.material=m;a.isPickable=false;return a;
  };
  const cyl=(n,x,y,z,d,h,m,sides=8,top=d)=>{
    const a=M.CreateCylinder(n,{diameterBottom:d,diameterTop:top,height:h,tessellation:sides},S);
    a.position.set(x,y,z);a.material=m;a.isPickable=false;return a;
  };
  const sphere=(n,x,y,z,d,m,segments=9)=>{
    const a=M.CreateSphere(n,{diameter:d,segments},S);
    a.position.set(x,y,z);a.material=m;a.isPickable=false;return a;
  };
  const nodes=[[-48,22],[-35,30],[-19,26],[-7,13],[-9,-4],[3,-18],
    [20,-27],[36,-20],[43,-3],[38,15]];
  // A single, cheap shaded ground mesh. Vertex colors tell the arc from
  // cold dead salt to golden new life. No fragment FX or moving terrain.
  const ground=M.CreateGround('reborn desert uninterrupted terrain',
    {width:142,height:106,subdivisions:52},S);
  const vertices=ground.getVerticesData(B3.VertexBuffer.PositionKind),colors=[];
  const stages=[[.16,.18,.24],[.30,.28,.32],[.46,.35,.29],[.62,.49,.34]];
  const lerp=(a,b,t)=>a+(b-a)*t;
  for(let i=0;i<vertices.length;i+=3){
    const x=vertices[i],z=vertices[i+2];
    let d=Infinity,progress=0;
    for(let k=0;k<nodes.length-1;k++){
      const [ax,az]=nodes[k],[bx,bz]=nodes[k+1],dx=bx-ax,dz=bz-az;
      const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
      const r=(x-ax-t*dx)**2+(z-az-t*dz)**2;
      if(r<d){d=r;progress=(k+t)/9;}
    }
    const near=Math.min(...nodes.map(([a,b])=>Math.hypot(a-x,b-z)));
    const keep=Math.max(0,Math.min(1,(near-3.8)/6));
    const ripple=.31*Math.sin(.18*x+.23*z)+.19*Math.cos(.29*x-.15*z);
    const dunes=Math.max(0,progress-.28)*1.6*(.60*Math.sin(.19*x+.14*z)+.4*Math.sin(.11*x-.26*z));
    vertices[i+1]=-.32+keep*(ripple+dunes);
    const t=progress*3,k=Math.min(2,Math.floor(t)),f=t-k;
    for(let c=0;c<3;c++)colors.push(
      Math.max(0,Math.min(1,lerp(stages[k][c],stages[k+1][c],f)+.027*Math.sin(x*.63+z*.38))));
    colors.push(1);
  }
  ground.setVerticesData(B3.VertexBuffer.PositionKind,vertices);
  const normals=[];
  B3.VertexData.ComputeNormals(vertices,ground.getIndices(),normals);
  ground.setVerticesData(B3.VertexBuffer.NormalKind,normals);
  ground.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  ground.useVertexColors=true;ground.material=mat.ground;ground.isPickable=false;

  // Tapered dune crests as terrain sheets, not giant ellipsoid "eggs".
  // Their narrow ends and edges meet the ground. LOW has fewer subdivisions.
  const ridge=(name,x,z,w,length,height,m,angle=0)=>{
    const rows=detail?12:8,cols=detail?8:5;
    const positions=[],indices=[];
    for(let row=0;row<=rows;row++){
      const t=row/rows,fade=Math.pow(Math.sin(Math.PI*t),.85);
      for(let col=0;col<=cols;col++){
        const u=2*col/cols-1;
        positions.push(u*w*.5*fade,
          -.25+height*fade*fade*(1-u*u), (t-.5)*length);
      }
    }
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const k=row*(cols+1)+col,n=k+cols+1;
      indices.push(k,n,k+1,k+1,n,n+1);
    }
    const data=new B3.VertexData();
    data.positions=positions;data.indices=indices;data.normals=[];
    B3.VertexData.ComputeNormals(positions,indices,data.normals);
    const mesh=new B3.Mesh(name,S);
    data.applyToMesh(mesh);
    mesh.position.set(x,0,z);mesh.rotation.y=angle;
    mesh.material=m;mesh.isPickable=false;
    return mesh;
  };
  // Broad organic crosswind folds behind the mission nodes; no ten platforms.
  for(let i=0;i<15;i++){
    const x=-48+i*7.6,phase=i*.72;
    const z=20-35*Math.sin(Math.PI*i/14)+10*Math.sin(phase*.8);
    const active=i<5?.6:i<9?.9:1.45;
    ridge('ancient delta sand fold '+i,x,z+13,8+active*6,14+active*8,
      1.0+active*.9,i<6?mat.salt:i<10?mat.dune:mat.gold,.27*Math.sin(phase));
    if(detail&&i>5&&i%2===0)ridge('young dune '+i,x+3,z+19,7,15,.9,mat.dune,-.35);
  }
  // 200: cold machine shards at the old salt coast.
  box('200 arrival scar',-53,-.1,37,25,.35,8,mat.glass);
  for(const [x,z,h,tilt] of [[-58,39,15,-.18],[-50,36,19,.09],[-42,39,12,.20]]){
    box('200 black machine needle',x,h/2,z,3.2,h,3.8,mat.dark).rotation.z=tilt;
    box('200 cold sensor slit',x,h*.55,z-2.05,.35,h*.52,.14,mat.metal);
  }
  for(let i=0;i<4;i++)box('200 marching robot imprint',-57+i*4.5,.15,30,2.1,.3,4.5,mat.machine);

  // 201: the invisible ship is defined by a missing wedge of disturbed dust.
  for(const [x,z,h] of [[-42,39,4],[-29,41,6],[-23,35,3.6]])
    cyl('201 suspended dust sentinel',x,h/2,z,1.1,h,mat.salt,5,.3);
  box('201 interrupted phantom shadow',-35,.07,36,18,.12,4,mat.memory).rotation.y=-.25;
  for(let i=0;i<4;i++)
    box('201 intermittent wake '+i,-45+i*4,.13,33+(i%2)*1.4,2.3,.12,.7,mat.glass);

  // 202: the Tleilaxu resurrect three human silhouettes.
  box('202 ghola memory base',-19,.15,35,15,.4,10,mat.machine);
  for(const [i,x] of [[0,-25],[1,-19],[2,-13]]){
    cyl('202 memory plinth '+i,x,1.1,36,4.4,1.2,mat.salt,8);
    for(const side of [-1,1])box('202 opaque memory frame '+i,x+side*1.8,5.5,37,.55,8.6,.7,mat.edge);
    box('202 memory lintel '+i,x,9.5,37,4.1,.65,.8,mat.metal);
    const ghost=sphere('202 recurrent ghola figure '+i,x,5.2,36.8,2.1,mat.memory,8);
    ghost.scaling.set(.65,1.45,.55);
    cyl('202 ghola cradle '+i,x,2.1,36.9,2.3,.65,mat.ivory,6);
  }

  // 203: fused salt, machine search prongs, no animation or fire particle.
  for(let i=0;i<7;i++){
    const x=-17+i*3.5,z=20+(i%3)*3;
    box('203 fused glass scar '+i,x,.14,z,2.3,.18,12+i%3*2,mat.glass)
      .rotation.y=.36+(i%2)*.12;
    if(detail)box('203 burnt ember '+i,x,.26,z-2,1,.10,5,mat.ash).rotation.y=.3;
  }
  for(const x of [-13,0]){
    box('203 machine search blade',x,4,27,2,8,3,mat.dark).rotation.z=x<0?.23:-.15;
    box('203 threat engraving',x,7.2,25.3,.35,2.5,.18,mat.red);
  }

  // 204: the first sandtrout, embryonic and small in scale.
  for(let i=0;i<8;i++){
    const x=-17+(i%4)*4,z=3+Math.floor(i/4)*4.2;
    const life=sphere('204 sandtrout birth '+i,x,.48,z,2.9,mat.olive,detail?9:6);
    life.scaling.set(1.4,.25,.72);life.rotation.y=.2+i*.31;
  }
  for(const x of [-15,-7,1])
    box('204 salt membrane crack',x,.22,7,2,.13,8,mat.salt).rotation.y=.3;

  // 205: stone sails of the Sisterhood, no royal architecture.
  for(const [i,x,z,h] of [[0,-3,-10,7],[1,5,-7,11],[2,13,-9,8]]){
    cyl('205 sisters wind-sculpted sail '+i,x,h/2,z,3.1,h,mat.ivory,3,.26)
      .rotation.z=i===1?-.18:.14;
    box('205 banner staff '+i,x+2.3,4.7,z-1,.2,7.5,.25,mat.machine);
    if(detail)box('205 sisters battle cloth '+i,x+3.2,6.7,z-1,1.9,2.7,.12,mat.human);
  }
  box('205 sisterhood gathering line',3,.16,-8,15,.35,6,mat.salt);

  // 206: facedancers are represented by opposing, doubled masks.
  box('206 masquerade plain',20,.06,-17,21,.22,12,mat.salt);
  for(let i=0;i<4;i++){
    const x=10+i*6.4,z=-16+(i%2)*3;
    const mask=sphere('206 split identity mask '+i,x,5,z,5.2,
      i%2?mat.memory:mat.ivory,9);
    mask.scaling.set(.65,1.55,.32);mask.rotation.y=(i%2?-.25:.20);
    box('206 stolen profile '+i,x+1.3,5,z-1.12,1.9,4,.3,mat.machine);
    if(detail)box('206 hidden eye '+i,x-.5,6,z-1.17,1.15,.28,.14,mat.dark);
  }

  // 207: a low human wind-circle, not a fortress.
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,x=36+7.5*Math.cos(a),z=-8+6*Math.sin(a);
    cyl('207 human wind shelter '+i,x,1.6,z,4.3,2.9,mat.ivory,4,.35).rotation.y=a*.5;
    if(detail)box('207 refuge entrance '+i,x,1.1,z-1.6,1.35,1.8,.18,mat.memory);
  }
  cyl('207 gathered campfire',36,.42,-8,3.3,.22,mat.human,9);
  for(const x of [29,43])cyl('207 final human beacon',x,2.7,-10,.65,5,mat.human,6,.2);

  // 208: the young worms displace the sand itself.
  for(let i=0;i<5;i++){
    const x=33+i*5.3,z=5+3*Math.sin(i*.8);
    ridge('208 new worm earthwave '+i,x,z,6.5,16,2.7,mat.gold,-.4+i*.11);
    if(detail&&i%2===0)for(let j=0;j<3;j++)
      box('208 worm surface band '+i+' '+j,x+j*.55-1.2,1.15,z+2.8,
        1,.22,3.2,mat.dune).rotation.y=-.2;
  }

  // 209: long Omnius machine crest VERSUS a huge living arc.
  // Not a reprise of C:5's polyhedral/armored autonomous brain.
  box('209 Omnius black horizontal horizon',38,10.5,37,43,4.8,8,mat.dark);
  box('209 machine serrated spine',38,14,37,48,2,7,mat.machine);
  for(let i=0;i<7;i++){
    const x=19+i*6.2,h=5.5+(i%3)*1.1;
    cyl('209 descending machine tooth '+i,x,7.6,32,2.4,h,mat.dark,4,.25)
      .rotation.z=Math.PI;
    box('209 Omnius threat trace '+i,x,11.9,32.8,2.4,.32,.18,mat.red);
  }
  const path=[];
  for(let i=0;i<=15;i++){
    const t=i/15;
    path.push(new B3.Vector3(40+18*t,1+12.5*Math.sin(Math.PI*t),
      25+6*Math.sin(Math.PI*t)));
  }
  const worm=M.CreateTube('209 newborn sandworm gigantic arch',
    {path,radius:2.35,tessellation:10,cap:2},S);
  worm.material=mat.dune;worm.isPickable=false;
  // Narrow armor ribs follow the curved tube, avoiding a caterpillar shape.
  for(let i=1;i<15;i+=2){
    const t=i/15,dy=12.5*Math.PI*Math.cos(Math.PI*t);
    const rib=cyl('209 worm annular rib '+i,40+18*t,
      1+12.5*Math.sin(Math.PI*t),25+6*Math.sin(Math.PI*t),
      5.05,.52,i%4===1?mat.gold:mat.dune,12);
    rib.rotation.z=-Math.atan2(18,dy);
  }
  cyl('209 deep worm maw',57.2,2.3,24.7,5.4,.45,mat.dark,12)
    .rotation.x=Math.PI/2;
  cyl('209 mouth sandstone rim',57.2,2.3,25.1,5.8,.22,mat.gold,12)
    .rotation.x=Math.PI/2;
  box('209 last human position',38,.16,20,9,.3,4,mat.ivory);
  cyl('209 final warm human signal',33.5,3,21,.6,5.4,mat.human,6,.15);
}
