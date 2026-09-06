import {
  ProviderId,
  Platform,
  PoseProviderRegistry,
  ProviderMetadata,
  CaptureSource,
  FrameData,
  PoseResult,
} from "@motion-forge/pose";

export const WEB_PLATFORM: Platform = "web";

////////////////////////////////////////////////////////////////////////////////
// Registry creation
////////////////////////////////////////////////////////////////////////////////

export function createPoseProviderRegistry(): PoseProviderRegistry {
  const registry = new PoseProviderRegistry({
    platform: WEB_PLATFORM,
    defaultProvider: "mediapipe",
  });

  registry.register({
    id: "auto",
    label: "Auto",
    available: true,
    capability: {
      supportsGPU: true,
      supportsCPU: true,
      supportsWeb: true,
      supportsDesktop: true,
      preferredBackend: "auto",
      fallbackPolicy: "cpu",
    },
  });

  registry.register({
    id: "mediapipe",
    label: "MediaPipe",
    available: true,
    capability: {
      supportsGPU: true,
      supportsCPU: true,
      supportsWeb: true,
      supportsDesktop: true,
      preferredBackend: "mediapipe",
      fallbackPolicy: "cpu",
    },
  });

  registry.register({
    id: "rtmpose",
    label: "RTMPose",
    available: false,
    capability: {
      supportsGPU: true,
      supportsCPU: true,
      supportsWeb: false,
      supportsDesktop: true,
      preferredBackend: "rtmpose",
      fallbackPolicy: "cpu",
    },
    reasonUnavailable:
      "Web backend não disponível neste MVP",
  });

  registry.register({
    id: "nvidia",
    label: "NVIDIA RTX",
    available: false,
    capability: {
      supportsGPU: true,
      supportsCPU: false,
      supportsWeb: false,
      supportsDesktop: true,
      preferredBackend: "nvidia",
      fallbackPolicy: "none",
    },
    reasonUnavailable:
      "NVIDIA RTX não disponível neste MVP",
  });

  registry.register({
    id: "custom",
    label: "Modelo personalizado",
    available: false,
    capability: {
      supportsGPU: true,
      supportsCPU: true,
      supportsWeb: false,
      supportsDesktop: true,
      preferredBackend: "custom",
      fallbackPolicy: "cpu",
    },
    reasonUnavailable:
      "Modelo personalizado não configurado",
  });

  return registry;
}

export const DEFAULT_REGISTRY = createPoseProviderRegistry();

////////////////////////////////////////////////////////////////////////////////
// Session helpers
////////////////////////////////////////////////////////////////////////////////

export interface CaptureSession {
  providerId: ProviderId;
  source: CaptureSource | null;
  running: boolean;
}

export function createPoseSession(): CaptureSession {
  return {
    providerId: "auto",
    source: null,
    running: false,
  };
}

////////////////////////////////////////////////////////////////////////////////
// Capture lifecycle
////////////////////////////////////////////////////////////////////////////////

export async function startCapture(
  session: CaptureSession,
  registry: PoseProviderRegistry,
  source: CaptureSource,
): Promise<{ session: CaptureSession; result?: PoseResult }> {
  const resolved = registry.resolveSelection(session.providerId);

  if (resolved === "unknown") {
    return {
      session: {
        ...session,
        providerId: resolved,
        source,
        running: false,
      },
      result: undefined,
    };
  }

  return {
    session: {
      providerId: resolved,
      source,
      running: true,
    },
    result: undefined,
  };
}

export async function stopCapture(
  session: CaptureSession,
): Promise<CaptureSession> {
  return {
    ...session,
    running: false,
  };
}

export async function resetSelectionToAuto(
  registry: PoseProviderRegistry,
): Promise<ProviderId> {
  return registry.resolveSelection("auto");
}

////////////////////////////////////////////////////////////////////////////////
// Frame helpers
////////////////////////////////////////////////////////////////////////////////

export function makeCaptureSource(deviceId?: string): CaptureSource {
  return {
    type: "webcam",
    deviceId,
  };
}

export function makeFrame(timestamp: number, data?: unknown): FrameData {
  return {
    type: "video",
    timestamp,
    data,
  };
}

export function describeProvider(
  registry: PoseProviderRegistry,
  id: ProviderId,
): ProviderMetadata | undefined {
  return registry.getMetadata(id);
}

////////////////////////////////////////////////////////////////////////////////
// Auto verification helpers
////////////////////////////////////////////////////////////////////////////////

export function resolveAutoProvider(
  registry: PoseProviderRegistry,
): ProviderId {
  return registry.resolveSelection("auto");
}

export function autoProviderMetadata(
  registry: PoseProviderRegistry,
): ProviderMetadata | undefined {
  const resolved = registry.resolveSelection("auto");
  if (resolved === "unknown") {
    return undefined;
  }
  return registry.getMetadata(resolved);
}

export function resolveActiveProvider(
  registry: PoseProviderRegistry,
  requestedProviderId: ProviderId,
): ProviderId {
  return registry.resolveSelection(requestedProviderId);
}

export function isActiveProviderAvailable(
  registry: PoseProviderRegistry,
  providerId: ProviderId,
): boolean {
  const metadata = registry.getMetadata(providerId);
  return Boolean(metadata?.available);
}
