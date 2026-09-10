import type { CanonicalAnchorMap, RestPoseData, RigBoneBinding } from "./rig-bindings.js";
import { type Quat, type Vec3 } from "./quat.js";
/** Pure-data snapshot of one rig bone at rest (bind/T-pose). */
export interface RestBoneSnapshot {
    name: string;
    /** World-space position at rest, rig space. */
    worldPos: Vec3;
    /** World-space rotation at rest, rig space. */
    worldRot: Quat;
    /** Local rotation at rest (what the engine stores on the bone). */
    localRot: Quat;
}
/**
 * Builds the solver's rest data from plain bone snapshots.
 *
 * The snapshots come from any scene graph: the caller decomposes world
 * matrices with its own engine math (e.g. three.js `getWorldPosition` +
 * `getWorldQuaternion`) and passes the results in. Segment directions are
 * derived from the anchor map: the direction between the rest origins of the
 * two anchor bones of each reference segment.
 *
 * @param snapshots rest-pose snapshot of every rig bone of interest
 * @param bindings  the rig bindings in use
 * @param anchors   canonical-point → rig-bone-origin map
 * @param hipsBone  name of the hips/root bone (for grounding)
 */
export declare function captureRestPose(snapshots: RestBoneSnapshot[], bindings: RigBoneBinding[], anchors: CanonicalAnchorMap, hipsBone: string): RestPoseData;
//# sourceMappingURL=rest-pose.d.ts.map