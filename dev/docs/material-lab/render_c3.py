"""C3 R2/R3 bounded material experiment. Blender background CPU, no game imports."""
import bpy, math, sys, os, base64, json
from mathutils import Vector
from pathlib import Path
out=Path(os.environ.get("C3_OUT","material-output")).resolve(); out.mkdir(exist_ok=True)
def linear(x): return x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4
def color(h): return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,)
import zlib
MAPS = {"gold":"eNoNU89r23YUl0psqHdxQpxhXdZCC4sP+RvsYgeaMrBDpMzfHJaNWMv36+Fcexp1tnSQk2MsLZagJEPf7/x9ItKpBylMGv0bRgbdZYc4ozIkl7UsyiZN7/ge78P7/Hg+9RxMbTZEZnJ7DDDkvqWkHDHfAiqxCLd3yyTWGQE40yKdRITzBCJNc4KiMtT374EI3djYStLjuZUT5acjtd70DcRRcrujMGW/G2Wbl52lY8ZXtdUvKFc5XiYbOwowGQAMdNR1zqe0ApHTtcpZh3seQhvyXvwMkdkVV9/8+BZGHancnCNKx3YUwH4AK4YdH65Voovo0L72vB0FAVVgCwhHMhm/BjZ+WRVyuEeM318m4MlyJUxTBvFfUfjDBaLuGebFXJ46jlGvIeGx1oAxRvMtxIdYPSiWcW/sxmlWEEm4JTxC6FIk28UK0TP2xJJ2F8lNEkcgI8MN0wwagFRIAMRkNgD95v4GCu8IPSl0BmVZeLA0UCxBKC0hWi9h4KPPBcqfLuahh2qrQqnVFKtNaXAiCEJx/rd6Xag2sDaoV0XaQxowzDz4YAZJGtqu3k8CB+zIMfJr9hot7H1gyCDcB9chdpre+Ff/BQlJY+TEYaJoUs9PSHhV09At4vz543HtoN/GqHt3d5emfy/IJdE8m5mgUn4NynlABvc+y0kF9w7SdJbGyiaVjsQYxj6AM6aeGzdFld9/omWGhnCedLpxOptpRNUvRj6aTpY7eNXgBeVFqVHdXrEWH/4cvbV5HkE+umX27N9l9M6ExAmnVh1NyYuiuuXa+p+VoYH0G9lw/+lm4bMvzAySwemisExq8idXfRKvdyCVYQS0ptjujYw8GtOWrFO9NhBlY7yRR6LLSY+vPzFmM1qJXrP3BSzxyTa1cu0JX0dDHSBGo2YLN4VWjtn90+85yQyfVD+yNacd8KYo05wZvQP/WzNK30en7OrWnoIzKn/8hnDHtFZzrN9oWq8GX/1xE15u6q7HG9Wyy+jerz2jR2hND3RryQ+BkZ6n6w6ZNJg5pplO9Bd0AB7Hrj3FqiLVHixlRyEDi0OXU0fhWJbrT7+kpQ6BM+WQsF17kuOKn/tuP7jGZcJYoa1xiH2Ov85+g7Dg3DjM9CmcXww80vt0wePIpNwgijWXZzSb+Jt9dPrs1VgFS5XxI47OJI0dlh/6nfJ8TdStVrHSXohydUVGVpMvjP4Hs5kcTQ==","dark":"eNoVU81q6zgYDeomKEPzCqWrIA/OwGxKCumrGWcTZGhfQbgbcXSRSldGKdblzma4F+YZjGdjlCENuRujgDy62n6H8306Pw1k88DMoN1LowCMDU66IeN2A4Sl4g8Uqrk5fmEfTwE49X2nqXv+8yqfYKaTC1TVqHcRWkCDB/jAhVY7n68lXHChSpxqira1fhFot+6ZLnEUpT544+J0mlBZHPwfcbqW8dav5QwLZIK0h8m8eKUnRRoPsXl3njjU2kLSvRWbMOnlnBJTTRJpV1a3Jda+72qAi/D+GDxA9EAX6Wqui7mIj6fM999KEbDrmAr7FZ9xbDIB/JW/6VUkAuX1B89zLArgrk0DuKlGl+02+J20tIBfV3yZl5mnksmZ1pINCRPKVf1B0f/66QnL0Tq/lW3R9gu/9opUfyuZBa9fj5dBvfioWQIGgrFb9LDB0FvnH3/W9eukhoZKm3kiiOJTkPcwo4jI/W/vVq7YJVkFUdRJSF8K052k/zzTs7bimZnpgzn4cTxfpKfq6iVTn75uV3ykclaxjwdarG1fd924BDmCo6gDlKj8mMmZGrbiTRSY339J8gg2KDDjCdWFUf1hWBy5pPVE5a0K0WsSn0FiNVK0/MJCpT97feX1xC1r36zcqMjtTnkJDF9RxtIkC+BFCz2dZoTD9bx9VXHhiwSBBem/i33BUOnqn5XMNFSFnW/Bi9euNiGW74Hm7isxutRP9aXBsXIlN4WZfLfUtpQc+slMseU33LHzauNvXCL+EV00n8O6VskkSUv4PC1JhJB1a8bs50hk9q3Ava0rIhFbryEl4byQFzQs608lp7NidccE7v2KtTMSel6IecECkzorYTyeJ/29yqIDbVw4wJt9a1p3Btj6WCrY/+I0KZXcZsipYXt1cmqSM5Iy+2/qSzrMwUlrgZbN8qRH0t/TvdwuVLS/AnU3z1nB7PvAmpetPGIjrHiarlvDI6CZkbyh8zpFU7PX1EDkwu4dHhd10ebodCkXI9v5SnFUNVKT0iu5YOpmOGjeGfE/a75nmA=="}
def texture_map(part):
 raw=zlib.decompress(base64.b64decode(MAPS[part]))
 values=[((x>>shift)&3)/3 for x in raw for shift in (6,4,2,0)]
 assert len(values)==128*32
 # Full-panel spatial field, not a single repeated micro swatch. Infer roughness and height, not measured PBR.
 im=bpy.data.images.new("ImageGen "+part+" inferred relief",width=128,height=32,alpha=False)
 im.colorspace_settings.name="Non-Color"
 rgba=[q for y in range(31,-1,-1) for v in values[y*128:(y+1)*128] for q in (v,v,v,1.)]
 im.pixels.foreach_set(rgba); im.update()
 im.filepath_raw=str(out/f"imagegen-{part}-height.png"); im.file_format="PNG";im.save();im.pack()
 return im
