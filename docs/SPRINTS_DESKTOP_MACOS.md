# Motion Forge — Desktop / macOS Sprints and Tasks

> Detailed build plan for the desktop runtime
> Tauri 2 + Rust, local-first, FBX-centric, offline-capable

## Overview

The desktop app should let a user:
- import a 3D character
- detect and map its humanoid skeleton
- open a webcam
- capture pose
- retarget and preview motion
- record animation
- export FBX for Blender, Unity, Unreal

On macOS, Metal should be preferred where GPU acceleration is used.

The desktop app should be self-contained after install and usable offline.

## Stack

- Tauri 2 for windowing, filesystem, native integration, and distribution
- Rust for orchestration, import/export, native runtime work, and heavy processing
- React + TypeScript + Vite + Zustand for the frontend
- Three.js for 3D preview
- MediaPipe as initial pose baseline
- ONNX as a future abstraction layer for models

## Shared concerns

Desktop should reuse the same core ideas as web:
- canonical skeleton
- rig profile
- body pose model
- retargeting
- IK
- filtering
- animation clip model

Avoid making desktop and web diverge too early.

## Pose providers

Desktop should support multiple backends, not only MediaPipe:
- MediaPipe
- RTMPose
- NVIDIA backend for RTX machines
- ONNX-based providers
- custom provider

The user can choose:

```text
Pose engine
  ○ Auto
  ○ MediaPipe
  ○ RTMPose
  ○ NVIDIA RTX
  ○ Custom model
```

`Auto` should pick the best backend for the current machine.

On macOS, Metal should be preferred for GPU work, but the pose backend itself should still be pluggable.

