import assert from 'node:assert/strict';
import { campaignPanDelta, campaignPinch, campaignTwist } from '../src/render3d/campaign-gestures.js';

const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} not near ${b}`);
for(const alpha of [-1.43,-1.13,-.83,0,.5]){
  for(const beta of [.76,.94,1.12]){
    const cfg={alpha,beta,radius:30,fov:.8,height:225};
    const scale=2*cfg.radius*Math.tan(cfg.fov/2)/cfg.height;
    // A drag-right is opposite the current screen-right direction.
    const right=campaignPanDelta(40,0,cfg);
    near(right.x*Math.sin(alpha)-right.z*Math.cos(alpha),-40*scale);
    near(right.x*(-Math.cos(alpha))+right.z*(-Math.sin(alpha)),0);
    // A drag-down moves the camera toward the horizon, not arbitrary world Z.
    const down=campaignPanDelta(0,35,cfg);
    near(down.x*Math.sin(alpha)-down.z*Math.cos(alpha),0);
    near((down.x*(-Math.cos(alpha))+down.z*(-Math.sin(alpha)))*Math.cos(beta),35*scale);
    // Symmetry, no spurious drift when a gesture is reversed.
    const reverse=campaignPanDelta(-40,-35,cfg);
    const forward=campaignPanDelta(40,35,cfg);
    near(reverse.x+forward.x,0);near(reverse.z+forward.z,0);
    // Smaller viewports correctly require more world movement per CSS pixel.
    assert.ok(Math.hypot(...Object.values(campaignPanDelta(20,0,{...cfg,height:175})))>
      Math.hypot(right.x,right.z)*.49);
  }
}
near(campaignPinch(100,200,30),15);
near(campaignPinch(200,100,30),60);
near(campaignTwist(Math.PI-.1,-Math.PI+.1),.2);
console.log('PASS Campaign 2.0 camera-relative pan, pinch and wraparound');
