import { useEffect, useRef, useState } from "react";
import type { PoseResult } from "@motion-forge/pose";
import { useAppStore } from "../store";

export function Viewport({
  stream,
  onVideoReady,
}: {
  stream?: MediaStream | null;
  onVideoReady?: (video: HTMLVideoElement) => void;
} = {}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"both" | "character" | "skeleton">("both");

  const currentPose = useAppStore((s) => s.currentPose);
  const defaultCharacter = useAppStore((s) => s.defaultCharacter);
  const customCharacterUrl = useAppStore((s) => s.customCharacterUrl);
  const inferenceFps = useAppStore((s) => s.inferenceFps);
  const inferenceLatencyMs = useAppStore((s) => s.inferenceLatencyMs);

  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const characterGroupRef = useRef<any>(null);
  const skeletonGroupRef = useRef<any>(null);
  const protoGroupRef = useRef<any>(null);
  const jointsRef = useRef<{ [key: string]: any }>({});
  const bonesLinesRef = useRef<any[]>([]);

  // Carrega e renderiza o Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    let cancelled = false;

    Promise.all([import("three"), import("three-stdlib")]).then(([THREE, stdlib]) => {
      if (cancelled || !mountRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#111116");
      sceneRef.current = scene;

      const { clientWidth, clientHeight } = mountRef.current;
      const camera = new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 0.1, 100);
      camera.position.set(0, 1.4, 3.8);
      camera.lookAt(0, 1.0, 0);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(clientWidth, clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Iluminação
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.2);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
      dirLight.position.set(2, 4, 3);
      dirLight.castShadow = true;
      scene.add(dirLight);

      const backLight = new THREE.DirectionalLight(0x6366f1, 1.0);
      backLight.position.set(-2, 2, -2);
      scene.add(backLight);

      // Grid de chão
      const gridHelper = new THREE.GridHelper(6, 24, 0x6366f1, 0x27272a);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // Grupos de renderização
      const charGroup = new THREE.Group();
      scene.add(charGroup);
      characterGroupRef.current = charGroup;

      const skelGroup = new THREE.Group();
      scene.add(skelGroup);
      skeletonGroupRef.current = skelGroup;

      // Criar Joints e Bones para o Esqueleto Canônico 3D
      const jointMaterial = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x0088aa,
        roughness: 0.2,
      });
      const jointGeom = new THREE.SphereGeometry(0.028, 16, 16);

      const jointNames = [
        "head",
        "neck",
        "chest",
        "spine",
        "pelvis",
        "leftShoulder",
        "leftUpperArm",
        "leftLowerArm",
        "leftHand",
        "rightShoulder",
        "rightUpperArm",
        "rightLowerArm",
        "rightHand",
        "leftUpperLeg",
        "leftLowerLeg",
        "leftFoot",
        "rightUpperLeg",
        "rightLowerLeg",
        "rightFoot",
      ];

      jointNames.forEach((name) => {
        const mesh = new THREE.Mesh(jointGeom, jointMaterial);
        mesh.visible = false;
        skelGroup.add(mesh);
        jointsRef.current[name] = mesh;
      });

      // Conexões ósseas canônicas
      const bonePairs: [string, string][] = [
        ["head", "neck"],
        ["neck", "chest"],
        ["chest", "spine"],
        ["spine", "pelvis"],
        ["chest", "leftShoulder"],
        ["leftShoulder", "leftLowerArm"],
        ["leftLowerArm", "leftHand"],
        ["chest", "rightShoulder"],
        ["rightShoulder", "rightLowerArm"],
        ["rightLowerArm", "rightHand"],
        ["pelvis", "leftUpperLeg"],
        ["leftUpperLeg", "leftLowerLeg"],
        ["leftLowerLeg", "leftFoot"],
        ["pelvis", "rightUpperLeg"],
        ["rightUpperLeg", "rightLowerLeg"],
        ["rightLowerLeg", "rightFoot"],
      ];

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x60a5fa,
        linewidth: 3,
      });

      bonesLinesRef.current = bonePairs.map(([a, b]) => {
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(),
        ]);
        const line = new THREE.Line(geom, lineMaterial);
        line.visible = false;
        skelGroup.add(line);
        return { line, a, b, geom };
      });

      // Função de carregamento do FBX padrão ou custom
      const loadCharacterModel = () => {
        while (charGroup.children.length > 0) {
          charGroup.remove(charGroup.children[0]);
        }

        let modelPath = "/models/eric_tpose.fbx";
        if (defaultCharacter === "carla") {
          modelPath = "/models/carla_tpose.fbx";
        } else if (defaultCharacter === "custom" && customCharacterUrl) {
          modelPath = customCharacterUrl;
        }

        setModelLoading(true);
        const fbxLoader = new stdlib.FBXLoader();
        fbxLoader.load(
          modelPath,
          (fbx: any) => {
            if (cancelled) return;
            setModelLoading(false);
            // Escala e centralização
            fbx.scale.setScalar(0.01);
            fbx.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            charGroup.add(fbx);
          },
          undefined,
          (err: any) => {
            console.warn("Falha ao carregar FBX template, exibindo manequim procedural", err);
            setModelLoading(false);
            createProceduralMannequin(THREE, charGroup);
          }
        );
      };

      loadCharacterModel();

      // Loop de renderização
      let rafId = 0;
      const clock = new THREE.Clock();

      const tick = () => {
        rafId = requestAnimationFrame(tick);
        renderer.render(scene, camera);
      };
      tick();

      const onResize = () => {
        if (!mountRef.current) return;
        const { clientWidth, clientHeight } = mountRef.current;
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(rafId);
        renderer.dispose();
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      cancelled = true;
    };
  }, [defaultCharacter, customCharacterUrl]);

  // Manequim procedural fallback caso o FBX não carregue
  function createProceduralMannequin(THREE: any, group: any) {
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

  // Atualiza visibilidade com base no modo
  useEffect(() => {
    if (characterGroupRef.current) {
      characterGroupRef.current.visible = viewMode === "both" || viewMode === "character";
    }
    if (skeletonGroupRef.current) {
      skeletonGroupRef.current.visible = viewMode === "both" || viewMode === "skeleton";
    }
  }, [viewMode]);

  // Atualiza os joints do esqueleto com a pose canônica em tempo real
  useEffect(() => {
    if (!currentPose || !skeletonGroupRef.current) return;

    const can = currentPose.canonical;
    const joints = jointsRef.current;

    const updateJoint = (name: string, point?: { position: [number, number, number]; confidence: number }) => {
      const mesh = joints[name];
      if (!mesh || !point) return;
      if (point.confidence > 0.25) {
        // Escala e posiciona na frente da câmera (MediaPipe world landmarks são centralizados no quadril em metros)
        mesh.position.set(
          -point.position[0] * 1.5,
          point.position[1] * 1.5 + 1.0,
          -point.position[2] * 1.5
        );
        mesh.visible = true;
      } else {
        mesh.visible = false;
      }
    };

    updateJoint("head", can.head);
    updateJoint("neck", can.neck);
    updateJoint("chest", can.chest);
    updateJoint("spine", can.spine);
    updateJoint("pelvis", can.pelvis);
    updateJoint("leftShoulder", can.leftShoulder);
    updateJoint("leftUpperArm", can.leftUpperArm);
    updateJoint("leftLowerArm", can.leftLowerArm);
    updateJoint("leftHand", can.leftHand);
    updateJoint("rightShoulder", can.rightShoulder);
    updateJoint("rightUpperArm", can.rightUpperArm);
    updateJoint("rightLowerArm", can.rightLowerArm);
    updateJoint("rightHand", can.rightHand);
    updateJoint("leftUpperLeg", can.leftUpperLeg);
    updateJoint("leftLowerLeg", can.leftLowerLeg);
    updateJoint("leftFoot", can.leftFoot);
    updateJoint("rightUpperLeg", can.rightUpperLeg);
    updateJoint("rightLowerLeg", can.rightLowerLeg);
    updateJoint("rightFoot", can.rightFoot);

    // Atualiza ossos/linhas
    bonesLinesRef.current.forEach(({ line, a, b, geom }) => {
      const jA = joints[a];
      const jB = joints[b];
      if (jA && jB && jA.visible && jB.visible) {
        const positions = geom.attributes.position.array;
        positions[0] = jA.position.x;
        positions[1] = jA.position.y;
        positions[2] = jA.position.z;
        positions[3] = jB.position.x;
        positions[4] = jB.position.y;
        positions[5] = jB.position.z;
        geom.attributes.position.needsUpdate = true;
        line.visible = true;
      } else {
        line.visible = false;
      }
    });
  }, [currentPose]);

  // Vídeo da câmera
  useEffect(() => {
    if (!stream) {
      setVideoReady(false);
      return;
    }

    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    videoRef.current = video;

    const handlePlaying = () => {
      setVideoReady(true);
      onVideoReady?.(video);
    };

    video.addEventListener("loadeddata", () => {
      video.play().catch(() => {});
    });
    video.addEventListener("playing", handlePlaying);

    return () => {
      video.removeEventListener("playing", handlePlaying);
      video.srcObject = null;
      videoRef.current = null;
    };
  }, [stream, onVideoReady]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "480px",
        borderRadius: 12,
        overflow: "hidden",
        background: "#0c0d12",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        position: "relative",
        border: "1px solid #27272a",
      }}
    >
      {/* Vídeo overlay (canto inferior esquerdo em PiP) */}
      {stream && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            width: 220,
            height: 165,
            borderRadius: 10,
            overflow: "hidden",
            border: "2px solid rgba(99, 102, 241, 0.6)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            background: "#000",
            zIndex: 10,
          }}
        >
          <video
            ref={(el) => {
              if (el && videoRef.current && el !== videoRef.current) {
                el.srcObject = stream;
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)", // Efeito espelho natural de webcam
            }}
            muted
            playsInline
            autoPlay
          />
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              background: "rgba(0,0,0,0.7)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 10,
              color: "#a1a1aa",
              fontWeight: 600,
            }}
          >
            WEBCAM AO VIVO
          </div>
        </div>
      )}

      {/* Barra de controle de visualização do Viewport */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          display: "flex",
          gap: 8,
          zIndex: 10,
          background: "rgba(24, 24, 27, 0.75)",
          backdropFilter: "blur(8px)",
          padding: "4px 8px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <button
          type="button"
          onClick={() => setViewMode("both")}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            borderRadius: 6,
            border: "none",
            background: viewMode === "both" ? "#6366f1" : "transparent",
            color: viewMode === "both" ? "#fff" : "#a1a1aa",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Ambos
        </button>
        <button
          type="button"
          onClick={() => setViewMode("character")}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            borderRadius: 6,
            border: "none",
            background: viewMode === "character" ? "#6366f1" : "transparent",
            color: viewMode === "character" ? "#fff" : "#a1a1aa",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Personagem
        </button>
        <button
          type="button"
          onClick={() => setViewMode("skeleton")}
          style={{
            padding: "4px 10px",
            fontSize: 12,
            borderRadius: 6,
            border: "none",
            background: viewMode === "skeleton" ? "#6366f1" : "transparent",
            color: viewMode === "skeleton" ? "#fff" : "#a1a1aa",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Esqueleto 3D
        </button>
      </div>

      {/* Indicador de status de carregamento ou inferência */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 10,
        }}
      >
        {modelLoading && (
          <div
            style={{
              background: "rgba(39, 39, 42, 0.85)",
              color: "#fbbf24",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 12,
              border: "1px solid rgba(251, 191, 36, 0.3)",
            }}
          >
            Carregando modelo FBX…
          </div>
        )}

        {currentPose && (
          <div
            style={{
              background: "rgba(24, 24, 27, 0.8)",
              backdropFilter: "blur(8px)",
              color: "#34d399",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              display: "flex",
              gap: 8,
            }}
          >
            <span>{inferenceFps} FPS</span>
            <span>•</span>
            <span>{inferenceLatencyMs}ms</span>
            <span>•</span>
            <span>{(currentPose.canonical.overallConfidence * 100).toFixed(0)}% conf</span>
          </div>
        )}
      </div>
    </div>
  );
}
