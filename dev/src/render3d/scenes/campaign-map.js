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
    this.cx = c.target[0]; this.cz = c.target[2];
    this.alpha = c.alpha; this.beta = c.beta; this.radius = c.radius;
    this.t0 = performance.now(); this.dirty = true; this.pointers = new Map();
    this.cam = new B3.UniversalCamera('campaign-camera', new B3.Vector3(0, 30, 30), this.scene);
    this.cam.minZ = .1; this.cam.maxZ = 250; this.cam.inputs.clear();
    this.scene.activeCamera = this.cam;
    const hemi = new B3.HemisphericLight('caladan-sky', new B3.Vector3(0, 1, 0), this.scene);
    hemi.intensity = 1.12;
    const sun = new B3.DirectionalLight('caladan-sun', new B3.Vector3(-.65,-1,-.45), this.scene);
    sun.intensity = .78;
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
    const grass = this.material('grass', '#58664f');
    const coast = this.material('rock', '#9a8d6c');
    const sea = this.material('sea', '#24616c');
    const stone = this.material('stone', '#b6a17a');
    const roof = this.material('roof', '#554e3f');
    const road = this.material('route', '#d7ad69');
    const clear = this.material('cleared', '#507f57');
    const ready = this.material('ready', '#d9a74d');
    const locked = this.material('locked', '#514b43');
    const boss = this.material('boss', '#b45138');
    const ground = M.CreateGround('Caladan highlands', {width: 62, height: 43, subdivisions: 1}, S);
    ground.position.set(-7, -.35, -2); ground.material = grass;
    const water = M.CreateGround('Caladan sea', {width: 66, height: 46, subdivisions: 1}, S);
    water.position.set(25, -.5, 13); water.material = sea;
    const shore = M.CreateBox('coastline cliffs', {width: 57,height: .9,depth: 4.4}, S);
    shore.position.set(10,-.1,7); shore.rotation.y = -.47; shore.material=coast;
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
  center(node) {
    if(node){this.cx=node.x;this.cz=node.z;} else {
      this.cx=this.map.preset.camera.target[0];this.cz=this.map.preset.camera.target[2];
    }
    this.applyCamera();
  }
  pointerDown=e=>{
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
    try{this.cv.setPointerCapture(e.pointerId);}catch(_){}
  };
  pointerMove=e=>{
    const p=this.pointers.get(e.pointerId);if(!p)return;
    const dx=e.clientX-p.x,dy=e.clientY-p.y;
    p.x=e.clientX;p.y=e.clientY;
    if(this.pointers.size===1){
      const speed=this.radius/620;
      this.cx -= dx*speed;this.cz -= dy*speed;
    }else if(this.pointers.size===2){
      const list=[...this.pointers.values()],d=Math.hypot(list[0].x-list[1].x,list[0].y-list[1].y);
      if(this._pinchD){this.radius*=this._pinchD/Math.max(8,d);}
      this._pinchD=d;
    }
    this.applyCamera();
  };
  pointerUp=e=>{
    const p=this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId); this._pinchD=null;
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
    this.pointers.clear();this._pinchD=null;
  }
  onWake(){this.bind();this.engine.resize();this.applyCamera();}
  onSleep(){this.unbind();}
  onDispose(){this.unbind();}
  contextLost(){this.dispose();}
  mode(now){return this.dirty||now-this.t0<700?'active':'static';}
  update(){
    const sz=cvSize(this.cv);
    if(sz.w!==this.w||sz.h!==this.h){this.w=sz.w;this.h=sz.h;this.engine.resize();}
    this.scene.render();this.dirty=false;
  }
  mount(el){
    const dpr=gfx(this.small).dpr.camp;
    this.wake(el,{cls:'campaign20-canvas',first:true,dpr});
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
export function closeCampaignMap(){
  if(ACTIVE){ACTIVE.sleep();ACTIVE.dispose();ACTIVE=null;}
}
