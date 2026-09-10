/**
 * Minimal quaternion math for the retarget solver.
 *
 * Conventions: unit quaternions [x, y, z, w], right-handed.
 * Rotation of vector v by quaternion q: v' = q * v * q*
 */
export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];
export declare const quatIdentity: Quat;
export declare function quatMultiply(a: Quat, b: Quat): Quat;
export declare function quatInvert(q: Quat): Quat;
export declare function quatNormalize(q: Quat): Quat;
/** Shortest-arc rotation from unit vector a to unit vector b. */
export declare function quatFromUnitVectors(a: Vec3, b: Vec3): Quat;
/** Rotation that maps the basis (fwd, up) in source space onto (fwd, up) in target space. */
export declare function quatFromFrameBasis(fwdA: Vec3, upA: Vec3, fwdB: Vec3, upB: Vec3): Quat;
export type Mat3 = [number, number, number, number, number, number, number, number, number];
export declare function quatFromRotationMatrix(m: Mat3): Quat;
export declare function rotateVec(q: Quat, v: Vec3): Vec3;
export declare function dot3(a: Vec3, b: Vec3): number;
export declare function cross3(a: Vec3, b: Vec3): Vec3;
export declare function len3(v: Vec3): number;
export declare function normalize3(v: Vec3): Vec3;
export declare function sub3(a: Vec3, b: Vec3): Vec3;
export declare function add3(a: Vec3, b: Vec3): Vec3;
export declare function scale3(v: Vec3, s: number): Vec3;
/** Shortest rotation angle between two quaternions, in degrees. */
export declare function quatAngleDeg(a: Quat, b: Quat): number;
export declare function clamp(v: number, min: number, max: number): number;
/** Quaternion slerp with the shortest path. */
export declare function quatSlerp(a: Quat, b: Quat, t: number): Quat;
//# sourceMappingURL=quat.d.ts.map