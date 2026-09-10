import {
  clamp,
  cross3,
  dot3,
  len3,
  normalize3,
  quatInvert,
  quatMultiply,
  quatNormalize,
  rotateVec,
  scale3,
  sub3,
  type Quat,
  type Vec3,
} from "./quat.js";

/**
 * Basic IK / joint-limit layer (Sprint 7 scope: believable, not exact).
 *
 * - HingeJointLimiter: constrains elbow/knee flexion to a plausible hinge
 *   range, removing the rubber-limb look of raw direction retargeting.
 * - FootGroundLock: while a foot is near the ground and moving slowly, pins
 *   the hips so planted feet don't slide (classic "root compensation").
 */

/** Identifies one hinge joint (elbow or knee) on a side. */
export type HingeJointId = "leftElbow" | "rightElbow" | "leftKnee" | "rightKnee";

export interface HingeLimit {
  /**
   * Flexion range in degrees around the hinge axis. The NATURAL side
   * (knee: heel back; elbow: hand forward, per side) gets the wide range
   * [−hyperMax, +flexMax] or its mirror, derived per joint from the rig's
   * rest data — never hard-coded per side.
   */
  minDeg: number;
  /** Max flexion in degrees (see minDeg). */
  maxDeg: number;
  /**
   * The hinge axis in the PARENT bone's rest LOCAL frame — flexion rotates
   * around this axis. Anatomically this is the transepicondylar axis: the
   * parent bone's roll reference, which is ⊥ to the limb at rest and stays
   * ⊥ in every pose because it rotates with the parent.
   */
  parentAxisLocal: Vec3;
  /** +1 when natural flexion measures positive around the axis, −1 otherwise. */
  naturalSign: 1 | -1;
}

export interface HingeSetup {
  joint: HingeJointId;
  /** The mid-segment bone (lowerarm / lowerleg binding boneName). */
  boneName: string;
  /** The parent chain bone (upperarm / upperleg binding boneName). */
  parentBoneName: string;
  limit: HingeLimit;
}

/**
 * Builds hinge setups for a bound rig. Everything is derived from the rest
 * data — no per-side hard-coding:
 *
 * - Axis (in the PARENT's rest local frame) = limb direction × body forward.
 *   This is the anatomical transepicondylar axis: ⊥ to the limb and ⊥ to
 *   the flexion plane, valid for a hanging arm AND a T-pose arm (a roll
 *   reference like the spine direction would be parallel to a hanging limb
 *   and degenerate). Because the axis is fixed in the parent frame it stays
 *   ⊥ to the limb in every pose.
 * - The natural-flexion side is derived by asking which rotation direction
 *   around the axis carries the limb toward the body's forward vector
 *   (elbow) or away from it (knee). The body forward is reconstructed from
 *   the rest world positions (hip line × spine-up).
 */
