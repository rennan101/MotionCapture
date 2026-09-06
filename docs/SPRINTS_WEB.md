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
- add camera selection UI:
  - camera device list from `enumerateDevices`
  - fallback label for devices without a friendly name
  - select device before starting capture
- add video preview element:
  - render the active `MediaStream` in the viewport area or a capture panel
  - keep preview separate from the 3D viewport until retargeting is ready
- request camera permission:
  - use `getUserMedia` with video-only constraints
  - handle denial and missing `getUserMedia` gracefully
- capture stream:
  - `openCamera(deviceId?)` returns a `MediaStream` or null
  - `closeCamera(stream)` stops all tracks
  - teardown stream on unmount and on stop
- create pose worker placeholder:
  - prepare the worker message protocol for frame dispatch
  - do not couple capture UI to inference code yet
- send frames to worker:
  - capture visible `<video>` frames at a stable cadence
  - pass `FrameData` toward the worker pipeline once Sprint 5 is ready
- receive pose results:
  - keep the receiving path ready before the real backend is added
- convert raw pose into internal canonical representation:
  - use `@motion-forge/core` body pose types as the target shape
  - keep conversion out of the UI layer
- handle low-confidence frames:
  - allow frames to be skipped or marked low confidence
  - do not crash the capture loop on bad frames
- add preview and status indicators:
  - capture state machine: `idle`, `requestingcamera`, `camera-ready`, `capturing`, `error`
  - StatusBar shows capture + camera status separately
  - ProviderStatus shows `solicitando câmera…` during request phase
  - ProviderStatus active pill reflects the resolved backend during `capturing`
- implement basic CPU fallback behavior:
  - document that work and inference may run outside the main thread
  - keep UI responsive during camera and potential inference work
- wire provider selection into the worker pipeline:
  - keep the selected provider id available to the worker pipeline
  - Auto selection is resolved by the registry before capture starts
  - RTMPose and Custom are prepared as unavailable paths in MVP web
- report provider unavailability clearly in the UI:
  - disabled selector options with `não disponível`
  - `Backend ativo` reflects the resolved provider, not only the raw selection
- connect camera readiness to app state:
  - `CameraSelector` reports `cameraReady` up to the App
  - StatusBar `Camera:` pill reflects `cameraReady`
  - ProviderStatus message reflects camera ready vs pending

Current web implementation:
- `CameraSelector` is device-only: it enumerates cameras, keeps the selected device, and mirrors the capture state coming from App
- `App.tsx` owns the real capture stream lifecycle through `openCamera(selectedDeviceId)` and `closeCamera(stream)`
- `Viewport` renders the live camera as a muted overlay while the stream is active
- `ProviderStatus` shows backend pill + message pill with request/capturing/camera-ready styling
- `StatusBar` shows provider pill, capture state, camera state, character state
- `store.ts` `CaptureState` is `"idle" | "requesting-camera" | "camera-ready" | "capturing" | "error"`
- capture button path: `idle` → `requesting-camera` → `capturing` + live preview → `idle` on stop
- provider wiring is ready for the real MediaPipe worker in Sprint 5
- app does not assume a single provider or a single camera
- web app typechecks cleanly with `tsc --noEmit`
- dev server runs on port 5173 via `pnpm --silent build:web` / Vite dev mode

Capture state machine:
- `idle` — no stream, camera button enables device selection
- `requesting-camera` — permission request in progress, selector disabled
- `capturing` — stream active, live preview visible, stop button shown
- `camera-ready` — stream active and ready to feed the inference path
- `error` — camera request failed

Definition of done:
- webcam permission flow works on a compatible browser
- camera selector lists devices and opens a stream
- camera stream can be stopped and cleaned up
- capture state updates StatusBar and ProviderStatus
- live camera preview is visible in the viewport while capturing
- provider wiring is ready for the real MediaPipe worker in Sprint 5
- app does not assume a single provider or a single camera

## Sprint 5 — MediaPipe integration

Goal:
- plug in MediaPipe Pose Landmarker in the web worker
- make it the default provider for MVP
- keep the interface open for RTMPose and other backends

Tasks:
- [x] integrate MediaPipe pose landmarker in web worker (`pose.worker.ts`)
- [x] map landmarks to canonical body pose (`mapMediaPipeToCanonical`)
- [x] separate camera space and canonical space (normalized 3D world landmarks)
- [x] add timestamp, confidence, root/pelvis handling
- [x] keep representation internal, not MediaPipe-specific (`CanonicalPose` in `@motion-forge/pose`)
- [x] handle 2D/3D as available
- [x] add provider selection UI hook and pipeline integration
- [x] integrate default 3D template characters (`Eric` e `Carla` FBX em T-Pose) from `assets/3d models template`
- [x] real-time 3D skeleton visualization overlay and toggle in Viewport
- [x] test with different subjects/lighting & GPU/CPU fallback

Definition of done:
- MediaPipe works as the default provider off the main thread
- canonical pose is produced and visualized in real time
- default 3D humanoid template characters are loaded automatically in Viewport if no custom FBX is provided
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
