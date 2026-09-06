# Pose Provider Contract

> Abstract interface for pose capture backends in Motion Forge
> One product, many providers: MediaPipe, RTMPose, NVIDIA, ONNX, custom

## Purpose

Motion Forge should not depend on a single pose model or vendor.

The Pose Provider contract defines the interface between the capture backend and the rest of the pipeline:
- webcam / frame input
- canonical 3D pose output
- provider metadata, capability, and fallback behavior

This allows:
- MVP with MediaPipe
- later RTMPose comparison
- later NVIDIA backend for RTX machines
- future custom 3D pose model
- user-facing provider selection in the app

## Canonical pipeline role

```text
Webcam
  ↓
PoseProvider
  ↓
Canonical Pose 3D
  ↓
Retarget
  ↓
IK
  ↓
Motion Cleanup
  ↓
Blender / Unity / Unreal
```

The provider produces canonical pose. The rest of the app does not care which backend created it.

## Provider selection model

The user can choose:

```text
Motor de captura
  ○ Auto
  ○ MediaPipe
  ○ RTMPose
  ○ NVIDIA RTX
  ○ Modelo personalizado
```

`Auto` must select the best available backend for the current device and runtime:
- web: browser-compatible backend
- desktop with NVIDIA RTX: optional NVIDIA backend when available
- otherwise: best available backend for the platform

## Provider capabilities

Each provider should declare:

- `id`
- `label`
- `supportedPlatforms`
- `supportsGPU`
- `supportsCPU`
- `supportsWeb`
- `supportsDesktop`
- `preferredBackend`
- `fallbackPolicy`
- `modelVariant` if applicable

Examples:

- MediaPipe: web + desktop, CPU/GPU where available
- RTMPose: desktop priority, possibly web when practical
- NVIDIA: desktop, RTX preferred
- Custom: any runtime if the user provides a model/runtime

## Inputs

A provider should accept one or more of:

- camera/video frame
- already processed frame metadata if needed
- session/configuration descriptor

The exact frame type may be runtime-specific, but the contract should keep it stable:
- web may use video frames in a worker
- desktop may use native frames or shared memory
- custom providers should still be able to plug in through the same interface

## Outputs

A provider must produce a canonical pose result, not raw vendor landmarks.

The canonical result should include:

- timestamp
- overall confidence
- body pose joints:
  - root
  - pelvis
  - spine
  - chest
  - neck
  - head
  - left/right shoulder
  - left/right upper arm
  - left/right lower arm
  - left/right hand
  - left/right upper leg
  - left/right lower leg
  - left/right foot
- per-joint confidence where available
- 3D position and orientation in canonical space
- provider metadata:
  - which backend produced it
  - latency estimate
  - warnings or drop reasons

## Interface shape

A provider implementation should support at least these operations:

- `initialize(config)`
- `supportsPlatform(platform)`
- `startCapture(source)`
- `processFrame(frame)`
- `stopCapture()`
- `dispose()`

And at least these queries:

- `getCapabilities()`
- `getCurrentProviderId()`
- `getHealth/status()`

The pipeline must be able to:
- select a provider by id or by `Auto`
- fall back if the chosen provider is unavailable
- report why a provider was chosen or rejected

## Canonical pose normalization contract

Providers must not force the rest of the app to understand MediaPipe, RTMPose, or NVIDIA output formats directly.

Conversion rules:

1. receive raw provider output
2. normalize scale, orientation, and coordinate space
3. produce canonical skeleton pose
4. expose confidence and metadata

This keeps retargeting, IK, and cleanup independent of the provider.

## Error and fallback contract

Providers can fail for many reasons:
- unsupported platform
- missing GPU
- missing model file
- permissions
- runtime error

The contract should define:
- graceful unavailability
- explicit fallback ordering
- user-visible reason when a backend is not usable
- stable degradation to CPU/web fallback when possible

## Provider registry

The app should maintain a provider registry, for example:

```text
PoseProviderRegistry
  ├── MediaPipeProvider
  ├── RTMPoseProvider
  ├── NVIDIAProvider
  ├── ONNXProvider
  ├── NativeProvider
  └── CustomProvider
```

The registry is responsible for:
- discovery
- capability checks
- selection
- instantiation
- fallback

## Status reporting

Each provider should be able to report:
- available / unavailable
- running / idle
- backend used
- latency
- dropped frames
- warnings

This supports both UX and diagnostics.

## MVP scope of the contract

MVP does not need every backend.

MVP needs:
- a usable PoseProvider interface
- MediaPipe as the default provider
- the ability to add more providers later
- provider selection in the UI
- stable canonical output even if the provider changes

The goal is architectural readiness, not full multi-backend parity on day one.

## Future extensions

Later versions may extend the contract with:
- hand/finger pose
- face/expression pose
- multi-camera inputs
- depth or camera calibration hints
- custom model loading
- runtime-specific GPU preferences

These should be additive, not breaking, whenever possible.

## Design intent

The contract exists so Motion Forge can become a mocap platform, not a single-provider app.

A good contract means:
- MediaPipe can come first
- RTMPose can be compared later
- NVIDIA can be optional on RTX hardware
- a custom model can eventually replace third-party backends
- the UI can expose provider choice without changing the pipeline
