// Headless sanity checks for the Sprint 8 clip model (ClipRecorder).
// Run: node scripts/validate-clip-recorder.mjs
import {
  ClipRecorder,
  CLIP_FORMAT_VERSION,
  CLIP_MAX_FRAMES,
  CLIP_MAX_DURATION_MS,
} from "../packages/pose/dist/pose-provider.js";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name} ${detail}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makePose(timestamp, y = 0) {
  const point = { position: [0, y, 0], confidence: 0.9 };
  return {
    timestamp,
    overallConfidence: 0.9,
    root: point, pelvis: point, spine: point, chest: point, neck: point, head: point,
    leftShoulder: point, leftUpperArm: point, leftLowerArm: point, leftHand: point,
    rightShoulder: point, rightUpperArm: point, rightLowerArm: point, rightHand: point,
    leftUpperLeg: point, leftLowerLeg: point, leftFoot: point, leftAnkle: point,
    rightUpperLeg: point, rightLowerLeg: point, rightFoot: point, rightAnkle: point,
  };
}

console.log("== basic recording ==");
{
  const rec = new ClipRecorder();
  rec.start("auto", "mediapipe");
  check("isRecording after start", rec.isRecording);
  const n = 20;
  for (let i = 0; i < n; i++) {
    rec.addPose(makePose(-1, i * 0.01));
    await sleep(5);
  }
  check("frameCount matches", rec.frameCount === n, `${rec.frameCount}/${n}`);
  const clip = rec.stop();
  check("stop returns clip", clip !== null);
  check("format version", clip.formatVersion === CLIP_FORMAT_VERSION);
  check("metadata frameCount", clip.metadata.frameCount === n);
  check("frames monotonic", clip.frames.every((f, i) => i === 0 || f.timestamp >= clip.frames[i - 1].timestamp));
  check("timestamps are recorder clock (>=0)", clip.frames[0].timestamp >= 0);
  check("duration = last ts", clip.metadata.durationMs === clip.frames[clip.frames.length - 1].timestamp);
  check("sampleRate > 0", clip.metadata.sampleRateHz > 0, String(clip.metadata.sampleRateHz));
  check("source recorded", clip.metadata.source.providerId === "auto" && clip.metadata.source.engineName === "mediapipe");
  check("recorder reusable after stop", (rec.stop() === null) && !rec.isRecording);
}

console.log("== empty recording ==");
{
  const rec = new ClipRecorder();
  rec.start("auto", "mediapipe");
  const clip = rec.stop();
  check("no frames → null clip", clip === null);
}

console.log("== pause excludes time ==");
{
  const rec = new ClipRecorder();
  rec.start("auto", "mediapipe");
  rec.addPose(makePose(-1));
  await sleep(60);
  rec.pause();
  check("paused flag", rec.isPaused);
  await sleep(120); // paused time — must be excluded
  rec.addPose(makePose(-1));
  check("no frames while paused", rec.frameCount === 1);
  rec.resume();
  rec.addPose(makePose(-1));
  await sleep(40);
  rec.addPose(makePose(-1));
  const clip = rec.stop();
  // If pause were counted, the 120 ms gap would appear between frames.
  const gaps = clip.frames.slice(1).map((f, i) => f.timestamp - clip.frames[i].timestamp);
  check("max inter-frame gap < pause duration", Math.max(...gaps) < 120, `gaps=${JSON.stringify(gaps)}`);
}

console.log("== frame limit ==");
{
  const rec = new ClipRecorder({ maxFrames: 10 });
  rec.start("auto", "mediapipe");
  for (let i = 0; i < 25; i++) rec.addPose(makePose(-1));
  const clip = rec.stop();
  check("maxFrames enforced", clip.metadata.frameCount === 10, String(clip.metadata.frameCount));
}

console.log("== duration limit ==");
{
  // Simulate a long recording without waiting: maxDurationMs = 50.
  const rec = new ClipRecorder({ maxDurationMs: 50 });
  rec.start("auto", "mediapipe");
  await sleep(70);
  const added = rec.addPose(makePose(-1));
  check("addPose refused past maxDuration", added === false);
  const clip = rec.stop();
  check("clip empty after refusal", clip === null);
}

console.log("== minInterval decimation ==");
{
  const rec = new ClipRecorder({ minIntervalMs: 30 });
  rec.start("auto", "mediapipe");
  for (let i = 0; i < 10; i++) {
    rec.addPose(makePose(-1));
    await sleep(10);
  }
  const clip = rec.stop();
  check("decimation reduced frames", clip.metadata.frameCount < 10, String(clip.metadata.frameCount));
}

console.log("== defaults sane ==");
check("CLIP_MAX_FRAMES", CLIP_MAX_FRAMES === 18000);
check("CLIP_MAX_DURATION_MS = 10min", CLIP_MAX_DURATION_MS === 600000);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
