"""CF-02: clothed character assembly and real GLB render proof.
Uses public MPFB 2.0.18 services and CC0 system assets, no runtime changes.
The work suit is a fitting test, not approved Dune costume.
"""
import bpy, os, json, math, importlib, base64
from pathlib import Path
from mathutils import Vector

out = Path(os.environ["CF_OUT"])
out.mkdir(parents=True, exist_ok=True)
assets = Path(os.environ["CF_ASSETS"])
def file(name):
    paths = sorted(assets.rglob(name))
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
macro.update({"gender":1.0,"age":0.75,"muscle":0.59,"weight":0.46})
body = H.create_human(macro_detail_dict=macro)
H.set_character_skin(file("middleage_caucasian_male.mhmat"), body, skin_type="GAMEENGINE")
H.add_builtin_rig(body,"game_engine")
for filename, kind in [("low-poly.mhclo","Eyes"),("eyebrow003.mhclo","Eyebrows"),("eyelashes01.mhclo","Eyelashes"),("short03.mhclo","Hair"),("male_worksuit01.mhclo","Clothes"),("shoes01.mhclo","Clothes")]:
    H.add_mhclo_asset(file(filename),body,asset_type=kind,material_type="GAMEENGINE",subdiv_levels=0)
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
points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
center = (lo+hi)/2
height = hi.z-lo.z
assert height > .2
triangles = 0
for o in meshes:
    o.data.calc_loop_triangles()
    triangles += len(o.data.loop_triangles)
    for p in o.data.polygons: p.use_smooth = True
report = {"triangles":triangles,"meshes":len(meshes),"materials":len({m.name for o in meshes for m in o.data.materials if m}),"height":height,"glb_bytes":(out/"candidate.glb").stat().st_size,"source":"MPFB 2.0.18 + system assets CC0","status":"fitting prototype; not artistic acceptance"}
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
