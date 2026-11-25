"""CF-02: clothed character assembly and real GLB render proof.
Uses public MPFB 2.0.18 services and CC0 system assets, no runtime changes.
The work suit is a fitting test, not approved Dune costume.
"""
import bpy, os, json, math, importlib, base64
import numpy as np
import runpy
from pathlib import Path
from mathutils import Vector

out = Path(os.environ["CF_OUT"])
out.mkdir(parents=True, exist_ok=True)
assets = Path(os.environ["CF_ASSETS"])
def file(name):
    paths = sorted(assets.rglob(name))
    if not paths:
        stem = Path(name).stem.lower()
        paths = sorted(p for p in assets.rglob("*.mhclo") if stem.endswith("_"+p.stem.lower()) and p.stem.lower() != "suit")
    if len(paths) != 1:
        raise RuntimeError(f"Expected one {name}, found {paths}")
    return str(paths[0])
def service(name):
    addon, = [a.module for a in bpy.context.preferences.addons if a.module.split(".")[-1] == "mpfb"]
    return getattr(importlib.import_module(addon + ".services." + name.lower()), name)
H, T, E, O = [service(n) for n in ("HumanService","TargetService","ExportService","ObjectService")]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
macro = T.get_default_macro_info_dict()
macro.update({"gender":1.0,"age":0.87,"muscle":0.65,"weight":0.49})
body = H.create_human(macro_detail_dict=macro)
old_skins=sorted(assets.rglob("old_caucasian_male.mhmat"))
H.set_character_skin(str(old_skins[0]) if old_skins else file("middleage_caucasian_male.mhmat"), body, skin_type="GAMEENGINE")
H.add_builtin_rig(body,"game_engine")
for filename, kind in [("low-poly.mhclo","Eyes"),("eyebrow003.mhclo","Eyebrows"),("eyelashes01.mhclo","Eyelashes"),("short01.mhclo","Hair"),("wdg_scruffy_beard.mhclo","Clothes"),("culturalibre_hero_suit_2.mhclo","Clothes"),("shoes02.mhclo","Clothes")]:
    item = H.add_mhclo_asset(file(filename),body,asset_type=kind,material_type="GAMEENGINE",subdiv_levels=0)
    # Retain existing material texture detail/alpha; recolor the base-color map offline.
    for mat in item.data.materials:
        if not mat or not mat.use_nodes: continue
        bsdf = next((n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED"),None)
        if not bsdf: continue
        base = bsdf.inputs["Base Color"]
        if "beard" in filename or kind=="Hair": palette=(.52,.49,.44); strength=.85
        elif "suit" in filename or "shoes" in filename: palette=(.16,.145,.12); strength=.9
        else: continue
        if base.is_linked and base.links[0].from_node.type=="TEX_IMAGE":
            node=base.links[0].from_node
            img=node.image.copy();node.image=img
            if max(img.size)>1024:
                scale=1024/max(img.size);img.scale(max(1,round(img.size[0]*scale)),max(1,round(img.size[1]*scale)))
            px=np.empty(len(img.pixels),dtype=np.float32);img.pixels.foreach_get(px)
            rgba=px.reshape(-1,4);lum=rgba[:,:3]@np.array([.2126,.7152,.0722],dtype=np.float32)
            colored=np.clip((.25+lum[:,None]*1.2)*np.array(palette),0,1)
            rgba[:,:3]=(1-strength)*rgba[:,:3]+strength*colored
            img.pixels.foreach_set(px);img.update();img.pack()
        else:
            if base.is_linked:
                continue
            base.default_value=(*palette,1)
        bsdf.inputs["Roughness"].default_value=.8
# Cap all image dimensions before export; preserve texture maps and alpha.
for img in bpy.data.images:
    if img.type=="IMAGE" and max(img.size)>1024:
        scale=1024/max(img.size);img.scale(max(1,round(img.size[0]*scale)),max(1,round(img.size[1]*scale)));img.pack()

root = E.create_character_copy(body,name_suffix="_export")
copy_body = O.find_object_of_type_amongst_nearest_relatives(root,"Basemesh")
E.bake_modifiers_remove_helpers(copy_body,bake_masks=True,bake_subdiv=True,remove_helpers=True,also_proxy=True)
bpy.ops.object.select_all(action="DESELECT")
hierarchy = [root] + list(O.get_list_of_children(root))
for obj in hierarchy:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(filepath=str(out/"candidate.glb"),export_format="GLB",use_selection=True,export_animations=False,export_all_influences=False)
# Verify and render the actual exported GLB, not the Blender working scene.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(out/"candidate.glb"))
meshes = [o for o in bpy.context.scene.objects if o.type=="MESH"]
assert meshes
# Raw object bounds included unrendered geometry; frame actual evaluated surface vertices.
dg=bpy.context.evaluated_depsgraph_get()
coords=[]
for o in meshes:
    eo=o.evaluated_get(dg);m=eo.to_mesh()
    used={i for poly in m.polygons for i in poly.vertices}
    coords.extend(tuple(eo.matrix_world @ m.vertices[i].co) for i in used)
    eo.to_mesh_clear()
a=np.asarray(coords)
lo=Vector(np.percentile(a,.3,axis=0));hi=Vector(np.percentile(a,99.7,axis=0))
center = (lo+hi)/2
height = hi.z-lo.z
assert height > .2
# Dedicated tailoring pass, then export and reimport before proof.
runpy.run_path(str(Path(__file__).with_name("tailor_stillsuit.py")), init_globals={"out":out,"center":center,"height":height,"lo":lo,"hi":hi})
meshes = [o for o in bpy.context.scene.objects if o.type=="MESH"]
triangles = 0
for o in meshes:
    o.data.calc_loop_triangles()
    triangles += len(o.data.loop_triangles)
    for p in o.data.polygons: p.use_smooth = True
report = {"triangles":triangles,"meshes":len(meshes),"materials":len({m.name for o in meshes for m in o.data.materials if m}),"height":height,"glb_bytes":(out/"candidate.glb").stat().st_size,"source":"MPFB 2.0.18 + system assets, WDG scruffy beard and culturalibre hero suit 2 (CC0)","status":"iteration 3; bespoke costume and decimation trial; not artistic acceptance"}
(out/"candidate-report.json").write_text(json.dumps(report,indent=2))
print("CF02_REPORT",json.dumps(report),flush=True)
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.world.color=(.25,.25,.25)
scene.render.image_settings.file_format="JPEG"
scene.render.image_settings.quality=85
scene.render.resolution_percentage=100
def aim(obj, target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
for loc,power,size in [((2,-4,4),450,3),((-3,-1,2),220,3),((1,3,3),350,2)]:
    data=bpy.data.lights.new("softbox","AREA")
    data.energy=power; data.shape="DISK"; data.size=size
    obj=bpy.data.objects.new("softbox",data);scene.collection.objects.link(obj)
    obj.location=center+Vector(loc)*height/2;aim(obj,center)
camdata=bpy.data.cameras.new("proof")
cam=bpy.data.objects.new("proof",camdata);scene.collection.objects.link(cam);scene.camera=cam
camdata.type="ORTHO"
for label,angle,close in [("front",0,False),("threequarter",35,False),("back",180,False),("face",12,True)]:
    target=center.copy()
    if close:target.z=hi.z-height*.10
    theta=math.radians(angle)
    cam.location=target+Vector((math.sin(theta),-math.cos(theta),.04))*height*3
    aim(cam,target)
    camdata.ortho_scale=height*(.32 if close else 1.14)
    scene.render.resolution_x=360 if close else 420
    scene.render.resolution_y=440 if close else 480
    path=out/(label+".jpg")
    scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)
    assert path.stat().st_size>1024
    # Split lines for safe log retrieval; only the generated preview, no private data.
    encoded=base64.b64encode(path.read_bytes()).decode()
    for i in range(0,len(encoded),3000):print("CF02_JPEG",label,i//3000,encoded[i:i+3000],flush=True)
