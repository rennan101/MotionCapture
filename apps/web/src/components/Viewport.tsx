import { useEffect, useRef } from "react";
import * as THREE from "three";

export function Viewport() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111111");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 1.2, 3.5);
    camera.lookAt(0, 0.9, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight,
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(-1, 2, 2);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(4, 20);
    scene.add(gridHelper);

    const protoGroup = new THREE.Group();
    scene.add(protoGroup);

    const placeholderHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: "#9aa6b8" }),
    );
    placeholderHead.position.set(0, 1.72, 0);
    protoGroup.add(placeholderHead);

    const placeholderTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.55, 0.28),
      new THREE.MeshStandardMaterial({ color: "#c7d2e0" }),
    );
    placeholderTorso.position.set(0, 1.18, 0);
    protoGroup.add(placeholderTorso);

    const placeholderPelvis = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: "#b6c0d0" }),
    );
    placeholderPelvis.position.set(0, 0.82, 0);
    protoGroup.add(placeholderPelvis);

    const placeholderLeftArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.6),
      new THREE.MeshStandardMaterial({ color: "#c7d2e0" }),
    );
    placeholderLeftArm.position.set(-0.36, 1.12, 0);
    placeholderLeftArm.rotation.z = Math.PI / 10;
    protoGroup.add(placeholderLeftArm);

    const placeholderRightArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.6),
      new THREE.MeshStandardMaterial({ color: "#c7d2e0" }),
    );
    placeholderRightArm.position.set(0.36, 1.12, 0);
    placeholderRightArm.rotation.z = -Math.PI / 10;
    protoGroup.add(placeholderRightArm);

    const placeholderLeftLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.7),
      new THREE.MeshStandardMaterial({ color: "#b6c0d0" }),
    );
    placeholderLeftLeg.position.set(-0.16, 0.32, 0);
    protoGroup.add(placeholderLeftLeg);

    const placeholderRightLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.7),
      new THREE.MeshStandardMaterial({ color: "#b6c0d0" }),
    );
    placeholderRightLeg.position.set(0.16, 0.32, 0);
    protoGroup.add(placeholderRightLeg);

    let rafId = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      protoGroup.rotation.y += 0.008;
      renderer.render(scene, camera);
    };

    tick();

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "480px",
        borderRadius: 10,
        overflow: "hidden",
        background: "#111",
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      }}
    />
  );
}
