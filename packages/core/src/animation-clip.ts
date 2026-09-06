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

export function createAnimationClip(
  name: string,
  id: string,
  sampleRate = 30,
): AnimationClip {
  return {
    name,
    id: id || name + "-" + Date.now(),
    startTime: 0,
    duration: 0,
    sampleRate,
    tracks: [],
    metadata: {},
  };
}
