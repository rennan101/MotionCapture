
import { ProviderId, Platform, PoseProviderRegistry, ProviderMetadata, CaptureSource, FrameData, PoseResult } from "@motion-forge/pose";

export const WEB_PLATFORM = "web";

export function createPoseProviderRegistry() {
  const registry = new PoseProviderRegistry({ platform: WEB_PLATFORM, defaultProvider: "mediapipe" });
  registry.register({ id: "auto", label: "Auto", available: true, capability: { supportsGPU: true, supportsCPU: true, supportsWeb: true, supportsDesktop: true, preferredBackend: "auto", fallbackPolicy: "cpu" } });
  registry.register({ id: "mediapipe", label: "MediaPipe", available: true, capability: { supportsGPU: true, supportsCPU: true, supportsWeb: true, supportsDesktop: true, preferredBackend: "mediapipe", fallbackPolicy: "cpu" } });
  registry.register({ id: "rtmpose", label: "RTMPose", available: false, capability: { supportsGPU: true, supportsCPU: true, supportsWeb: false, supportsDesktop: true, preferredBackend: "rtmpose", fallbackPolicy: "cpu" }, reasonUnavailable: "Web backend nao disponivel neste MVP" });
  registry.register({ id: "nvidia", label: "NVIDIA RTX", available: false, capability: { supportsGPU: true, supportsCPU: false, supportsWeb: false, supportsDesktop: true, preferredBackend: "nvidia", fallbackPolicy: "none" }, reasonUnavailable: "NVIDIA RTX nao disponivel neste MVP" });
  registry.register({ id: "custom", label: "Modelo personalizado", available: false, capability: { supportsGPU: true, supportsCPU: true, supportsWeb: false, supportsDesktop: true, preferredBackend: "custom", fallbackPolicy: "cpu" }, reasonUnavailable: "Modelo personalizado nao configurado" });
  return registry;
}

export function createPoseSession() {
  return { providerId: "auto", source: null, running: false };
}

export async function startCapture(session, registry, source) {
  const resolved = registry.resolveSelection(session.providerId);
  if (resolved === "unknown") {
    return { session: { ...session, providerId: resolved, source, running: false }, result: undefined };
  }
  return { session: { providerId: resolved, source, running: true }, result: undefined };
}

export async function stopCapture(session) {
  return { ...session, running: false };
}

export async function resetSelectionToAuto(registry) {
  return registry.resolveSelection("auto");
}

export function makeCaptureSource(deviceId) {
  return { type: "webcam", deviceId };
}

export function makeFrame(timestamp, data) {
  return { type: "video", timestamp, data };
}

export function describeProvider(registry, id) {
  return registry.getMetadata(id);
}

export function resolveAutoProvider(registry) {
  return registry.resolveSelection("auto");
}

export function autoProviderMetadata(registry) {
  const resolved = registry.resolveSelection("auto");
  if (resolved === "unknown") return undefined;
  return registry.getMetadata(resolved);
}

export function resolveActiveProvider(registry, requestedProviderId) {
  return registry.resolveSelection(requestedProviderId);
}

export function isActiveProviderAvailable(registry, providerId) {
  const metadata = registry.getMetadata(providerId);
  return Boolean(metadata?.available);
}

export async function listVideoInputDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput").map((device) => ({
    label: device.label || ("Camera " + device.deviceId.slice(0, 8) + (device.deviceId.slice(8) ? "..." : "")),
    deviceId: device.deviceId,
    labelUnknown: device.label === "" || device.label === undefined,
  }));
}

export async function openCamera(deviceId) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { stream: null, outcome: "unsupported", detail: "Esta pagina nao suporta webcam no navegador atual." };
  }
  const attempt = async (constraints, label) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream, outcome: label, detail: "camera aberta" };
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          return { stream: null, outcome: "denied", detail: "Permissao de camera negada." };
        }
        if (error.name === "OverconstrainedError") {
          return { stream: null, outcome: "overconstrained", detail: "Dispositivo selecionado nao esta disponivel com as restricoes solicitadas." };
        }
        if (error.name === "NotFoundError") {
          return { stream: null, outcome: "overconstrained", detail: "Nenhuma camera encontrada." };
        }
      }
      console.warn("MotionForge: camera request failed", error);
      return { stream: null, outcome: "error", detail: error instanceof Error ? error.message : "Nao foi possivel abrir a camera." };
    }
  };
  if (deviceId) {
    let result = await attempt({ video: { deviceId: { exact: deviceId } }, audio: false }, "opened");
    if (result.outcome === "overconstrained") {
      console.warn("MotionForge: deviceId indisponivel, tentando camera padrao", result.detail);
      result = await attempt({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }, "fallback-opened");
      if (result.outcome !== "opened" && result.outcome !== "fallback-opened") {
        result = { stream: null, outcome: "fallback-denied", detail: "O dispositivo selecionado nao respondeu." };
      }
    }
    return result;
  }
  return attempt({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }, "opened");
}

export function closeCamera(stream) {
  if (!stream) return;
  try { stream.getTracks().forEach((track) => track.stop()); } catch (e) {}
}
