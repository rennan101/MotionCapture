// Sprint 9: headless validation of the GLB export path.
//
// Runs the REAL export code (clip-baker + glb-export) in Node via an esbuild
// bundle — three and three-stdlib run fine outside the browser; only the
// download anchor click is browser-specific, which lives in App.tsx, not here.
//
// Checks: baking determinism, track coverage, GLB magic/structure, animation
// channel count, and hips translation staying in meter scale (not FBX 0.01).
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";

// esbuild is a transitive dep (of vite) — resolve it from the pnpm store.
const pnpmStore = new URL("../node_modules/.pnpm/", import.meta.url).pathname;
const esbuildDir = readdirSync(pnpmStore).find((d) => d.startsWith("esbuild@"));
if (!esbuildDir) throw new Error("esbuild not found in node_modules/.pnpm");
const requireEsbuild = createRequire(
  join(pnpmStore, esbuildDir, "node_modules/esbuild/package.json"),
);
const { build } = requireEsbuild("esbuild");

const ROOT = new URL("..", import.meta.url).pathname;

const ENTRY = `
import { bakeClipToTracks } from "${ROOT}apps/web/src/export/clip-baker.ts";
import { exportClipToGlb } from "${ROOT}apps/web/src/export/glb-export.ts";

export { bakeClipToTracks, exportClipToGlb };
`;

