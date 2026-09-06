export type ProviderId = "auto" | "mediapipe" | "rtmpose" | "nvidia" | "custom" | "unknown";
export type Platform = "web" | "macos" | "windows" | "linux";
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
export interface PoseProviderAsync {
    initialize(config?: Record<string, unknown>): Promise<void>;
    supportsPlatform(platform: Platform): boolean;
    startCapture(source: CaptureSource): Promise<void>;
    processFrame(frame: FrameData): Promise<PoseResult>;
    stopCapture(): Promise<void>;
    dispose(): Promise<void>;
}
export interface CaptureSource {
    type: "webcam";
    deviceId?: string;
}
export interface FrameData {
    type: "video";
    timestamp: number;
    data?: unknown;
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
export interface PoseProviderRegistryOptions {
    platform: Platform;
    defaultProvider?: ProviderId;
    availableProviders?: ProviderId[];
}
export declare class PoseProviderRegistry {
    private readonly options;
    private providers;
    constructor(options: PoseProviderRegistryOptions);
    register(metadata: ProviderMetadata): void;
    getAvailable(): ProviderMetadata[];
    resolveSelection(selection: ProviderId): ProviderId;
    getMetadata(id: ProviderId): ProviderMetadata | undefined;
}
//# sourceMappingURL=pose-provider.d.ts.map