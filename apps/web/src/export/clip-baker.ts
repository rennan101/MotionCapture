import * as THREE from "three";
import type { CanonicalPose, MotionClip } from "@motion-forge/pose";
import {
  DEFAULT_AXIS_MAPPING,
  RetargetSolver,
  captureRestPose,
  UE5_CANONICAL_ANCHOR_BONES,
  UE5_RIG_BINDINGS,
  type RestPoseData,
} from "@motion-forge/retarget";

/**
 * Clip baker (Sprint 9): turns a recorded MotionClip into
 * THREE.QuaternionKeyframeTrack / VectorKeyframeTrack data on the rig's own
 * bone names, ready for glTFExporter (GLB) or THREE.AnimationClip reuse.
 *
 * Uses the deterministic solve (fixed smoothing 0, no temporal state) so
 * baking is reproducible and frame-accurate: export must not depend on when
 * the user pressed record, and baking N times yields the same result.
 *
 * Hips translation is baked as a POSITION track on the hips bone in the rest
 * skeleton's world space (meters) — the same space the exported GLB skeleton
 * is built from, so the track drives it directly. (The live viewport instead
 * converts to the hips parent's pre-scale local space; that conversion is FBX
 * specific and must NOT be baked into the glTF.)
 */

export interface BakeOptions {
  /**
   * Rest data to solve against. Prefer passing the same RestPoseData the
   * live viewport captured (via onRetargetReady) so the export matches the
   * animation the user saw. When omitted, a synthetic identity T-pose rig is
   * used — still valid, just not aligned to a specific character.
   */
  rest?: RestPoseData | null;
}

export interface BakeResult {
  clip: THREE.AnimationClip;
  /** Rest data the tracks were solved against (drives the GLB skeleton). */
  rest: RestPoseData;
  diagnostics: {
    boneCount: number;
    frameCount: number;
    durationSec: number;
    hipTrackName: string;
  };
}

function makeSolver(restOverride?: RestPoseData | null): {
  solver: RetargetSolver;
  rest: RestPoseData;
} {
  // Rest snapshot: prefer the caller-provided rest (identical to the live
  // viewport); otherwise build a synthetic identity rig from the canonical
  // anchor bones.
  if (restOverride) {
    const solver = new RetargetSolver(UE5_RIG_BINDINGS, restOverride, { smoothing: 0 });
    return { solver, rest: restOverride };
  }

  const snapshots: {
    name: string;
    worldPos: [number, number, number];
    worldRot: [number, number, number, number];
    localRot: [number, number, number, number];
  }[] = [];

  {
    // Synthetic identity rig at plausible T-pose positions (meters), so the
    // solver has consistent rest data without a loaded character.
    const T: Record<string, [number, number, number]> = {
      hip: [0, 1.0, 0],
      spine_01: [0, 1.1, 0],
      spine_02: [0, 1.2, 0],
      spine_03: [0, 1.3, 0],
      neck: [0, 1.45, 0],
      head: [0, 1.6, 0],
      shoulder_l: [-0.2, 1.42, 0],
      upperarm_l: [-0.22, 1.42, 0],
      lowerarm_l: [-0.52, 1.42, 0],
      hand_l: [-0.75, 1.42, 0],
      shoulder_r: [0.2, 1.42, 0],
      upperarm_r: [0.22, 1.42, 0],
      lowerarm_r: [0.52, 1.42, 0],
      hand_r: [0.75, 1.42, 0],
      upperleg_l: [-0.12, 0.95, 0],
      lowerleg_l: [-0.12, 0.52, 0],
      foot_l: [-0.12, 0.1, 0],
      upperleg_r: [0.12, 0.95, 0],
      lowerleg_r: [0.12, 0.52, 0],
      foot_r: [0.12, 0.1, 0],
    };
    for (const [name, worldPos] of Object.entries(T)) {
      snapshots.push({ name, worldPos, worldRot: [0, 0, 0, 1], localRot: [0, 0, 0, 1] });
    }
  }

  const rest = captureRestPose(snapshots, UE5_RIG_BINDINGS, UE5_CANONICAL_ANCHOR_BONES, "hip");
  const solver = new RetargetSolver(UE5_RIG_BINDINGS, rest, { smoothing: 0 });
  return { solver, rest };
}

export function bakeClipToTracks(clip: MotionClip, options: BakeOptions = {}): BakeResult {
  const frames = clip.frames;
  if (frames.length === 0) throw new Error("Cannot bake an empty clip");

  const { solver, rest } = makeSolver(options.rest);

  const times = new Float32Array(frames.length);
  const boneQuats = new Map<string, Float32Array>();
  const hipPositions: Float32Array = new Float32Array(frames.length * 3);

  frames.forEach((pose: CanonicalPose, i) => {
    const result = solver.solve(pose, DEFAULT_AXIS_MAPPING, 1);
    times[i] = pose.timestamp / 1000;

    for (const [boneName, localQuat] of Object.entries(result.localRotations)) {
      let arr = boneQuats.get(boneName);
      if (!arr) {
        arr = new Float32Array(frames.length * 4);
        boneQuats.set(boneName, arr);
      }
      arr[i * 4 + 0] = localQuat[0];
      arr[i * 4 + 1] = localQuat[1];
      arr[i * 4 + 2] = localQuat[2];
      arr[i * 4 + 3] = localQuat[3];
    }

    // Hip translation in the rest skeleton's world space (meters) — drives
    // the exported GLB skeleton directly, no conversion needed.
    hipPositions[i * 3 + 0] = result.hipsWorldPosition[0];
    hipPositions[i * 3 + 1] = result.hipsWorldPosition[1];
    hipPositions[i * 3 + 2] = result.hipsWorldPosition[2];
  });

  const tracks: THREE.KeyframeTrack[] = [];
  for (const [boneName, values] of boneQuats) {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values));
  }
  const hipTrackName = "hip.position";
  tracks.push(new THREE.VectorKeyframeTrack(hipTrackName, times, hipPositions));

  const durationSec = frames[frames.length - 1].timestamp / 1000;
  const animClip = new THREE.AnimationClip(
    clip.metadata.name || "motion-forge-clip",
    durationSec,
    tracks,
  );

  return {
    clip: animClip,
    rest,
    diagnostics: {
      boneCount: boneQuats.size,
      frameCount: frames.length,
      durationSec,
      hipTrackName,
    },
  };
}