export function buildHingeSetups(
  restBones: Record<
    string,
    { worldPos: Vec3; worldRot: Quat; primaryLocal: Vec3; secondaryLocal: Vec3; localRot: Quat }
  >,
  boneNames: {
    hips: string;
    spineTop: string;
    upperArmL: string;
    lowerArmL: string;
    upperArmR: string;
    lowerArmR: string;
    upperLegL: string;
    lowerLegL: string;
    upperLegR: string;
    lowerLegR: string;
  },
  options: {
    kneeFlexDeg?: number;
    kneeHyperDeg?: number;
    elbowFlexDeg?: number;
    elbowHyperDeg?: number;
  } = {},
): HingeSetup[] {
  const kneeFlexDeg = options.kneeFlexDeg ?? 150;
  const kneeHyperDeg = options.kneeHyperDeg ?? 5;
  const elbowFlexDeg = options.elbowFlexDeg ?? 160;
  const elbowHyperDeg = options.elbowHyperDeg ?? 5;

  const hips = restBones[boneNames.hips];
  const spineTop = restBones[boneNames.spineTop];
  const upperLegL = restBones[boneNames.upperLegL];
  const upperLegR = restBones[boneNames.upperLegR];
  if (!hips || !spineTop || !upperLegL || !upperLegR) return [];

  // Body forward in rig space: hip line (left→right) × spine up. For a
  // y-up rig facing +Z with left at −X: (+X) × (+Y) = +Z ✓.
  const upWorld = normalize3(sub3(spineTop.worldPos, hips.worldPos));
  const hipLineWorld = normalize3(sub3(upperLegR.worldPos, upperLegL.worldPos));
  if (len3(upWorld) < 1e-6 || len3(hipLineWorld) < 1e-6) return [];
  const forwardWorld = normalize3(cross3(hipLineWorld, upWorld));

  const makeSetup = (
    joint: HingeJointId,
    upperName: string,
    lowerName: string,
    flexMax: number,
    hyperMax: number,
    towardForward: boolean,
  ): HingeSetup | null => {
    const upper = restBones[upperName];
    if (!upper) return null;
    // Limb direction in the parent's rest local frame (primaryLocal is
    // already stored in that frame).
    const primary = normalize3(upper.primaryLocal);
    // Body forward in the same frame.
    const fwd = normalize3(rotateVec(quatInvert(upper.worldRot), forwardWorld));
    // Hinge axis: limb × forward — ⊥ to the limb and to the flexion plane,
    // i.e. the anatomical transepicondylar axis, valid in any limb pose.
    const axis = normalize3(cross3(primary, fwd));
    if (len3(axis) < 1e-6) return null;
    // Natural direction: rotation around `axis` carrying the limb toward
    // (elbow) or away from (knee) the forward vector. With axis defined as
    // primary × fwd this is always +1 for elbows and −1 for knees, but we
    // derive it instead of assuming it.
    const target = towardForward ? fwd : scale3(fwd, -1);
    const handed = dot3(cross3(primary, target), axis);
    const naturalSign: 1 | -1 = handed >= 0 ? 1 : -1;
    return {
      joint,
      boneName: lowerName,
      parentBoneName: upperName,
      limit: {
        minDeg: naturalSign === 1 ? -hyperMax : -flexMax,
        maxDeg: naturalSign === 1 ? flexMax : hyperMax,
        parentAxisLocal: axis,
        naturalSign,
      },
    };
  };

  const setups: HingeSetup[] = [];
  const defs: [HingeJointId, string, string, number, number, boolean][] = [
    ["leftElbow", boneNames.upperArmL, boneNames.lowerArmL, elbowFlexDeg, elbowHyperDeg, true],
    ["rightElbow", boneNames.upperArmR, boneNames.lowerArmR, elbowFlexDeg, elbowHyperDeg, true],
    ["leftKnee", boneNames.upperLegL, boneNames.lowerLegL, kneeFlexDeg, kneeHyperDeg, false],
    ["rightKnee", boneNames.upperLegR, boneNames.lowerLegR, kneeFlexDeg, kneeHyperDeg, false],
  ];
  for (const [joint, upperName, lowerName, flexMax, hyperMax, towardForward] of defs) {
    const setup = makeSetup(joint, upperName, lowerName, flexMax, hyperMax, towardForward);
    if (setup) setups.push(setup);
  }
  return setups;
}

/**
 * Projects a mid-segment bone's world rotation so the child-segment flexion
 * relative to the parent segment stays inside [minDeg, maxDeg].
 *
 * Pure math: operates on world rotations and rest reference directions, so it
 * composes cleanly after the solver's per-bone pass.
 */
export function applyHingeClamp(
  setup: HingeSetup,
  worldRots: Record<string, Quat>,
  restBones: Record<string, { primaryLocal: Vec3 }>,
): void {
  const childWorld = worldRots[setup.boneName];
  const parentWorld = worldRots[setup.parentBoneName];
  if (!childWorld || !parentWorld) return;

  const rest = restBones[setup.boneName];
  if (!rest) return;

  // Parent segment direction in world (parent frame rest dir rotated out).
  const parentSegLocal = restBones[setup.parentBoneName]?.primaryLocal;
  if (!parentSegLocal) return;
  const parentSegWorld = rotateVec(parentWorld, parentSegLocal);
  const childSegWorld = rotateVec(childWorld, rest.primaryLocal);

  // Signed flexion angle around the hinge axis.
  const axisWorld = rotateVec(parentWorld, setup.limit.parentAxisLocal);
  const axisN = normalize3(axisWorld);
  if (len3(axisN) < 1e-6) return;

  // Component of each segment perpendicular to the hinge axis.
  const perp = (v: Vec3): Vec3 => {
    const d = axisN[0] * v[0] + axisN[1] * v[1] + axisN[2] * v[2];
    return normalize3([v[0] - axisN[0] * d, v[1] - axisN[1] * d, v[2] - axisN[2] * d]);
  };
  const a = perp(parentSegWorld);
  const b = perp(childSegWorld);
  if (len3(a) < 1e-6 || len3(b) < 1e-6) return;

  const cos = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
  let angle = Math.acos(cos);
  // Sign: positive when b is rotated from a around +axis.
  const cross: Vec3 = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  if (cross[0] * axisN[0] + cross[1] * axisN[1] + cross[2] * axisN[2] < 0) {
    angle = -angle;
  }

  const clampedDeg = clamp((angle * 180) / Math.PI, setup.limit.minDeg, setup.limit.maxDeg);
  if (Math.abs(clampedDeg - (angle * 180) / Math.PI) < 1e-3) return; // in range

  // Rotation that removes the excess flexion: rotate the child segment BACK
  // around the hinge axis by the signed overshoot (negative rotation for an
  // overshoot past max, positive to recover from hyperextension past min).
  const excessDeg = (angle * 180) / Math.PI - clampedDeg;
  const excess: Quat = axisAngleQuat(axisN, (-excessDeg * Math.PI) / 180);
  const correctedWorld = quatNormalize(quatMultiply(excess, childWorld));

  // Write back the corrected world rotation (converted to local by caller if
  // needed — here we update worldRots so later children inherit it).
  worldRots[setup.boneName] = correctedWorld;
}

