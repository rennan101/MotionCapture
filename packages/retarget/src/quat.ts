/**
 * Minimal quaternion math for the retarget solver.
 *
 * Conventions: unit quaternions [x, y, z, w], right-handed.
 * Rotation of vector v by quaternion q: v' = q * v * q*
 */

export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];

export const quatIdentity: Quat = [0, 0, 0, 1];

export function quatMultiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by + ay * bw + az * bx - ax * bz,
    aw * bz + az * bw + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatInvert(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function quatNormalize(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len < 1e-9) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

/** Shortest-arc rotation from unit vector a to unit vector b. */
export function quatFromUnitVectors(a: Vec3, b: Vec3): Quat {
  let dot = dot3(a, b);
  if (dot < -0.999999) {
    // Antiparallel: pick any orthogonal axis.
    let axis = cross3([1, 0, 0], a);
    if (len3(axis) < 1e-6) axis = cross3([0, 1, 0], a);
    const n = normalize3(axis);
    return [n[0], n[1], n[2], 0];
  }
  if (dot > 0.999999) {
    return quatIdentity;
  }
  const c = cross3(a, b);
  return quatNormalize([c[0], c[1], c[2], 1 + dot]);
}

/** Rotation that maps the basis (fwd, up) in source space onto (fwd, up) in target space. */
export function quatFromFrameBasis(fwdA: Vec3, upA: Vec3, fwdB: Vec3, upB: Vec3): Quat {
  const mA = frameMatrix(fwdA, upA);
  const mB = frameMatrix(fwdB, upB);
  // q = mB * mA^T, extracted from the orthonormal matrices.
  return quatFromRotationMatrix(mul3x3(mB, transpose3x3(mA)));
}

function frameMatrix(fwd: Vec3, up: Vec3): Mat3 {
  const f = normalize3(fwd);
  const u0 = normalize3(up);
  let r = cross3(u0, f);
  if (len3(r) < 1e-6) r = cross3([1, 0, 0], f);
  const rN = normalize3(r);
  const u = cross3(f, rN);
  return [rN[0], u[0], f[0], rN[1], u[1], f[1], rN[2], u[2], f[2]];
}

export type Mat3 = [number, number, number, number, number, number, number, number, number];

function mul3x3(a: Mat3, b: Mat3): Mat3 {
  const out = new Array(9).fill(0) as unknown as Mat3;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      out[row * 3 + col] =
        a[row * 3 + 0] * b[0 * 3 + col] +
        a[row * 3 + 1] * b[1 * 3 + col] +
        a[row * 3 + 2] * b[2 * 3 + col];
    }
  }
  return out;
}

function transpose3x3(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function quatFromRotationMatrix(m: Mat3): Quat {
  const trace = m[0] + m[4] + m[8];
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    return [
      (m[7] - m[5]) * s,
      (m[2] - m[6]) * s,
      (m[3] - m[1]) * s,
      0.25 / s,
    ];
  }
  if (m[0] > m[4] && m[0] > m[8]) {
    const s = 2.0 * Math.sqrt(1.0 + m[0] - m[4] - m[8]);
    return [0.25 * s, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[5] - m[7]) / s];
  }
  if (m[4] > m[8]) {
    const s = 2.0 * Math.sqrt(1.0 + m[4] - m[0] - m[8]);
    return [(m[1] + m[3]) / s, 0.25 * s, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  }
  const s = 2.0 * Math.sqrt(1.0 + m[8] - m[0] - m[4]);
  return [(m[2] + m[6]) / s, (m[5] + m[7]) / s, 0.25 * s, (m[3] - m[1]) / s];
}

export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const qv: Quat = [v[0], v[1], v[2], 0];
  const out = quatMultiply(quatMultiply(q, qv), quatInvert(q));
  return [out[0], out[1], out[2]];
}

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function len3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function normalize3(v: Vec3): Vec3 {
  const l = len3(v);
  if (l < 1e-9) return [0, 0, 0];
  return [v[0] / l, v[1] / l, v[2] / l];
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** Shortest rotation angle between two quaternions, in degrees. */
export function quatAngleDeg(a: Quat, b: Quat): number {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d)) * (180 / Math.PI);
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Quaternion slerp with the shortest path. */
export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cos = -cos;
  }
  if (cos > 0.9995) {
    return quatNormalize([
      a[0] + t * (bx - a[0]),
      a[1] + t * (by - a[1]),
      a[2] + t * (bz - a[2]),
      a[3] + t * (bw - a[3]),
    ]);
  }
  const theta = Math.acos(cos);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return [
    a[0] * wa + bx * wb,
    a[1] * wa + by * wb,
    a[2] * wa + bz * wb,
    a[3] * wa + bw * wb,
  ];
}
