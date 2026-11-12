#!/usr/bin/env python3
"""Convert a rigged GLB into the game's DGM1 container and external JPEG textures.
Run: python convert_young_baron_dgm.py input.glb output_dir
Requirements: numpy, Pillow. Source rig height is 2.10m; scaled to game 1.95m.
"""
import sys, json, struct, math, io, os
from pathlib import Path
from collections import defaultdict
import numpy as np
from PIL import Image

COMP={5120:('i1',1),5121:('u1',1),5122:('<i2',2),5123:('<u2',2),5125:('<u4',4),5126:('<f4',4)}
SHAPE={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
SCALE=1.95/2.1
INPUT=Path(sys.argv[1]); OUT=Path(sys.argv[2]); OUT.mkdir(parents=True,exist_ok=True)
raw=INPUT.read_bytes(); assert raw[:4]==b'glTF'; assert struct.unpack_from('<I',raw,8)[0]==len(raw)
jsonsize=struct.unpack_from('<I',raw,12)[0]; doc=json.loads(raw[20:20+jsonsize]);boff=20+jsonsize
assert raw[boff+4:boff+8]==b'BIN\0'; BIN=memoryview(raw)[boff+8:boff+8+struct.unpack_from('<I',raw,boff)[0]]

def acc(k):
 a=doc['accessors'][k];v=doc['bufferViews'][a['bufferView']];t,n=COMP[a['componentType']];count=a['count'];sz=SHAPE[a['type']];start=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',sz*n)
 if stride==sz*n: ar=np.frombuffer(BIN,dtype=t,count=count*sz,offset=start).reshape(count,sz).copy()
 else: ar=np.stack([np.frombuffer(BIN,dtype=t,count=sz,offset=start+i*stride) for i in range(count)])
 return ar
skin=doc['skins'][0]; nodes=doc['nodes']; joints=skin['joints']; boneNames=[nodes[i]['name'] for i in joints]
expected={'hips','spine','head','shR','elR','handR','shL','elL','handL','hipR','kneeR','ankR','hipL','kneeL','ankL','capeA','capeB','capeC'}
assert set(boneNames)==expected and len(boneNames)==18, boneNames
parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
world={}
def pos(i):
 if i in world:return world[i]
 p=np.asarray(nodes[i].get('translation',[0,0,0]),dtype=float)
 world[i]=p+(pos(parents[i]) if i in parents and parents[i]!=0 else 0)
 return world[i]
J=[[nodes[i]['name'],(pos(i)*SCALE).round(6).tolist(),nodes[parents[i]]['name'] if i in parents and parents[i] in joints else None] for i in joints]
# Extract embedded textures as external JPEG assets (avoid storing large base64 in JS).
images=[]
for i,im in enumerate(doc['images']):
 v=doc['bufferViews'][im['bufferView']];start=v.get('byteOffset',0);blob=bytes(BIN[start:start+v['byteLength']]);img=Image.open(io.BytesIO(blob)).convert('RGB'); path=OUT/f'legend-baron-{i}.jpg';img.save(path,'JPEG',quality=84,optimize=True);images.append(path)

# These open surfaces were authored with inward winding in the prototype GLB.
# Repair before generating normals and converting to Babylon's CW indices.
mesh_names={node['mesh']:node.get('name','') for node in nodes if 'mesh' in node}
inward_surfaces=('UV_textured_real_3d_face','coattail_outer','inner_red_tail','red_collared_neck')
parts={}; vertexCount=0; triCount=0
for matid in sorted(set(p.get('material',0) for m in doc['meshes'] for p in m['primitives'])):
 position=[];normals=[];color=[];uvs=[];ji=[];weights=[];inds=[]
 for meshid,mesh in enumerate(doc['meshes']):
  for p in mesh['primitives']:
   if p.get('material',0)!=matid:continue
   attrs=p['attributes'];v=acc(attrs['POSITION']).astype(np.float32)*SCALE;ix=acc(p['indices']).reshape(-1).astype(np.int64)
   assert (ix.max()<len(v))
   if any(name in mesh_names[meshid] for name in inward_surfaces):
    ix=ix.reshape(-1,3)[:,[0,2,1]].reshape(-1)
   # Babylon authored materials use opposite winding to the original glTF export.
   source_ix=ix.copy()
   ix=ix.reshape(-1,3)[:,[0,2,1]].reshape(-1)
   if 'NORMAL' in attrs:nm=acc(attrs['NORMAL']).astype(np.float32)
   else:
    nm=np.zeros_like(v);tris=source_ix.reshape(-1,3)
    for t in tris:
     a,b,c=v[t];n=np.cross(b-a,c-a);nm[t]+=n
    leng=np.linalg.norm(nm,axis=1,keepdims=True);nm/=np.maximum(leng,1e-9)
   uv=acc(attrs['TEXCOORD_0']).astype(np.float32) if 'TEXCOORD_0' in attrs else np.zeros((len(v),2),dtype=np.float32)
   # glTF UV starts at the top; DGM/JPEG uses Babylon invertY=true (bottom origin).
   uv[:,1]=1-uv[:,1]
   j=acc(attrs['JOINTS_0']).astype(np.uint8);w=acc(attrs['WEIGHTS_0']).astype(np.float32)
   # The prototype's proximity weights accidentally bind coat corners to hands.
   # Keep the complete garment (including trim/lining) on its dedicated cloth rig.
   name=mesh_names[meshid]
   cloth_names=('coattail_outer','coattail_lining','silver_coattail_edge','inner_red_tail','brocade_detail','hems_')
   torso_names=('outer_black_coat_torso','burgundy_high_neck_tunic','chest_burgundy_front','coat_lapel_trim','other_lapel_outline')
   belt_names=('waist_belt','ornate_buckle','buckle_inner','buckle_core')
   if any(key in name for key in cloth_names):
    upper,lower=next(x[1][1] for x in J if x[0]=='capeB'),next(x[1][1] for x in J if x[0]=='capeC')
    blend=np.clip((v[:,1]-lower)/(upper-lower),0,1)
    j=np.zeros_like(j);w=np.zeros_like(w);j[:,0]=boneNames.index('capeB');j[:,1]=boneNames.index('capeC');w[:,0]=blend;w[:,1]=1-blend
   elif any(key in name for key in torso_names+belt_names):
    j=np.zeros_like(j);w=np.zeros_like(w);j[:,0]=boneNames.index('hips') if any(key in name for key in belt_names) else boneNames.index('spine');w[:,0]=1
   ws=w.sum(axis=1,keepdims=True);w/=np.maximum(ws,1e-9);w=np.clip(np.rint(w*255),0,255).astype(np.uint8)
   # exact 255 total for each vertex
   for ww in w: ww[int(np.argmax(ww))]=max(0,min(255,int(ww[np.argmax(ww)])+255-int(ww.sum())))
   base=len(position);position.extend(v.tolist());normals.extend(nm.tolist());uvs.extend(uv.tolist());ji.extend(j.tolist());weights.extend(w.tolist());inds.extend((ix+base).tolist())
 n=len(position)
 if not n:continue
 mat=doc['materials'][matid];bc=mat.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1]);c=np.tile(np.array(bc[:3]),(n,1));color=np.clip(np.rint(c*255),0,255).astype('u1')
 # Each material receives its own texture. DGM accepts arbitrary part keys.
 name=f'legend_baron_{matid:02d}'
 P={'n':n,'p':np.rint(np.array(position,dtype=np.float32)*10000).clip(-32768,32767).astype('<i2').tobytes(),
 'nr':np.rint(np.array(normals)*127).clip(-127,127).astype('i1').tobytes(),
 'c':color.tobytes(),'uv':np.rint(np.clip(uvs,0,1)*65535).astype('<u2').tobytes(),
 'j':np.array(ji,dtype='u1').tobytes(),'w':np.array(weights,dtype='u1').tobytes(),
 'i':np.array(inds,dtype='<u2' if n<65536 else '<u4').tobytes(),'i32':n>=65536}
 mr=mat.get('pbrMetallicRoughness',{})
 P['material']={'roughness':mr.get('roughnessFactor',1),'metalness':mr.get('metallicFactor',1),'noSheen':1}
 if mat.get('doubleSided') or matid in (4,5,6):P['material']['side']='double'
 tex=mr.get('baseColorTexture')
 if tex is not None:
  ti=doc['textures'][tex['index']]['source'];P['alb']={'@t':f'tex/legend-baron-{ti}.jpg'}
 parts[name]=P;vertexCount+=n;triCount+=len(inds)//3
