import * as THREE from "three";
import { GLTFExporter } from "three-stdlib";
import { bakeClipToTracks } from "./clip-baker.js";

export async function exportClipToGlb(clip, options = {}) {
  const rest = options.rest || null;
  const fileStem = options.fileStem || "motion-forge-clip";
  
  const tracks = bakeClipToTracks(clip, rest, options);
  
  const scene = new THREE.Scene();
  const root = new THREE.Object3D();
  scene.add(root);
  
  // Build bones from rest data if available
  if (rest) {
    for (const [name, boneData] of Object.entries(rest.bones)) {
      const bone = new THREE.Bone();
      bone.name = name;
      bone.position.set(boneData.worldPos[0], boneData.worldPos[1], boneData.worldPos[2]);
      bone.quaternion.set(boneData.localRot[0], boneData.localRot[1], boneData.localRot[2], boneData.localRot[3]);
      root.add(bone);
    }
  }
  
  const exporter = new GLTFExporter();
  const blob = await new Promise((resolve, reject) => {
    exporter.parse(scene, (result) => {
      if (result instanceof Error) reject(result);
      else {
        const glb = result;
        resolve(new Blob([glb], { type: "application/octet-stream" }));
      }
    }, { binary: true });
  });
  
  const fileName = fileStem + ".glb";
  const bytes = blob.size;
  const diagnostics = {
    bytes,
    boneCount: rest ? Object.keys(rest.bones).length : 0,
    frameCount: clip.frames.length,
  };
  
  return { blob, fileName, diagnostics };
}
