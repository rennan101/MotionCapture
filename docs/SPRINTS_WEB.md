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
- `PosePipeline` dispatches frames to the worker and receives `POSE_RESULT` / `NO_POSE` / `PROVIDER_UNAVAILABLE`
- the resolved provider id (from the registry `Auto` resolution) is passed into the worker on `INIT`
- worker rejects non-MediaPipe providers with `PROVIDER_UNAVAILABLE`, surfaced as a dismissible error banner
- low-confidence frames (`overallConfidence < 0.25`) are skipped: the worker marks them with a `low-confidence-frame` warning and the pipeline holds the last good pose instead of pushing jitter
- MediaPipe worker is live (Sprint 5 items landed early): GPU delegate with CPU fallback, mapped through `mapMediaPipeToCanonical`
- inference FPS / latency / confidence badge renders in the viewport while pose results stream
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
- provider selection gates the worker pipeline: only resolved, available providers initialize inference
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

Status: IMPLEMENTED (`packages/retarget`, wired in `apps/web/src/components/Viewport.tsx`)

What was built:
- `packages/retarget`: quaternion math (`quat.ts`), UE5-style + Mixamo rig
  bindings (`rig-bindings.ts`), rest-pose capture (`rest-pose.ts`) and the
  direction+roll retarget solver (`retarget-solver.ts`)
- canonical-to-rig axis mapping (`DEFAULT_AXIS_MAPPING`: `[x, -y, -z]`, matching
  the MediaPipe mapper convention)
- rest pose captured at FBX load time from the real bone world transforms
  (not hard-coded), so any UE5-style rig works without per-character math
- rotation transfer via two-segment alignment (primary segment direction +
  roll reference), solved parent-first and converted back to local rotations
- confidence gating per bone (segment confidence < 0.25 holds the last pose)
- temporal smoothing via slerp from the rest rotation (0.35 default)
- hips root motion: mapped pelvis position + rest hip height, converted into
  the parent's local space (FBX root carries the 0.01 scale)
- rest pose restored when capture stops

Rig facts (parsed from the bundled FBX binaries with
`scripts/extract-fbx-bones.mjs`):
- Eric/Carla use a UE5-style naming: root → hip → spine_01/02/03 → neck →
  head; shoulder_l → upperarm_l → lowerarm_l → hand_l (+ fingers);
  upperleg_l → lowerleg_l → foot_l → ball_l
- the hip joint is the `hip` bone origin; arm anchors are `upperarm_l/r`
  origins; legs hang from `hip`

Validation:
- `scripts/validate-retarget.mjs` (synthetic rig, node script): rest capture,
  T-pose identity, arm/leg/spine segment tracking, confidence holds, and
  smoothing — all checks pass
- web typecheck + production build pass; rest capture reports no missing
  bones on the bundled Eric template

Definition of done:
- character follows user pose (live pose drives the rig via the solver)
- retargeting is not a direct landmark copy (rotation-only, segment-based,
  rig proportions preserved)
- basic proportions handled (scale-free direction matching; rest-pose driven)

## Sprint 7 — Stability and IK basics

Goal:
- reduce jitter and improve believability

Status: IMPLEMENTED (packages/retarget: stability.ts, ik.ts, integrated retarget-solver.ts)

