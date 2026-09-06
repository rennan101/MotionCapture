import type { CanonicalBoneName } from "@motion-forge/core";

////////////////////////////////////////////////////////////////////////////////
// Pose Provider Contract
////////////////////////////////////////////////////////////////////////////////
//
// The pose layer is the swap point of the Motion Forge pipeline.
//
//   Webcam
//     ↓
//   PoseProvider
//     ↓
//   Canonical Pose 3D
//     ↓
//   Retarget
//     ↓
//   IK
//     ↓
//   Motion Cleanup
//     ↓
//   Blender / Unity / Unreal
//
// The app selects a provider by id or by `Auto`.
// The pipeline consumes a canonical pose, not vendor-specific labels.
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// Provider identity and platform
////////////////////////////////////////////////////////////////////////////////

export type ProviderId =
  | "auto"
  | "mediapipe"
  | "rtmpose"
  | "nvidia"
  | "custom"
  | "unknown";

export const PROVIDER_IDS: readonly ProviderId[] = [
  "auto",
  "mediapipe",
  "rtmpose",
  "nvidia",
  "custom",
  "unknown",
] as const;

export type Platform =
  | "web"
  | "macos"
  | "windows"
  | "linux";

////////////////////////////////////////////////////////////////////////////////
// Provider capabilities
////////////////////////////////////////////////////////////////////////////////

export interface ProviderCapability {
  supportsGPU: boolean;
  supportsCPU: boolean;
  supportsWeb: boolean;
  supportsDesktop: boolean;
  preferredBackend: ProviderId;
  fallbackPolicy: "none" | "cpu" | "another-shim";
}

export interface ProviderMetadata {
  id: ProviderId;
  label: string;
  available: boolean;
  capability: ProviderCapability;
  reasonUnavailable?: string;
}

////////////////////////////////////////////////////////////////////////////////
// Capture input
////////////////////////////////////////////////////////////////////////////////

export interface CaptureSource {
  type: "webcam";
  deviceId?: string;
}

export interface FrameData {
  type: "video";
  timestamp: number;
  data?: unknown;
}

////////////////////////////////////////////////////////////////////////////////
// Canonical pose output
////////////////////////////////////////////////////////////////////////////////

export interface BoneCapturePoint {
  position: [number, number, number];
  confidence: number;
}

export interface CanonicalPose {
  timestamp: number;
  overallConfidence: number;
  root: BoneCapturePoint;
  pelvis: BoneCapturePoint;
  spine: BoneCapturePoint;
  chest: BoneCapturePoint;
  neck: BoneCapturePoint;
  head: BoneCapturePoint;
  leftShoulder: BoneCapturePoint;
  leftUpperArm: BoneCapturePoint;
  leftLowerArm: BoneCapturePoint;
  leftHand: BoneCapturePoint;
  rightShoulder: BoneCapturePoint;
  rightUpperArm: BoneCapturePoint;
  rightLowerArm: BoneCapturePoint;
  rightHand: BoneCapturePoint;
  leftUpperLeg: BoneCapturePoint;
  leftLowerLeg: BoneCapturePoint;
  leftFoot: BoneCapturePoint;
  rightUpperLeg: BoneCapturePoint;
  rightLowerLeg: BoneCapturePoint;
  rightFoot: BoneCapturePoint;
}

export interface PoseResult {
  canonical: CanonicalPose;
  providerId: ProviderId;
  latencyMs: number;
  warnings: string[];
}

////////////////////////////////////////////////////////////////////////////////
// Provider interface
////////////////////////////////////////////////////////////////////////////////

export interface PoseProviderAsync {
  initialize(config?: Record<string, unknown>): Promise<void>;
  supportsPlatform(platform: Platform): boolean;
  startCapture(source: CaptureSource): Promise<void>;
  processFrame(frame: FrameData): Promise<PoseResult>;
  stopCapture(): Promise<void>;
  dispose(): Promise<void>;
}

export interface PoseProviderLifecycle {
  initialize(config?: Record<string, unknown>): Promise<void>;
  supportsPlatform(platform: Platform): boolean;
  startCapture(source: CaptureSource): Promise<void>;
  stopCapture(): Promise<void>;
  dispose(): Promise<void>;
}

export interface PoseProviderShims extends PoseProviderLifecycle {
  processFrame(frame: FrameData): Promise<PoseResult>;
  getMetadata(): ProviderMetadata;
}

////////////////////////////////////////////////////////////////////////////////
// Provider registry
////////////////////////////////////////////////////////////////////////////////

export interface PoseProviderRegistryOptions {
  platform: Platform;
  defaultProvider?: ProviderId;
  availableProviders?: ProviderId[];
}

export class PoseProviderRegistry {
  private readonly options: PoseProviderRegistryOptions;
  private providers: Map<ProviderId, ProviderMetadata> = new Map();

  constructor(options: PoseProviderRegistryOptions) {
    this.options = options;
  }

  register(metadata: ProviderMetadata): void {
    this.providers.set(metadata.id, metadata);
  }

  getAvailable(): ProviderMetadata[] {
    return Array.from(this.providers.values());
  }

  /// Return the real provider id the pipeline should use.
  /// Explicit selections must be registered and available.
  /// `Auto` must be resolved by the registry, not by the consumer.
  resolveSelection(selection: ProviderId): ProviderId {
    if (selection !== "auto") {
      const m = this.providers.get(selection);
      if (m && m.available) {
        return selection;
      }
      return "unknown";
    }

    if (this.options.platform === "web") {
      if (this.providers.get("mediapipe")?.available) {
        return "mediapipe";
      }
    }

    if (this.options.platform === "macos" || this.options.platform === "windows") {
      if (this.providers.get("nvidia")?.available) {
        return "nvidia";
      }
      if (this.providers.get("mediapipe")?.available) {
        return "mediapipe";
      }
    }

    const preferred = this.options.defaultProvider ?? "mediapipe";
    const m = this.providers.get(preferred);
    if (m && m.available) {
      return preferred;
    }

    return "unknown";
  }

  getMetadata(id: ProviderId): ProviderMetadata | undefined {
    return this.providers.get(id);
  }
}

export * from "./mediapipe-mapper.js";