def material(name,h,metal,rough,hybrid=False,part=None):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=m.node_tree.nodes;l=m.node_tree.links;p=n.get("Principled BSDF")
 p.inputs["Base Color"].default_value=color(h);p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if "Anisotropic IOR Level" in p.inputs:p.inputs["Anisotropic IOR Level"].default_value=.65 if part else .35
 elif "Anisotropic" in p.inputs:p.inputs["Anisotropic"].default_value=.65 if part else .35
 tc=n.new("ShaderNodeTexCoord")
 # elongated machining marks in actual object-space coordinates, consistent across widths.
 vec=n.new("ShaderNodeVectorMath");vec.operation="MULTIPLY";vec.inputs[1].default_value=(2,100,8);l.new(tc.outputs["Object"],vec.inputs[0])
 tx=n.new("ShaderNodeTexNoise");tx.inputs["Scale"].default_value=12;tx.inputs["Detail"].default_value=2;tx.inputs["Roughness"].default_value=.55;l.new(vec.outputs["Vector"],tx.inputs["Vector"])
 bump=n.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.24;bump.inputs["Distance"].default_value=.0018;l.new(tx.outputs["Fac"],bump.inputs["Height"])
 ramp=n.new("ShaderNodeMapRange");ramp.inputs["To Min"].default_value=rough-.06;ramp.inputs["To Max"].default_value=rough+.06;l.new(tx.outputs["Fac"],ramp.inputs["Value"]);l.new(ramp.outputs["Result"],p.inputs["Roughness"])
 if hybrid and part:
  tex=n.new("ShaderNodeTexImage");tex.image=texture_map(part);tex.extension="EXTEND";tex.interpolation="Linear";l.new(tc.outputs["Generated"],tex.inputs["Vector"])
  relief=n.new("ShaderNodeBump");relief.inputs["Strength"].default_value=.28;relief.inputs["Distance"].default_value=.004;l.new(tex.outputs["Color"],relief.inputs["Height"]);l.new(bump.outputs["Normal"],relief.inputs["Normal"]);l.new(relief.outputs["Normal"],p.inputs["Normal"])
  rr=n.new("ShaderNodeMapRange");rr.inputs["To Min"].default_value=rough-.10;rr.inputs["To Max"].default_value=rough+.10;l.new(tex.outputs["Color"],rr.inputs["Value"]);l.new(rr.outputs["Result"],p.inputs["Roughness"])
 else:l.new(bump.outputs["Normal"],p.inputs["Normal"])
 return m
