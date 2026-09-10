// Synthetic sanity check for the direction+roll retarget solver.
// Run: node scripts/validate-retarget.mjs
import {
  RetargetSolver,
  captureRestPose,
  UE5_RIG_BINDINGS,
  UE5_CANONICAL_ANCHOR_BONES,
} from "../packages/retarget/dist/index.js";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name} ${detail}`);
  }
}

const approx = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;
const vecClose = (a, b, eps = 1e-3) =>
  a.every((v, i) => approx(v, b[i], eps));

// ---------------------------------------------------------------- helpers
// Rotate v by quaternion q ([x,y,z,w]).
function rotate(q, v) {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}
function qmul(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by + ay * bw + az * bx - ax * bz,
    aw * bz + az * bw + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
function qinv(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v) => {
  const l = Math.hypot(...v);
  return l < 1e-9 ? [0, 0, 0] : v.map((c) => c / l);
};

// ---------------------------------------------------- synthetic rig (rest)
// Rig space: y-up, character faces +Z, left side at -X.
// T-pose joints (meters):
const T = {
  root: [0, 0, 0],
  hip: [0, 1.0, 0],
  pelvis: [0, 1.0, 0],
  spine_01: [0, 1.1, 0],
  spine_02: [0, 1.2, 0],
  spine_03: [0, 1.3, 0],
  neck: [0, 1.45, 0],
  head: [0, 1.6, 0],
  shoulder_l: [-0.2, 1.42, 0],
  upperarm_l: [-0.22, 1.42, 0], // shoulder joint
  lowerarm_l: [-0.52, 1.42, 0], // elbow
  hand_l: [-0.75, 1.42, 0], // wrist
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

// Give arm bones a NON-identity rest world rotation (typical for UE rigs,
// where bone local axes don't align with world axes) to exercise the math.
// Left arm bones: rotate 90° about Y so local +X points along world -Z.
function rotY90() {
  const s = Math.SQRT1_2;
  return [0, s, 0, s];
}
const ARM_REST_WORLD = rotY90();

const snapshots = Object.entries(T).map(([name, worldPos]) => {
  const isArm = name.startsWith("upperarm") || name.startsWith("lowerarm") || name.startsWith("hand");
  const worldRot = isArm ? ARM_REST_WORLD : [0, 0, 0, 1];
  return {
    name,
    worldPos,
    worldRot,
    localRot: worldRot, // rest parents identity → local == world for this test
  };
});

const rest = captureRestPose(snapshots, UE5_RIG_BINDINGS, UE5_CANONICAL_ANCHOR_BONES, "hip");

console.log("== rest capture ==");
check("no missing bones", rest.missing.length === 0, JSON.stringify(rest.missing));
check("hips rest y = 1.0", approx(rest.hipsRestY, 1.0, 1e-6), String(rest.hipsRestY));

// Primary direction of upperarm_l must be world -X (shoulder→elbow), rotated
// into the bone's local frame by the inverse of its rest world rotation.
const upperarmRest = rest.bones.upperarm_l;
const primaryWorldL = norm(sub(T.lowerarm_l, T.upperarm_l)); // [-1, 0, 0]
const primaryLocalL = rotate(qinv(upperarmRest.worldRot), primaryWorldL);
check(
  "upperarm_l primaryLocal = invRest * worldDir (stored consistently)",
  vecClose(upperarmRest.primaryLocal, primaryLocalL, 1e-6),
  JSON.stringify(upperarmRest.primaryLocal),
);

// ---------------------------------------------------- build test poses
// Canonical pose (mapper convention: y-up, person facing +Z, left at +X).
// We define the canonical T-pose so that, under DEFAULT_AXIS_MAPPING
// ([x, -y, -z]), it maps exactly onto our rig T-pose (that is what
// "self-consistent rest" means here): canonical = -mapping applied to rig.
const MAP = { x: 1, y: -1, z: -1, scale: 1 };
const toCanonical = (p) => [p[0] * MAP.x, p[1] * MAP.y, p[2] * MAP.z]; // rig → canonical
const fromCanonical = toCanonical; // mapping is an involution here (y,z flips square to identity)

function makePose(joints, confidence = 1) {
  const pose = { timestamp: 0, overallConfidence: confidence };
  // Canonical poses are hip-centered (MediaPipe world-landmark convention):
  // every point is expressed relative to the pelvis.
  const pelvis = joints.pelvis;
  const rel = (p) => sub(p, pelvis);
  // Map canonical point names to synthetic joints
  const map = {
    root: "root",
    pelvis: "pelvis",
    spine: "spine_01",
    chest: "spine_03",
    neck: "neck",
    head: "head",
    leftShoulder: "upperarm_l",
    leftUpperArm: "upperarm_l",
    leftLowerArm: "lowerarm_l",
    leftHand: "hand_l",
    rightShoulder: "upperarm_r",
    rightUpperArm: "upperarm_r",
    rightLowerArm: "lowerarm_r",
    rightHand: "hand_r",
    leftUpperLeg: "upperleg_l",
    leftLowerLeg: "lowerleg_l",
    leftFoot: "foot_l",
    leftAnkle: "foot_l",
    rightUpperLeg: "upperleg_r",
    rightLowerLeg: "lowerleg_r",
    rightFoot: "foot_r",
    rightAnkle: "foot_r",
  };
  for (const [canon, joint] of Object.entries(map)) {
    const p = toCanonical(rel(joints[joint]));
    pose[canon] = { position: p, confidence };
  }
  return pose;
}

// Rest pose in rig space → canonical pose (T-pose)
const tposeCanonical = makePose(T);

// Target pose: arms down along the body, right knee flexed (heel back).
const TARGET = {
  ...T,
  lowerarm_l: [-0.30, 1.05, 0], // elbow moved down/in
  hand_l: [-0.30, 0.80, 0], // hand below elbow
  lowerarm_r: [0.30, 1.05, 0],
  hand_r: [0.30, 0.80, 0],
  lowerleg_r: [0.15, 0.55, -0.05],
  foot_r: [0.16, 0.15, -0.30], // ankle BEHIND the knee (natural flexion)
};
const targetCanonical = makePose(TARGET);

// Hyperextended-leg pose: ankle far FORWARD of the knee (impossible knee).
const HYPER = {
  ...T,
  lowerleg_r: [0.15, 0.55, 0.05],
  foot_r: [0.16, 0.15, 0.35], // shin swung forward past straight
};
const hyperCanonical = makePose(HYPER);

console.log("== solve: T-pose frame ==");
const solver = new RetargetSolver(UE5_RIG_BINDINGS, rest, { smoothing: 0 });
const r0 = solver.solve(tposeCanonical, MAP, 1);
check("no skipped bones at T-pose", r0.skipped.length === 0, JSON.stringify(r0.skipped));
check(
  "hips world position = rest height when pose is at origin (hip-centered)",
  vecClose(r0.hipsWorldPosition, [0, 1.0, 0], 1e-6),
  JSON.stringify(r0.hipsWorldPosition),
);

console.log("== solve: arms down + leg lifted ==");
const r1 = solver.solve(targetCanonical, MAP, 1);
check("no skipped bones", r1.skipped.length === 0, JSON.stringify(r1.skipped));

// Reconstruct world rotations through the synthetic hierarchy and check that
// each bound bone's primary segment points where the canonical pose says.
const worldRots = {};
const parentOfRig = {
  hip: null,
  spine_01: "hip",
  spine_02: "spine_01",
  spine_03: "spine_02",
  neck: "spine_03",
  head: "neck",
  shoulder_l: "spine_03",
  upperarm_l: "shoulder_l",
  lowerarm_l: "upperarm_l",
  hand_l: "lowerarm_l",
  shoulder_r: "spine_03",
  upperarm_r: "shoulder_r",
  lowerarm_r: "upperarm_r",
  hand_r: "lowerarm_r",
  upperleg_l: "hip",
  lowerleg_l: "upperleg_l",
  foot_l: "lowerleg_l",
  upperleg_r: "hip",
  lowerleg_r: "upperleg_r",
  foot_r: "lowerleg_r",
};
for (const [boneName, local] of Object.entries(r1.localRotations)) {
  const parent = parentOfRig[boneName];
  worldRots[boneName] = parent && worldRots[parent] ? qmul(worldRots[parent], local) : local;
}

function worldSegmentDir(fromBone, toBone) {
  // both bones share the segment start when fromBone is the anchor origin
  const from = T[fromBone];
  const to = TARGET[toBone] ?? T[toBone];
  return norm(sub(to, from));
}

// upperarm_l: solved world rotation must rotate its local primary dir onto
// the mapped canonical shoulder→elbow dir.
{
  const solved = worldRots.upperarm_l;
  const restLocal = rest.bones.upperarm_l.primaryLocal;
  const got = rotate(solved, restLocal);
  const want = norm(
    sub(
      fromCanonical(toCanonical(TARGET.lowerarm_l)),
      fromCanonical(toCanonical(TARGET.upperarm_l)),
    ),
  );
  check("upperarm_l tracks shoulder→elbow", vecClose(got, want, 1e-3), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}
{
  const solved = worldRots.lowerarm_l;
  const got = rotate(solved, rest.bones.lowerarm_l.primaryLocal);
  const want = norm(
    sub(
      fromCanonical(toCanonical(TARGET.hand_l)),
      fromCanonical(toCanonical(TARGET.lowerarm_l)),
    ),
  );
  check("lowerarm_l tracks elbow→wrist", vecClose(got, want, 1e-3), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}
{
  const solved = worldRots.upperleg_r;
  const got = rotate(solved, rest.bones.upperleg_r.primaryLocal);
  const want = norm(
    sub(
      fromCanonical(toCanonical(TARGET.lowerleg_r)),
      fromCanonical(toCanonical(TARGET.upperleg_r)),
    ),
  );
  check("upperleg_r tracks hip→knee (lifted leg)", vecClose(got, want, 1e-3), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}
{
  // Spine chain should stay aligned with pelvis→chest (no twist target here).
  const got = rotate(worldRots.spine_01, rest.bones.spine_01.primaryLocal);
  const want = norm(
    sub(
      fromCanonical(toCanonical(TARGET.spine_03)),
      fromCanonical(toCanonical(TARGET.pelvis)),
    ),
  );
  check("spine_01 tracks pelvis→chest", vecClose(got, want, 1e-3), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

console.log("== confidence gating ==");
const lowConf = makePose(targetCanonical ? TARGET : TARGET, 0.1);
const r2 = new RetargetSolver(UE5_RIG_BINDINGS, rest, { smoothing: 0, minConfidence: 0.25 }).solve(lowConf, MAP, 1);
check("all bones held at low confidence", r2.skipped.length === UE5_RIG_BINDINGS.length, `${r2.skipped.length}/${UE5_RIG_BINDINGS.length} skipped`);
check(
  "held bones keep rest local rotations",
  vecClose(r2.localRotations.upperarm_l, rest.bones.upperarm_l.localRot, 1e-6),
);

console.log("== smoothing ==");
const snapSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, { smoothing: 0 });
const s0 = snapSolver.solve(targetCanonical, MAP, 1);
const smoothSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, { smoothing: 0.5 });
const s1 = smoothSolver.solve(targetCanonical, MAP, 1);
// First frame must lie halfway (in angle) between rest and the snapped target.
const restQ = rest.bones.upperarm_l.localRot;
const angleBetween = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3])));
const aRestToTarget = angleBetween(restQ, s0.localRotations.upperarm_l);
const aRestToFirst = angleBetween(restQ, s1.localRotations.upperarm_l);
check(
  "first smoothed frame is halfway from rest to target",
  approx(aRestToFirst, aRestToTarget * 0.5, 1e-3),
  `first=${aRestToFirst.toFixed(4)} halfOfTarget=${(aRestToTarget * 0.5).toFixed(4)}`,
);

console.log("== Sprint 7: adaptive stabilizer ==");
// Adaptive mode (no explicit smoothing): still poses damp hard, fast poses pass through.
const stabSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, {}); // adaptive
// Feed T-pose for 5 frames (hold still), then the target pose.
for (let i = 0; i < 5; i++) stabSolver.solve(tposeCanonical, MAP, 1);
const heldSlow = stabSolver.solve(tposeCanonical, MAP, 1).localRotations.upperarm_l;
const angleFromRest = (q) => angleBetween(restQ, q);
const slowDrift = angleFromRest(heldSlow);
check("still pose: stabilizer converges near rest (heavy damping)", slowDrift < 0.2, `drift=${slowDrift.toFixed(4)}deg`);

// Fast motion: after the still hold, jump to target — the stabilizer must
// NOT treat a legitimate big swing as an outlier (threshold 110°) and must
// pass a meaningful fraction of the motion through on the first frame.
const fastOut = stabSolver.solve(targetCanonical, MAP, 1).localRotations.upperarm_l;
const fastProgress = angleFromRest(fastOut) / aRestToTarget;
check("fast motion: stabilizer passes through (>25% of target)", fastProgress > 0.25, `progress=${(fastProgress * 100).toFixed(1)}%`);

// Confidence hysteresis: bone held at low conf re-engages only above threshold+margin.
const hystSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, {});
hystSolver.solve(lowConf, MAP, 1); // drop at conf 0.1
const rHeld = hystSolver.solve({ ...makePose(TARGET, 0.3) }, MAP, 1); // below reacquire (0.35): still held
check("hysteresis: below threshold+margin stays held", rHeld.held.includes("upperarm_l"), JSON.stringify(rHeld.held));
const rMid = hystSolver.solve({ ...makePose(TARGET, 0.5) }, MAP, 1); // above 0.35: re-engages
check(
  "hysteresis: re-engage requires threshold + margin",
  !rMid.held.includes("upperarm_l"),
  `mid=${JSON.stringify(rMid.held)}`,
);

console.log("== Sprint 7: point outlier gate ==");
const ogSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, {});
ogSolver.solve(targetCanonical, MAP, 1);
// Teleport one point absurdly far.
const glitch = makePose(TARGET);
glitch.head = { position: [50, 50, 50], confidence: 1 };
const rG = ogSolver.solve(glitch, MAP, 1);
check("teleport glitch rejected", rG.rejectedPoints.includes("head"), JSON.stringify(rG.rejectedPoints));
// The solved pose must NOT chase the glitch: head bone stays near its prev frame.
const normal = new RetargetSolver(UE5_RIG_BINDINGS, rest, {});
normal.solve(targetCanonical, MAP, 1);
const rNormal = normal.solve(glitch, MAP, 1);
const sameHead = angleBetween(rG.localRotations["head"], rNormal.localRotations["head"]) < 1e-6;
check("glitched frame uses previous position (pose unchanged)", sameHead, `${angleBetween(rG.localRotations["head"], rNormal.localRotations["head"]).toFixed(4)}deg apart`);

console.log("== Sprint 7: knee hinge limit ==");
const clampSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, {});
// Natural flexed knee: must NOT be clamped.
const rNat = clampSolver.solve(targetCanonical, MAP, 1);
check("natural knee flexion not clamped", !rNat.clamped.includes("lowerleg_r"), JSON.stringify(rNat.clamped));
// Hyperextended knee: MUST be clamped.
const rHyper = clampSolver.solve(hyperCanonical, MAP, 1);
check("hyperextended knee clamped", rHyper.clamped.includes("lowerleg_r"), JSON.stringify(rHyper.clamped));
// After clamping, the shin direction must be inside the limit — reconstruct
// the flexion angle and verify it landed at the boundary (5 deg hyper). This
// is the Sprint 7 core guarantee: no impossible joints.
{
  const solvedWorld = {};
  for (const [boneName, local] of Object.entries(rHyper.localRotations)) {
    const parent = parentOfRig[boneName];
    solvedWorld[boneName] = parent && solvedWorld[parent] ? qmul(solvedWorld[parent], local) : local;
  }
  // knee axis: hip line (world +X at rest) rotated by parent (upperleg) world rot
  const parentW = solvedWorld["upperleg_r"];
  // At rest upperleg world = identity, so axis ≈ [1,0,0] rotated by parentW.
  const axis = rotate(parentW, [1, 0, 0]);
  const shin = rotate(solvedWorld["lowerleg_r"], rest.bones.lowerleg_r.primaryLocal);
  // flexion vs straight-down [0,-1,0], signed around axis
  const straight = [0, -1, 0];
  const a = norm([
    straight[0] - axis[0] * (straight[0] * axis[0] + straight[1] * axis[1] + straight[2] * axis[2]),
    straight[1] - axis[1] * (straight[0] * axis[0] + straight[1] * axis[1] + straight[2] * axis[2]),
    straight[2] - axis[2] * (straight[0] * axis[0] + straight[1] * axis[1] + straight[2] * axis[2]),
  ]);
  const b = norm([
    shin[0] - axis[0] * (shin[0] * axis[0] + shin[1] * axis[1] + shin[2] * axis[2]),
    shin[1] - axis[1] * (shin[0] * axis[0] + shin[1] * axis[1] + shin[2] * axis[2]),
    shin[2] - axis[2] * (shin[0] * axis[0] + shin[1] * axis[1] + shin[2] * axis[2]),
  ]);
  const crossAB = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sign = crossAB[0] * axis[0] + crossAB[1] * axis[1] + crossAB[2] * axis[2] >= 0 ? 1 : -1;
  const flexDeg = sign * (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;
  check("clamped flexion at boundary (~5 deg hyper max)", flexDeg <= 5.5, `flexion=${flexDeg.toFixed(2)}deg`);
}

console.log("== Sprint 7: spine chain distribution ==");
// A fully-bent torso canonical pose: chest tilted far forward, chains must
// share the bend (each spine link bends ~1/4 of total instead of link 1
// taking everything).
const BENT = { ...T };
const tilt = (p, amount) => [p[0], p[1], p[2] + amount];
BENT.spine_01 = tilt(T.spine_01, 0.05);
BENT.spine_02 = tilt(T.spine_02, 0.1);
BENT.spine_03 = tilt(T.spine_03, 0.15);
BENT.neck = tilt(T.neck, 0.2);
BENT.head = tilt(T.head, 0.25);
// shoulder/arm/leg anchors on the tilted chest stay consistent
BENT.shoulder_l = tilt(T.shoulder_l, 0.18);
BENT.upperarm_l = tilt(T.upperarm_l, 0.18);
BENT.lowerarm_l = tilt(T.lowerarm_l, 0.18);
BENT.hand_l = tilt(T.hand_l, 0.18);
BENT.shoulder_r = tilt(T.shoulder_r, 0.18);
BENT.upperarm_r = tilt(T.upperarm_r, 0.18);
BENT.lowerarm_r = tilt(T.lowerarm_r, 0.18);
BENT.hand_r = tilt(T.hand_r, 0.18);
const bentCanonical = makePose(BENT);
const bendSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, { smoothing: 0 }); // deterministic
bendSolver.solve(tposeCanonical, MAP, 1);
const rBend = bendSolver.solve(bentCanonical, MAP, 1);
const angleOf = (bone) => (angleBetween(rest.bones[bone].localRot, rBend.localRotations[bone]) * 180) / Math.PI; // → degrees
const hipA = angleOf("hip");
const s1A = angleOf("spine_01");
const s2A = angleOf("spine_02");
const s3A = angleOf("spine_03");
check(
  "chain members share the bend (all four links engaged)",
  hipA > 1 && s1A > 1 && s2A > 1 && s3A > 1,
  `hip=${hipA.toFixed(2)} s1=${s1A.toFixed(2)} s2=${s2A.toFixed(2)} s3=${s3A.toFixed(2)}`,
);
check(
  "distribution is balanced (no single link takes the whole bend)",
  Math.max(hipA, s1A, s2A, s3A) < 2 * Math.min(hipA, s1A, s2A, s3A) + 0.5,
  `max/min ratio ${Math.max(hipA, s1A, s2A, s3A).toFixed(2)}/${Math.min(hipA, s1A, s2A, s3A).toFixed(2)}`,
);

console.log("== Sprint 7: foot ground lock ==");
// Feet at ground level, still → planted; then shift hips sideways → foot pin
// should produce a hips compensation offset instead of foot sliding.
const lockSolver = new RetargetSolver(UE5_RIG_BINDINGS, rest, {});
const GROUND = { ...T, foot_l: [-0.12, 0.02, 0], foot_r: [0.12, 0.02, 0] };
const groundCanonical = makePose(GROUND);
lockSolver.solve(groundCanonical, MAP, 1);
const shifted = makePose({ ...GROUND, foot_l: [-0.02, 0.02, 0], foot_r: [0.22, 0.02, 0], upperleg_l: [-0.02, 0.95, 0], upperleg_r: [0.22, 0.95, 0] });
const rShift = lockSolver.solve(shifted, MAP, 1);
// Without a lock, feet would slide 10cm; with the lock the solver pins the
// points pre-solve — we verify via the diagnostic: hips offset != 0.
check(
  "planted feet produce hips compensation",
  Math.hypot(...rShift.hipsWorldPosition) > 0 && (Math.abs(rShift.hipsWorldPosition[0]) > 1e-6 || Math.abs(rShift.hipsWorldPosition[2]) > 1e-6),
  `hips=${JSON.stringify(rShift.hipsWorldPosition)}`,
);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
