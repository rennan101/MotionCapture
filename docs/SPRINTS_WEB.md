# Motion Forge — Web Sprints and Tasks

> Detailed build plan for the web runtime
> Shared core, browser-local, GPU when available

## Overview

The web app should let a user:
- open the app in a browser
- select a camera
- capture pose locally
- preview a character in 3D
- see retargeted motion
- record and export GLB/animation data

The web app must not require the user to install extra programs.

## Stack

- React + TypeScript + Vite
- Zustand for state
- Three.js for 3D
- Web Workers for pose and motion work
- WebGPU when available
- MediaPipe Pose Landmarker as the first provider
- ONNX Runtime Web as a compatible abstraction path

## Pose providers

The web app should not hardcode MediaPipe into the product.

Supported backends for web:
- MediaPipe
- RTMPose when available in browser
- ONNX Runtime Web when practical
- custom provider via the same interface

The user can choose:

```text
Motor de captura
  ○ Auto
  ○ MediaPipe
  ○ RTMPose
  ○ NVIDIA RTX
  ○ Modelo personalizado
```

`Auto` should pick the best browser-compatible backend.

In the current web MVP, that means `Auto` prefers MediaPipe when it is available.

## Shared concerns

The web app uses the same core as desktop as much as possible:
- canonical skeleton
- rig profile
- body pose representation
- retargeting logic
- animation data model
- export data model

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
GLB / animation data
```

## Sprint 1 — Project foundation

Goal:
- create the web app shell and shared package structure
- make sure the app builds and runs

Tasks:
- initialize web app in apps/web
- configure Vite + React + TypeScript
- add shared packages structure in packages/
- add core types package skeleton
- add a minimal Zustand store
- add a simple layout shell
- verify dev server starts
- verify build works

Definition of done:
- app runs locally
- types in place even if empty
- no business logic yet

## Sprint 2 — Core types and viewer

Goal:
- define the main domain types
- render a 3D character placeholder

Tasks:
- define canonical skeleton types
- define rig profile types
- define body pose types
- define animation clip types
- add Three.js setup
- add a viewport component
- load a simple GLB placeholder character
- render it in the viewport
- add basic camera controls in viewport

Definition of done:
- core types usable across packages
- a character can be loaded and viewed
- no pose yet

## Sprint 3 — Pose provider interface + motor de captura UI

Goal:
- define the pose abstraction before implementation
- prepare for multiple providers, not only MediaPipe
- expose `Motor de captura` selection with Autonomous `Auto` selection

Tasks:
- define PoseProvider interface in `@motion-forge/pose`
- define provider result types:
  - `CaptureSource`
  - `FrameData`
  - `BoneCapturePoint`
  - `CanonicalPose`
  - `PoseResult`
- define provider selection model:
  - Auto
  - MediaPipe
  - RTMPose
  - NVIDIA RTX
  - Modelo personalizado
- define provider capability and metadata types:
  - `ProviderCapability`
  - `ProviderMetadata`
- define `Platform` identity for web and desktop
- define provider lifecycle + shim interfaces:
  - `PoseProviderAsync`
  - `PoseProviderLifecycle`
  - `PoseProviderShims`
- define `PoseProviderRegistry`:
  - `register(metadata)`
  - `getAvailable()`
  - `resolveSelection(selection)`
  - `getMetadata(id)`
- make `Auto` a real registry responsibility, not UI-only logic
- implement a no-op/placeholder provider wiring first:
  - registry creation for `platform: "web"`
  - fixed provider list with realistic availability
  - `startCapture` / `stopCapture` session helpers
  - Auto resolution to MediaPipe on web when available
- add provider selection UI controls:
  - segmented radio panel for `Motor de captura`
  - `Auto` option behavior
  - disabled state when a provider is unavailable
  - inactive caption like `não disponível`
  - active backend indicator in the capture panel
  - short status text for the current backend
  - override Auto by selecting a specific provider
- pass the registry into the status components so the UI reflects the resolved backend
- keep provider choice local to the session where appropriate
- document how a real provider will be plugged in
- add a task/issue to validate Auto behavior on web and desktop

Definition of done:
- provider interface is stable enough to implement
- web app can talk to a provider abstraction
- the full `Motor de captura` selector is part of the design, not an afterthought
- `Auto` selects a usable provider on web
- unavailable providers are visible and disabled
- the status UI shows which backend was selected by Auto
- provider selection is ready for the real webcam/worker pipeline in Sprint 4

## Sprint 4 — Webcam and worker pipeline

Goal:
- capture video from the camera
- run pose inference off the main thread
- honor the selected pose provider

Tasks:
- add camera selection UI
- add video preview element
- request camera permission
- capture stream
- create pose worker
- send frames to worker
- receive pose results
- convert raw pose into internal canonical representation
- handle low-confidence frames
- add preview and status indicators
- implement basic CPU fallback behavior
- wire provider selection into the worker pipeline:
  - when user picks MediaPipe, use MediaPipe backend
  - when user picks Auto, choose best browser-compatible backend
  - when user picks RTMPose or Custom, prepare path for later backends
  - show current provider in the capture UI
- report provider unavailability clearly in the UI

Definition of done:
- webcam works
- pose worker runs
- app is not blocked by inference on the main UI thread
- selected pose engine is actually used by the capture pipeline

## Sprint 5 — MediaPipe integration

Goal:
- plug in MediaPipe Pose Landmarker in the web worker
- make it the default provider for MVP
- keep the interface open for RTMPose and other backends

Tasks:
- integrate MediaPipe pose landmarker in worker
- map landmarks to canonical body pose
- separate camera space and canonical space
- add timestamp, confidence, root/pelvis handling
- keep representation internal, not MediaPipe-specific
- handle 2D/3D as available
- add provider selection UI hook
- test with different subjects/lighting
- prepare compatibility path for RTMPose or ONNX backend

Definition of done:
- MediaPipe works as the default provider
- canonical pose is produced
- provider can be swapped later
- the app is not presented as MediaPipe-only

## Sprint 6 — Basic retargeting

Goal:
- move a loaded character using captured pose

Tasks:
- implement canonical-to-rig mapping
- implement rotation transfer from canonical pose to rig bones
- handle rest pose correction
- handle axis correction
- apply retargeting in animation worker
- update viewport with character pose
- validate arm, leg, spine, and head movement

Definition of done:
- character follows user pose
- retargeting is not a direct landmark copy
- basic proportions handled

## Sprint 7 — Stability and IK basics

Goal:
- reduce jitter and improve believability

Tasks:
- add confidence filtering
- add basic temporal smoothing
- add outlier rejection
- implement foot IK basics
- implement hand IK basics
- add elbow/knee constraint idea
- add spine distribution logic
- tune smoothing for live use

Definition of done:
- pose looks stable enough in preview
- feet and hands are more stable than raw capture
- no offline cleanup yet

## Sprint 8 — Recording and clip model

Goal:
- record motion and store it as animation clip data

Tasks:
- add record/stop/pause/resume state
- store pose stream as animation clip
- add clip metadata
- add sample rate and duration tracking
- add basic clip list UI
- store raw and cleaned representations separately
- define export-ready data structure

Definition of done:
- user can record motion
- clip data is saved internally
- raw and processed versions coexist

## Sprint 9 — GLB export and web output

Goal:
- produce a useful output from the web app

Tasks:
- define GLB/animation data output model
- implement GLB export path or animation data export
- prepare export file contents
- add export/download UI
- verify output can be reused by the app or other tools
- keep FBX as a desktop-primary export for now

Definition of done:
- web app can export GLB or animation data
- export is usable for round-trip or handoff

## Sprint 10 — Web hardening and readiness

Goal:
- make the web MVP practical for a real user

Tasks:
- improve fallback behavior when WebGPU is unavailable
- improve worker reliability and error handling
- improve camera selection and permissions UX
- improve performance diagnostics
- add quality profiles UI if useful
- verify local-only behavior is clear to the user
- test on representative devices and browsers

Definition of done:
- web app works without external installs
- user can capture, preview, record, and export
- no cloud dependency in the default path

## Optional future web tasks

- WebGPU inference backend
- deeper filtering and offline cleanup in worker
- keyframe editing UI
- hands/face support
- multi-camera support
- direct FBX export in web
- live streaming
