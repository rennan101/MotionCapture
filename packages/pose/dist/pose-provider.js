export const PROVIDER_IDS = [
    "auto",
    "mediapipe",
    "rtmpose",
    "nvidia",
    "custom",
    "unknown",
];
export class PoseProviderRegistry {
    options;
    providers = new Map();
    constructor(options) {
        this.options = options;
    }
    register(metadata) {
        this.providers.set(metadata.id, metadata);
    }
    getAvailable() {
        return Array.from(this.providers.values());
    }
    /// Return the real provider id the pipeline should use.
    /// Explicit selections must be registered and available.
    /// `Auto` must be resolved by the registry, not by the consumer.
    resolveSelection(selection) {
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
    getMetadata(id) {
        return this.providers.get(id);
    }
}
export * from "./mediapipe-mapper.js";
//# sourceMappingURL=pose-provider.js.map