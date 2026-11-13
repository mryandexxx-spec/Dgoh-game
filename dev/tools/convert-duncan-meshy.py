#!/usr/bin/env python3
"""Convert optimized Meshy GLB into Dune GoH DGM1 v5 (local-trs) asset.
Requires numpy and Pillow. Run from repository root:
python dev/tools/convert-duncan-meshy.py --input dev/assets-src/duncan/Duncan_mobile_optimized_16clips.glb --root dev
"""
import argparse, json, struct, os, io, pathlib, math
import numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--root',default='dev');a=p.parse_args()
root=pathlib.Path(a.root);src=pathlib.Path(a.input)
f=src.open('rb');assert f.read(4)==b'glTF';ver,total=struct.unpack('<II',f.read(8));assert ver==2
l,t=struct.unpack('<II',f.read(8));assert t==0x4e4f534a;g=json.loads(f.read(l));l,t=struct.unpack('<II',f.read(8));assert t==0x004e4942;raw=f.read(l)
ct={5120:np.dtype('i1'),5121:np.dtype('u1'),5122:np.dtype('<i2'),5123:np.dtype('<u2'),5125:np.dtype('<u4'),5126:np.dtype('<f4')};sz={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(i):
 x=g['accessors'][i];v=g['bufferViews'][x['bufferView']];s=v.get('byteStride');dtype=ct[x['componentType']];off=v.get('byteOffset',0)+x.get('byteOffset',0);n=x['count'];k=sz[x['type']]
 if s:
  ar=np.ndarray((n,k),dtype=dtype,buffer=raw,offset=off,strides=(s,dtype.itemsize))
 else:ar=np.frombuffer(raw,dtype=dtype,count=n*k,offset=off).reshape(n,k)
 return np.array(ar)
# Node naming: preserve hierarchy; adapt 15 core bones to engine's named aliases.
rename={'Hips':'hips','Spine2':'spine','Head':'head','RightArm':'shR','RightForeArm':'elR','RightHand':'handR','LeftArm':'shL','LeftForeArm':'elL','LeftHand':'handL','RightUpLeg':'hipR','RightLeg':'kneeR','RightFoot':'ankR','LeftUpLeg':'hipL','LeftLeg':'kneeL','LeftFoot':'ankL'}
jn=g['skins'][0]['joints'];nodes=g['nodes'];names={i:rename.get(nodes[i].get('name','').split(':')[-1], nodes[i].get('name','node_'+str(i)).replace('mixamorig:','mx_')) for i in jn}
assert len(set(names.values()))==len(jn) and all(v in names.values() for v in rename.values())
parents={};[parents.setdefault(ch,i) for i,n in enumerate(nodes) for ch in n.get('children',[])]
# Preserve all 66 bones and their source rest quaternion/scale. GLB positions are already Y-up.
joints=[]
for i in jn:
 n=nodes[i];par=parents.get(i);joints.append([names[i],n.get('translation',[0,0,0]),names.get(par),n.get('rotation',[0,0,0,1]),n.get('scale',[1,1,1])])
# Packed DGM blobs: relative to end of 4-byte-aligned JSON header.
blob=bytearray()
def pack(ar):
 b=np.ascontiguousarray(ar).tobytes();blob.extend(b'\0'*((-len(blob))%4));o=len(blob);blob.extend(b);return {'@b':[o,len(b)]}
pr=g['meshes'][0]['primitives'][0];at=pr['attributes'];P=acc(at['POSITION']).astype('<f4');N=acc(at['NORMAL']).astype('<f4');UV=acc(at['TEXCOORD_0']).astype('<f4');J=acc(at['JOINTS_0']).astype(np.uint8);W=acc(at['WEIGHTS_0']).astype('<f4');I=acc(pr['indices']).reshape(-1)
assert len(P)<65536 and J.max()<256
assert I.max()<65536
# Engine authored.js interprets positions as signed int16 / 10000 and normals as signed int8 / 127.
assert np.max(np.abs(P))<3.2767
pp=np.rint(P*10000).astype('<i2');nn=np.rint(np.clip(N,-1,1)*127).astype('i1');uv=np.rint(np.clip(UV,0,1)*65535).astype('<u2')
weights=np.rint(W*255).astype('u1');ix=np.argmax(weights,axis=1);fix=255-weights.sum(axis=1).astype(int);weights[np.arange(len(weights)),ix]=np.clip(weights[np.arange(len(weights)),ix].astype(int)+fix,0,255).astype('u1')
# Source skin joint indices refer to skin.joints, NOT GLB node indices; keep skin joint order.
part={'n':len(P),'p':pack(pp),'nr':pack(nn),'c':pack(np.full((len(P),3),255,dtype='u1')),'j':pack(J),'w':pack(weights),'uv':pack(uv),'i':pack(I.astype('<u2')),'i32':False,'material':'cloth','alb':{'@t':'tex/duncan-meshy-alb.jpg'}}
# Existing loader reads clip tracks in local node coordinates, times float32, values float32.
clips={}
for an in g['animations']:
 tracks=[];duration=0.
 for ch in an['channels']:
  target=ch['target'];ni=target['node'];path=target['path'];
  if ni not in names or path not in ('rotation','translation','scale'):continue
  s=an['samplers'][ch['sampler']];ts=acc(s['input']).reshape(-1).astype('<f4');vs=acc(s['output']).astype('<f4')
  if not len(ts):continue
  assert s.get('interpolation','LINEAR')=='LINEAR', 'Unsupported interpolation in '+an['name']
  duration=max(duration,float(ts[-1]));tracks.append({'joint':names[ni],'path':path,'times':pack(ts),'values':pack(vs),'componentCount':vs.shape[1]})
 clips[an['name']]={'duration':duration,'tracks':tracks}
# From source GLB one skinned mesh, 66 joints (with fingers). Keep full rig rather than destructive retargeting.
out={'v':5,'jointFormat':'local-trs','joints':joints,'parts':{'cloth':part},'clips':clips,'materialMode':'standard','grip':{'p':[0,-.04,.01]}}
# DGM header may contain blobs, which are relative to base (after padded JSON header).
head=json.dumps(out,separators=(',',':'),ensure_ascii=False).encode('utf8');head+=b' '*((-len(head))%4)
res=b'DGM1'+struct.pack('<I',len(head))+head+blob
model=root/'assets/models/duncan-meshy.dgm';model.parent.mkdir(parents=True,exist_ok=True);model.write_bytes(res)
im=g['images'][0];v=g['bufferViews'][im['bufferView']];pic=raw[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];image=Image.open(io.BytesIO(pic)).convert('RGB');tex=root/'assets/tex/duncan-meshy-alb.jpg';tex.parent.mkdir(parents=True,exist_ok=True);image.save(tex,'JPEG',quality=88,optimize=True,subsampling=0)
manifest={'source':str(src),'output':str(model),'joint_count':len(joints),'triangle_count':len(I)//3,'clip_count':len(clips),'clips':{n:{'seconds':round(c['duration'],3),'tracks':len(c['tracks'])} for n,c in clips.items()},'texture':str(tex),'bytes':len(res)}
(root/'assets-src/duncan').mkdir(parents=True,exist_ok=True)
(root/'assets-src/duncan/animation-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
# Check parseable DGM and named aliases
assert res[:4]==b'DGM1' and len(res)>=8+struct.unpack('<I',res[4:8])[0]
print(json.dumps(manifest,ensure_ascii=False,indent=2))