# DGM1 uses json references to tightly packed binary arrays.
payload=bytearray()
def transform(x):
 if isinstance(x,bytes):
  ofs=len(payload);payload.extend(x);return {'@b':[ofs,len(x)]}
 if isinstance(x,dict):return {k:transform(v) for k,v in x.items()}
 if isinstance(x,list):return [transform(v) for v in x]
 return x
# Keep the source animation clips, in local joint coordinates. Translation-only bind
# transforms and uniform scale make the rotations directly usable by the game rig.
clips={}
for animation in doc.get('animations',[]):
 tracks=[]
 for channel in animation['channels']:
  target=channel['target'];sampler=animation['samplers'][channel['sampler']]
  assert target['path']=='rotation' and sampler.get('interpolation','LINEAR')=='LINEAR'
  tracks.append({'joint':nodes[target['node']]['name'],
   'times':acc(sampler['input']).reshape(-1).round(6).tolist(),
   'rotations':acc(sampler['output']).round(7).tolist()})
 clips[animation['name']]={'duration':max(t['times'][-1] for t in tracks),'tracks':tracks}
body=transform({'v':4,'joints':J,'parts':parts,'grip':None,'materialMode':'standard','clips':clips})
if vertexCount > 30000 or triCount > 50000:
 print('WARNING: high-poly staging source; NOT APPROVED for iPhone: verts=',vertexCount,'triangles=',triCount,file=sys.stderr)
if not clips:
 print('WARNING: no animation clips in supplied GLB; retargeting is still required',file=sys.stderr)
head=json.dumps(body,ensure_ascii=False,separators=(',',':')).encode();head+=b' '*((-len(head))%4)
output=OUT/'legend-baron.dgm';output.write_bytes(b'DGM1'+struct.pack('<I',len(head))+head+payload)
print(json.dumps({'path':str(output),'bytes':output.stat().st_size,'parts':len(parts),'vertices':vertexCount,'triangles':triCount,'bones':len(J),'jpgs':[p.name for p in images]},ensure_ascii=False,indent=2))
