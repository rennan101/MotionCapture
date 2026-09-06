# Motion Forge — Base Implementation Plan

> AI Motion Capture and 3D Character Animation
> Local-first, GPU-first, shared core, two runtimes: Web and Desktop

## 1. Product intent

Motion Forge turns a webcam plus a 3D character into an animation pipeline:

- import a character
- detect or map its humanoid skeleton
- capture pose from a camera
- retarget pose onto the character
- show it in a 3D viewport in real time
- record animation
- export animation for downstream tools

The long-term goal is one product with two runtimes, not two separate products.

## 2. Principles

### Local-first
Camera and inference stay on device by default. Offline use is expected. No account required for MVP.

### GPU-first
Favor GPU acceleration where available:
- macOS: Metal
- Windows: Direct3D 12 / DirectML
- Web: WebGPU, with WebGL and WASM CPU fallback

### Shared core
Keep the core logic independent of the UI and of the runtime:
- pose representation
- canonical skeleton
- rig profiles and bone mapping
- retargeting
- IK
- filtering
- animation data

## 3. Stack

### Frontend
- React
- TypeScript
- Vite
- Zustand
- Three.js

### Desktop
- Tauri 2
- Rust for orchestration, filesystem, native integration, and heavy processing

### Web
- React + TypeScript + Vite
- Web Workers
- WebGPU / WebGL / WASM fallback
- ONNX Runtime Web or MediaPipe for pose

### Pose providers
- Start with MediaPipe Pose Landmarker as baseline
- Do not lock the product to MediaPipe
- Keep PoseProvider abstract so backends can be swapped:
  - MediaPipeProvider
  - RTMPoseProvider
  - NVIDIAProvider
  - ONNXProvider
  - NativeProvider
  - CustomProvider

### Provider selection
The user should be able to choose:

```text
Motor de captura
  ○ Auto
  ○ MediaPipe
  ○ RTMPose
  ○ NVIDIA RTX
  ○ Modelo personalizado
```

`Auto` should pick the best backend for the current device:
- web: browser-compatible backend
- desktop with NVIDIA RTX: optional NVIDIA backend when available
- other cases: best available backend for the platform

### Current provider contract

The project has `@motion-forge/pose` (`packages/pose`) as the dedicated provider package.

It defines:
- `ProviderId`: `"auto"`, `"mediapipe"`, `"rtmpose"`, `"nvidia"`, `"custom"`, `"unknown"`
- `Platform`: `"web"`, `"macos"`, `"windows"`, `"linux"`
- provider capabilities and metadata
- canonical pose types: `BoneCapturePoint`, `CanonicalPose`, `PoseResult`
- provider interface: `PoseProviderAsync`, `PoseProviderLifecycle`, `PoseProviderShims`
- `PoseProviderRegistry` including `Auto` resolution

In the current web MVP, the registry is configured with MediaPipe available and the other backends unavailable, so `Auto` resolves to MediaPipe.

## 4. Architecture at a glance

```text
Webcam
  ↓
PoseProvider
  ↓
Canonical 3D pose
  ↓
Retarget
  ↓
IK
  ↓
Motion cleanup
  ↓
Blender / Unity / Unreal
```

The camera is the input. The pose provider is the swap point.

In more detail:

```text
              Webcam
                 │
                 ▼
          ┌──────────────────┐
          │  PoseProvider    │
          └────────┬─────────┘
                   │
          ┌────────┼─────────────────┐
          ↓        ↓                 ↓
     MediaPipe  RTMPose          NVIDIA
     Web/CPU/   Desktop/GPU      NVIDIA GPU
     GPU       │                 │
          └─────┴─────────────────┘
                ▼
          ┌──────────────────┐
          │ Canonical Pose   │
          │     3D           │
          └────────┬─────────┘
                   ▼
          ┌──────────────────┐
          │    Retarget      │
          └────────┬─────────┘
                   ▼
          ┌──────────────────┐
          │       IK         │
          └────────┬─────────┘
                   ▼
          ┌──────────────────┐
          │ Motion Cleanup   │
          └────────┬─────────┘
                   ▼
        Blender / Unity / Unreal
```

Do not copy raw MediaPipe landmarks directly onto a character. Use a canonical skeleton as the intermediate representation.

## 4.1 Version plan for pose

- MVP: MediaPipe → Canonical 3D Skeleton → Retarget → IK
- V2: MediaPipe + RTMPose, compare quality
- V3: NVIDIA BodyPose3DNet as optional backend for RTX machines
- V4: custom 3D pose model for higher quality and third-party independence

## 5. Canonical skeleton

Create one internal humanoid skeleton that acts as the common language between pose and characters:

```text
Root
└── Hips
    ├── Spine
    │   ├── Chest
    │   │   ├── Neck
    │   │   │   └── Head
    │   │   ├── LeftShoulder
    │   │   │   └── LeftUpperArm
    │   │   │       └── LeftLowerArm
    │   │   │           └── LeftHand
    │   │   └── RightShoulder
    │   │       └── RightUpperArm
    │   │           └── RightLowerArm
    │   │               └── RightHand
    │   ├── LeftUpperLeg
    │   │   └── LeftLowerLeg
    │   │       └── LeftFoot
    │   └── RightUpperLeg
    │       └── RightLowerLeg
    │           └── RightFoot
```