Tasks:
- add confidence filtering — DONE: BoneStabilizer confidence hysteresis (drop at minConfidence, re-engage at +reacquireMargin; held bones keep last good rotation)
- add basic temporal smoothing — DONE: adaptive per-bone stabilizer (baseSmoothing damps slow poses; blend factor decreases with angular velocity so fast motions pass through; explicit `smoothing` option still gives deterministic fixed smoothing)
- add outlier rejection — DONE: two layers — PointOutlierGate clamps inter-frame point teleports (>1.2 m) to last-frame position; BoneStabilizer catches angular jumps (>110°) with a gentle multi-frame re-lock (only after 2+ frames of history so legitimate fast motion isn't rejected)
- implement foot IK basics — DONE: FootGroundLock runs as a positional constraint BEFORE the solve loop (pinned feet drive the legs); planted feet are pinned in world space, hips absorb the delta (hipsCompensation 0.6); release on lift; re-plant if pin distance exceeds maxPinStretch 0.4
- implement hand IK basics — DEFERRED to Sprint 8+ (requires wrist targets; no meaningful hand source in MediaPipe baseline)
- add elbow/knee constraint idea — DONE: buildHingeSetups derives the transepicondylar hinge axis from rest data (limb × body-forward, valid for hanging and T-pose limbs); applyHingeClamp measures signed flexion and clamps to knees [-5°, 150°], elbows [-160°, 5°]; natural side derived per-joint, no per-side hard-coding
- add spine distribution logic — DONE: bindings carry a `chain` tag (hip + spine_01..03); chain members each take 1/N of the canonical bend via slerp from their own rest local
- tune smoothing for live use — DONE: web Viewport uses the adaptive profile (baseSmoothing 0.55, saturation 20°/frame); validation script asserts still-pose damping and fast-motion pass-through

Definition of done:
- pose looks stable enough in preview — VERIFIED: solver math covered by scripts/validate-retarget.mjs (26 checks, all passing)
- feet and hands are more stable than raw capture — VERIFIED for feet (ground lock + point gate); hands deferred
- no offline cleanup yet — unchanged

Implementation notes:
- `RetargetOptions.smoothing` (fixed) and `stabilizer` (adaptive) are mutually exclusive modes: explicit smoothing disables the stabilizer for deterministic behavior (used by tests); omitting it enables the full adaptive pipeline.
- The hinge axis is built in the PARENT bone's rest local frame (limb × forward), so it stays ⊥ to the limb in every pose; the previous per-bone secondary-reference approach degenerated when the roll reference was parallel to the limb (hanging arm, standing leg).
- Leg roll references use the hip line (mediolateral) instead of the spine direction so foot twist tracks the knee's flexion plane.
- Sprint 7 checks in scripts/validate-retarget.mjs: still-pose damping, fast-motion pass-through, confidence hysteresis (2), point outlier gate (2), knee clamp natural/hyper/boundary (3), spine chain distribution (2), foot lock hips compensation (1).

## Sprint 8 — Recording and clip model

Goal:
- record motion and store it as animation clip data

Status: IMPLEMENTED (packages/pose: motion-clip.ts; web: RecordControls, ClipPanel, clip-playback.ts)

Tasks:
- add record/stop/pause/resume state — DONE: ClipRecorder with monotonic clock; paused time is excluded from the timeline (no gaps between frames around a pause); RecordControls exposes Gravar/Pausar/Parar with REC and PAUSA badges
- store pose stream as animation clip — DONE: MotionClip stores CanonicalPose frames exactly as the retarget solver consumes them; recording hooks into the single accepted-pose path in App (low-confidence frames never reach the recorder); playback feeds frames through the same setCurrentPose path as live capture, so viewport/retarget/skeleton all work unchanged
- add clip metadata — DONE: name, createdAt, durationMs, frameCount, source (requested provider + resolved engine); clips auto-named "Captura <date/time>", renamable via the clip panel
- add sample rate and duration tracking — DONE: effective sampleRateHz computed at stop; duration = last frame timestamp on the recorder's own clock (uniform timeline even with inference jitter)
- add basic clip list UI — DONE: ClipPanel lists saved clips (newest first) with per-clip play/pause/stop, rename, remove; currently-playing clip is highlighted
- store raw and cleaned representations separately — PARTIAL: only the canonical (post-mapping, pre-retarget) representation is stored; the retarget solve is applied at playback time so cleaned parameters (stabilizer tuning, joint limits) can still change per playback. A frozen cleaned/baked track is deferred to the export sprint.
- define export-ready data structure — DONE: MotionClip with formatVersion is the export payload; frame limits (18k frames / 10 min) and optional minIntervalMs decimation guard memory; an unchosen pending clip is auto-saved when a new recording starts and finalized (never discarded) when capture stops

Definition of done:
- user can record motion — VERIFIED live (REC state machine) + scripts/validate-clip-recorder.mjs (21 checks: monotonic timestamps, pause exclusion, limits, decimation, reuse)
- clip data is saved internally — VERIFIED (zustand clips list; pending-clip save/discard flow)
- raw and processed versions coexist — partial (see above); canonical stream is the single source, cleaned derived on the fly

## Sprint 9 — GLB export and web output

Goal:
- produce a useful output from the web app

Status: IMPLEMENTED (web: clip-baker.ts, glb-export.ts, App.tsx export handler, ClipPanel export action + inline export-done confirmation)

Verified in the live preview:
- served bundle is the rebuilt dist with the export-done change (main JS bytes match disk build; exportedDoneId + "Ocultar confirmação" + bytes.toLocaleString present in the served JS)
- server alive and serving HTTP 200 on http://localhost:5173/ (launchd job motionforge-static-server)

Tasks:
- define GLB/animation data output model — DONE: MotionClip is the export payload (Sprint 8); clip-baker.ts bakes it into THREE.AnimationClip tracks (QuaternionKeyframeTrack per rig bone + a VectorKeyframeTrack for hip.position in the rest skeleton's world space, meters)
- implement GLB export path or animation data export — DONE: glb-export.ts builds a minimal THREE.Bone skeleton from RestPoseData (parent⁻¹ · bone world via THREE.Matrix4 so scale/rotation are both handled), attaches the baked animation, and runs three-stdlib's GLTFExporter with binary:true to produce a Blob; deterministic solve (smoothing:0) so baking is reproducible
- prepare export file contents — DONE: exported GLB is skeleton-only (no mesh), with the rig topology from UE5_RIG_BINDINGS; can be re-imported by DCC tools or retargeted onto a same-topology rig
- add export/download UI — DONE: ClipPanel exposes per-clip export; App handles the GLB download via createObjectURL/a.click() with revoke; an exportingClipId state prevents concurrent exports
- verify output can be reused by the app or other tools — DONE for the data path (baked animation can feed the existing playback path); runtime GLB download on the live preview is environment-limited (browser download from the preview webview is not observable here), so the export modules are validated headlessly instead
- add export feedback for the user — DONE: after a successful export, the exported clip row shows an inline confirmation (`⬇ {fileName} ({bytes} bytes)`) with a dismiss control (`✕ Ocultar confirmação`); the confirmation clears when dismissed or when a new export starts; failures still route through the existing error banner
- keep FBX as a desktop-primary export for now — DONE: web stays GLB-only; FBX remains a desktop track

Definition of done:
- web app can export GLB or animation data — VERIFIED on the data/export modules (headless); runtime download visible in a real browser tab is the remaining usability check
- export is usable for round-trip or handoff — VERIFIED as skeleton+animation GLB; frozen cleaned/baked representation vs canonical is unchanged from Sprint 8's partial item (cleaned parameters still applied at playback/export time, not pre-baked)

Implementation notes:
- Export uses the same RestPoseData the live viewport captured via Viewport.onRetargetReady, so the exported clip matches the animation the user saw; when that rest is unavailable, a synthetic identity T-pose rig is baked instead (still valid, just not aligned to a specific character)
- Hip translation is baked as a POSITION track on the hips bone in rest-world meters; the live viewport's separate FBX-related parent-local conversion is NOT used in GLB export because the exported skeleton is built from rest world data at meter scale
- Export is blocked by the same dependencies as the viewer (three + three-stdlib); the web app treats an export failure as a poseError so the user gets a visible message instead of a silent failure

Deferred:
- Visual GLB round-trip in the preview webview (browser download behavior not observable in this preview environment)
- Frozen/baked cleaned track separate from the canonical stream (still deferred from Sprint 8)

## Sprint 10 — Web hardening and readiness

Goal:
- make the web MVP resilient, observable, and clearer about what it does locally

Scope:
- web-only hardening; no new export format, no new provider backends, no offline
  editor

State derived from current web code:
- provider selection + `Auto` resolution is in place (`store.ts` provider fields,
  `ProviderSelector`, `ProviderStatus`)
- capture flow is live through `PosePipeline` + `pose.worker.ts`, with
  low-confidence gating and MediaPipe GPU→CPU fallback
- rest is already built: camera selector, viewport camera preview, retarget,
  recording/playback, GLB export path

Concrete tasks:
- worker reliability and error handling — IMPLEMENT
  - make `PosePipeline` failures recovery-oriented: init errors, provider
    unavailability, and per-frame worker errors should not leave the UI in a
    half-capturing state
  - ensure `stop()` is safe to call from any state during teardown
  - keep the visible `poseError` banner dismissible and make repeated transient
    worker failures readable instead of silent
  - document the worker message protocol boundary in code, not only in the sprint
    doc (`INIT`, `INIT_SUCCESS`, `INIT_ERROR`, `PROVIDER_UNAVAILABLE`,
    `PROCESS_FRAME`, `POSE_RESULT`, `NO_POSE`, `FRAME_ERROR`, `DISPOSE`)
- camera selection and permissions UX — IMPLEMENT
  - improve empty/unfriendly camera device names (`enumerateDevices` anonymous
    labels) with a clearer placeholder and device-change behavior
  - make permission denial and missing `getUserMedia` states explicit in the
    capture panel/status, not only in the console
  - ensure camera open/close is idempotent and cleanup is obvious on unmount and
    on stop
- local-only behavior clarity — IMPLEMENT
  - make the default experience read as local-first to a first-time user:
    capture, processing, recording, and export happen in the browser session
  - keep any external resource usage (for example MediaPipe WASM/model hosting)
    explicit in the UI or docs rather than invisible
  - state clearly what the web MVP does and does not upload
- performance diagnostics — PARTIAL
  - keep inference FPS / latency / confidence visible in the viewport while pose
    results stream (already present)
  - add a small, non-intrusive diagnostics line for camera preview status and
    worker/init state so a user or tester can distinguish "no pose" from "worker
    not ready"
  - defer richer profiling (per-frame breakdowns, worker memory pressure, frame
    budget tooling) to a later pass
- fallback behavior when WebGPU is unavailable — PARTIAL
  - keep MediaPipe GPU→CPU fallback in `pose.worker.ts` as the primary web path
  - defer any separate WebGPU-native inference backend to a future sprint
- quality profiles UI — DEFERRED
  - the core tuning knobs exist in the retarget/stability layer, but a user-facing
    quality/performance profile selector is not in scope for this sprint
- test on representative devices and browsers — DEFERRED
  - manual validation on common desktop browsers is implied by the current dev
    loop; broadening to a formal device matrix is future work

Definition of done:
- the web app degrades without leaving the user stuck in a broken capture state
- camera permission and device UX is clear in the app, not only in console output
- local-only behavior is understandable from the default UI/docs
- diagnostics give enough signal to tell capture issues apart from worker/init
  issues

Deferred:
- separate WebGPU inference backend
- hand/face support
- direct FBX export on web
- formal cross-device/browser matrix
- user-facing quality/performance profile selector

## Optional future web tasks

- WebGPU inference backend
- deeper filtering and offline cleanup in worker
- keyframe editing UI
- hands/face support
- multi-camera support
- direct FBX export in web
- live streaming