/** Minimal axis-angle to quaternion. */
function axisAngleQuat(axis: Vec3, angleRad: number): Quat {
  const s = Math.sin(angleRad / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angleRad / 2)];
}

// ---------------------------------------------------------------------------
// Foot ground lock
// ---------------------------------------------------------------------------

export interface FootGroundLockOptions {
  /** Height below which a foot counts as "planted" (rig units). Default 0.09. */
  groundHeight?: number;
  /** Max foot speed to COUNT AS a new plant (m/frame). Default 0.02. */
  maxPlantedSpeed?: number;
  /** How strongly the hips absorb the foot correction (0..1). Default 0.6. */
  hipsCompensation?: number;
  /**
   * Pin distance above which the foot is considered lifted/teleported and
   * the lock re-plants at the new spot instead of stretching. Default 0.4.
   */
  maxPinStretch?: number;
}

interface FootLockState {
  planted: boolean;
  prevPos: Vec3 | null;
  /** Frames the foot has been planted (for release smoothing). */
  plantedFrames: number;
}

/**
 * Keeps planted feet from sliding: while a foot is near the ground and slow,
 * its world position is pinned and the resulting offset is partially absorbed
 * by the hips. This is a positional constraint evaluated on the CANONICAL
 * pose before solving, so the whole retarget chain inherits it.
 */
export class FootGroundLock {
  private readonly options: Required<FootGroundLockOptions>;
  private readonly feet: Record<"left" | "right", FootLockState> = {
    left: { planted: false, prevPos: null, plantedFrames: 0 },
    right: { planted: false, prevPos: null, plantedFrames: 0 },
  };

  constructor(options: FootGroundLockOptions = {}) {
    this.options = {
      groundHeight: options.groundHeight ?? 0.09,
      maxPlantedSpeed: options.maxPlantedSpeed ?? 0.02,
      hipsCompensation: options.hipsCompensation ?? 0.6,
      maxPinStretch: options.maxPinStretch ?? 0.4,
    };
  }

  /**
   * Applies foot pinning to the mapped canonical points and returns the hips
   * compensation offset to add to the hips world position.
   *
   * @param footPoints `{ leftFoot, rightFoot }` mapped positions (rig space)
   * @param hipsPos    current hips world position (rig space)
   */
  apply(
    footPoints: { leftFoot: Vec3; rightFoot: Vec3 },
    hipsPos: Vec3,
  ): { feet: { leftFoot: Vec3; rightFoot: Vec3 }; hipsOffset: Vec3 } {
    const feet = { leftFoot: footPoints.leftFoot, rightFoot: footPoints.rightFoot };
    const hipsOffset: Vec3 = [0, 0, 0];

    for (const side of ["left", "right"] as const) {
      const state = this.feet[side];
      const pos = side === "left" ? feet.leftFoot : feet.rightFoot;
      const speed = state.prevPos ? len3(sub3(pos, state.prevPos)) : 0;
      const nearGround = pos[1] <= this.options.groundHeight;

      if (state.planted) {
        if (!nearGround) {
          // Foot left the ground band: release the pin.
          state.planted = false;
          state.plantedFrames = 0;
        } else {
          // Keep pinning: apparent foot motion while planted means the HIPS
          // moved — that is exactly when the pin must hold. The delta is
          // absorbed by the hips so legs don't stretch visually.
          const pinned = state.prevPos!;
          const delta = sub3(pinned, pos);
          if (len3(delta) > this.options.maxPinStretch) {
            // Pin distance exploded (teleport/impossible pose): re-plant here.
            state.prevPos = pos;
            state.plantedFrames = 1;
            continue;
          }
          if (side === "left") feet.leftFoot = pinned;
          else feet.rightFoot = pinned;
          hipsOffset[0] += delta[0] * this.options.hipsCompensation;
          hipsOffset[2] += delta[2] * this.options.hipsCompensation;
          state.plantedFrames++;
          continue;
        }
      }

      // Candidate for planting.
      if (nearGround && speed < this.options.maxPlantedSpeed) {
        state.planted = true;
        state.plantedFrames = 1;
        // No immediate correction on the plant frame; from the next frame on
        // the foot stays pinned.
      }
      state.prevPos = pos;
    }

    return { feet, hipsOffset };
  }

  reset(): void {
    this.feet.left = { planted: false, prevPos: null, plantedFrames: 0 };
    this.feet.right = { planted: false, prevPos: null, plantedFrames: 0 };
  }
}
