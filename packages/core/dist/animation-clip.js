export function createAnimationClip(name, id, sampleRate = 30) {
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
//# sourceMappingURL=animation-clip.js.map