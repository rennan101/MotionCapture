import type { CanonicalPose } from "@motion-forge/pose";
import type { CanonicalPointName, RestBoneData, RestPoseData, RigBoneBinding } from "./rig-bindings.js";
import {
  add3,
  len3,
  normalize3,
  quatFromFrameBasis,
  quatInvert,
  quatMultiply,
  quatNormalize,
  quatSlerp,
  scale3,
  sub3,
  type Quat,
  type Vec3,
} from "./quat.js";
import { BoneStabilizer, PointOutlierGate } from "./stability.js";
import { applyHingeClamp, buildHingeSetups, FootGroundLock, type FootGroundLockOptions, type HingeSetup } from "./ik.js";
export type { FootGroundLockOptions };

/** How the canonical pose maps into rig space (mediapipe-mapper convention). */
export interface CanonicalAxisMapping {
  x: 1 | -1;
  y: 1 | -1;
  z: 1 | -1;
  /** Applied to every coordinate after axis flips. */
  scale: number;
}

/** Default matches mapMediaPipeToCanonical: [x, -y, -z], meters, y-up, -z forward. */
export const DEFAULT_AXIS_MAPPING: CanonicalAxisMapping = { x: 1, y: -1, z: -1, scale: 1 };

export interface RetargetOptions {
  /**
   * Legacy fixed smoothing (0 = instant, 1 = frozen). When omitted, adaptive
   * smoothing from the stabilizer is used instead. Default: adaptive.
   */
  smoothing?: number;
  /** Skip bones whose driving segment confidence is below this. Default 0.25. */
  minConfidence?: number;
  /** Outlier gate: max plausible inter-frame point motion (meters). Default 1.2. */
  maxPointJumpMeters?: number;
  /** Stabilizer options (adaptive smoothing, jump rejection, hysteresis). */
  stabilizer?: {
    baseSmoothing?: number;
    velocitySmoothingGain?: number;
    jumpSmoothing?: number;
    jumpThresholdDeg?: number;
    velocitySaturationDeg?: number;
    reacquireMargin?: number;
  };
  /** Knee flexion clamp in degrees. Default [0, 150]. */
  kneeLimit?: [number, number];
  /** Elbow flexion clamp in degrees. Default [0, 160]. */
  elbowLimit?: [number, number];
  /** Foot ground lock options; `false` disables it entirely. */
  footLock?: { groundHeight?: number; maxPlantedSpeed?: number; hipsCompensation?: number } | false;
}

export interface RetargetResult {
  /** Local rotations per bound bone name. */
  localRotations: Record<string, Quat>;
  /** World-space hips position (rig space) for the rig root. */
  hipsWorldPosition: Vec3;
  /** Bones skipped this frame (missing rest data or low confidence). */
  skipped: string[];
  /** Canonical points rejected as teleports this frame. */
  rejectedPoints: string[];
  /** Bones currently held by confidence hysteresis. */
  held: string[];
  /** Bones clamped by a hinge limit this frame. */
  clamped: string[];
}

type PosePoint = { position: [number, number, number]; confidence: number };
type PoseKey = CanonicalPointName;

const ALL_POINTS: PoseKey[] = [
  "root", "pelvis", "spine", "chest", "neck", "head",
  "leftShoulder", "leftUpperArm", "leftLowerArm", "leftHand",
  "rightShoulder", "rightUpperArm", "rightLowerArm", "rightHand",
  "leftUpperLeg", "leftLowerLeg", "leftFoot",
  "rightUpperLeg", "rightLowerLeg", "rightFoot",
];

/** Canonical structural depth, used to solve parents before children. */
const STRUCTURAL_DEPTH: Partial<Record<CanonicalPointName, number>> = {
  pelvis: 0,
  spine: 1,
  chest: 2,
  neck: 3,
  head: 4,
  leftShoulder: 3,
  rightShoulder: 3,
  leftUpperArm: 4,
  rightUpperArm: 4,
  leftLowerArm: 5,
  rightLowerArm: 5,
  leftHand: 6,
  rightHand: 6,
  leftUpperLeg: 1,
  rightUpperLeg: 1,
  leftLowerLeg: 2,
  rightLowerLeg: 2,
  leftFoot: 3,
  rightFoot: 3,
};

/** Canonical structural parent, used for parent-chain discovery. */
const STRUCTURAL_PARENT: Partial<Record<CanonicalPointName, CanonicalPointName>> = {
  spine: "pelvis",
  chest: "spine",
  neck: "chest",
  head: "neck",
  leftShoulder: "chest",
  rightShoulder: "chest",
  leftUpperArm: "leftShoulder",
  rightUpperArm: "rightShoulder",
  leftLowerArm: "leftUpperArm",
  rightLowerArm: "rightUpperArm",
  leftHand: "leftLowerArm",
  rightHand: "rightLowerArm",
  leftUpperLeg: "pelvis",
  rightUpperLeg: "pelvis",
  leftLowerLeg: "leftUpperLeg",
  rightLowerLeg: "rightUpperLeg",
  leftFoot: "leftLowerLeg",
  rightFoot: "rightLowerLeg",
};

