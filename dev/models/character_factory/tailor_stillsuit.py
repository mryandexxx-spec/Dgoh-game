"""Offline fitting experiment on the imported, rigged MPFB GLB.
A bespoke fabric/panel pass, not an accepted costume. No runtime code.
Caller supplies out, center, height, lo and hi.
"""
import bpy, math, json
from mathutils import Vector

H=height
cx,cy=center.x,center.y
z0=lo.z
def xyz(v):
    return ((v.x-cx)/H,(v.y-cy)/H,(v.z-z0)/H)

meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
rigs=[o for o in bpy.context.scene.objects if o.type=="ARMATURE"]
assert len(rigs)==1, [o.name for o in rigs]
rig=rigs[0]
def count(o):
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)
before={o.name:count(o) for o in meshes}
# Preserve UVs, skin group interpolation and surface detail where possible.
# This is an experiment: inspect the resulting face, seams, weights and deformation.
for o in meshes:
    n=before[o.name]
    if n<300: continue
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True);bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new("offline mobile reduction","DECIMATE")
    mod.decimate_type="COLLAPSE"
    mod.ratio=.38 if "suit" in o.name.lower() or "beard" in o.name.lower() else .46
    bpy.ops.object.modifier_move_up(modifier=mod.name) if len(o.modifiers)>1 else None
    bpy.ops.object.modifier_apply(modifier=mod.name)

def mat(name,color,rough=.85):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*color,1)
    bs.inputs["Roughness"].default_value=rough
    m.use_backface_culling=False
    return m

fabric=mat("Stillsuit charcoal textile",(.075,.067,.052))
leather=mat("Stillsuit wraps",(.10,.081,.056))
sand=mat("Weathered sand cloth",(.34,.25,.145))
# Fine woven cloth variation baked as vertex color, not a runtime procedural shader.
panels=mat("Stillsuit fitted panels",(.09,.08,.06))
nt=panels.node_tree
vc=nt.nodes.new("ShaderNodeVertexColor");vc.layer_name="CostumeColor"
nt.links.new(vc.outputs["Color"],nt.nodes.get("Principled BSDF").inputs["Base Color"])
suits=[o for o in meshes if "hero_suit" in o.name.lower()]
assert len(suits)==1,[o.name for o in meshes]
suit=suits[0]
suit.data.materials.clear();suit.data.materials.append(panels)
attr=suit.data.color_attributes.new(name="CostumeColor",type="FLOAT_COLOR",domain="POINT")
suit.data.color_attributes.active_color=attr
for v in suit.data.vertices:
    x,y,z=xyz(suit.matrix_world@v.co)
    # Panel boundaries follow torso, hips and knees, not a global checkerboard.
    weave=.007*math.sin(171*x+123*z)+.005*math.cos(95*y-153*z)
    base=.062+weave
    if .49<z<.54: base=.115+weave
    if .57<z<.76 and abs(x)<.14:
        rib=abs(math.sin((z+.025*math.cos(18*x))*math.pi/0.027))
        base=.085+.04*(rib>.65)+weave
        if abs(x)<.023 or abs(abs(x)-.105)<.012:base=.045+weave
    if .22<z<.36:
        base=.084+.03*(abs(math.sin(z*math.pi/.026))>.7)+weave
    if .4<z<.49 and abs(x)>.09:base=.105+weave
    attr.data[v.index].color=(base,base*.86,base*.66,1)
for p in suit.data.polygons:p.material_index=0;p.use_smooth=True

# Existing body topology supplies fitted sleeves, preserving the original skinning.
# Do not cover hands or face. This is a preliminary seam placement.
for o in meshes:
    if not (o.name.startswith("Human_export") or o.name.startswith("Human_export.")):continue
    o.data.materials.append(fabric);idx=len(o.data.materials)-1
    for p in o.data.polygons:
        x,y,z=xyz(o.matrix_world@p.center)
        if abs(x)>.105 and abs(x)<.255 and .60<z<.85:p.material_index=idx

def cloth(name,cols,rows,position,material,weights):
    vertices=[];faces=[]
    for j in range(rows+1):
        for i in range(cols+1):
            x,y,z=position(i/cols,j/rows)
            vertices.append((cx+x*H,cy+y*H,z0+z*H))
    for j in range(rows):
        for i in range(cols):
            k=j*(cols+1)+i
            faces.append((k,k+1,k+cols+2,k+cols+1))
    m=bpy.data.meshes.new(name);m.from_pydata(vertices,[],faces);m.update()
    o=bpy.data.objects.new(name,m);bpy.context.scene.collection.objects.link(o)
    m.materials.append(material)
    for p in m.polygons:p.use_smooth=True
    uv=m.uv_layers.new(name="UVMap")
    for p in m.polygons:
        for li in p.loop_indices:
            vi=m.loops[li].vertex_index
            uv.data[li].uv=(vi%(cols+1)/cols,vi//(cols+1)/rows)
    groups={}
    for j in range(rows+1):
        for name,w in weights(j/rows).items():
            if w<=0:continue
            assert name in rig.data.bones,name
            if name not in groups:groups[name]=o.vertex_groups.new(name=name)
            groups[name].add(list(range(j*(cols+1),(j+1)*(cols+1))),w,"REPLACE")
    arm=o.modifiers.new("Character rig","ARMATURE");arm.object=rig
    o.parent=rig;o.matrix_parent_inverse=rig.matrix_world.inverted()
    return o

# Back drape: gathered neckline, widening hem, asymmetric folds.
def cape(u,t):
    a=2*u-1
    width=.115+.075*math.sin(t*math.pi/2)
    x=a*width+.012*t*t
    y=.048+.095*t+.025*(1-a*a)+(.004+.017*t)*math.cos(a*math.pi*4+.8*t)
    z=.855-.50*t-.035*abs(a)*(1-t)+.035*t*a
    return x,y,z
def cape_weights(t):
    # torso-only drape; no cloth simulation or new bones
    return {"spine_03":max(0,1-2*t),"spine_02":1-abs(2*t-1),"pelvis":max(0,2*t-1)}
cloth("Sand cloak",30,30,cape,sand,cape_weights)
# Asymmetric scarf across shoulders, front drape and slight folds.
def scarf(u,t):
    a=2*u-1
    x=a*(.12+.015*t)
    y=-.078-.025*t+.05*abs(a)+.008*math.sin(a*10+t*8)
    z=.846-.095*t-.04*abs(a)-.022*(1-a*a)*t
    return x,y,z
cloth("Sand neck wrap",24,10,scarf,sand,lambda t:{"spine_03":1-t*.4,"spine_02":t*.4})

# Record mesh reduction; validate actual exported GLB in caller.
post={o.name:count(o) for o in bpy.context.scene.objects if o.type=="MESH"}
print("CF_TAILOR",json.dumps({"before":before,"after":post}),flush=True)
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.context.scene.objects:
    if o.type in {"MESH","ARMATURE"}:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(out/"candidate.glb"),export_format="GLB",use_selection=True,export_animations=False,export_all_influences=False)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(out/"candidate.glb"))
