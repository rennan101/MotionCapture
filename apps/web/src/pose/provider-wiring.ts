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

/** Device enumeration result, with an explicit usability label. */
export interface CameraDeviceItem {
  label: string;
  deviceId: string;
  /** True when the browser has not yet authorized a label for this device. */
  labelUnknown: boolean;
}

export async function listVideoInputDevices():
  Promise<Array<CameraDeviceItem>> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter(
      (device): device is MediaDeviceInfo & { kind: "videoinput" } =>
        device.kind === "videoinput",
    )
    .map((device) => ({
      labelUnknown: device.label === "" || device.label === undefined,
      label:
        device.label ||
        `Câmera ${device.deviceId.slice(0, 8)}${device.deviceId.slice(8) ? "…" : ""}`,
      deviceId: device.deviceId,
    }));
}

/** Open-camera result with an explicit outcome label for the UI. */
export interface CameraOpenResult {
  stream: MediaStream | null;
  /** Machine-readable outcome used by the capture panel and diagnostics line. */
  outcome:
    | "opened"
    | "denied"
    | "not-allowed"
    | "overconstrained"
    | "unsupported"
    | "fallback-opened"
    | "fallback-denied"
    | "fallback-unavailable"
    | "error";
  detail: string;
}

export async function openCamera(
  deviceId?: string,
): Promise<CameraOpenResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      stream: null,
      outcome: "unsupported",
      detail:
        "Esta página não suporta webcam no navegador atual. Tente um navegador moderno (Chrome, Edge, Firefox, Safari).",
    };
  }

  const attempt = async (
    constraints: MediaStreamConstraints,
    label: string
  ): Promise<CameraOpenResult> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream, outcome: label as CameraOpenResult["outcome"], detail: "câmera aberta" };
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          return {
            stream: null,
            outcome: "denied",
            detail:
              "Permissão de câmera negada. Ative a permissão na barra do navegador e tente novamente.",
          };
        }
        if (error.name === "OverconstrainedError") {
          return {
            stream: null,
            outcome: "overconstrained",
            detail:
              "O dispositivo selecionado não está disponível com as restrições solicitadas. Selecione outra câmera e tente novamente.",
          };
        }
        if (error.name === "NotFoundError") {
          return {
            stream: null,
            outcome: "overconstrained",
            detail:
              "Nenhuma câmera encontrada com o dispositivo selecionado. Selecione outra opção.",
          };
        }
      }
      console.warn("MotionForge: camera request failed", error);
      return {
        stream: null,
        outcome: "error",
        detail:
          error instanceof Error ? error.message : "Não foi possível abrir a câmera.",
      };
    }
  };

  if (deviceId) {
    let result = await attempt(
      { video: { deviceId: { exact: deviceId } }, audio: false },
      "opened"
    );
    if (result.outcome === "overconstrained") {
      // iPhone via Camo, USB hubs, and removed/muted devices commonly hit this.
      // Try a device-agnostic fallback before failing the request.
      console.warn(
        "MotionForge: deviceId indisponível, tentando câmera padrão",
        result.detail
      );
      result = await attempt(
        { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        "fallback-opened"
      );
      if (result.outcome !== "opened" && result.outcome !== "fallback-opened") {
        result = {
          stream: null,
          outcome: "fallback-denied",
          detail:
            "O dispositivo selecionado não respondeu e nenhuma câmera padrão pôde ser aberta. Verifique as permissões e a conexão da câmera.",
        };
      }
    }
    return result;
  }

  return attempt(
    { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    "opened"
  );
}

/** Idempotent camera teardown. Safe to call on an already-stopped stream. */
export function closeCamera(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // ignore teardown noise on a stream that is already dead
  }
}