This is useful for:
- independent pose representation
- retargeting between different character rigs
- future engine export mapping

## 6. Scope

### In scope for MVP
- import FBX with existing skeleton
- detect and map humanoid bones
- open webcam
- detect body pose
- generate canonical pose
- retarget to character
- live preview
- record animation
- export FBX from desktop
- export GLB/animation data from web

### Out of scope for MVP
- custom AI model training
- cloud inference
- multi-camera
- face and finger mocap
- perfect auto-rigging
- complex Unity/Unreal/Blender plugins
- advanced animation editing

### Deferred to later phases
- OBJ support
- assisted auto-rigging
- advanced motion cleanup
- foot/hand constraints beyond basic IK
- timeline and keyframe editing beyond recording
- hands, fingers, face
- live streaming
- full engine plugins

## 7. Monorepo layout

Recommended structure:

```text
motion-forge/
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   └── src-tauri/
│   └── web/
│       └── src/
├── packages/
│   ├── ui/
│   ├── core/
│   ├── pose/
│   ├── skeleton/
│   ├── retarget/
│   ├── animation/
│   ├── formats/
│   ├── renderer/
│   └── protocol/
├── native/
│   ├── importer/
│   ├── exporter/
│   ├── pose/
│   └── runtime/
├── models/
├── plugins/
│   ├── blender/
│   ├── unity/
│   └── unreal/
├── tests/
└── docs/
```

For MVP, focus on:
- apps/desktop
- apps/web
- packages/core
- packages/pose
- packages/skeleton
- packages/retarget
- packages/animation
- packages/renderer
- packages/ui

## 8. Execution order

Recommended order:

1. Monorepo and app shells
2. Basic Three.js viewport and character loading
3. Canonical skeleton and core types
4. Pose provider interface + MediaPipe initial implementation
5. Webcam and worker pipeline
6. Basic retargeting
7. Basic IK and stability
8. Recording
9. Export
10. Web MVP hardening

This order avoids building AI before the core, and avoids coupling too many things at once.

## 9. Interfaces to keep stable

Define clear boundaries early:
- PoseProvider
- ModelRuntime
- CharacterImporter
- CharacterExporter
- RigProvider / RigProfile
- Retargeter
- IKSolver
- MotionProcessor
- AnimationExporter
- ProjectFormat

This makes it easier to replace MediaPipe, change GPU backends, or improve IK later.

## 10. Performance targets

Desktop targets from the architecture:

- pose inference: under 20 ms
- retarget: under 2 ms
- IK: under 2 ms
- filtering: under 1 ms
- viewport: around 60 FPS

Frame budget at 60 FPS is about 16.67 ms total.

Avoid unnecessary CPU/GPU ping-pong. Keep pose data compact and pass it efficiently.

## 11. Threading model

Separate concerns:

- main/UI thread: render and UI events
- pose worker: ML inference
- animation worker: retargeting, IK, filtering
- IO worker: import and export

On the web, use Web Workers, SharedArrayBuffer when available, OffscreenCanvas where possible, and WebGPU when supported.

## 12. Quality profiles

Keep profiles in mind:
- performance
- balanced
- quality

Start small. Do not ship oversized models in MVP.

## 13. Success criteria

MVP is functionally successful when:
- a humanoid FBX plus webcam produces real-time pose
- the character follows the user
- recording works
- FBX export works
- the exported FBX imports into Blender
- the exported FBX at least imports and maps into Unity humanoid workflow

This means the MVP is not just a preview; it closes the loop with external tools.

## 14. Risks

High risk:
- auto-rigging OBJ
- accurate 3D from one camera
- hands/fingers
- perfect FBX export
- retargeting non-conventional characters

Medium risk:
- WebGPU performance and compatibility
- different bone hierarchies
- stylized characters

Low risk:
- basic webcam pose tracking
- 3D preview
- recording
- basic filtering
- canonical skeleton
- GLB export

## 15. Recommended immediate next steps

1. Create the repository and pnpm workspace
2. Set up apps/desktop with Tauri 2 and apps/web with Vite + React + TS
3. Add shared core types first
4. Implement a placeholder character viewer with Three.js
5. Add MediaPipe pose on web as the first provider
6. Connect webcam, pose, canonical skeleton, retargeting, and viewport
7. Add IK and basic filtering
8. Add recording and timeline basics
9. Add export: FBX on desktop, GLB/animation data on web
10. Validate with Blender and Unity

## 16. Deliverables for “ready for user without extra programs”

### Web
- runs in browser
- no install needed for basic use
- camera and inference happen locally in the browser

### Desktop
- shipped as a self-contained app
- works offline after install
- no need to install Blender, Unity, or Unreal just to use the app

### Engine side
- export formats are compatible with external tools
- but the external tools themselves remain separate consumer software, not app dependencies

## 17. Documents this plan is based on

- architecture.md
- PROJECT_EVOLUTION.md
- prior conversation decisions: MVP-first, local-first, shared core, two runtimes
