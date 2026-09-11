import * as THREE from "three";
import {
  DEFAULT_AXIS_MAPPING,
  RetargetSolver,
  UE5_CANONICAL_ANCHOR_BONES,
  UE5_RIG_BINDINGS,
  captureRestPose,
} from "@motion-forge/retarget";

const JOINT_NAMES = [
  "head", "neck", "chest", "spine", "pelvis",
  "leftShoulder", "leftUpperArm", "leftLowerArm", "leftHand",
  "rightShoulder", "rightUpperArm", "rightLowerArm", "rightHand",
  "leftUpperLeg", "leftLowerLeg", "leftFoot",
  "rightUpperLeg", "rightLowerLeg", "rightFoot",
];

const BONE_PAIRS = [
  ["head", "neck"], ["neck", "chest"], ["chest", "spine"], ["spine", "pelvis"],
  ["chest", "leftShoulder"], ["leftShoulder", "leftLowerArm"], ["leftLowerArm", "leftHand"],
  ["chest", "rightShoulder"], ["rightShoulder", "rightLowerArm"], ["rightLowerArm", "rightHand"],
  ["pelvis", "leftUpperLeg"], ["leftUpperLeg", "leftLowerLeg"], ["leftLowerLeg", "leftFoot"],
  ["pelvis", "rightUpperLeg"], ["rightUpperLeg", "rightLowerLeg"], ["rightLowerLeg", "rightFoot"],
];