## Pose pipeline

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
FBX / animation data
```

## Sprint 1 — Project foundation

Goal:
- create the Tauri desktop app shell
- connect it to the shared monorepo
- make sure the app builds and runs on macOS

Tasks:
- initialize apps/desktop with Tauri 2
- add Rust backend shell
- connect frontend to Vite + React + TypeScript
- add shared package references where appropriate
- add a basic window layout
- verify dev mode runs
- verify production build runs locally
- confirm no extra external tool is required to launch the app

Definition of done:
- desktop app starts
- frontend renders
- Rust backend is present and reachable
- no user-side install of external tools required

## Sprint 2 — Core types and 3D viewer

Goal:
- bring in the shared core types
- render a character in the desktop viewport

Tasks:
- add or link core types
- add canonical skeleton and rig profile types
- add Three.js viewport to desktop frontend
- load a placeholder GLB or simple character
- render it with basic controls
- verify macOS rendering works
- keep the viewer separate from capture logic

Definition of done:
- character can be loaded and viewed
- domain types are shared with web where practical
- no capture yet

## Sprint 3 — Character importer and skeleton detection

Goal:
- import FBX with an existing skeleton
- detect bones and map them to canonical humanoid

Tasks:
- add FBX import path, either via Rust native layer or existing importer approach
- read scene, meshes, armatures, bones
- analyze bone names and hierarchy
- build a detected skeleton model
- map detected bones to canonical humanoid bones
- generate a rig profile for the imported character
- add UI for review and correction
- support T-pose or rest pose concept

Definition of done:
- FBX with skeleton can be imported
- humanoid mapping is produced
- user can review/confirm mapping

## Sprint 3 — Character importer and skeleton detection

Goal:
- import FBX with an existing skeleton
- detect bones and map them to canonical humanoid

Tasks:
- add FBX import path, either via Rust native layer or existing importer approach
- read scene, meshes, armatures, bones
- analyze bone names and hierarchy
- build a detected skeleton model
- map detected bones to canonical humanoid bones
- generate a rig profile for the imported character
- add UI for review and correction
- support T-pose or rest pose concept

Definition of done:
- FBX with skeleton can be imported
- humanoid mapping is produced
- user can review/confirm mapping

## Sprint 4 — Pose provider and camera integration

Goal:
- add webcam support on desktop
- add a desktop-capable pose provider system
- support more than one backend from the start
- add the UI for selecting the pose engine

Tasks:
- add camera selection and permission handling
- add video frame pipeline
- integrate PoseProvider interface in native or shared runtime
- start with MediaPipe-compatible path as default
- prepare backend selection for RTMPose, NVIDIA, and custom providers
- produce canonical body pose
- keep inference off the UI thread
- add fallback if preferred backend is unavailable
- log performance and dropped frames
- add provider selection UI in the desktop app:
  - Motor de captura selector
  - Auto, MediaPipe, RTMPose, NVIDIA RTX, Custom options
  - disabled options when a backend is unavailable
  - current backend indicator in capture settings
  - clear message when a provider cannot be used
- wire selected provider into capture and inference pipeline
- reuse the same `@motion-forge/pose` registry and provider ids as web where practical

Definition of done:
- webcam works on macOS
- pose is produced locally
- inference does not block UI
- provider selection is part of the architecture, not a MediaPipe lock-in
- user can switch provider from the UI where backends are available
- `Auto` resolves to a usable desktop backend, with NVIDIA optional on RTX hardware

## Sprint 5 — Retargeting on desktop

Goal:
- make the imported character follow the captured pose

Tasks:
- apply canonical pose to character rig
- handle rest pose correction
- handle bone axis differences
- handle proportion differences
- run retarget in a worker or Rust runtime when beneficial
- update viewport in real time
- verify arm, leg, spine, head motion

Definition of done:
- retargeting works on desktop
- character animates with user motion
- no direct raw-landmark-to-bone coupling

## Sprint 6 — IK and stability

Goal:
- improve believability for desktop use
- stabilize feet, hands, and limbs

Tasks:
- add foot IK
- add hand IK
- add knee/elbow pole constraints
- distribute spine rotation
- add confidence-based filtering
- add temporal smoothing
- add outlier rejection
- tune for live use on desktop hardware

Definition of done:
- character motion is more stable
- foot/hand problems are reduced
- IK is modular and replaceable

## Sprint 7 — Recording and timeline basics

Goal:
- record and manage animation clips on desktop

Tasks:
- add recording state
- store animation clip data
- support pause/resume/stop
- add a basic timeline UI
- keep raw and cleaned animation versions
- add clip metadata
- prepare for export

Definition of done:
- user can record motion
- clip data is available internally
- timeline shows recorded range

## Sprint 8 — FBX export

Goal:
- export animation from desktop in a form usable by external tools

Tasks:
- implement FBX animation export path
- export skeleton and animation data appropriately
- support export profiles for common targets:
  - Blender
  - Unity
  - Unreal
- handle scale, root bone, and mapping choices
- add export UI
- validate output by reimporting in Blender and checking Unity import

Definition of done:
- desktop can export FBX
- exported FBX can be imported downstream
- user does not need to install extra tooling just to run Motion Forge

## Sprint 9 — Desktop hardening and macOS specifics

Goal:
- improve reliability, performance, and macOS fit

Tasks:
- ensure Metal is used where appropriate for GPU work
- improve watchdog and worker reliability
- improve memory handling for larger scenes
- improve camera handling and device switching
- improve offline behavior
- verify app runs without internet after install
- improve startup and build reproducibility
- test on representative macOS hardware

Definition of done:
- desktop app feels local and self-contained
- performance is acceptable for live use
- offline usage is reliable

## Sprint 10 — Polish and MVP readiness

Goal:
- make desktop MVP practical for the target user

Tasks:
- finalize import, retarget, IK, recording, and export flow
- improve UX for first-time users
- add clear “local processing” messaging
- add basic diagnostics
- prepare release packaging for macOS
- verify the full loop end to end:
  - import character
  - capture pose
  - retarget
  - preview
  - record
  - export FBX
  - import in Blender
- validate Unity humanoid path as far as practical

Definition of done:
- desktop MVP can complete a real motion capture workflow
- no extra dependent programs are required to use the app itself
- exported FBX is usable outside the app

## Optional future desktop tasks

- RTMPose backend integration and quality comparison
- NVIDIA BodyPose3DNet backend for RTX machines
- custom pose model support
- stronger GPU backend selection and device detection
- OBJ import and auto-rigging assistance
- GLB as a first-class internal and exchange format
- advanced motion cleanup
- keyframe editing
- hands and face capture
- multi-camera
- native export for more engines
- advanced IK and offline cleanup modes
