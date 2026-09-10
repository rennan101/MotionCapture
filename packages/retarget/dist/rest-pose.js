import { normalize3, rotateVec, quatInvert, sub3 } from "./quat.js";
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
export function captureRestPose(snapshots, bindings, anchors, hipsBone) {
    const byName = new Map();
    for (const s of snapshots)
        byName.set(s.name, s);
    const anchorPos = new Map();
    const anchorMissing = [];
    for (const [point, boneName] of Object.entries(anchors)) {
        const snap = byName.get(boneName);
        if (snap) {
            anchorPos.set(point, snap.worldPos);
        }
        else {
            anchorMissing.push(boneName);
        }
    }
    const bones = {};
    const missing = [...anchorMissing];
    const anchorDir = (seg) => {
        const a = anchorPos.get(seg[0]);
        const b = anchorPos.get(seg[1]);
        if (!a || !b)
            return null;
        const d = sub3(b, a);
        const n = normalize3(d);
        return n[0] === 0 && n[1] === 0 && n[2] === 0 ? null : n;
    };
    for (const binding of bindings) {
        const snap = byName.get(binding.boneName);
        if (!snap) {
            missing.push(binding.boneName);
            continue;
        }
        const primaryWorld = anchorDir(binding.primary);
        const secondaryWorld = anchorDir(binding.secondary);
        if (!primaryWorld || !secondaryWorld) {
            missing.push(binding.boneName);
            continue;
        }
        const invWorld = quatInvert(snap.worldRot);
        const primaryLocal = normalize3(rotateVec(invWorld, primaryWorld));
        const secondaryLocal = normalize3(rotateVec(invWorld, secondaryWorld));
        bones[binding.boneName] = {
            name: snap.name,
            worldPos: snap.worldPos,
            worldRot: snap.worldRot,
            localRot: snap.localRot,
            primaryLocal,
            secondaryLocal,
        };
    }
    const hips = byName.get(hipsBone);
    return {
        bones,
        missing,
        hipsRestY: hips ? hips.worldPos[1] : 1,
    };
}
//# sourceMappingURL=rest-pose.js.map