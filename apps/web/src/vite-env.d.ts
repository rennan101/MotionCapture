/// <reference types="vite/client" />

declare module "three" {
  export interface Scene {
    background: Color | null;
    add(object: Object3D): void;
  }

  export interface Object3D {
    position: Vector3;
    rotation: Euler;
    add(object: Object3D): void;
    scale: Vector3;
  }

  export interface Euler {
    z: number;
    x: number;
    y: number;
  }

  export interface Euler {
    z: number;
  }

  export interface Vector3 {
    set(x: number, y: number, z: number): void;
  }

  export interface PerspectiveCamera {
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export interface WebGLRenderer {
    setSize(width: number, height: number): void;
    setPixelRatio(value: number): void;
    domElement: HTMLElement;
    dispose(): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
  }

  export interface Color {
    set(color: string): Color;
  }

  export interface Group extends Object3D {}

  export interface Mesh extends Object3D {
    constructor(
      geometry: BufferGeometry,
      material: Material,
    );
    position: Vector3;
    rotation: Euler;
  }

  export interface MeshStandardMaterial extends Material {}

  export interface Material {}

  export interface BufferGeometry {}

  export interface AmbientLight extends Object3D {
    constructor(color: number, intensity?: number);
  }

  export interface DirectionalLight extends Object3D {
    position: Vector3;
    constructor(color: number, intensity?: number);
  }

  export interface GridHelper extends Object3D {
    constructor(size: number, divisions: number);
  }

  export = THREE;
}