/** Rest-derived reference data one hinge needs (built once per solve pass). */
interface HingeRuntime {
  setup: HingeSetup;
}

/**
 * Direction + roll retarget solver with the Sprint 7 stability layers:
 *
 * 1. Point outlier gate   — teleport glitches are clamped to last-frame pos.
 * 2. Spine distribution   — multi-bone spine chains share one canonical bend.
 * 3. Per-bone stabilizer  — adaptive smoothing + jump rejection + confidence
 *                           hysteresis.
 * 4. Hinge joint limits   — elbows/knees can't hyperextend or invert.
 * 5. Foot ground lock     — planted feet don't slide; hips absorb the delta.
 *
 * Core math is unchanged from Sprint 6: for each bound bone, solve the
 * rotation that maps its rest reference frame onto the segment frame built
 * from the canonical pose, then convert the target world rotation into a
 * local rotation relative to the already-solved parent.
 */
export class RetargetSolver {
  private readonly bindings: RigBoneBinding[];
  private readonly rest: RestPoseData;
  private readonly legacySmoothing: number | undefined;
  private readonly minConfidence: number;
  private readonly parentOf: Record<string, string | null> = {};
  private readonly chainMembers: Record<string, RigBoneBinding[]> = {};
  private readonly stabilizer: BoneStabilizer;
  private readonly pointGate: PointOutlierGate;
  private readonly hinges: HingeRuntime[];
  private readonly footLock: FootGroundLock | null;
  private current: Record<string, Quat> = {};

  constructor(bindings: RigBoneBinding[], rest: RestPoseData, options: RetargetOptions = {}) {
    if (bindings.length === 0) throw new Error("RetargetSolver requires at least one binding");
    if (!rest.bones || Object.keys(rest.bones).length === 0) {
      throw new Error("RestPoseData has no bones — capture the rest pose before solving");
    }
    this.rest = rest;
    this.legacySmoothing = options.smoothing;
    this.minConfidence = options.minConfidence ?? 0.25;
    this.bindings = [...bindings].sort(
      (a, b) => (STRUCTURAL_DEPTH[a.canonical] ?? 99) - (STRUCTURAL_DEPTH[b.canonical] ?? 99),
    );
    for (const binding of this.bindings) {
      this.parentOf[binding.boneName] = this.findParentName(binding);
      const chain = binding.chain;
      if (chain) {
        (this.chainMembers[chain] ??= []).push(binding);
      }
    }
    this.stabilizer = new BoneStabilizer(options.stabilizer);
    this.pointGate = new PointOutlierGate({ maxJumpMeters: options.maxPointJumpMeters });
    this.hinges = buildHingeSetups(this.rest.bones, {
      hips: "hip",
      spineTop: "spine_03",
      upperArmL: "upperarm_l",
      lowerArmL: "lowerarm_l",
      upperArmR: "upperarm_r",
      lowerArmR: "lowerarm_r",
      upperLegL: "upperleg_l",
      lowerLegL: "lowerleg_l",
      upperLegR: "upperleg_r",
      lowerLegR: "lowerleg_r",
    }, {
      kneeFlexDeg: options.kneeLimit?.[1],
      kneeHyperDeg: options.kneeLimit?.[0] !== undefined ? Math.abs(options.kneeLimit[0]) : undefined,
      elbowFlexDeg: options.elbowLimit?.[1],
      elbowHyperDeg: options.elbowLimit?.[0] !== undefined ? Math.abs(options.elbowLimit[0]) : undefined,
    }).map((setup) => ({ setup }));
    this.footLock =
      options.footLock === false
        ? null
        : new FootGroundLock(options.footLock ?? {});
  }

