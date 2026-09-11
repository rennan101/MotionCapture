import * as THREE from "three";
import { UE5_RIG_BINDINGS } from "@motion-forge/retarget";

export function bakeClipToTracks(clip, rest, options = {}) {
  const smoothing = options.smoothing ?? 0;
  const tracks = [];
  
  if (!rest) {
    // Fallback: create synthetic identity rig
    return tracks;
  }
  
  // Create quaternion keyframe tracks for each bone
  for (const [boneName, boneData] of Object.entries(rest.bones)) {
    const times = [];
    const values = [];
    
    clip.frames.forEach((frame, i) => {
      times.push(frame.timestamp);
      // Get the bone's rotation from the frame
      const rot = frame.canonical.bones?.[boneName] || [0, 0, 0, 1];
      values.push(rot[0], rot[1], rot[2], rot[3]);
    });
    
    if (times.length > 1) {
      const track = new THREE.QuaternionKeyframeTrack("." + boneName + "quaternion", times, values);
      tracks.push(track);
    }
  }
  
  return tracks;
}

export function createSyntheticRest() {
  const bones = {};
  for (const binding of UE5_RIG_BINDINGS) {
    bones[binding.boneName] = {
      worldPos: [0, 0, 0],
      worldRot: [0, 0, 0, 1],
      localRot: [0, 0, 0, 1],
    };
  }
  return { bones, missing: [] };
}
