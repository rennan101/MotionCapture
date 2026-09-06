export interface AnimationClipTrack {
    bone: string;
    positions?: Float32Array;
    orientations?: Float32Array;
    sampleRate: number;
}
export interface AnimationClip {
    name: string;
    id: string;
    startTime: number;
    duration: number;
    sampleRate: number;
    tracks: AnimationClipTrack[];
    metadata: Record<string, string>;
}
export declare function createAnimationClip(name: string, id: string, sampleRate?: number): AnimationClip;
//# sourceMappingURL=animation-clip.d.ts.map