  /**
   * Solve one frame.
   *
   * @param pose      canonical pose (mapper convention: y-up, -z forward,
   *                  hip-centered — MediaPipe world-landmark convention)
   * @param axisMap   how canonical coordinates map into rig space
   * @param hipsScale scales the mapped pelvis position into rig units
   */
  solve(
    pose: CanonicalPose,
    axisMap: CanonicalAxisMapping = DEFAULT_AXIS_MAPPING,
    hipsScale = 1,
  ): RetargetResult {
    const mapped = {} as Record<PoseKey, PosePoint>;
    for (const k of ALL_POINTS) {
      const p = pose[k] as PosePoint | undefined;
      if (!p) continue;
      mapped[k] = {
        position: [
          p.position[0] * axisMap.x * axisMap.scale,
          p.position[1] * axisMap.y * axisMap.scale,
          p.position[2] * axisMap.z * axisMap.scale,
        ],
        confidence: p.confidence,
      };
    }

    // Layer 1: reject teleport glitches before any rotation math.
    const gate = this.pointGate.filter(mapped);
    const points = gate.points as Record<PoseKey, PosePoint>;
    const skipped: string[] = [];
    const held: string[] = [];
    const clamped: string[] = [];

    // Layer 1b: foot ground lock — a POSITIONAL constraint, so it must run
    // before the solve loop: pinned foot points drive the leg rotations and
    // the resulting hips offset keeps the rig from stretching. Canonical
    // points are hip-centered, so "near the ground" is evaluated relative to
    // the hips world position (pelvis + rest height).
    let hipsWorldPosition = add3(
      scale3(points["pelvis"].position, hipsScale),
      [0, this.rest.hipsRestY, 0],
    );
    let hipsFootOffset: Vec3 = [0, 0, 0];
    if (this.footLock) {
      const groundY = hipsWorldPosition[1] - this.rest.hipsRestY;
      const locked = this.footLock.apply(
        {
          leftFoot: add3(points["leftFoot"].position, [0, groundY, 0]),
          rightFoot: add3(points["rightFoot"].position, [0, groundY, 0]),
        },
        hipsWorldPosition,
      );
      points["leftFoot"] = { position: sub3(locked.feet.leftFoot, [0, groundY, 0]), confidence: points["leftFoot"].confidence };
      points["rightFoot"] = { position: sub3(locked.feet.rightFoot, [0, groundY, 0]), confidence: points["rightFoot"].confidence };
      hipsFootOffset = locked.hipsOffset;
    }

    // Precompute chain distribution weights: total bend across the chain is
    // split as 1/N for each link (equal distribution; believable and cheap).
    const chainWeights = new Map<string, number>();
    for (const [chain, members] of Object.entries(this.chainMembers)) {
      void chain;
      const w = 1 / members.length;
      for (const m of members) chainWeights.set(m.boneName, w);
    }

    const localRotations: Record<string, Quat> = {};
    const worldRots: Record<string, Quat> = {};
    const confByBone: Record<string, number> = {};

    for (const binding of this.bindings) {
      const restBone = this.rest.bones[binding.boneName];
      if (!restBone) {
        skipped.push(binding.boneName);
        continue;
      }
      const parentName = this.parentOf[binding.boneName];
      const parentWorld = parentName ? worldRots[parentName] : undefined;
      if (parentName && !parentWorld) {
        skipped.push(binding.boneName);
        continue;
      }

      const segA = points[binding.primary[0]];
      const segB = points[binding.primary[1]];
      const rollA = points[binding.secondary[0]];
      const rollB = points[binding.secondary[1]];
      if (!segA || !segB || !rollA || !rollB) {
        skipped.push(binding.boneName);
        continue;
      }
      const conf = Math.min(segA.confidence, segB.confidence, rollA.confidence, rollB.confidence);
      confByBone[binding.boneName] = conf;
      const segLen = len3(sub3(segB.position, segA.position));
      const rollLen = len3(sub3(rollB.position, rollA.position));

      if (conf < this.minConfidence || segLen < 1e-6 || rollLen < 1e-6) {
        this.holdCurrent(binding, restBone, parentWorld, localRotations, worldRots, skipped);
        continue;
      }

      const primaryTarget = normalize3(sub3(segB.position, segA.position));
      const rollTarget = normalize3(sub3(rollB.position, rollA.position));
      const targetWorld = quatFromFrameBasis(
        restBone.primaryLocal,
        restBone.secondaryLocal,
        primaryTarget,
        rollTarget,
      );

      let local = parentWorld
        ? quatNormalize(quatMultiply(quatInvert(parentWorld), targetWorld))
        : quatNormalize(targetWorld);

      // Spine distribution: chain links solve against their parent normally,
      // but their contribution is damped so the bend spreads across the chain.
      const chainWeight = chainWeights.get(binding.boneName);
      if (chainWeight !== undefined) {
        // Blend the solved local toward THIS bone's own rest local by the
        // chain weight: each of N links takes ~1/N of the bend, so the spine
        // curves smoothly instead of kinking at the first link.
        local = quatSlerp(restBone.localRot, local, chainWeight);
      }

      localRotations[binding.boneName] = local;
      worldRots[binding.boneName] = parentWorld
        ? quatMultiply(parentWorld, local)
        : local;
    }

    // Layer 2: temporal stabilization.
    // - Explicit `smoothing` = deterministic fixed smoothing (Sprint 6
    //   behavior; used by tests and anyone who wants a known transfer
    //   function). The adaptive stabilizer is disabled entirely.
    // - No `smoothing` = Sprint 7 adaptive layers: per-bone stabilizer with
    //   velocity-adaptive damping, outlier rejection, confidence hysteresis.
    const stabilized: Record<string, Quat> = {};
    for (const binding of this.bindings) {
      const restBone = this.rest.bones[binding.boneName];
      const raw = localRotations[binding.boneName];
      if (!restBone || !raw) continue;
      if (this.legacySmoothing !== undefined) {
        const prev = this.current[binding.boneName] ?? restBone.localRot;
        stabilized[binding.boneName] = quatSlerp(prev, raw, 1 - this.legacySmoothing);
        continue;
      }
      const conf = confByBone[binding.boneName] ?? 0;
      const out = this.stabilizer.stabilize(
        binding.boneName,
        raw,
        restBone.localRot,
        conf,
        this.minConfidence,
      );
      stabilized[binding.boneName] = out.rotation;
      if (out.held) held.push(binding.boneName);
    }

    // Recompute world rotations from the stabilized locals (children must
    // inherit stabilized parents; hinge clamps operate on world rotations).
    const stableWorld: Record<string, Quat> = {};
    for (const binding of this.bindings) {
      const parentName = this.parentOf[binding.boneName];
      const parentWorld = parentName ? stableWorld[parentName] : undefined;
      const local = stabilized[binding.boneName];
      if (!local) continue;
      stableWorld[binding.boneName] = parentWorld
        ? quatMultiply(parentWorld, local)
        : local;
    }

    // Layer 3: hinge joint limits (elbows/knees) on world rotations.
    for (const { setup } of this.hinges) {
      const before = worldRots[setup.boneName];
      applyHingeClamp(setup, stableWorld, this.rest.bones);
      if (before && stableWorld[setup.boneName] && quatAngleDegOpt(stableWorld[setup.boneName], before) > 0.1) {
        clamped.push(setup.boneName);
      }
    }

    // Convert clamped world rotations back to local, relative to stabilized
    // parents (clamps only ever touch the mid-segment bone itself).
    for (const { setup } of this.hinges) {
      const corrected = stableWorld[setup.boneName];
      if (!corrected) continue;
      const parentName = this.parentOf[setup.boneName];
      const parentWorld = parentName ? stableWorld[parentName] : undefined;
      const local = parentWorld
        ? quatNormalize(quatMultiply(quatInvert(parentWorld), corrected))
        : corrected;
      stabilized[setup.boneName] = local;
      this.current[setup.boneName] = local;
    }

    // Commit stabilized locals as the new history.
    for (const [name, q] of Object.entries(stabilized)) {
      this.current[name] = q;
    }

    // Hips position: the pelvis target plus the foot-lock compensation (the
    // lock itself ran pre-solve as layer 1b).
    hipsWorldPosition = add3(hipsWorldPosition, hipsFootOffset);

    return { localRotations: stabilized, hipsWorldPosition, skipped, rejectedPoints: gate.rejected, held, clamped };
  }

