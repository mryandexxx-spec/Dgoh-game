"""CF-01: run inside Blender with MPFB 2.0.18 enabled. No runtime output."""
import importlib
import json
import math
import os
from pathlib import Path
import bpy

out = Path(os.environ["CF_OUT"]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def service(suffix, name):
    addons = [a.module for a in bpy.context.preferences.addons if a.module.split(".")[-1] == "mpfb"]
    if len(addons) != 1:
        raise RuntimeError(f"Expected one enabled MPFB extension, got {addons}")
    module = addons[0] + suffix[len("mpfb"):]
    return getattr(importlib.import_module(module), name)

# Use public scripting API documented by MPFB.
human_service = service("mpfb.services.humanservice", "HumanService")
target_service = service("mpfb.services.targetservice", "TargetService")
macro = target_service.get_default_macro_info_dict()
macro.update({"gender": 1.0, "age": 0.65, "muscle": 0.65, "weight": 0.5})
body = human_service.create_human(macro_detail_dict=macro)
rig = human_service.add_builtin_rig(body, "game_engine")
assert rig.type == "ARMATURE" and len(rig.data.bones) > 10
assert body.type == "MESH" and len(body.data.vertices) > 1000

# Freeze the evaluated geometry for reporting (not for export).
depsgraph = bpy.context.evaluated_depsgraph_get()
evaluated = body.evaluated_get(depsgraph)
mesh = evaluated.to_mesh()
try:
    mesh.calc_loop_triangles()
    assert all(math.isfinite(c) for v in mesh.vertices for c in v.co)
    bone_names = {bone.name for bone in rig.data.bones if bone.use_deform}
    groups = {g.index for g in body.vertex_groups if g.name in bone_names}
    counts = [sum(g.group in groups and g.weight > 1e-6 for g in v.groups) for v in body.data.vertices]
    report = {
        "blender": bpy.app.version_string,
        "mpfb": "2.0.18",
        "vertices_evaluated": len(mesh.vertices),
        "triangles_evaluated": len(mesh.loop_triangles),
        "uv_layers": len(mesh.uv_layers),
        "bone_names": sorted(bone_names),
        "vertices_without_deform_weights_raw": counts.count(0),
        "max_deform_influences_raw": max(counts),
        "dimensions": list(body.dimensions),
        "note": "Raw base only; helpers, weights, clothes, retargeting and mobile budgets need separate validation."
    }
finally:
    evaluated.to_mesh_clear()
assert report["triangles_evaluated"] > 1000
assert report["uv_layers"] > 0
assert any(counts)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.gltf(filepath=str(out / "base.glb"), export_format="GLB",
                          use_selection=True, export_animations=False)
assert (out / "base.glb").stat().st_size > 1024
report["glb_bytes"] = (out / "base.glb").stat().st_size
(out / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print("CF01_REPORT", json.dumps(report), flush=True)