export function createViewport({ mount, onVideoReady, onRetargetReady }) {
  const videoRef = { current: null };
  const sceneRef = { current: null };
  const cameraRef = { current: null };
  const rendererRef = { current: null };
  const characterGroupRef = { current: null };
  const skeletonGroupRef = { current: null };
  const jointsRef = { current: {} };
  const bonesLinesRef = { current: [] };
  const retargetRef = { current: null };
  const onRetargetReadyRef = { current: onRetargetReady };

  let viewMode = "both";
  let modelLoading = false;
  let rafId = 0;
  let loadController = { current: null };
  let threeSetup = null;

  mount.className = "mf-viewport";
  mount.style.cssText = "width:100%;height:100%;min-height:480px;border-radius:12px;overflow:hidden;background:#0c0d12;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;border:1px solid #27272a;";

  // --- Three.js setup ---
  function setupThree() {
    if (sceneRef.current) return;
    import("three-stdlib").then((stdlib) => {
      if (!mount || loadController.current?.signal.aborted) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#111116");
      sceneRef.current = scene;

      const { clientWidth, clientHeight } = mount;
      const camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 100);
      camera.position.set(0, 1.4, 3.8);
      camera.lookAt(0, 1.0, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(clientWidth, clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.2);
      scene.add(hemiLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
      dirLight.position.set(2, 4, 3);
      dirLight.castShadow = true;
      scene.add(dirLight);
      const backLight = new THREE.DirectionalLight(0x6366f1, 1.0);
      backLight.position.set(-2, 2, -2);
      scene.add(backLight);

      const gridHelper = new THREE.GridHelper(6, 24, 0x6366f1, 0x27272a);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      const charGroup = new THREE.Group();
      scene.add(charGroup);
      characterGroupRef.current = charGroup;

      const skelGroup = new THREE.Group();
      scene.add(skelGroup);
      skeletonGroupRef.current = skelGroup;

      const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x0088aa, roughness: 0.2 });
      const jointGeom = new THREE.SphereGeometry(0.028, 16, 16);
      JOINT_NAMES.forEach((name) => {
        const mesh = new THREE.Mesh(jointGeom, jointMaterial);
        mesh.visible = false;
        skelGroup.add(mesh);
        jointsRef.current[name] = mesh;
      });

      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x60a5fa });
      bonesLinesRef.current = BONE_PAIRS.map(([a, b]) => {
        const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geom, lineMaterial);
        line.visible = false;
        skelGroup.add(line);
        return { line, a, b, geom };
      });

      const tick = () => {
        rafId = requestAnimationFrame(tick);
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      tick();

      const onResize = () => {
        if (!mount) return;
        const { clientWidth, clientHeight } = mount;
        if (cameraRef.current) { cameraRef.current.aspect = clientWidth / clientHeight; cameraRef.current.updateProjectionMatrix(); }
        if (rendererRef.current) rendererRef.current.setSize(clientWidth, clientHeight);
      };
      window.addEventListener("resize", onResize);

      threeSetup = () => {
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(rafId);
        if (rendererRef.current) rendererRef.current.dispose();
        if (mount && rendererRef.current?.domElement.parentNode === mount) mount.removeChild(rendererRef.current.domElement);
      };
    });
  }

  // --- FBX loading ---
  function loadCharacterModel(defaultChar, customUrl) {
    if (!characterGroupRef.current) return;
    while (characterGroupRef.current.children.length > 0) {
      characterGroupRef.current.remove(characterGroupRef.current.children[0]);
    }
    let modelPath = "/models/eric_tpose.fbx";
    if (defaultChar === "carla") modelPath = "/models/carla_tpose.fbx";
    else if (defaultChar === "custom" && customUrl) modelPath = customUrl;

    modelLoading = true;
    updateViewportOverlay();

    loadController.current = new AbortController();
    import("three-stdlib").then((stdlib) => {
      if (loadController.current?.signal.aborted) return;
      const fbxLoader = new stdlib.FBXLoader();
      fbxLoader.load(modelPath,
        (fbx) => {
          if (loadController.current?.signal.aborted) return;
          modelLoading = false;
          updateViewportOverlay();
          fbx.scale.setScalar(0.01);
          fbx.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
          setupRetargeting(fbx);
          if (characterGroupRef.current) characterGroupRef.current.add(fbx);
        },
        undefined,
        (err) => {
          if (loadController.current?.signal.aborted) return;
          console.warn("Falha ao carregar FBX template, exibindo manequim procedural", err);
          modelLoading = false;
          updateViewportOverlay();
          createProceduralMannequin(characterGroupRef.current || new THREE.Group());
        }
      );
    });
  }

  function setupRetargeting(fbx) {
    const bonesByName = new Map();
    fbx.traverse((child) => { if (child.isBone || child.type === "Bone") bonesByName.set(child.name, child); });
    const snapshots = UE5_RIG_BINDINGS.flatMap((b) => {
      const results = [];
      for (const boneName of [b.boneName, UE5_CANONICAL_ANCHOR_BONES[b.canonical] ?? b.boneName]) {
        const bone = bonesByName.get(boneName);
        if (!bone) continue;
        const wp = new THREE.Vector3();
        const wq = new THREE.Quaternion();
        bone.getWorldPosition(wp);
        bone.getWorldQuaternion(wq);
        results.push({ name: boneName, worldPos: [wp.x, wp.y, wp.z], worldRot: [wq.x, wq.y, wq.z, wq.w], localRot: [bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w] });
      }
      return results;
    });
    const seen = new Set();
    const unique = snapshots.filter((s) => { if (seen.has(s.name)) return false; seen.add(s.name); return true; });
    const rest = captureRestPose(unique, UE5_RIG_BINDINGS, UE5_CANONICAL_ANCHOR_BONES, "hip");
    onRetargetReadyRef.current?.(rest);
    retargetRef.current = {
      solver: new RetargetSolver(UE5_RIG_BINDINGS, rest, { minConfidence: 0.25, stabilizer: { baseSmoothing: 0.55, velocitySaturationDeg: 20 } }),
      rest,
      bonesByName,
    };
    if (rest.missing.length > 0) console.warn("Retarget: ossos ausentes no rig:", rest.missing);
  }

  function createProceduralMannequin(group) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), mat);
    head.position.set(0, 1.65, 0);
    group.add(head);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.2), mat);
    torso.position.set(0, 1.25, 0);
    group.add(torso);
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.18), mat);
    pelvis.position.set(0, 0.92, 0);
    group.add(pelvis);
  }

  // --- View mode controls ---
  const controlsOverlay = document.createElement("div");
  controlsOverlay.style.cssText = "position:absolute;top:16px;left:16px;display:flex;gap:8px;z-index:10;background:rgba(24,24,27,0.75);backdrop-filter:blur(8px);padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);";
  mount.appendChild(controlsOverlay);

  const modeButtons = [{ label: "Ambos", value: "both" }, { label: "Personagem", value: "character" }, { label: "Esqueleto 3D", value: "skeleton" }];
  modeButtons.forEach(({ label, value }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText = "padding:4px 10px;font-size:12px;border-radius:6px;border:none;background:" + (viewMode === value ? "#6366f1" : "transparent") + ";color:" + (viewMode === value ? "#fff" : "#a1a1aa") + ";cursor:pointer;font-weight:500;";
    btn.addEventListener("click", () => {
      viewMode = value;
      updateViewMode();
      updateViewportOverlay();
    });
    controlsOverlay.appendChild(btn);
  });

  function updateViewMode() {
    if (characterGroupRef.current) characterGroupRef.current.visible = viewMode === "both" || viewMode === "character";
    if (skeletonGroupRef.current) skeletonGroupRef.current.visible = viewMode === "both" || viewMode === "skeleton";
  }

  // --- Status overlay ---
  const statusOverlay = document.createElement("div");
  statusOverlay.style.cssText = "position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:12px;z-index:10;";
  mount.appendChild(statusOverlay);
  let statusBadge = null;
  let fpsBadge = null;

  function updateViewportOverlay() {
    if (statusBadge) { statusOverlay.removeChild(statusBadge); statusBadge = null; }
    if (fpsBadge) { statusOverlay.removeChild(fpsBadge); fpsBadge = null; }
    if (modelLoading) {
      statusBadge = document.createElement("div");
      statusBadge.style.cssText = "background:rgba(39,39,42,0.85);color:#fbbf24;padding:4px 10px;border-radius:6px;font-size:12px;border:1px solid rgba(251,191,36,0.3);";
      statusBadge.textContent = "Carregando modelo FBX…";
      statusOverlay.appendChild(statusBadge);
    }
  }

  function showFpsBadge(fps, latencyMs, confidence) {
    if (fpsBadge) { statusOverlay.removeChild(fpsBadge); fpsBadge = null; }
    fpsBadge = document.createElement("div");
    fpsBadge.style.cssText = "background:rgba(24,24,27,0.8);backdrop-filter:blur(8px);color:#34d399;padding:4px 12px;border-radius:6px;font-size:12px;font-family:monospace;border:1px solid rgba(52,211,153,0.3);display:flex;gap:8px;";
    const parts = [`${fps} FPS`, "•", `${latencyMs}ms`, "•", `${(confidence * 100).toFixed(0)}% conf`];
    parts.forEach((p) => { const s = document.createElement("span"); s.textContent = p; fpsBadge.appendChild(s); });
    statusOverlay.appendChild(fpsBadge);
  }

  // --- Camera preview ---
  let cameraOverlay = null;
  let cameraVideoEl = null;

  function setStream(stream) {
    if (!stream) {
      if (cameraOverlay) { mount.removeChild(cameraOverlay); cameraOverlay = null; }
      cameraVideoEl = null;
      videoRef.current = null;
      return;
    }
    if (!cameraOverlay) {
      cameraOverlay = document.createElement("div");
      cameraOverlay.style.cssText = "position:absolute;bottom:16px;left:16px;width:220px;height:165px;border-radius:10px;overflow:hidden;border:2px solid rgba(99,102,241,0.6);box-shadow:0 4px 20px rgba(0,0,0,0.6);background:#000;z-index:10;";
      mount.appendChild(cameraOverlay);
      const label = document.createElement("div");
      label.style.cssText = "position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.7);padding:2px 6px;border-radius:4px;font-size:10px;color:#a1a1aa;font-weight:600;";
      label.textContent = "WEBCAM AO VIVO";
      cameraOverlay.appendChild(label);
    }
    if (!cameraVideoEl) {
      cameraVideoEl = document.createElement("video");
      cameraVideoEl.autoplay = true;
      cameraVideoEl.playsInline = true;
      cameraVideoEl.muted = true;
      cameraVideoEl.style.cssText = "width:100%;height:100%;object-fit:cover;transform:scaleX(-1);";
      cameraOverlay.appendChild(cameraVideoEl);
      cameraVideoEl.addEventListener("playing", () => { onVideoReady?.(cameraVideoEl); });
      cameraVideoEl.addEventListener("loadeddata", () => { cameraVideoEl.play().catch(() => {}); });
    }
    if (cameraVideoEl.srcObject !== stream) cameraVideoEl.srcObject = stream;
    videoRef.current = cameraVideoEl;
  }

  // --- Pose update ---
  function updatePose(poseResult) {
    if (!poseResult || !skeletonGroupRef.current) {
      const rt = retargetRef.current;
      if (!rt) return;
      rt.solver.reset();
      for (const [boneName, bone] of rt.bonesByName) {
        const restBone = rt.rest.bones[boneName];
        if (restBone) bone.quaternion.set(restBone.localRot[0], restBone.localRot[1], restBone.localRot[2], restBone.localRot[3]);
        if (boneName === "hip" && bone.userData.restPosition) {
          const [x, y, z] = bone.userData.restPosition;
          bone.position.set(x, y, z);
        }
        bone.updateMatrixWorld(true);
      }
      if (fpsBadge) { statusOverlay.removeChild(fpsBadge); fpsBadge = null; }
      return;
    }

    const can = poseResult.canonical;
    const joints = jointsRef.current;
    const updateJoint = (name, point) => {
      const mesh = joints[name];
      if (!mesh || !point) return;
      if (point.confidence > 0.25) {
        mesh.position.set(-point.position[0] * 1.5, point.position[1] * 1.5 + 1.0, -point.position[2] * 1.5);
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    };
    JOINT_NAMES.forEach((name) => updateJoint(name, can[name]));

    bonesLinesRef.current.forEach(({ line, a, b, geom }) => {
      const jA = joints[a], jB = joints[b];
      if (jA && jB && jA.visible && jB.visible) {
        const positions = geom.attributes.position.array;
        positions[0] = jA.position.x; positions[1] = jA.position.y; positions[2] = jA.position.z;
        positions[3] = jB.position.x; positions[4] = jB.position.y; positions[5] = jB.position.z;
        geom.attributes.position.needsUpdate = true;
        line.visible = true;
      } else {
        line.visible = false;
      }
    });

    const rt = retargetRef.current;
    if (!rt) return;
    const result = rt.solver.solve(poseResult.canonical, DEFAULT_AXIS_MAPPING, 1);
    for (const [boneName, localQuat] of Object.entries(result.localRotations)) {
      const bone = rt.bonesByName.get(boneName);
      if (!bone) continue;
      bone.quaternion.set(localQuat[0], localQuat[1], localQuat[2], localQuat[3]);
    }
    const hip = rt.bonesByName.get("hip");
    if (hip && hip.parent) {
      const parent = hip.parent;
      if (!hip.userData.restPosition) hip.userData.restPosition = [hip.position.x, hip.position.y, hip.position.z];
      parent.updateWorldMatrix(true, false);
      const inv = parent.matrixWorld.clone().invert();
      const target = inv.multiplyVector(new THREE.Vector3(result.hipsWorldPosition[0], result.hipsWorldPosition[1], result.hipsWorldPosition[2]));
      hip.position.set(target.x, target.y, target.z);
    }
    const rootBone = rt.bonesByName.get("root");
    if (rootBone) rootBone.updateMatrixWorld(true);
    showFpsBadge(poseResult.fps || 0, poseResult.latencyMs || 0, poseResult.canonical.overallConfidence);
  }

  // --- Public API ---
  return {
    setStream,
    updatePose(poseResult) { updatePose(poseResult); },
    destroy() {
      if (loadController.current) { loadController.current.signal.abort(); loadController.current = null; }
      if (threeSetup) { threeSetup(); threeSetup = null; }
      setStream(null);
      jointsRef.current = {};
      bonesLinesRef.current = [];
      retargetRef.current = null;
      characterGroupRef.current = null;
      skeletonGroupRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      videoRef.current = null;
      if (statusBadge) { statusOverlay.removeChild(statusBadge); statusBadge = null; }
      if (fpsBadge) { statusOverlay.removeChild(fpsBadge); fpsBadge = null; }
    },
  };
}