  /** Drop smoothing history (e.g. on capture stop). */
  reset(): void {
    this.current = {};
    this.stabilizer.reset();
    this.pointGate.reset();
    this.footLock?.reset();
  }

  /** Exposed for apps that want to blend results themselves. */
  getCurrentRotations(): Record<string, Quat> {
    return { ...this.current };
  }

  private holdCurrent(
    binding: RigBoneBinding,
    restBone: RestBoneData,
    parentWorld: Quat | undefined,
    localRotations: Record<string, Quat>,
    worldRots: Record<string, Quat>,
    skipped: string[],
  ): void {
    const held = this.current[binding.boneName] ?? restBone.localRot;
    localRotations[binding.boneName] = held;
    worldRots[binding.boneName] = parentWorld ? quatMultiply(parentWorld, held) : held;
    skipped.push(binding.boneName);
  }

  /**
   * Rig-parent of a binding's bone, discovered from the rest snapshot's
   * structural table: the closest already-ordered binding whose canonical
   * bone is the structural parent.
   */
  private findParentName(binding: RigBoneBinding): string | null {
    const parentCanonical = STRUCTURAL_PARENT[binding.canonical];
    if (!parentCanonical) return null;
    // Find the binding with the same depth that binds this canonical parent,
    // choosing the last one (deepest chain link, e.g. spine_03 for chest).
    let best: RigBoneBinding | undefined;
    for (const cand of this.bindings) {
      if (cand === binding) continue;
      if (cand.canonical === parentCanonical) best = cand;
      if (best === cand) break;
    }
    return best ? best.boneName : null;
  }
}

function quatAngleDegOpt(a: Quat | undefined, b: Quat | undefined): number {
  if (!a || !b) return 0;
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d)) * (180 / Math.PI);
}
