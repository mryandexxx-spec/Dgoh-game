// Campaign 2.0 C4.3 — D:1 "Conspiracy". One shared GameScene/EngineHost.
// Route: covert freight yard -> Sardaukar lifts -> Corrino interception bridge.
// Only static Babylon meshes/instances. No independent loop, particles, shadows.
export function buildConspiracy(B3,scene,material) {
  const M=B3.MeshBuilder;
  const ground=material('conspiracy-ground','#303a43');
  const dark=material('conspiracy-basalt','#19242f');
  const iron=material('conspiracy-iron','#354452');
  const mid=material('conspiracy-steel','#586773');
  const top=material('conspiracy-stone','#94a1a6');
  const bright=material('conspiracy-inlay','#c0c8c7');
  const gold=material('conspiracy-signals','#ce9f59');
  const bronze=material('conspiracy-rust','#81664c');
  const indigo=material('conspiracy-shadow','#101923');
  const mark=material('conspiracy-route','#b99761');
  const box=(name,x,y,z,w,h,d,mat,rot=0)=>{
    const mesh=M.CreateBox(name,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);mesh.rotation.y=rot;mesh.material=mat;mesh.isPickable=false;
    return mesh;
  };
  const cyl=(name,x,y,z,d,h,mat,t=10)=>{
    const mesh=M.CreateCylinder(name,{diameter:d,height:h,tessellation:t},scene);
    mesh.position.set(x,y,z);mesh.material=mat;mesh.isPickable=false;return mesh;
  };
  // Low-cost industrial shelf. Raised rear structures never swallow a map pin.
  const land=M.CreateGround('Conspiracy plateau',{width:101,height:66,subdivisions:2},scene);
  land.position.y=-.3;land.material=ground;land.isPickable=false;
  box('Service route raised foundation',0,-.13,0,88,.26,7,iron);
  for(const z of [-4.25,4.25])box('Freight rail trim',0,.04,z,87,.13,.25,bronze);
  // Separate industrial west from ceremonial east using continuous low platforms.
  box('Freight apron',-29,-.16,13,24,.35,17,dark);
  box('Lift central plinth',-1,-.18,13,34,.35,20,iron);
  box('Imperial dock forecourt',27,-.15,13,27,.35,19,mid);
  // Mission 1-3. Cold black cargo yard with hidden meeting, uniform transfer,
  // encrypted shield key. Vary freight sizes and avoid the route z≈0.
  for(let i=0;i<11;i++){
    const x=-43+(i%6)*4.8,z=10+Math.floor(i/6)*7;
    box('Covert freight container '+i,x,.65+(i%3)*.13,z,4,1.55+(i%3)*.25,2.9,i%3?iron:dark);
    box('Container upper rib '+i,x,1.6+(i%3)*.25,z,4.2,.15,3.05,mid);
  }
  for(const x of [-41,-32,-23]) {
    box('Conspiracy yard beacon post',x,2,6,.5,4,.55,dark);
    box('Amber signal',x,4.15,6,.85,.38,.85,gold);
  }
  box('Fenring private transfer hut',-39,2,12,5,4.1,5,mid);
  box('Fenring privacy canopy',-39,4.25,12,6.5,.4,6,bronze);
  box('Sardaukar disguise checkpoint',-30,2.6,9.5,6,5.3,5.2,dark);
  for(const x of [-33,-27]){
    box('Disguise tunnel post',x,2.8,7,.68,5.6,.72,mid);
    box('Disguise tunnel top',x,5.68,9.5,.68,.52,6,top);
  }
  box('Encrypted communications kiosk',-21,2.6,12,6,5.1,4,mid);
  box('Shield-key display',-21,3.2,9.9,3,1.4,.14,gold);
  // Mission 4-7. Two monumental vertical lift towers dominate skyline,
  // connected by a steel catwalk. Shadows are geometry only, not realtime FX.
  for(const x of [-12,5]){
    box('Deep freight elevator shaft',x,8.1,15,8,16.3,8,dark);
    for(const y of [2.3,6.6,10.9,15.2]) {
      box('Freight elevator transverse truss',x,y,10.65,9,.5,.7,mid);
      box('Freight lift floor',x,y-.24,14.8,7.3,.45,7.3,iron);
    }
    for(const dx of [-3.2,3.2]){
      box('Freight lift vertical rail',x+dx,8.4,10.6,.7,16.8,.8,top);
    }
    box('Shaft roof cap',x,16.5,15,9,.65,9,mid);
  }
  box('Upper troop causeway',-3.5,11.4,11,13.5,.62,3,top);
  for(const y of [10.7,12.1])box('Upper causeway rail',-3.5,y,9.3,13.5,.28,.26,bronze);
  box('Mentat surveillance archive',-14,2.2,9,6.3,4.4,5.2,iron);
  box('Piter false dispatch office',4,2.2,7.8,7.8,4.3,4,dark);
  box('Dispatch amber monitor',4,3,5.72,3,1.3,.18,gold);
  box('Bene Gesserit recess',12,2.2,12.5,6.8,4.5,4.5,indigo);
  for(const x of [9.5,14.5]){
    box('Order privacy colonnade',x,4,9.9,.9,8,.95,top);
    box('Order colonnade capital',x,8.2,9.9,1.4,.36,1.4,bright);
  }
  // Mission 8-10. Imperial security area: more stone, less industry.
  box('Imperial arsenal storage',18,1.35,10,7.2,2.7,5,mid);
  for(const x of [15.8,18,20.2])box('Arsenal vault panel',x,2.2,7.4,1.5,2.8,.19,indigo);
  box('Guild transport apron',27,.3,14,15,.45,11,top);
  for(const x of [23,30]) {
    box('Frigate hull silhouette',x,3.2,19,5.1,2.1,10,iron,.06);
    box('Frigate raised bridge',x,4.8,17,2.3,1.8,3.8,mid);
    box('Frigate prow',x,2.3,12.5,2.2,1.05,4,bright);
  }
  // Ceremonial imperial interception gateway is at the final mission, beyond
  // the distant industrial kit; open central portal leaves boss pin unobscured.
  for(const x of [31,39]){
    box('Corrino imperial gate pylon',x,6.2,15,3.2,12.4,5.6,top);
    box('Imperial pylon crown',x,12.7,15,4,.6,6.2,bright);
    box('Imperial inner reveal',x,6.8,11.98,1.4,6,.2,indigo);
  }
  box('Imperial gate architrave',35,12.2,15,12.4,2,5.8,top);
  box('Imperial gold frieze',35,11.25,11.95,7.4,.32,.3,gold);
  box('Final interception bridge',35,.28,3.7,10,.44,6,mid);
  for(const x of [31,39])box('Interception bridge rail',x,.95,3.7,.42,1.3,6,bronze);
  // Controlled instancing only for the repeating lamps; no new shader/bloom.
  const fixture=box('Conspiracy lamp fixture master',0,0,0,.62,.4,.62,gold);
  fixture.setEnabled(false);
  for(let i=0;i<16;i++) {
    const lamp=fixture.createInstance('Conspiracy wayfinding light '+i);
    lamp.position.set(-40+i*5.2,.48,4.9);
    lamp.isPickable=false;
  }
  // Small tie bars to give the service route perspective; gameplay route and
  // mission rings are created independently by shared campaign-map.js.
  for(let x=-41;x<41;x+=4.5)box('Access road joint',x,.02,0,.28,.08,6,mark);
}
