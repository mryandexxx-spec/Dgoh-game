"""C3 material-only experiment. Blender background CPU, no game imports."""
import bpy, math, sys, os, base64, json
from mathutils import Vector
from pathlib import Path
out=Path(os.environ.get("C3_OUT","material-output")).resolve(); out.mkdir(exist_ok=True)
sample=out/"imagegen-height-sample.png"
sample.write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAADAAAAAQCAAAAAB1xaNtAAACAklEQVR42gXBWZYbNwwAQIAASPYieebZzilyy1w2P47TIzU3kICr8J80wrK9UACSueCemXJfm85ZH99i+z3oPMdLqfqBCRpPx+2tt+8mfhdPqHxofDVXPI7eFEEDxnjP7Vj6sszJNnthyzeoCsQ6JQnU4C5Sq2EB2j/1P+NwPLTCuBhsFgMkSWCURnqaG2K8ZeqGQGcP4boutod1DMZP+ruESXayKruWyRrnatmdfRRYzU0+P+J5HEeS5TQT787cEkGbdVKQAL0LFIkW/fbfLILV2xfQOzVpsm7G4UkB+HsPRSqi68h7h6VLvvlPQFxVqa+9xnyI5ckhZv84DGyjEzu2EbI358Qs0dVTRAjlClXHghTnZMkazFxtnl1Gv9qefdS8nm8mINzbFDS0+FfF59LVuO1E0J02x+tY8uNOKa28kd/DVthGefy6BLMPBnd8K3u35/HLtk5IVcN+YgrVRoqPO1HHol/rwAVlhPHhBM5B562BwsUQui+w3smQaZnNZUoxMDTET71gxVyVJZevDJGWsdGuec6g+3PG2lxgk9m0sSHnzGFmcWGVPa9FklJosUvVva56n+VfPBrtqxWM8zto91yT3UfhU4WWeZNm2AFn6EmY8T6qMSj503V7y1qhz6kHARdlBG3rEwzsdo2B2ALj3Oe94vo/LEwyxF8epoQy/gA/pnaiiFC4VAAAAABJRU5ErkJggg=="))
def linear(x): return x/12.92 if x<.04045 else ((x+.055)/1.055)**2.4
def color(h): return tuple(linear(int(h[i:i+2],16)/255) for i in (0,2,4))+(1,)
def material(name,h,metal,rough,hybrid=False):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=m.node_tree.nodes;l=m.node_tree.links;p=n.get("Principled BSDF")
 p.inputs["Base Color"].default_value=color(h);p.inputs["Metallic"].default_value=metal;p.inputs["Roughness"].default_value=rough
 if hybrid:
  tx=n.new("ShaderNodeTexImage");tx.image=bpy.data.images.load(str(sample),check_existing=True);tx.image.colorspace_settings.name="Non-Color";tx.image.pack();tx.extension="REPEAT"
  tc=n.new("ShaderNodeTexCoord");l.new(tc.outputs["Generated"],tx.inputs["Vector"])
 else:
  tx=n.new("ShaderNodeTexNoise");tx.inputs["Scale"].default_value=105;tx.inputs["Detail"].default_value=2;tx.inputs["Roughness"].default_value=.55
  tc=n.new("ShaderNodeTexCoord");l.new(tc.outputs["Generated"],tx.inputs["Vector"])
 b=n.new("ShaderNodeBump");b.inputs["Strength"].default_value=.12;b.inputs["Distance"].default_value=.006;l.new(tx.outputs["Color"],b.inputs["Height"]);l.new(b.outputs["Normal"],p.inputs["Normal"])
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
def light(name,loc,energy,size,color):
 data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.shape="DISK";data.size=size;data.color=color
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(-Vector(loc)).to_track_quat("-Z","Y").to_euler()
for W in (993,801):
 for variant in ("blender","hybrid"):
  for state in ("normal","pressed","disabled"):
   bpy.ops.wm.read_factory_settings(use_empty=True)
   scene=bpy.context.scene
   scene.render.engine="CYCLES";scene.cycles.samples=96;scene.cycles.use_denoising=False
   scene.render.resolution_x=W;scene.render.resolution_y=132;scene.render.resolution_percentage=100
   scene.render.film_transparent=True;scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGBA"
   scene.world=bpy.data.worlds.new("Neutral studio");scene.world.use_nodes=True;scene.world.node_tree.nodes["Background"].inputs[0].default_value=(.24,.24,.24,1);scene.world.node_tree.nodes["Background"].inputs[1].default_value=.55
   scene.view_settings.view_transform="Standard";scene.view_settings.look="None"
   frame=material("Antique bronze","8d7650",.66,.35);dark=material("Dark satin","24211d",.35,.48);gold=material("Sand brass","b89761" if state=="normal" else "a18151",.60,.43,variant=="hybrid")
   prism("Outer frame",octagon(W,1),.01,.05,1.3,frame,W)
   prism("Recess",octagon(W,4),.025,.045,1.0,dark,W)
   if state!="disabled":
    xt=W*.60+26;xb=W*.60-26
    prism("Brass insert",[(xt,9),(W-25,9),(W-11,23),(W-11,108),(W-25,123),(xb,123)],.054 if state=="normal" else .040,.035,2.4,gold,W)
    prism("Dark insert",[(22,9),(xt-7,9),(xb-7,123),(22,123),(9,110),(9,22)],.042,.035,1.2,dark,W)
   else: prism("Inactive insert",octagon(W,8),.042,.035,1.2,dark,W)
   cd=bpy.data.cameras.new("Front orthographic");cam=bpy.data.objects.new("Camera",cd);bpy.context.collection.objects.link(cam);cam.location=(0,0,10);cd.type="ORTHO";cd.ortho_scale=W/132;scene.camera=cam
   light("Soft key",(-2,3,5),420,5,(1,.94,.85));light("Neutral fill",(3,-2,4),160,4,(1,1,1))
   path=out/f"{variant}-{W}-{state}.png";scene.render.filepath=str(path)
   bpy.ops.render.render(write_still=True)
   if W==993 and state=="normal": bpy.ops.wm.save_as_mainfile(filepath=str(out/f"{variant}.blend"))
   print("C3_RENDER",variant,W,state,path.name,flush=True)
(out/"receipt.json").write_text(json.dumps({"blender":bpy.app.version_string,"sizes":[[993,132],[801,132]],"variants":["blender","hybrid"],"states":["normal","pressed","disabled"],"hybrid_source":"ImageGen brass interior grayscale high-pass sample, 48x16; not a true measured height map","runtime":False},indent=2))

# Inline visual witnesses for remote independent review; PNGs remain unmodified.
for w in (993,801):
 for variant in ("blender","hybrid"):
  p=out/f"{variant}-{w}-normal.png"
  data=base64.b64encode(p.read_bytes()).decode()
  for i in range(0,len(data),3000):
   print(f"C3_WITNESS {variant}-{w} {i//3000:04d} {data[i:i+3000]}",flush=True)
