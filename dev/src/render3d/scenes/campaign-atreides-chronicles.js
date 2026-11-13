// Campaign 2.0 C4.4 — C:0 "House Atreides": a chronological anthology,
// not a literal landscape joining different planets. All objects are static.
// The ten mission rings/labels belong to the shared GameScene and stay world-anchored.
export function buildAtreidesChronicles(B3, scene, material) {
  const M=B3.MeshBuilder;
  const ink=material('chronicles-void','#18242d');
  const parchment=material('chronicles-stone','#938c7c');
  const pale=material('chronicles-pale','#c3b49a');
  const bronze=material('chronicles-bronze','#aa8656');
  const caladan=material('chronicles-caladan','#386b69');
  const green=material('chronicles-forest','#2a493c');
  const pine=material('chronicles-pine','#406657');
  const giedi=material('chronicles-hunt','#343b40');
  const ix=material('chronicles-ix','#557c90');
  const ixLight=material('chronicles-ix-inlay','#92b7bc');
  const court=material('chronicles-court','#a19686');
  const ginaz=material('chronicles-ginaz','#667781');
  const box=(name,x,y,z,w,h,d,mat)=>{
    const mesh=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;return mesh;
  };
  const cyl=(name,x,y,z,d,h,mat,t=10)=>{
    const mesh=M.CreateCylinder(name,{diameter:d,height:h,tessellation:t},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;return mesh;
  };
  const cone=(name,x,y,z,d,h,mat,t=6)=>{
    const mesh=M.CreateCylinder(name,{diameterTop:0,diameterBottom:d,height:h,tessellation:t},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;return mesh;
  };
  // A museum-like sequence of separate landscape slabs, not a single planet.
  const floor=M.CreateGround('Chronicles dark archive backdrop',{width:110,height:57,subdivisions:1},scene);
  floor.position.y=-.72;floor.material=ink;floor.isPickable=false;
  const zones=[
    [-42,-33,caladan],[-32,-13,giedi],[-12,7,ix],[8,26,court],[27,47,ginaz]
  ];
  for(const [a,b,color] of zones) {
    box('Chronicle separate exhibit plinth', (a+b)/2,-.42,4,b-a-.65,.64,28,color);
    box('Chronicle gold edge',(a+b)/2,-.075,-9.6,b-a-.8,.09,.25,bronze);
    box('Chronicle rear retaining wall',(a+b)/2,.03,17.8,b-a-.8,.25,.6,pale);
  }
  // The playable line is physically continuous but each chapter retains
  // its own distinct island and architectural silhouette behind the rings.
  box('Historical route bridge',2,-.17,0,92,.27,4,parchment);
  for(let x=-43;x<=46;x+=4.3)box('Archive road inscription',x,.015,0,.24,.07,3.6,bronze);
  // 1: Caladan, bull ring and father of Leto. Not another coast/castle map.
  cyl('Old duke amphitheatre outer',-40,.42,10,13,1.1,pale,18);
  cyl('Bullring dark floor',-40,1.01,10,9.8,.08,giedi,18);
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10;
    cyl('Caladan memorial column',-40+6.2*Math.cos(a),2.2,10+6.2*Math.sin(a),.64,2.7,parchment,8);
  }
  box('Atreides ceremonial arch',-40,3.1,15,7,1.0,1,bronze);
  // 2–3: Duncan hunted in the Giedi preserves. Trees are silhouette clusters,
  // never copied from the industrial Giedi or Conspiracy maps.
  for(let i=0;i<15;i++){
    const x=-31+(i%6)*3.1,z=8+Math.floor(i/6)*3.5;
    cyl('Harkonnen hunting forest trunk',x,1.3,z,.5,2.8,giedi,6);
    cone('Hunting preserve canopy',x,4.2,z,2.7,4.1,i%3?green:pine);
  }
  box('Hunt fence',-26,1.6,15,11,2.8,.4,parchment);
  box('Duncan concealed escape crevice',-16,1.4,13,6,2.7,5.5,ink);
  for(const x of [-19,-13])box('Escape rocky outcrop',x,2.5,13,2.7,5.1,6,giedi);
  // 4–5: Ix — upright precision towers, bridges, and technology glow;
  // distinct from the crude loading docks of the dark campaigns.
  for(const x of [-9,-3,3]){
    cyl('Ix crystal foundation',x,.8,11,4.2,1.7,ix,8);
    box('Ix glass tower',x,6,11,3.4,10.5,3.4,ix);
    box('Ix antenna band',x,11.4,11,3.9,.5,3.9,ixLight);
    box('Ix vertical window',x,6,9.18,.55,7.1,.12,ixLight);
  }
  box('Ix aerial skybridge',-3,7.8,11,15,.5,2.1,pale);
  box('Ix diplomatic dock',3,1.4,17,8,2.8,5.2,ink);
  // 6: Landsraad — an imposing marble tribunal, open sightline at route z=0.
  box('Landsraad tribunal dais',12,.6,13,12,1.3,9,court);
  for(const x of [8,11,14,17]){
    cyl('Landsraad colonnade',x,4.6,9,.85,7.3,pale,8);
    box('Landsraad capital',x,8.4,9,1.4,.45,1.4,bronze);
  }
  box('Landsraad imperial lintel',12,8.85,9,13,.85,2.4,pale);
  box('Landsraad witness podium',12,2.2,13,3.5,2,2.9,bronze);
  // 7: Duncan's arrival under the hawk banner, a transitional stone gate.
  for(const x of [22,26])box('Atreides refuge gatepost',x,3,11,1.8,6,2,pale);
  box('Atreides refuge gateway crown',24,6.5,11,7,.8,2.3,bronze);
  box('Atreides hawk-banner cloth',24,4.8,10.7,2.1,3,.16,caladan);
  // 8: Ginaz blade academy on mountain stone, not a military factory.
  for(const [x,y] of [[30,4],[35,7],[41,5],[45,3]]){
    cone('Ginaz mountain ridge',x,y/2,15,8,y,ginaz,5);
  }
  box('Ginaz swordmaster school terrace',36,2.1,9,13,3.4,8,pale);
  for(const x of [31,35,39,43]){
    cyl('Ginaz practice column',x,5.2,6,.75,3.4,ginaz,8);
  }
  box('Ginaz academy roof',36,7.1,9,15,.6,9,bronze);
  // 9–10: oath and the Harkonnen counterattack share a final courtyard
  // but the last boss looks toward defensive ramparts beyond the oath plaza.
  box('First oath parade ground',40,.32,-5,10,.6,6,parchment);
  for(const x of [39,42])box('Atreides oath banner',x,3.3,-6,.8,4,.18,caladan);
  for(const x of [43,47]){
    box('Harkonnen reprisal bastion',x,3.4,12,3.2,6.8,5,giedi);
    box('Bastion battlement',x,7,12,4,.65,5.8,bronze);
  }
  // No particles, custom render loops, new light sources, or texture requests.
}
