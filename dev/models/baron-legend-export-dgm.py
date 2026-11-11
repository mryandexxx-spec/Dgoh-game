import bpy,json,struct,math,sys
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'baron_mobile';bpy.ops.wm.open_mainfile(filepath=str(OUT/'baron_mobile.blend'))
rig=bpy.data.objects['Baron_Rig'];names=['hips','spine','head','shR','elR','handR','shL','elL','handL','hipR','kneeR','ankR','hipL','kneeL','ankL','capeA','capeB','capeC'];assert set(names)==set(b.name for b in rig.data.bones)
idx={n:i for i,n in enumerate(names)}
def gv(v):return [v[0],v[2],-v[1]]
joints=[[n,gv(rig.matrix_world@rig.data.bones[n].head_local),rig.data.bones[n].parent.name if rig.data.bones[n].parent else None] for n in names]
parts={};total_v=0;total_t=0
for o in sorted([o for o in bpy.data.objects if o.type=='MESH'],key=lambda x:x.name):
 me=o.data;me.calc_loop_triangles();mat=me.materials[0];p=mat.node_tree.nodes.get('Principled BSDF');color=list(p.inputs['Base Color'].default_value)[:3]
 # Per-corner normals preserve the bevels and hard edges under the game's indexed format.
 verts=[];normals=[];uv=[];js=[];ws=[];inds=[];lookup={};gmap={g.index:g.name for g in o.vertex_groups};W=[]
 for v in me.vertices:
  inf=sorted([(idx[gmap[g.group]],float(g.weight)) for g in v.groups if gmap[g.group] in idx and g.weight>1e-6],key=lambda x:-x[1])[:4]
  if not inf:inf=[(0,1.0)]
  tot=sum(w for _,w in inf);jn=[j for j,w in inf]+[0]*(4-len(inf));wn=[w/tot for j,w in inf]+[0]*(4-len(inf));wb=np.rint(np.array(wn)*255).astype(int);wb[int(wb.argmax())]+=255-int(wb.sum());W.append((jn,wb.tolist()))
 for tri in me.loop_triangles:
  tri_indices=[]
  for li in tri.loops:
   vi=me.loops[li].vertex_index;n=o.matrix_world.to_3x3().inverted().transposed()@me.corner_normals[li].vector;n.normalize();n=gv(n);q=np.rint(np.array(n)*127).clip(-127,127).astype('i1');key=(vi,tuple(q))
   if key not in lookup:
    lookup[key]=len(verts);verts.append(gv(o.matrix_world@me.vertices[vi].co));normals.append(q);js.append(W[vi][0]);ws.append(W[vi][1])
   tri_indices.append(lookup[key])
  inds.extend([tri_indices[0],tri_indices[2],tri_indices[1]])
 n=len(verts);assert n<65536
 srgb=np.power(np.clip(color,0,1),1/2.2);c=np.tile(np.rint(srgb*255).astype('u1'),(n,1))
 material={'roughness':float(p.inputs['Roughness'].default_value),'metalness':float(p.inputs['Metallic'].default_value),'noSheen':1,'side':'double'}
 if 'Suspensor' in mat.name:material['emissive']='#e30003'
 part={'n':n,'p':np.rint(np.array(verts)*10000).clip(-32768,32767).astype('<i2').tobytes(),'nr':np.array(normals,dtype='i1').tobytes(),'c':c.tobytes(),'j':np.array(js,dtype='u1').tobytes(),'w':np.array(ws,dtype='u1').tobytes(),'i':np.array(inds,dtype='<u2').tobytes(),'i32':False,'material':material}
 parts[o.name]=part;total_v+=n;total_t+=len(inds)//3
payload=bytearray()
def pack(x):
 if isinstance(x,bytes):a=len(payload);payload.extend(x);return {'@b':[a,len(x)]}
 if isinstance(x,dict):return {k:pack(v) for k,v in x.items()}
 if isinstance(x,list):return [pack(v) for v in x]
 return x
header=json.dumps(pack({'v':4,'joints':joints,'grip':None,'parts':parts}),separators=(',',':')).encode();header+=b' '*((-len(header))%4)
path=OUT/'baron-legend-mobile.dgm';path.write_bytes(b'DGM1'+struct.pack('<I',len(header))+header+payload)
print('DGM_EXPORTED',{'bytes':path.stat().st_size,'parts':len(parts),'vertices':total_v,'triangles':total_t,'bones':len(joints)})
