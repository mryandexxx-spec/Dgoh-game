// Campaign 2.0 · C2 — мобильная диорама Каладана на общем EngineHost.
// Нет собственного Engine, render loop, rAF, таймера или DOM-измерений в update().
import { B3, HAS_GL, HAS3D, loadB3, cvSize } from '../base.js';
import { engineHost } from '../engine-host.js';
import { GameScene } from '../game-scene.js';
import { gfx } from '../quality.js';

let ACTIVE = null;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
class CampaignMapScene extends GameScene {
  constructor(map, select) {
    super(engineHost());
    this.map = map; this.select = select;
    this.small = Math.min(innerWidth, innerHeight) < 600;
    this.scene = new B3.Scene(this.engine);
    this.scene.useRightHandedSystem = true;
    this.scene.clearColor = new B3.Color4(.12, .18, .16, 1);
    this.scene.skipPointerMovePicking = true;
    const c = map.preset.camera;
    const current=map.nodes.find(n=>n.open&&!n.stars) || map.nodes.filter(n=>n.open).at(-1);
    this.selectedId=current?.id ?? map.nodes[0]?.id;
    this.cx=current?.x ?? c.target[0]; this.cz=current?.z ?? c.target[2];
    this.alpha = c.alpha; this.beta = c.beta; this.radius = c.radius;
    this.t0 = performance.now(); this.dirty = true; this.pointers = new Map();
    this.cameraTween = null;
    this.cam = new B3.UniversalCamera('campaign-camera', new B3.Vector3(0, 30, 30), this.scene);
    this.cam.minZ = .1; this.cam.maxZ = 250; this.cam.inputs.clear();
    this.scene.activeCamera = this.cam;
    const hemi = new B3.HemisphericLight('caladan-sky', new B3.Vector3(0, 1, 0), this.scene);
    hemi.intensity = .88;
    const sun = new B3.DirectionalLight('caladan-sun', new B3.Vector3(-.65,-1,-.45), this.scene);
    sun.intensity = .62;
    this.makeGeometry();
    this.applyCamera();
  }
  material(name, color) {
    const m = new B3.StandardMaterial(name, this.scene);
    m.diffuseColor = B3.Color3.FromHexString(color);
    m.specularColor = new B3.Color3(.035,.04,.04);
    return m;
  }
  makeGeometry() {
    const M = B3.MeshBuilder, S = this.scene, P = this.map.preset;
    const grass = this.material('grass', '#4a6044');
    const coast = this.material('rock', '#9a8d6c');
    const sea = this.material('sea', '#184c5a');
    const stone = this.material('stone', '#b6a17a');
    const roof = this.material('roof', '#554e3f');
    const road = this.material('route', '#d7ad69');
    const clear = this.material('cleared', '#507f57');
    const ready = this.material('ready', '#d9a74d');
    const locked = this.material('locked', '#514b43');
    const boss = this.material('boss', '#b45138');
    // Caladan: a continuous low-poly shoreline, not intersecting rectangular land/sea planes.
    // Terrain vertex elevations encode grass hills, coves and a steep waterline.
    // No dynamic shadows, height textures, RTT or procedural work in the frame loop.
    const water = M.CreateGround('Caladan ocean', {width: 130, height: 120}, S);
    water.position.set(7, -.83, 11); water.material = sea; water.isPickable = false;
    const ground = M.CreateGround('Caladan coastal highlands',
      {width: 74, height: 51, subdivisions: 34, updatable: true}, S);
    ground.position.set(-6, 0, -3); ground.material = grass; ground.isPickable = false;
    const verts = ground.getVerticesData(B3.VertexBuffer.PositionKind);
    const indices = ground.getIndices();
    const coastAt = x => 5.8 - .12 * x + 1.5 * Math.sin((x + 4) * .24);
    for (let i = 0; i < verts.length; i += 3) {
      const x = verts[i] - 6, z = verts[i+2] - 3, inland = coastAt(x) - z;
      const hills = .22 * Math.sin(x * .23) * Math.cos(z * .31)
        + .28 * Math.sin((x + z) * .18);
      const cliff = inland < -2 ? -1.6 : inland < 1.8 ? -.2 + inland * .53 : .75;
      verts[i+1] = cliff + hills * Math.max(0, Math.min(1, (inland + 3) / 5));
    }
    ground.updateVerticesData(B3.VertexBuffer.PositionKind, verts);
    const normals = [];
    B3.VertexData.ComputeNormals(verts, indices, normals);
    ground.updateVerticesData(B3.VertexBuffer.NormalKind, normals);
    // Лёгкая архитектура без runtime shadow maps / RTT.
    const makeBox=(name,x,y,z,w,h,d,mat)=>{
      const b=M.CreateBox(name,{width:w,height:h,depth:d},S);
      b.position.set(x,y,z); b.material=mat; return b;
    };
    makeBox('Atreides citadel',-12,2.3,-10,9,4.7,7,stone);
    makeBox('castle keep',-14,5.4,-10,3.7,5.7,3.8,stone);
    for(const [dx,dz] of [[-17,-14],[-7,-14],[-17,-6],[-7,-6]]) {
      makeBox('castle tower',dx,3.7,dz,1.9,7.5,1.9,stone);
      makeBox('tower cap',dx,7.5,dz,2.4,.45,2.4,roof);
    }
    makeBox('harbour breakwater',12,.25,4,12,.8,2,stone);
    makeBox('harbour warehouse',16,1.7,2,4,3.3,3,roof);
    makeBox('spaceport deck',23,.15,11,9,.7,7,stone);
    makeBox('spaceport terminal',23,1.7,14,5,3,2,roof);
    // The landing pad stands on a coastal causeway rather than floating on the sea.
    makeBox('spaceport causeway',23,-.09,7.1,3.2,.95,9.5,stone);
    for(const [x,z] of [[20,8],[26,8],[20,13],[26,13]]) {
      makeBox('landing support',x,-.58,z,.9,.6,.9,coast);
    }
    makeBox('airfield control tower',26.7,2.35,11,1.45,4.2,1.45,roof);
    const bollard=this.material('coastal beacon','#c9b07d');
    for(const z of [5.2,7.8,10.3]) for(const x of [21.3,24.7]) {
      makeBox('runway signal',x,.65,z,.3,.45,.3,bollard);
    }
    // Architectural landmarks: stepped castle parapets, harbour piers and a
    // raised circular landing beacon remain readable when zoomed out on phones.
    for(const [x,z] of [[-17,-10],[-12,-14],[-7,-10],[-12,-6]]) {
      makeBox('Atreides buttress',x,1.1,z,1.1,2.2,1.1,coast);
    }
    for(const z of [1.4,4.1,6.8]) {
      makeBox('Caladan pier',15,-.06,z,7,.4,.55,stone);
    }
    const landing=M.CreateCylinder('landing pad', {diameter:7.5,height:.5,tessellation:18}, S);
    landing.position.set(23,.45,11); landing.material=coast;landing.isPickable=false;
    const beacon=M.CreateCylinder('landing signal',{diameter:.72,height:2,tessellation:8},S);
    beacon.position.set(26,1.5,13);beacon.material=road;beacon.isPickable=false;
    const foliage=this.material('woodland','#354e3b'),trunk=this.material('trunks','#514333');
    const base=M.CreateCylinder('caladan-tree-trunk',{diameterTop:.11,diameterBottom:.28,height:1.35,tessellation:5},S);
    base.material=trunk;base.isPickable=false;base.setEnabled(false);
    const crown=M.CreateCylinder('caladan-crown',{diameterTop:.12,diameterBottom:1.25,height:2.5,tessellation:6},S);
    crown.material=foliage;crown.isPickable=false;crown.setEnabled(false);
    // Instancing instead of dozens of independent draw calls.
    for(let k=0;k<22;k++) {
      const x=-29+(k*13%43),z=-19+(k*17%21);
      if ((x > -19 && x < -5 && z > -16 && z < -4) || Math.hypot(x+22,z+11)<4) continue;
      const tree=base.createInstance('woodland-trunk-'+k);
      tree.position.set(x,1.5,z);
      const leaves=crown.createInstance('woodland-canopy-'+k);
      leaves.position.set(x,3.3,z);
      const scale=.66+(k%4)*.13;
      tree.scaling.setAll(scale);leaves.scaling.setAll(scale);
    }
    // Дорога явно соединяет миссии; тонкие дешёвые цилиндры без текстур.
    P.nodes.slice(1).forEach(([x,z],k)=>{
      const [px,pz]=P.nodes[k], dx=x-px, dz=z-pz, len=Math.hypot(dx,dz);
      const path=M.CreateBox('mission-route',{width:.26,height:.05,depth:len},S);
      path.position.set((x+px)/2,.16,(z+pz)/2);
      path.rotation.y=Math.atan2(-dx,dz);
      path.material=road; path.isPickable=false;
    });
    this.markerMeshes = [];
    for(const node of this.map.nodes) {
      const ring = M.CreateCylinder('mission-'+node.number, {diameter:node.boss?2.65:2.15,height:.45,tessellation:12},S);
      ring.position.set(node.x,.43,node.z);
      ring.material=node.boss?boss:node.stars?clear:node.open?ready:locked;
      ring.metadata={campaignNodeId:node.id};
      const core=M.CreateSphere('mission-core-'+node.number,{diameter:node.boss?1.35:1.05,segments:10},S);
      core.position.set(node.x,.99,node.z);
      core.material=ring.material; core.metadata={campaignNodeId:node.id};
      this.markerMeshes.push(ring,core);
    }
  }
  applyCamera() {
    const c=this.map.preset.camera;
    this.alpha=clamp(this.alpha,c.alpha-c.turnLimit,c.alpha+c.turnLimit);
    this.beta=clamp(this.beta,.76,1.12); this.radius=clamp(this.radius,c.minRadius,c.maxRadius);
    this.cx=clamp(this.cx,-21,21); this.cz=clamp(this.cz,-12,13);
    const q=this.radius*Math.sin(this.beta);
    this.cam.position.set(this.cx+q*Math.cos(this.alpha),
      this.radius*Math.cos(this.beta)+1.6,
      this.cz+q*Math.sin(this.alpha));
    this.cam.setTarget(new B3.Vector3(this.cx,0,this.cz));
    this.t0=performance.now(); this.dirty=true;
  }
  center(node, animate = true) {
    if(node)this.selectedId=node.id;
    const x = node?.x ?? this.map.preset.camera.target[0];
    const z = node?.z ?? this.map.preset.camera.target[2];
    if (!animate) { this.cameraTween=null;this.cx=x;this.cz=z;this.applyCamera();return; }
    this.cameraTween={sx:this.cx,sz:this.cz,x,z,t0:performance.now(),duration:380};
    this.t0=performance.now();this.dirty=true;
  }
  pointerDown=e=>{
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
    try{this.cv.setPointerCapture(e.pointerId);}catch(_){}
  };
  pointerMove=e=>{
    const p=this.pointers.get(e.pointerId);if(!p)return;
    const dx=e.clientX-p.x,dy=e.clientY-p.y;
    p.x=e.clientX;p.y=e.clientY;
    this.cameraTween=null;
    if(this.pointers.size===1){
      if(e.altKey || e.buttons===2) this.alpha+=dx*.006;
      else { const speed=this.radius/620;this.cx-=dx*speed;this.cz-=dy*speed; }
    }else if(this.pointers.size===2){
      const list=[...this.pointers.values()],d=Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);
      const ang=Math.atan2(list[0].y-list[1].y,list[0].x-list[1].x);
      if(this._pinchD){this.radius*=this._pinchD/Math.max(8,d);}
      if(this._pinchA!==undefined) {
        let da=ang-this._pinchA;
        if(da>Math.PI)da-=Math.PI*2;
        if(da< -Math.PI)da+=Math.PI*2;
        this.alpha+=da*.65;
      }
      this._pinchD=d;this._pinchA=ang;
    }
    this.applyCamera();
  };
  pointerUp=e=>{
    const p=this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId); this._pinchD=null;this._pinchA=undefined;
    if(!p || Math.hypot(e.clientX-p.sx,e.clientY-p.sy)>9 || this.pointers.size)return;
    const hit=this.scene.pick(e.offsetX,e.offsetY);
    const id=hit?.pickedMesh?.metadata?.campaignNodeId;
    if(Number.isInteger(id))this.select(id);
  };
  wheel=e=>{
    if(e.cancelable)e.preventDefault();
    this.radius*=e.deltaY>0?1.08:.92;this.applyCamera();
  };
  // Limited rotate: two-finger twist is not used for selection; a small deliberate horizontal
  // shift with Alt/mouse drag is supported by the same input without additional frames.
  bind() {
    this.cv.style.touchAction='none';
    this.cv.addEventListener('pointerdown',this.pointerDown);
    this.cv.addEventListener('pointermove',this.pointerMove);
    this.cv.addEventListener('pointerup',this.pointerUp);
    this.cv.addEventListener('pointercancel',this.pointerUp);
    this.cv.addEventListener('wheel',this.wheel,{passive:false});
  }
  unbind(){
    for(const [name,fn] of [['pointerdown',this.pointerDown],['pointermove',this.pointerMove],
      ['pointerup',this.pointerUp],['pointercancel',this.pointerUp],['wheel',this.wheel]])
      this.cv.removeEventListener(name,fn);
    this.pointers.clear();this._pinchD=null;this._pinchA=undefined;
  }
  projectLabels(){
    if(!this.labels?.length)return;
    // UI viewport is cached at mount/resize, no DOM layout reads in the render loop.
    const w=this.stageWidth||1,h=this.stageHeight||1;
    const vp=new B3.Viewport(0,0,w,h);
    const matrix=this.scene.getTransformMatrix();
    const entries=this.map.nodes.map((node,k)=>{
      const p=B3.Vector3.Project(new B3.Vector3(node.x,1.15,node.z),
        B3.Matrix.IdentityReadOnly,matrix,vp);
      const diameter=node.boss?60:50;
      const visible=Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.z>0&&p.z<1
        &&p.x>diameter/2+3&&p.y>diameter/2+3
        &&p.x<w-diameter/2-3&&p.y<h-diameter/2-3;
      return {node,el:this.labels[k],x:p.x,y:p.y,diameter,visible};
    });
    // Never allow 50/60px buttons to overlap. Give the selected node first
    // claim, followed by open nodes nearest the focus. Farther missions become
    // visible when the player moves/zooms the map.
    const focus=this.map.nodes.find(n=>n.id===this.selectedId);
    entries.sort((a,b)=>{
      const weight=e=> (e.node.id===this.selectedId?1000:0)
        +(e.node.open?100:0)
        -Math.hypot(e.node.x-(focus?.x??this.cx),e.node.z-(focus?.z??this.cz));
      return weight(b)-weight(a);
    });
    const shown=[];
    for(const e of entries){
      if(!e.el)continue;
      const collides=shown.some(p=>
        Math.abs(e.x-p.x)<(e.diameter+p.diameter)/2+5 &&
        Math.abs(e.y-p.y)<(e.diameter+p.diameter)/2+5);
      e.el.style.visibility=e.visible&&!collides?'visible':'hidden';
      if(e.visible&&!collides){
        e.el.style.transform=`translate3d(${e.x.toFixed(1)}px,${e.y.toFixed(1)}px,0) translate(-50%,-50%)`;
        shown.push(e);
      }
    }
  }
  onWake(){this.bind();this.engine.resize();this.applyCamera();}
  onSleep(){this.unbind();}
  onDispose(){this.unbind();}
  contextLost(){this.dispose();}
  mode(now){return this.cameraTween||this.dirty||now-this.t0<700?'active':'static';}
  update(now){
    if(this.cameraTween){
      const t=this.cameraTween, k=clamp((now-t.t0)/t.duration,0,1);
      const ease=k*k*(3-2*k);
      this.cx=t.sx+(t.x-t.sx)*ease;this.cz=t.sz+(t.z-t.sz)*ease;
      if(k>=1)this.cameraTween=null;
      this.applyCamera();
    }
    const sz=cvSize(this.cv);
    if(sz.w!==this.w||sz.h!==this.h){
      this.w=sz.w;this.h=sz.h;this.engine.resize();
      this.stageWidth=this.screenEl?.clientWidth||this.stageWidth;
      this.stageHeight=this.screenEl?.clientHeight||this.stageHeight;
    }
    this.scene.render();this.projectLabels();this.dirty=false;
  }
  mount(el){
    this.labels=Array.from(el.querySelectorAll('[data-c20node]'));
    this.screenEl=el;
    this.stageWidth=el.clientWidth;this.stageHeight=el.clientHeight;
    const dpr=gfx(this.small).dpr.camp;
    this.wake(el,{cls:'campaign20-canvas',first:true,dpr});
    this.dirty=true;this.t0=performance.now();
  }
}
export function mountCampaignMap(el,map,onSelect,onFallback){
  if(!el||!map||!HAS_GL){onFallback?.();return;}
  const attach=()=>{
    if(!el.isConnected)return;
    try{
      if(ACTIVE && (ACTIVE.map.preset.id!==map.preset.id || !ACTIVE.alive)){
        ACTIVE.dispose();ACTIVE=null;
      }
      if(!ACTIVE) ACTIVE=new CampaignMapScene(map,onSelect);
      else {ACTIVE.select=onSelect;ACTIVE.map=map;}
      ACTIVE.mount(el);
      el.classList.add('campaign20-3d-ready');
    }catch(e){console.warn('campaign 3d',e);onFallback?.();}
  };
  if(HAS3D)attach();else loadB3().then(ok=>ok?attach():onFallback?.());
}
export function focusCampaignNode(id){
  const node=ACTIVE?.map?.nodes.find(p=>p.id===id);
  if(node && ACTIVE.awake) ACTIVE.center(node,true);
}
export function closeCampaignMap(){
  if(ACTIVE){ACTIVE.sleep();ACTIVE.dispose();ACTIVE=null;}
}
