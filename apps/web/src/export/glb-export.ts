import * as THREE from "three";
import { GLTFExporter } from "three-stdlib";
import type { MotionClip } from "@motion-forge/pose";
import type { RestPoseData } from "@motion-forge/retarget";
import { bakeClipToTracks, type BakeOptions, type BakeResult } from "./clip-baker.js";

/**
 * GLB export (Sprint 9): writes a recorded MotionClip as a .glb file.
 *
 * Strategy: build a minimal skeleton (bone hierarchy, no mesh) whose rest
 * layout matches the rig the user animated, attach the baked keyframe
 * tracks, and run three-stdlib's GLTFExporter with binary:true. DCC tools
 * (Blender/Unity/Unreal) import this as a skeleton with a quaternion
 * animation; the clip can also be retargeted onto any same-topology rig.
 *
 * Bone construction uses THREE's own math (no hand-rolled quaternion
 * component arithmetic): each bone's local position/rotation is derived by
 * subtracting the parent's world transform from its own world transform.
 */

export interface GlbExportOptions extends BakeOptions {
  /** Exported file stem (without extension). Default from clip metadata. */
  fileStem?: string;
}

export interface GlbExportResult {
  blob: Blob;
  fileName: string;
  diagnostics: BakeResult["diagnostics"] & { bytes: number };
}

/** Rigid ordered parent map matching UE5_RIG_BINDINGS structure. */
const BONE_PARENTS: Record<string, string | null> = {
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

/**
 * Builds a THREE skeleton from a rest snapshot: each bone's local transform
 * is (parent world)⁻¹ · (bone world), computed with THREE.Matrix4 so scale
 * and rotation are both handled correctly.
 */
function buildSkeletonFromRest(rest: RestPoseData): THREE.Bone | null {
  if (!rest.bones["hip"]) return null;

  const world = new Map<string, { pos: THREE.Vector3; rot: THREE.Quaternion }>();
  for (const [name, restBone] of Object.entries(rest.bones)) {
    world.set(name, {
      pos: new THREE.Vector3(...restBone.worldPos),
      rot: new THREE.Quaternion(...restBone.worldRot),
    });
  }

  const byName = new Map<string, THREE.Bone>();
  let rootBone: THREE.Bone | null = null;

  for (const name of Object.keys(BONE_PARENTS)) {
    const w = world.get(name);
    if (!w) continue; // keep the hierarchy sparse when a bone is missing
    const bone = new THREE.Bone();
    bone.name = name;

    const parentName = BONE_PARENTS[name];
    const parentW = parentName ? world.get(parentName) : undefined;

    if (parentW) {
      // local = parentWorld⁻¹ · boneWorld
      const parentMat = new THREE.Matrix4().compose(
        parentW.pos,
        parentW.rot,
        new THREE.Vector3(1, 1, 1),
      );
      const boneMat = new THREE.Matrix4().compose(w.pos, w.rot, new THREE.Vector3(1, 1, 1));
      const local = parentMat.clone().invert().multiply(boneMat);
      const pos = new THREE.Vector3();
      const rot = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      local.decompose(pos, rot, scl);
      bone.position.copy(pos);
      bone.quaternion.copy(rot);
    } else {
      bone.position.copy(w.pos);
      bone.quaternion.copy(w.rot);
      rootBone = bone;
    }
    byName.set(name, bone);
  }

  // Link parents (second pass so missing bones don't orphan children).
  for (const [name, parentName] of Object.entries(BONE_PARENTS)) {
    const bone = byName.get(name);
    if (!bone || !parentName) continue;
    const parent = byName.get(parentName);
    if (parent && bone.parent !== parent) parent.add(bone);
  }

  return rootBone ?? byName.get("hip") ?? null;
}

export async function exportClipToGlb(
  clip: MotionClip,
  options: GlbExportOptions = {},
): Promise<GlbExportResult> {
  if (clip.frames.length === 0) throw new Error("Cannot export an empty clip");

  const baked = bakeClipToTracks(clip, options);
  const root = buildSkeletonFromRest(baked.rest) ?? fallbackBone();

  const group = new THREE.Group();
  group.name = "MotionForgeRig";
  group.add(root);

  // Track names are bare bone names ("hip.quaternion"), matching Bone.name,
  // which is how glTFExporter resolves animation channels to nodes.
  group.animations = [baked.clip];

  const blob = await new Promise<Blob>((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          reject(new Error("glTFExporter returned JSON instead of binary GLB"));
        }
      },
      (err) => reject(err instanceof Error ? err : new Error(String(err))),
      { binary: true, animations: [baked.clip] },
    );
  });

  const stem =
    options.fileStem ??
    (clip.metadata.name || "motion-forge-clip").replace(/[^\w-]+/g, "_").slice(0, 60);

  return {
    blob,
    fileName: `${stem}.glb`,
    diagnostics: { ...baked.diagnostics, bytes: blob.size },
  };
}

/** Minimal one-bone fallback if rest data is unusable. */
function fallbackBone(): THREE.Bone {
  const bone = new THREE.Bone();
  bone.name = "hip";
  bone.position.set(0, 1, 0);
  return bone;
}