def prism(name,poly,z,depth,bevel,mat,W):
 # pixel -> world coordinates, top-down orthographic, polygon clockwise in source
 pts=[((x-W/2)/132,(66-y)/132) for x,y in poly]; count=len(pts)
 verts=[(x,y,z-depth) for x,y in pts]+[(x,y,z) for x,y in pts]
 faces=[tuple(range(count)),tuple(reversed(range(count,2*count)))]+[(i,i+count,(i+1)%count+count,(i+1)%count) for i in range(count)]
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
 bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.mode_set(mode="EDIT");bpy.ops.mesh.select_all(action="SELECT");bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode="OBJECT");ob.select_set(False)
 if bevel:
  mod=ob.modifiers.new("Machined bevel","BEVEL");mod.width=bevel/132;mod.segments=3;mod.limit_method="ANGLE"
  norm=ob.modifiers.new("Weighted normals","WEIGHTED_NORMAL");norm.keep_sharp=True
 return ob
def octagon(W,inset=0):
 c=19; i=inset
 return [(c+i*.42,i),(W-c-i*.42,i),(W-i,c+i*.42),(W-i,132-c-i*.42),(W-c-i*.42,132-i),(c+i*.42,132-i),(i,132-c-i*.42),(i,c+i*.42)]
def light(name,loc,energy,size,color,strip=None):
 data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.shape="RECTANGLE" if strip else "DISK";data.size=size;data.color=color
 if strip: data.size_y=strip
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(-Vector(loc)).to_track_quat("-Z","Y").to_euler()
for W in (993,801):
 for variant in ("blender","hybrid"):
  for state in ("normal","pressed","disabled"):
   bpy.ops.wm.read_factory_settings(use_empty=True)
   scene=bpy.context.scene
   scene.render.engine="CYCLES";scene.cycles.samples=96;scene.cycles.use_denoising=False
   scene.render.resolution_x=W;scene.render.resolution_y=132;scene.render.resolution_percentage=100
   scene.render.film_transparent=True;scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGBA"
   scene.world=bpy.data.worlds.new("Neutral studio");scene.world.use_nodes=True;scene.world.node_tree.nodes["Background"].inputs[0].default_value=(.18,.18,.18,1);scene.world.node_tree.nodes["Background"].inputs[1].default_value=.45
   scene.view_settings.view_transform="Standard";scene.view_settings.look="None"
   frame=material("Antique bronze","8d7650",.86,.27);dark=material("Dark satin","24211d",.65,.42,variant=="hybrid","dark");gold=material("Sand brass","b89761" if state=="normal" else "a18151",.88,.30,variant=="hybrid","gold")
   prism("Outer frame",octagon(W,1),.01,.05,2.1,frame,W)
   prism("Recess",octagon(W,4),.025,.045,1.0,dark,W)
   if state!="disabled":
    x=round(W/3*.59)*3;xt=x+36;xb=x-15
    prism("Brass insert",[(xt,9),(W-25,9),(W-11,23),(W-11,108),(W-25,123),(xb,123)],.054 if state=="normal" else .040,.035,3.8,gold,W)
    prism("Dark insert",[(22,9),(xt-7,9),(xb-7,123),(22,123),(9,110),(9,22)],.042,.035,2.2,dark,W)
   else: prism("Inactive insert",octagon(W,8),.042,.035,1.2,dark,W)
   cd=bpy.data.cameras.new("Front orthographic");cam=bpy.data.objects.new("Camera",cd);bpy.context.collection.objects.link(cam);cam.location=(0,0,10);cd.type="ORTHO";cd.ortho_scale=W/132;scene.camera=cam
   light("Long reflected key",(-.7,.50,3),260,8,(1,.98,.95),.65);light("Broad neutral fill",(2,-1.7,4),90,5,(1,1,1),2.5);light("Raking edge",(-3,2,1.2),110,3,(1,.96,.90),.35)
   path=out/f"{variant}-{W}-{state}.png";scene.render.filepath=str(path)
   bpy.ops.render.render(write_still=True)
   if W==993 and state=="normal": bpy.ops.wm.save_as_mainfile(filepath=str(out/f"{variant}.blend"))
   print("C3_RENDER",variant,W,state,path.name,flush=True)
(out/"receipt.json").write_text(json.dumps({"blender":bpy.app.version_string,"sizes":[[993,132],[801,132]],"variants":["blender","hybrid"],"states":["normal","pressed","disabled"],"hybrid_source":"Two distinct 128x32 whole-panel ImageGen high-pass fields, 2-bit quantized; separately inferred height and roughness, not measured PBR","runtime":False},indent=2))

# Inline visual witnesses for remote independent review; PNGs remain unmodified.
for w in (993,801):
 for variant in ("blender","hybrid"):
  p=out/f"{variant}-{w}-normal.png"
  data=base64.b64encode(p.read_bytes()).decode()
  for i in range(0,len(data),3000):
   print(f"C3_WITNESS {variant}-{w} {i//3000:04d} {data[i:i+3000]}",flush=True)
