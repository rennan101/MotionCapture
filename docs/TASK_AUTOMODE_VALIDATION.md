# Task — Validate Auto provider selection on Web and Desktop

## Objective

Validate that the `Auto` pose engine selection works correctly on both runtimes:
- web
- desktop, especially macOS

The goal is not to implement every backend in MVP.
The goal is to prove that:
- Auto picks a sensible provider
- unavailable providers are rejected cleanly
- the UI reflects the chosen backend
- fallback behavior is stable

## Acceptance criteria

- [ ] Auto mode is exposed in the app as `Motor de captura → Auto`
- [ ] Auto selects a usable provider on the current platform
- [ ] The UI shows which provider was selected
- [ ] If no provider is usable, the app shows a clear unavailable state
- [ ] Selecting a specific provider later overrides Auto
- [ ] Provider selection survives app restart only if settings support it
- [ ] Fallback behavior does not crash the capture pipeline
- [ ] Diagnostics show why Auto chose a provider or why a provider was skipped
- [ ] Auto resolution is performed by `PoseProviderRegistry.resolveSelection("auto")`
- [ ] The status bar shows `Auto → <resolved provider>` when Auto is on
- [ ] The capture panel shows the resolved backend, not just the raw selection value

## Web validation steps

1. Start the web app
2. Open pose settings
3. Set provider to Auto
4. Start webcam
5. Confirm which backend was selected
6. Check:
   - MediaPipe is usable in browser
   - RTMPose backend is not forced if unavailable
   - fallback does not break capture
7. Switch provider manually to MediaPipe
8. Confirm capture still works
9. Switch back to Auto
10. Confirm provider choice is re-evaluated

Notes:
- Web Auto should prefer browser-compatible providers
- Custom model support may be limited in early web MVP

## Desktop validation steps

1. Build and run the desktop app
2. Open pose settings
3. Set provider to Auto
4. Start webcam
5. Confirm which backend was selected
6. Check:
   - default provider works
   - unavailable backends are not selected
   - NVIDIA RTX is not required for MVP
7. Switch provider manually to MediaPipe
8. Confirm capture still works
9. Switch back to Auto
10. Confirm provider choice is re-evaluated

Notes:
- Desktop Auto should prefer the best available backend for the machine
- NVIDIA backend should be optional, not mandatory
- macOS Metal usage should be handled at the GPU layer, not by locking the pose backend

## Provider matrix to validate

For MVP, validate at least:

| Provider  | Web          | Desktop macOS | Desktop Windows |
|-----------|--------------|---------------|-----------------|
| Auto      | yes          | yes           | yes             |
| MediaPipe | primary MVP  | if available  | if available    |
| RTMPose   | if available | if available  | if available    |
| NVIDIA RTX| no           | if available  | if available    |
| Custom    | limited MVP  | limited MVP   | limited MVP     |

For MVP, “if available” means the UI should handle absence gracefully.

## Provider matrix — current web implementation

In the current web MVP, the registry is configured as:

| Provider  | Available | Reason |
|-----------|-----------|--------|
| Auto      | yes       | selects MediaPipe on web |
| MediaPipe | yes       | default web backend |
| RTMPose   | no        | Web backend não disponível neste MVP |
| NVIDIA RTX| no        | NVIDIA RTX não disponível neste MVP |
| Custom    | no        | Modelo personalizado não configurado |

That means current web validation is mostly a wiring sanity check:

- Auto should resolve to MediaPipe
- switching to MediaPipe manually should work
- switching to an unavailable provider should not be possible while another provider is selected
- switching back to Auto should re-resolve

## UI validation

Validate that the UI shows:
- provider options consistently
- unavailable options as unavailable
- current provider clearly
- a reason when Auto cannot use a provider
- that provider choice is understandable to a non-technical user

## Diagnostics to capture

For each run, capture:
- selected provider
- reason for selection
- platform
- GPU availability
- CPU fallback used
- dropped frames
- latency estimate
- any warnings

## Current web diagnostics to assert

From the current code, assert:

- `createPoseProviderRegistry()` creates a web registry with MediaPipe available
- `registry.resolveSelection("auto")` returns `"mediapipe"`
- `registry.resolveSelection("rtmpose")` returns `"unknown"`
- `ProviderSelector` shows `Motor de captura` with the expected five options
- `ProviderSelector` disables unavailable options when another provider is selected
- when `value === "auto"`, `ProviderSelector` highlights the resolved active provider
- `ProviderStatus` and `StatusBar` reflect the resolved backend when a registry is passed
- when `providerId === "auto"`, `StatusBar` shows `Provider: auto → MediaPipe`
- when `providerId === "unknown"`, the status pills show the unavailable state without crashing

This will help validate whether Auto is actually choosing well.

## Definition of done

- Auto works on web
- Auto works on desktop
- unavailable providers are not selected silently
- UI states are clear
- fallback behavior is safe
- selection logic is easy to extend for RTMPose, NVIDIA, and custom backends later

## Out of scope for this task

- full quality comparison between providers
- full NVIDIA integration
- full RTMPose integration
- custom model training or loading UI beyond basic readiness

## Why this matters

If Auto works, the app can present itself as a platform:
- simple for new users
- extensible for advanced users
- not locked to MediaPipe
- ready for V2/V3/V4 provider evolution