let checks = 0;
let failures = 0;
function check(name, cond, detail = "") {
  checks++;
  if (cond) {
    console.log(`  ok: ${name}`);
  } else {
    failures++;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- Synthetic canonical pose generator -------------------------------------
// T-pose at t=0, then a left-arm raise + knee bend across 30 frames @30Hz.
// Positions follow the mediapipe-mapper convention: hip-centered (pelvis at
// origin), +Y up, character facing +Z, left = -X.
function makePose(t, x, y, z, conf = 0.95) {
  return { position: [x, y, z], confidence: conf };
}
function makeClipPose(timestampMs, armRaise = 0, kneeBend = 0) {
  // armRaise 0..1: left lowerarm rotates up from horizontal toward vertical.
  const leftLowerArm = [
    -0.52 * Math.cos(armRaise * (Math.PI / 2)),
    1.42 + 0.52 * Math.sin(armRaise * (Math.PI / 2)) - 1.0,
    0,
  ];
  // kneeBend 0..1: left lowerleg swings back (foot moves -Z, up a bit).
  const knee = kneeBend * (Math.PI / 3);
  const thighLen = 0.43, shinLen = 0.42;
  const lowerLeg = [
    -0.12,
    0.95 - thighLen * Math.cos(knee),
    -shinLen * Math.sin(knee),
  ];
  const foot = [
    -0.12,
    0.95 - thighLen * Math.cos(knee) - shinLen * Math.cos(knee) * 0.9,
    -shinLen * Math.sin(knee) + 0.1,
  ];
  return {
    timestamp: timestampMs,
    overallConfidence: 0.95,
    root: makePose(0, 1.6, 0),
    pelvis: makePose(0, 0, 0),
    spine: makePose(0, 0.25, 0),
    chest: makePose(0, 0.45, 0),
    neck: makePose(0, 0.6, 0),
    head: makePose(0, 0.75, 0),
    leftShoulder: makePose(-0.2, 0.55, 0),
    leftUpperArm: makePose(-0.4, 0.55, 0),
    leftLowerArm: makePose(...leftLowerArm),
    leftHand: makePose(-0.95, 0.55, 0),
    rightShoulder: makePose(0.2, 0.55, 0),
    rightUpperArm: makePose(0.4, 0.55, 0),
    rightLowerArm: makePose(0.52, 0.55, 0),
    rightHand: makePose(0.75, 0.55, 0),
    leftUpperLeg: makePose(-0.12, -0.05, 0),
    leftLowerLeg: makePose(...lowerLeg),
    leftFoot: makePose(...foot),
    leftAnkle: makePose(...foot),
    rightUpperLeg: makePose(0.12, -0.05, 0),
    rightLowerLeg: makePose(0.12, -0.48, 0),
    rightFoot: makePose(0.12, -0.9, 0),
    rightAnkle: makePose(0.12, -0.9, 0),
  };
}

function makeClip() {
  const frames = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const phase = i / (N - 1);
    frames.push(
      makeClipPose(
        i * (1000 / 30),
        Math.min(1, phase * 1.2),   // arm raise
        Math.max(0, Math.sin(phase * Math.PI)), // knee bend in and out
      ),
    );
  }
  return {
    formatVersion: 1,
    metadata: {
      name: "validate-glb",
      createdAt: "2026-01-01T00:00:00.000Z",
      durationMs: (N - 1) * (1000 / 30),
      frameCount: N,
      sampleRateHz: 30,
      source: { engineName: "mediapipe", engineVersion: "test", platform: "node" },
    },
    frames,
  };
}

// --- Run ---------------------------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "mfglb-"));
const entryPath = join(tmp, "entry.ts");
const outPath = join(tmp, "bundle.mjs");
writeFileSync(entryPath, ENTRY);

console.log("Bundling export modules with esbuild…");
await build({
  entryPoints: [entryPath],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outPath,
  absWorkingDir: ROOT,
  // Bundle three + three-stdlib IN: the bundle runs from tmpdir, where Node
  // couldn't resolve them; bundling keeps the test self-contained.
  external: [],
  logLevel: "error",
});

const mod = await import(pathToFileURL(outPath).href);
const { bakeClipToTracks, exportClipToGlb } = mod;
const clip = makeClip();

console.log("\n== Baker ==");
const baked = bakeClipToTracks(clip, {});
check("bake produces tracks", baked.clip.tracks.length > 1, `${baked.clip.tracks.length}`);
const quatTracks = baked.clip.tracks.filter((tr) => tr.name.endsWith(".quaternion"));
check(">= 19 quaternion tracks", quatTracks.length >= 19, `${quatTracks.length}`);
check("hip position track present", baked.clip.tracks.some((tr) => tr.name === "hip.position"));
const hipTrack = baked.clip.tracks.find((tr) => tr.name === "hip.position");
const firstHipY = hipTrack.values[1];
check("hips Y near rest height (~1.0 m)", Math.abs(firstHipY - 1.0) < 0.25, `${firstHipY.toFixed(3)}`);
const minHip = Math.min(...Array.from(hipTrack.values).filter((_, i) => i % 3 === 1));
check("hips never collapse toward 0 (no 0.01-scale bug)", minHip > 0.5, `${minHip.toFixed(3)}`);
check("duration matches clip", Math.abs(baked.diagnostics.durationSec - (29 / 30)) < 1e-6, `${baked.diagnostics.durationSec}`);

const baked2 = bakeClipToTracks(clip, {});
const a = JSON.stringify(baked.clip.tracks.map((tr) => [tr.name, Array.from(tr.values).slice(0, 8)]));
const b = JSON.stringify(baked2.clip.tracks.map((tr) => [tr.name, Array.from(tr.values).slice(0, 8)]));
check("baking is deterministic", a === b);

console.log("\n== GLB export ==");
const result = await exportClipToGlb(clip, {});
const buf = Buffer.from(await result.blob.arrayBuffer());
check("file name from metadata", result.fileName === "validate-glb.glb", result.fileName);
check("GLB magic", buf.readUInt32LE(0) === 0x46546c67, `0x${buf.readUInt32LE(0).toString(16)}`);
check("GLB version 2", buf.readUInt32LE(4) === 2);
const totalLen = buf.readUInt32LE(8);
check("GLB length header matches bytes", totalLen === buf.length, `${totalLen} vs ${buf.length}`);
check("non-trivial payload", buf.length > 2000, `${buf.length} bytes`);

// Parse JSON chunk for scene/animation structure.
const chunkLen = buf.readUInt32LE(12);
const chunkType = buf.readUInt32LE(16);
check("JSON chunk type", chunkType === 0x4e4f534a, `0x${chunkType.toString(16)}`);
const gltf = JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8"));
check("has animations", Array.isArray(gltf.animations) && gltf.animations.length === 1);
const anim = gltf.animations[0];
const rotChannels = anim.channels.filter((ch) => ch.target.path === "rotation");
const posChannels = anim.channels.filter((ch) => ch.target.path === "translation");
check(">= 19 rotation channels", rotChannels.length >= 19, `${rotChannels.length}`);
check("1 hips translation channel", posChannels.length === 1, `${posChannels.length}`);
check("animation nodes exist", gltf.nodes && gltf.nodes.length >= 19, `${gltf.nodes?.length}`);
const nodeNames = new Set((gltf.nodes ?? []).map((n) => n.name));
for (const expected of ["hip", "spine_01", "upperarm_l", "lowerleg_r", "foot_l"]) {
  check(`node "${expected}" present`, nodeNames.has(expected));
}

// Hips translation sampler must be in meters — read the output accessor
// (min/max if present, else decode straight from the binary chunk).
const hipsSamplerIndex = anim.channels.find((ch) => ch.target.path === "translation").sampler;
const acc = gltf.accessors[anim.samplers[hipsSamplerIndex].output];
const binChunkLen = buf.readUInt32LE(20 + chunkLen);
const binChunkType = buf.readUInt32LE(24 + chunkLen);
check("binary chunk type", binChunkType === 0x004e4942, `0x${binChunkType.toString(16)}`);
const binStart = 28 + chunkLen;
// VEC3 float accessor: byteOffset may live on the bufferView, not the accessor.
const view = gltf.bufferViews[acc.bufferView];
const dataStart = binStart + (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
const hipsYs = [];
for (let i = 0; i < acc.count; i++) {
  hipsYs.push(buf.readFloatLE(dataStart + i * 12 + 4)); // +4 = Y component
}
const minY = Math.min(...hipsYs);
const maxY = Math.max(...hipsYs);
check("hips accessor Y in meter scale", maxY > 0.5 && minY > 0.5, `min=${minY.toFixed(3)} max=${maxY.toFixed(3)}`);
check("binary chunk sane", binChunkLen > 0 && binStart + binChunkLen <= buf.length, `${binChunkLen} bytes`);

console.log(`\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}`);
rmSync(tmp, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
