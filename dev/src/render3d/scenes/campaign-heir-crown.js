// Campaign 2.0 C4.18 — D:4 "Наследник" / "Венец без трона".
// Canonical global mission IDs 110–119. One static, connected volumetric story atlas.
// All meshes/materials belong to CampaignMapScene. No Engine, rAF, timers,
// runtime shadowmaps, particles or separate render targets.
export function buildHeirCrown(B3, scene, material, detail = true) {
  const M = B3.MeshBuilder;
  const mat = {
    ground: material('heir-vertex-slate', '#ffffff'),
    stone: material('heir-bone-stone', '#bab7ac'),
    chalk: material('heir-stage-ivory', '#e1d3c0'),
    void: material('heir-empty-throne-obsidian', '#25232d'),
    graphite: material('heir-graphite', '#34313a'),
    silk: material('heir-gesserit-silk', '#4b4156'),
    crimson: material('heir-harkonnen-bordeaux', '#782f3b'),
    bronze: material('heir-aged-bronze', '#a67d61'),
    spice: material('heir-spice-amber', '#c58d4f'),
    sand: material('heir-sand-slate', '#9d7653'),
    shade: material('heir-black-recess', '#1d1e26'),
    metal: material('heir-blade-steel', '#a8b7b7'),
  };
  mat.spice.emissiveColor = B3.Color3.FromHexString('#241508');
  const box = (name,x,y,z,w,h,d,tint,angle=0) => {
    const m=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    m.position.set(x,y,z);m.rotation.y=angle;m.material=tint;m.isPickable=false;return m;
  };
  const cyl = (name,x,y,z,d,h,tint,edges=10) => {
    const m=M.CreateCylinder(name,{diameter:d,height:h,tessellation:edges},scene);
    m.position.set(x,y,z);m.material=tint;m.isPickable=false;return m;
  };
  const link = (name,a,b,y,width,tint) => {
    const dx=b[0]-a[0],dz=b[1]-a[1];
    return box(name,(a[0]+b[0])/2,y,(a[1]+b[1])/2,
      width,.12,Math.hypot(dx,dz),tint,Math.atan2(-dx,dz));
  };
  const points = [
    [-55,-16],[-59,0],[-49,15],[-34,26],[-16,31],
    [1,28],[18,19],[31,6],[37,-11],[25,-25],
  ];
  // One ground plane, with baked eastward spice gradation. No disconnected islands.
  const land=M.CreateGround('heir single connected stone and spice ground',
    {width:154,height:116,subdivisions:detail?25:14,updatable:true},scene);
  const pos=land.getVerticesData(B3.VertexBuffer.PositionKind),colors=[];
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  for(let i=0;i<pos.length;i+=3){
    const x=pos[i],z=pos[i+2];
    pos[i+1]=-.47+.025*Math.sin(x*.18+z*.16);
    const east=clamp((x+18)/78,0,1);
    const variation=.016*Math.sin(x*.23-z*.14);
    colors.push(.28+.31*east+variation,.27+.19*east+variation,.31+.07*east+variation,1);
  }
  land.updateVerticesData(B3.VertexBuffer.PositionKind,pos);
  const normals=[];B3.VertexData.ComputeNormals(pos,land.getIndices(),normals);
  land.updateVerticesData(B3.VertexBuffer.NormalKind,normals);
  land.setVerticesData(B3.VertexBuffer.ColorKind,colors);
  land.useVertexColors=true;land.material=mat.ground;land.isPickable=false;

  // The black unoccupied centre is a visual depression, never a mission island.
  const absence=cyl('heir empty throne central void',-10,-.36,2,53,.12,mat.void,40);
  absence.scaling.x=1.2;absence.scaling.z=.83;
  for(const [i,x,z,a] of [[0,-31,-16,-.27],[1,3,-22,.18],[2,19,3,.42]]) {
    box('heir central void broken inner lip '+i,x,-.05,z,18,.45,1.7,mat.graphite,a);
  }
  // A thick physically traversable crescent: all ten marker pads touch the same
  // continuous stone causeway, not a thin screen line or ten independent plinths.
  points.forEach(([x,z],i) => {
    cyl('heir crown accessible terrace '+i,x,-.07,z,11,.57,
      i<3?mat.stone:i<6?mat.graphite:mat.sand,10);
  });
  for(let i=1;i<points.length;i++) {
    link('heir crown continuous promenade '+i,points[i-1],points[i],-.13,9.5,
      i<3?mat.stone:i<6?mat.graphite:mat.sand);
  }
  // The curb follows the curved shoreline; its low height leaves marker rays clear.
  if(detail)for(let i=1;i<points.length;i+=2){
    const a=points[i-1],b=points[i];
    link('heir crown exterior curb '+i,[a[0],a[1]-4.7],[b[0],b[1]-4.7],.05,.45,mat.bronze);
  }
  // The only regional change: static dock seams and fixed cargo ramps, not a teleport.
  link('heir Giedi to court threshold',[-49,15],[-34,26],.08,3,mat.bronze);
  link('heir court to spice bonded cargo ramp',[1,28],[18,19],.08,3,mat.bronze);

  // 110 Arena: open, asymmetric amphitheatre, unlike D:0's concentric stadium.
  cyl('110 arena open fighting crescent',-55,.17,-7,15,.33,mat.sand,22);
  for(let i=0;i<(detail?6:4);i++){
    const angle=.12+i*Math.PI/(detail?5:3);
    const x=-55+Math.cos(angle)*11,z=-7+Math.sin(angle)*10;
    const seat=box('110 amphitheatre rising angular stand '+i,x,1.1+i*.21,z,
      6,1.3+i*.25,2.7,i%2?mat.stone:mat.chalk,angle);
    seat.rotation.y=-angle;
  }
  for(const x of [-63,-47]){
    box('110 crimson arena standard '+x,x,5.2,-1,.36,9,.48,mat.graphite);
    box('110 crimson fabric '+x,x,7.0,-1.3,2.2,4,.14,mat.crimson);
  }
  // 111 Poison: one monumental tilted steel blade on a sharp stone examination desk.
  box('111 poison blade examination slab',-59,.84,7,9,1.45,5,mat.chalk);
  box('111 immense ceremonial poisoned blade',-59,2.0,7,1.25,.28,8,mat.metal,-.24);
  box('111 visible poison channel',-59,2.19,6,.25,.13,6,mat.crimson,-.24);
  for(const x of [-63,-55])box('111 witness witness screen '+x,x,3.2,10,.65,6.2,1.5,mat.graphite);
  if(detail)box('111 poisoned vial on slab',-62,1.9,5.5,.85,1,.85,mat.spice);

  // 112 Baron: tall curtains frame an exposed sleeping alcove, not a fortress.
  box('112 baron assassination alcove black recess',-49,3.1,22,12,6,1.4,mat.shade);
  for(const x of [-55,-43]){
    box('112 baron curtain pier '+x,x,4.2,21,1.4,8.4,3.1,mat.crimson);
    box('112 baron bronze drapery seam '+x,x,7.9,20.5,1.6,.3,3.4,mat.bronze);
  }
  box('112 baron vulnerable sleeping dais',-49,.7,18,7,1.4,4,mat.stone);
  box('112 assassin concealed door',-49,4,22.8,3.3,5.4,.45,mat.graphite);
  if(detail)box('112 fallen palace guard spear',-45,1,16,.32,.32,5,mat.metal,.42);

  // 113 Spice convoy: low static freight sleds and broken guide grooves.
  for(const [i,x] of [-38,-30].entries()){
    box('113 convoy hull sled '+i,x,.8,33,6,1.3,9,mat.graphite,-.22);
    box('113 amber sealed spice load '+i,x,2.05,34.0,5,1.5,4,mat.spice,-.22);
  }
  link('113 Gurney broken convoy rut',[-41,28],[-28,36],.15,.55,mat.crimson);
  box('113 spice convoy hovering fixed dock gantry',-34,5,40,13,.7,1.3,mat.bronze);
  for(const x of [-40,-28])box('113 spice dock stationary girder '+x,x,2.7,40,.7,5,.7,mat.stone);

  // 114 Mohiam: three asymmetrical privacy screens with one light-slit opening.
  for(const [i,x,h] of [[0,-22,8],[1,-17,11],[2,-11,7]]){
    box('114 Mohiam absolute silence screen '+i,x,h/2,39,1.15,h,3,
      i===1?mat.silk:mat.stone);
  }
  box('114 Mohiam examination carpet',-16,.22,35,10,.22,5,mat.silk);
  box('114 Mohiam razor thin white test aperture',-14,5.1,37.15,.75,8,.17,mat.chalk);
  if(detail)for(const x of [-19,-13])
    box('114 Mohiam waiting acolyte pedestal '+x,x,.85,34.5,1.8,1.7,1.4,mat.graphite);

  // 115 Duel on Giedi: a triangular combat geometry, not another round arena.
  for(const [i,a,b] of [
    [0,[-5,35],[7,35]],[1,[7,35],[1,26]],[2,[1,26],[-5,35]]]){
    link('115 triangular blade duel boundary '+i,a,b,.32,.75,mat.metal);
  }
  for(const [i,x,z] of [[0,-5,35],[1,7,35],[2,1,26]]){
    box('115 duel upright guard '+i,x,3,z,.65,6,.65,mat.graphite);
  }
  box('115 garrison combat judges dais',1,.65,40,8,1.3,3.5,mat.stone);

  // 116 Desert witch: a double knife-shaped stone fissure, with static cloth.
  for(const [i,x,h,tilt] of [[0,14,10,-.12],[1,22,8,.16]]){
    const rock=box('116 fissure vertical shard '+i,x,h/2,25,2.5,h,4.5,mat.sand);
    rock.rotation.z=tilt;
  }
  box('116 BG whispered veiled silhouette',18,5.4,27,.55,6,.25,mat.silk,-.12);
  box('116 sand warning lip',18,.5,20,12,1,2,mat.bronze);
  if(detail)box('116 desert signal fabric',19,9.0,26,4,.65,.2,mat.chalk,.21);

  // 117 Marriage as political geometry: incompatible seats under a V-shaped crown.
  box('117 arranged marriage low seat',28,2,12,3.7,4,3.5,mat.stone);
  box('117 arranged marriage tall seat',35,3,12,3.9,6,3.6,mat.graphite);
  box('117 two empty thrones seat back',35,7,13,4.3,6,.65,mat.crimson);
  for(const [i,x,angle] of [[0,28,-.45],[1,35,.45]]){
    const beam=box('117 unequal wedding canopy wing '+i,x,9.7,16,.8,1,12,mat.bronze);
    beam.rotation.z=angle;
  }
  if(detail)for(const x of [28,35])
    box('117 vow silk runner '+x,x,.45,6,2.5,.12,6,mat.silk);

  // 118 Fremen ambush: broken cargo and sharp dune knives, not a D:3 harvester.
  box('118 destroyed spice convoy broken sled',37,1.1,-4,9,2.1,5,mat.graphite,.32);
  box('118 broken caravan open cargo',41,2.4,-5,5,1.7,3.5,mat.spice,.35);
  for(const [i,x,h] of [[0,31,4],[1,38,6],[2,45,4.8]]){
    const dune=box('118 Fremen ambush sandstone knife '+i,x,h/2,-1,2,h,4,mat.sand);
    dune.rotation.z=i===1?.28:-.23;
  }
  const canopy=box('118 torn spice caravan canopy',35,5.4,-5,9,.45,4,mat.crimson,.3);
  canopy.rotation.z=.19;
  if(detail)box('118 shattered convoy axle',41,.7,-11,9,.6,.6,mat.metal,.8);

  // 119 Gurney's revenge: crossed blades form the broken outline of a lyre.
  box('119 Gurney Feyd final stone confrontation floor',25,.38,-19,16,.75,10,mat.stone);
  for(const [i,x,tilt] of [[0,22,-.27],[1,29,.27]]){
    const blade=box('119 broken warrior poet steel lyre blade '+i,x,5.9,-17,
      1.1,10.8,.85,mat.metal);
    blade.rotation.z=tilt;
  }
  box('119 Gurney debt vertical memorial',25,3.7,-18,1.9,7.5,1.2,mat.crimson);
  box('119 Harkonnen defeated standard pole',32,1.7,-18,.8,4.6,.5,mat.graphite,.68);
  box('119 Harkonnen defeated standard cloth',33.5,1.2,-18,4.5,1.5,.25,mat.crimson,.72);
  if(detail){
    box('119 blade scar foreground',24,.52,-24,9,.12,.34,mat.bronze,.24);
    box('119 broken ceremonial crown tip',19,1.1,-16,3.8,2,.9,mat.graphite,.26);
  }
}
