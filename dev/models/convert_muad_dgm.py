#!/usr/bin/env python3
"""Convert a skinned Meshy/Mixamo GLB into a DGM1-v5 staging asset.
Preserves all 66 local bind transforms and all 8 original animation clips.
Requires an upgraded renderer for local TRS and translations/scales.
"""
import json,struct,sys,io,hashlib
from pathlib import Path
from collections import defaultdict,Counter
import numpy as np
from PIL import Image
SRC=Path(sys.argv[1]); OUT=Path(sys.argv[2]);OUT.mkdir(parents=True,exist_ok=True)
b=SRC.read_bytes();assert b[:4]==b'glTF' and struct.unpack_from('<I',b,8)[0]==len(b)
jl=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+jl]);boff=20+jl
assert b[boff+4:boff+8]==b'BIN\0';bin=memoryview(b)[boff+8:boff+8+struct.unpack_from('<I',b,boff)[0]]
CT={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'};N={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(k):
 a=d['accessors'][k]; assert 'sparse' not in a
 v=d['bufferViews'][a['bufferView']];dt=np.dtype(CT[a['componentType']]);cnt=a['count'];sz=N[a['type']];st=v.get('byteStride',sz*dt.itemsize);start=v.get('byteOffset',0)+a.get('byteOffset',0)
 if st==sz*dt.itemsize:return np.frombuffer(bin,dtype=dt,count=cnt*sz,offset=start).reshape(cnt,sz).copy()
 return np.stack([np.frombuffer(bin,dtype=dt,count=sz,offset=start+i*st) for i in range(cnt)])
assert len(d['skins'])==1 and len(d['meshes'])==1
nodes=d['nodes'];skin=d['skins'][0];indices=skin['joints']; assert len(indices)<=255
parents={child:i for i,n in enumerate(nodes) for child in n.get('children',[])}
# stable name choices used by existing rendering code
aliases={'Hips':'hips','Spine':'spine','Spine1':'spine1','Spine2':'spine2','Head':'head','Neck':'neck','RightArm':'shR','RightForeArm':'elR','RightHand':'handR','LeftArm':'shL','LeftForeArm':'elL','LeftHand':'handL','RightUpLeg':'hipR','RightLeg':'kneeR','RightFoot':'ankR','LeftUpLeg':'hipL','LeftLeg':'kneeL','LeftFoot':'ankL'}
def name(i):
 s=nodes[i].get('name','joint_'+str(i));suffix=s.split(':')[-1];return aliases.get(suffix,s)
assert len({name(i) for i in indices})==len(indices)
order={i:k for k,i in enumerate(indices)}
def quat(i):return nodes[i].get('rotation',[0,0,0,1])
def loc(i):return nodes[i].get('translation',[0,0,0])
def scale(i):return nodes[i].get('scale',[1,1,1])
# DGM v5: joints are in LOCAL coordinate systems, not world-space positions.
joints=[[name(i),loc(i),name(parents[i]) if parents.get(i) in order else None,quat(i),scale(i)] for i in indices]
# Use source mesh data in its native coordinate system and its inverse bind matrices.
mesh_node=next(n for n in nodes if 'mesh' in n and 'skin' in n)
assert not any(k in mesh_node for k in ('matrix','translation','rotation','scale')),'mesh transform needs baking'
ibm=acc(skin['inverseBindMatrices']).astype('float32');assert ibm.shape==(len(indices),16)
parts={};vertexCount=0;triangleCount=0;texfiles=[]
for ii,im in enumerate(d.get('images',[])):
 v=d['bufferViews'][im['bufferView']];start=v.get('byteOffset',0);raw=bytes(bin[start:start+v['byteLength']]);image=Image.open(io.BytesIO(raw)).convert('RGB'); p=OUT/f'muad-dib-{ii}.jpg';image.save(p,'JPEG',quality=90,optimize=True);texfiles.append(p)
for mi,m in enumerate(d['meshes']):
 for pi,prim in enumerate(m['primitives']):
  att=prim['attributes'];v=acc(att['POSITION']).astype('float32'); n=len(v);assert n<65535
  nr=acc(att['NORMAL']).astype('float32');uv=acc(att['TEXCOORD_0']).astype('float32');uv[:,1]=1-uv[:,1]
  ji=acc(att['JOINTS_0']).astype('uint8');ww=acc(att['WEIGHTS_0']).astype('float32');ww/=np.maximum(ww.sum(axis=1,keepdims=True),1.e-12)
  weights=np.clip(np.rint(ww*255),0,255).astype('uint8')
  for w in weights:
   k=int(np.argmax(w));w[k]=np.uint8(np.clip(int(w[k])+255-int(w.sum()),0,255))
  assert np.all(weights.astype('int32').sum(axis=1)==255)
  assert ji.max()<len(joints)
  ix=acc(prim['indices']).reshape(-1).astype('uint16');assert len(ix)%3==0
  # Babylon's authored DGM has opposite triangle winding versus GLB.
  ix=ix.reshape(-1,3)[:,[0,2,1]].reshape(-1)
  mat=d['materials'][prim.get('material',0)];mr=mat.get('pbrMetallicRoughness',{});rgb=mr.get('baseColorFactor',[1,1,1,1])[:3];col=np.tile((np.array(rgb)*255).round().clip(0,255).astype('uint8'),(n,1))
  # existing DGM format's signed int16 1e-4 meter positions. Verify no overflow.
  scaled=np.rint(v*10000);assert np.max(np.abs(scaled))<=32767, 'DGM int16 overflow'
  obj={'n':n,'p':scaled.astype('<i2').tobytes(),'nr':np.rint(nr*127).clip(-127,127).astype('i1').tobytes(),'uv':np.rint(np.clip(uv,0,1)*65535).astype('<u2').tobytes(),'c':col.tobytes(),'j':ji.tobytes(),'w':weights.tobytes(),'i':ix.astype('<u2').tobytes(),'i32':False,'material':{'roughness':mr.get('roughnessFactor',1),'metalness':mr.get('metallicFactor',1),'noSheen':1,'side':'double' if mat.get('doubleSided') else 'front'}}
  tx=mr.get('baseColorTexture')
  if tx is not None:
   srcidx=d['textures'][tx['index']]['source'];obj['alb']={'@t':f'tex/muad-dib-{srcidx}.jpg'}
  parts[f'muad_dib_{mi}_{pi}']=obj;vertexCount+=n;triangleCount+=len(ix)//3
clips={}
for a in d['animations']:
 tr=[]
 for ch in a['channels']:
  tgt=ch['target'];s=a['samplers'][ch['sampler']];key=tgt['path'];assert key in ('rotation','translation','scale')
  assert s.get('interpolation','LINEAR')=='LINEAR'
  if tgt['node'] not in order:continue
  times=np.round(acc(s['input']).reshape(-1),6).tolist();values=np.round(acc(s['output']).astype('float32'),7).tolist()
  base={'rotation':quat(tgt['node']),'translation':loc(tgt['node']),'scale':scale(tgt['node'])}[key]
  ary=np.array(values,dtype=np.float32)
  # A constant channel equal to its rest value has no effect; omit it safely.
  if np.max(np.abs(ary-np.array(base,dtype=np.float32))) < 0.00002:continue
  tr.append({'joint':name(tgt['node']),'path':key,'times':times,'values':ary})
 clips[a['name']]={'duration':max(t['times'][-1] for t in tr),'tracks':tr}
# All clips in original order, mapping suggestions only, not claims of combat implementation.
report={'format':'DGM1 v5 local-trs','input':str(SRC.name),'bones':len(joints),'vertices':vertexCount,'triangles':triangleCount,'materials':len(parts),'textures':len(texfiles),'animations':{k:{'duration':v['duration'],'tracks':len(v['tracks']),'types':dict(Counter(x['path'] for x in v['tracks']))} for k,v in clips.items()},'runtime_compatibility':'REQUIRES localTrs renderer support; older DGM parser can parse file but old renderer cannot animate correctly'}
blob=bytearray()
def transform(obj):
 if isinstance(obj,bytes):
  start=len(blob);blob.extend(obj);return {'@b':[start,len(obj)]}
 if isinstance(obj,dict):return {k:transform(v) for k,v in obj.items()}
 if isinstance(obj,list):return [transform(x) for x in obj]
 return obj
# JSON payload holds animation keys and retains full precision. Future target: binary tracks.
# Store animation keyframe arrays as binary blobs, not millions of JSON floats.
for clip in clips.values():
 for track in clip['tracks']:
  track['times']=np.array(track['times'],dtype='<f4').tobytes()
  track['values']=np.array(track['values'],dtype='<f4').tobytes()
  track['componentCount']=4 if track['path']=='rotation' else 3
header={'v':5,'jointFormat':'local-trs','joints':joints,'inverseBindMatrices':ibm.astype('<f4').tobytes(),'parts':parts,'grip':None,'materialMode':'standard','clips':clips}
h=json.dumps(transform(header),separators=(',',':')).encode();h+=b' '*((-len(h))%4)
output=OUT/'muad-dib-legend.dgm';output.write_bytes(b'DGM1'+struct.pack('<I',len(h))+h+blob)
report.update({'dgm_bytes':output.stat().st_size,'dgm_sha256':hashlib.sha256(output.read_bytes()).hexdigest()})
(OUT/'conversion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
