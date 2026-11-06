// render3d/babylon.js — точка входа чанка Babylon (фаза 4, REFACTOR_PLAN §7). Собирается tools/build.mjs отдельно от app.js
// (@babylonjs/core 9.30.0, tree-shaking, без WGSL-шейдеров — движок только WebGL). Набор имён B3 — тот же, что брали из UMD
// глобала BABYLON (аудит — PHASE4_STATUS.md, шаг 1), чтобы код сцен не менялся. Новое имя Babylon → добавить импорт сюда.
// Side-effect-импорты (компоненты сцены, пикинг) — без них соответствующие возможности молча не работают.
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { EngineStore } from '@babylonjs/core/Engines/engineStore.js';
import { Constants } from '@babylonjs/core/Engines/constants.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Axis } from '@babylonjs/core/Maths/math.axis.js';
import { Curve3 } from '@babylonjs/core/Maths/math.path.js';
import { Viewport } from '@babylonjs/core/Maths/math.viewport.js';
import { Skeleton } from '@babylonjs/core/Bones/skeleton.js';
import { Bone } from '@babylonjs/core/Bones/bone.js';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
import { SpotLight } from '@babylonjs/core/Lights/spotLight.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer.js';
import '@babylonjs/core/Layers/effectLayerSceneComponent.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { Effect } from '@babylonjs/core/Materials/effect.js';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture.js';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture.js';
import '@babylonjs/core/Materials/Textures/Loaders/envTextureLoader.js';   // фаза 5, шаг 6: окружение героя — prefiltered .env (tools/make-env.mjs)
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2.js';
import '@babylonjs/core/Materials/Textures/Loaders/ktxTextureLoader.js';   // фаза 5, шаг 5: загрузчик .ktx2 (транскодер — assets/ktx2/, URLConfig в authored.js)
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import '@babylonjs/core/Particles/particleSystemComponent.js';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline.js';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent.js';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent.js';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent.js';
import { DepthOfFieldEffectBlurLevel } from '@babylonjs/core/PostProcesses/depthOfFieldEffect.js';
import { ReflectionProbe } from '@babylonjs/core/Probes/reflectionProbe.js';
import '@babylonjs/core/Culling/ray.js';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder.js';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder.js';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder.js';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder.js';
import { CreateIcoSphere } from '@babylonjs/core/Meshes/Builders/icoSphereBuilder.js';
import { CreateLathe } from '@babylonjs/core/Meshes/Builders/latheBuilder.js';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder.js';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder.js';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder.js';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder.js';
import { CreateTube } from '@babylonjs/core/Meshes/Builders/tubeBuilder.js';
const MeshBuilder = { CreateBox, CreateCylinder, CreateDisc, CreateGround, CreateIcoSphere, CreateLathe, CreatePlane, CreatePolyhedron, CreateSphere, CreateTorus, CreateTube };

const B3 = {
  Engine, EngineStore, Constants, Scene, Vector3, Quaternion, Matrix, Color3, Color4, Axis, Curve3, Viewport, Skeleton, Bone,
  UniversalCamera, DirectionalLight, HemisphericLight, PointLight, SpotLight, ShadowGenerator, GlowLayer, StandardMaterial, PBRMaterial,
  Effect, ImageProcessingConfiguration, Texture, DynamicTexture, RenderTargetTexture, CubeTexture, KhronosTextureContainer2, Mesh, TransformNode, VertexData,
  VertexBuffer, ParticleSystem, DefaultRenderingPipeline, SSAO2RenderingPipeline, DepthOfFieldEffectBlurLevel, ReflectionProbe, MeshBuilder,
};
globalThis.__B3 = B3;   // для 3D-смоука (EngineStore.Instances) и render3d/base.js

export { B3 };
