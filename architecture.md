# Architecture — AI Motion Capture & 3D Character Animation

> **Projeto:** Motion Capture + Auto-Rigging + Retargeting para personagens 3D  
> **Plataformas-alvo:** macOS, Windows e Web  
> **Prioridades:** performance local, GPU, privacidade, baixo custo, compatibilidade com Blender/Unity/Unreal  
> **Status:** arquitetura inicial / roadmap técnico

---

## 1. Visão do produto

A aplicação recebe um personagem 3D (`.FBX`, `.OBJ` e futuramente `.GLB/.GLTF`), identifica ou cria seu esqueleto humanoide e utiliza uma câmera para capturar os movimentos de uma pessoa.

Pipeline principal:

```text
                    ┌──────────────────────┐
                    │   3D Character       │
                    │ FBX / OBJ / GLB      │
                    └──────────┬───────────┘
                               │
                         Import / Analyze
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Character Processing │
                    │ Rig Detection        │
                    │ Auto-Rigging         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Canonical Humanoid   │
                    │ Skeleton             │
                    └──────────┬───────────┘
                               │
                               │ Retarget
                               │
Camera ──► Pose AI ──► 3D Body Pose ─────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ IK + Motion Cleanup  │
                    │ Filtering             │
                    │ Foot/Hand Constraints │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Animation Timeline   │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼──────────────────┐
             ▼                 ▼                  ▼
          Blender             Unity             Unreal
           FBX/GLB             FBX                FBX
             │                 │                  │
             └──────────── Export / Animation ───┘
```

---

# 2. Princípios arquiteturais

## 2.1 Local-first

O processamento deve acontecer no dispositivo sempre que possível.

Objetivos:

- baixa latência;
- funcionamento offline;
- privacidade;
- ausência de custo por frame;
- aproveitamento da GPU do usuário.

A câmera **não deve ser enviada para um servidor por padrão**.

---

## 2.2 GPU-first

A aplicação deve possuir uma camada de aceleração capaz de utilizar:

- Apple Metal;
- Direct3D 12;
- Vulkan;
- WebGPU.

A camada de IA deve preferir:

```text
GPU
 ↓
WebGPU / Native GPU EP
 ↓
CPU fallback
```

---

## 2.3 Shared Core

A lógica principal não deve depender da interface.

```text
┌─────────────────────────────────────────┐
│              Application UI             │
│        React / TypeScript / WebView      │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│              App Core API               │
│ Character / Pose / Rig / Animation      │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴───────────┐
        ▼                      ▼
 Native Runtime            Web Runtime
 macOS / Windows           Browser
```

Isso permite compartilhar o máximo possível entre desktop e web.

---

# 3. Stack recomendada

## Desktop

### Tauri 2

Responsável por:

- janela;
- filesystem;
- integração nativa;
- distribuição;
- comunicação JS ↔ Rust;
- permissões.

O frontend pode continuar sendo React/TypeScript.

### Rust

Responsável por:

- orchestration;
- filesystem;
- parsing;
- processamento pesado;
- comunicação com módulos nativos;
- jobs assíncronos;
- gerenciamento de memória.

### Frontend

- React
- TypeScript
- Vite
- Zustand
- Three.js

---

# 4. Web

A versão web deve reutilizar:

- React;
- TypeScript;
- Three.js;
- Web Workers;
- WebAssembly;
- WebGPU.

A inferência poderá utilizar:

```text
ONNX Runtime Web
        │
        ├── WebGPU
        ├── WebGL fallback
        └── WASM CPU fallback
```

O navegador pode executar inferência localmente, sem enviar o vídeo para servidores.

---

# 5. IA de Pose

## 5.1 Decisão principal

O projeto não deve ficar preso a um único modelo de pose.

A escolha inicial é **MediaPipe Pose Landmarker** como baseline, mas o produto deve ser estruturado como uma **plataforma de mocap com troca de motores de captura**, não como um aplicativo dependente do MediaPipe.

O usuário deve poder escolher, na aplicação:

```text
Motor de captura
  ○ Auto
  ○ MediaPipe
  ○ RTMPose
  ○ NVIDIA RTX
  ○ Modelo personalizado
```

## 5.2 Pipeline de pose

O pipeline de pose é:

```text
Webcam
 ↓
PoseProvider
 ↓
Canonical Pose 3D
 ↓
Retarget
 ↓
IK
 ↓
Motion Cleanup
 ↓
Blender / Unity / Unreal
```

Em mais detalhe:

```text
              Webcam
                 │
                 ▼
          ┌──────────────┐
          │  PoseProvider │
          └──────┬───────┘
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
MediaPipe     RTMPose     NVIDIA
Web/CPU/GPU  Desktop/GPU  NVIDIA GPU
     │           │           │
     └───────────┼───────────┘
                 ▼
          ┌──────────────┐
          │ Canonical Pose│
          │     3D        │
          └──────┬───────┘
                 ▼
          ┌──────────────┐
          │    Retarget   │
          └──────┬───────┘
                 ▼
          ┌──────────────┐
          │      IK       │
          └──────┬───────┘
                 ▼
          ┌──────────────┐
          │ Motion Cleanup│
          └──────┬───────┘
                 ▼
        Blender / Unity / Unreal
```

A câmera é o ponto de entrada. O Provider é o ponto de extensão.

## 5.3 Implementação por versão

### MVP

```text
MediaPipe → Canonical 3D Skeleton → Retarget → IK
```

### V2

```text
MediaPipe + RTMPose → comparar qualidade
```

### V3

```text
NVIDIA BodyPose3DNet como backend opcional para máquinas RTX
```

### V4

```text
modelo próprio de 3D pose → maior qualidade e independência de terceiros
```

## 5.4 Interface PoseProvider

A arquitetura deve manter o Pose Provider desacoplado:

```text
PoseProvider
├── MediaPipeProvider
├── RTMPoseProvider
├── NVIDIAProvider
├── ONNXProvider
├── NativeProvider
└── CustomProvider
```

A interface deve definir:

- entrada de frame/câmera;
- saída de pose normalizada e confiança;
- configuração de modelo e modo;
- capacidade de fallback entre backends;
- indicação de suporte a GPU/CPU/Web.

Assim podemos substituir o modelo posteriormente sem reescrever o sistema inteiro.

## 5.5 Seleção automática

O modo **Auto** deve escolher o melhor provider disponível para o dispositivo:

- web: MediaPipe ou outro backend compatível com browser;
- desktop com GPU NVIDIA RTX: tentar backend NVIDIA quando disponível;
- demais casos: usar o melhor backend disponível para a plataforma.

Isso mantém a aplicação simples para o usuário e, ao mesmo tempo, abre a porta para backends mais avançados no futuro.

---

# 6. Modelo de pose

Internamente não devemos trabalhar diretamente com os landmarks do MediaPipe.

Criar uma representação própria:

```text
BodyPose
├── timestamp
├── confidence
├── root
├── pelvis
├── spine
├── chest
├── neck
├── head
├── leftShoulder
├── leftUpperArm
├── leftLowerArm
├── leftHand
├── rightShoulder
├── rightUpperArm
├── rightLowerArm
├── rightHand
├── leftUpperLeg
├── leftLowerLeg
├── leftFoot
├── rightUpperLeg
├── rightLowerLeg
└── rightFoot
```

Futuramente:

```text
Hands
Face
Eyes
Fingers
```

---

# 7. Canonical Skeleton

Criar um esqueleto interno independente de Blender, Unity ou Unreal.

Exemplo:

```text
Root
└── Hips
    ├── Spine
    │   ├── Chest
    │   │   ├── Neck
    │   │   │   └── Head
    │   │   ├── LeftShoulder
    │   │   │   └── LeftUpperArm
    │   │   │       └── LeftLowerArm
    │   │   │           └── LeftHand
    │   │   └── RightShoulder
    │   │       └── RightUpperArm
    │   │           └── RightLowerArm
    │   │               └── RightHand
    │   ├── LeftUpperLeg
    │   │   └── LeftLowerLeg
    │   │       └── LeftFoot
    │   └── RightUpperLeg
    │       └── RightLowerLeg
    │           └── RightFoot
```

O canonical skeleton será o intermediário entre:

```text
Camera Pose
      ↓
Canonical Skeleton
      ↓
Character Skeleton
```

---

# 8. Retargeting

O retargeting é uma das partes centrais do projeto.

Fluxo:

```text
Human Pose
   ↓
Normalize
   ↓
Canonical Skeleton
   ↓
Character Rest Pose
   ↓
Bone Mapping
   ↓
Rotation Transfer
   ↓
IK
   ↓
Final Animation
```

Cada personagem possuirá um:

```text
CharacterRigProfile
```

com:

```text
boneMap
restPose
boneLengths
forwardAxis
upAxis
scale
rootBone
hipsBone
```

---

# 9. Auto Rigging

## Fase 1

Não tentar fazer auto-rigging perfeito.

Primeiro suportar personagens que já possuem armature.

```text
FBX
 ↓
Read Skeleton
 ↓
Detect Bones
 ↓
Map Humanoid
```

---

## Fase 2

Auto-rigging semiautomático.

O software identifica:

- cabeça;
- pescoço;
- braços;
- antebraços;
- mãos;
- quadril;
- coxas;
- pernas;
- pés.

O usuário corrige somente ambiguidades.

---

## Fase 3

OBJ sem skeleton.

```text
OBJ
 ↓
Mesh analysis
 ↓
Human detection
 ↓
Skeleton estimation
 ↓
Skin weights
 ↓
Humanoid Rig
```

Essa etapa deve ser tratada como módulo separado porque é significativamente mais complexa.

---

# 10. OBJ

OBJ deve ser considerado formato de entrada, não formato principal.

Problema:

```text
OBJ
 └── Mesh
```

Normalmente não contém:

- skeleton;
- bones;
- skinning;
- animation.

Portanto:

```text
OBJ → Auto Rig → Skin → Motion
```

é necessário.

---

# 11. FBX

FBX será o formato principal para o pipeline desktop.

Import:

```text
FBX
 ↓
Parser
 ↓
Scene
 ↓
Meshes
 ↓
Armatures
 ↓
Materials
```

Export:

```text
Animation
 ↓
FBX Export
```

Para máxima compatibilidade, o exportador deve possuir perfis:

```text
FBX / Unity
FBX / Unreal
FBX / Blender
```

---

# 12. GLTF / GLB

GLB deve ser prioridade para:

- web;
- preview;
- armazenamento interno;
- comunicação entre módulos.

Preferir:

```text
GLB
```

no browser porque é compacto e adequado para renderização web.

---

# 13. Blender

A integração com Blender deve acontecer inicialmente por arquivos.

Fluxo:

```text
Application
      ↓
GLB / FBX / animation data
      ↓
Blender
```

Futuramente criar:

```text
MotionForge Blender Add-on
```

para:

- importar captura;
- retarget;
- limpar animação;
- exportar FBX;
- criar actions.

---

# 14. Unity

Criar perfil:

```text
Unity Humanoid
```

Objetivo:

```text
MotionForge
     ↓
FBX
     ↓
Unity
     ↓
Humanoid Avatar
```

Futuramente:

```text
MotionForge Unity Package
```

com:

- runtime;
- importer;
- animation tools;
- live streaming.

---

# 15. Unreal

Criar perfil:

```text
Unreal Manny / MetaHuman-compatible mapping
```

O primeiro objetivo deve ser produzir FBX corretamente retargetável.

Futuramente:

```text
MotionForge Unreal Plugin
```

---

# 16. Motion Processing

Raw pose é ruidosa.

Pipeline:

```text
Raw Landmarks
      ↓
Confidence filtering
      ↓
Outlier rejection
      ↓
Temporal smoothing
      ↓
Velocity filtering
      ↓
Bone reconstruction
      ↓
IK
      ↓
Foot stabilization
      ↓
Final animation
```

Filtros possíveis:

- One Euro Filter;
- exponential smoothing;
- Kalman filter;
- Savitzky-Golay para offline cleanup.

O usuário deverá controlar:

```text
Smoothness
Responsiveness
Foot Lock
Hand Lock
Noise Reduction
```

---

# 17. IK

O sistema deverá possuir IK para:

- mãos;
- pés;
- cotovelos;
- joelhos;
- coluna.

Exemplo:

```text
Pose AI
   ↓
Foot position
   ↓
Foot IK
   ↓
Ground contact
   ↓
Stable foot
```

Isso reduz problemas comuns de motion capture por webcam.

---

# 18. Captura em tempo real

Pipeline alvo:

```text
Camera
 ↓
Frame
 ↓
Pose inference
 ↓
Pose normalization
 ↓
Retarget
 ↓
IK
 ↓
Viewport
```

Objetivo inicial:

```text
30 FPS
```

Meta:

```text
60 FPS viewport
```

A inferência pode trabalhar em frequência diferente do rendering.

Exemplo:

```text
Rendering: 60 FPS
Pose inference: 30 FPS
Animation interpolation: 60 FPS
```

---

# 19. Arquitetura de threads

Nunca executar tudo na UI thread.

```text
Main/UI Thread
      │
      ├── Render
      │
      └── UI events

Pose Worker
      │
      └── ML inference

Animation Worker
      │
      ├── Retarget
      ├── IK
      └── Filtering

IO Worker
      │
      ├── Import
      └── Export
```

No browser:

```text
Web Worker
SharedArrayBuffer
OffscreenCanvas
WebGPU
```

quando suportados.

---

# 20. GPU Strategy

## macOS

Preferir:

```text
Metal
```

através da camada nativa de aceleração.

Apple Silicon deverá ser tratado como plataforma prioritária.

---

## Windows

Preferir:

```text
Direct3D 12
```

com Vulkan como alternativa quando necessário.

---

## Web

Preferir:

```text
WebGPU
```

com fallback:

```text
WebGL
 ↓
WASM
```

---

# 21. ONNX

Modelos próprios ou alternativos devem ser distribuídos preferencialmente em:

```text
ONNX
```

Isso permite trocar o backend.

```text
Model
 ↓
ONNX
 ├── Native Runtime
 └── ONNX Runtime Web
```

ONNX Runtime possui Execution Providers para WebGPU e pode manter inferência local no browser.

---

# 22. Estratégia de modelos

Não colocar modelos gigantes no primeiro MVP.

Ter perfis:

```text
Performance
Balanced
Quality
```

### Performance

Modelo pequeno.

Objetivo:

```text
30–60 FPS
```

### Balanced

Melhor precisão.

Objetivo:

```text
30 FPS
```

### Quality

Modelo maior.

Uso:

```text
Offline processing
```

---

# 23. Câmeras

Suporte inicial:

```text
Webcam
```

Futuro:

```text
iPhone
Android
Depth Camera
Multiple Cameras
```

Multi-camera:

```text
Camera A ─┐
Camera B ─┼──► 3D Pose Reconstruction
Camera C ─┘
```

Isso pode melhorar significativamente a reconstrução 3D, mas não deve fazer parte do MVP.

---

# 24. 2D → 3D

A câmera comum fornece principalmente informação visual 2D.

O sistema precisa estimar:

```text
X
Y
Z
```

A primeira versão utilizará o modelo de pose para estimar profundidade.

Futuramente:

```text
Multi-view
Depth estimation
Camera calibration
```

podem melhorar a precisão.

---

# 25. Performance Budget

Objetivo desktop:

```text
Pose inference:       < 20 ms
Retarget:             < 2 ms
IK:                   < 2 ms
Filtering:            < 1 ms
Viewport:             60 FPS
```

Meta aproximada:

```text
Frame budget @ 60 FPS = 16.67 ms
```

O sistema deve evitar copiar grandes buffers entre:

```text
CPU ↔ GPU
```

---

# 26. Memory Strategy

Evitar:

```text
Camera frame
 ↓
CPU copy
 ↓
GPU copy
 ↓
CPU result
 ↓
GPU render
```

Preferir:

```text
Camera
 ↓
GPU
 ↓
Inference
 ↓
GPU / compact pose data
 ↓
Render
```

Quando possível.

---

# 27. Web Performance

O browser deve possuir três modos:

```text
WebGPU
  ↓
WebGL
  ↓
WASM SIMD + Threads
```

O WASM deve usar:

- SIMD;
- threads;
- Web Workers.

Quando disponíveis.

---

# 28. Offline

O aplicativo desktop deve funcionar completamente offline depois da instalação.

Arquivos:

```text
models/
runtime/
plugins/
presets/
```

Nenhuma conta deve ser necessária para o MVP.

---

# 29. Privacidade

Default:

```text
Camera → Local Device → AI
```

Nunca:

```text
Camera → Cloud
```

sem consentimento explícito.

O produto deve deixar claro:

> "Your camera footage is processed locally."

---

# 30. Projeto de pastas

```text
motion-forge/
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   └── src-tauri/
│   │
│   └── web/
│       └── src/
│
├── packages/
│   ├── ui/
│   ├── core/
│   ├── pose/
│   ├── skeleton/
│   ├── retarget/
│   ├── animation/
│   ├── formats/
│   ├── renderer/
│   └── protocol/
│
├── native/
│   ├── importer/
│   ├── exporter/
│   ├── pose/
│   └── runtime/
│
├── models/
│   ├── pose/
│   ├── hands/
│   └── face/
│
├── plugins/
│   ├── blender/
│   ├── unity/
│   └── unreal/
│
├── tests/
│   ├── pose/
│   ├── retarget/
│   ├── animation/
│   └── formats/
│
└── docs/
```

---

# 31. Monorepo

Recomendação:

```text
pnpm workspace
```

com:

```text
Rust
+
TypeScript
```

O projeto deve utilizar CI para:

```text
macOS
Windows
Web
```

---

# 32. Licenciamento

Priorizar dependências:

- MIT;
- Apache-2.0;
- BSD;
- permissivas compatíveis com distribuição comercial.

Cada modelo de IA deverá possuir um arquivo:

```text
MODEL_LICENSE.md
```

com:

- origem;
- licença;
- redistribuição permitida;
- uso comercial;
- attribution necessária.

---

# 33. Componentes candidatos

## UI

- React
- TypeScript
- Vite
- Zustand

## Desktop

- Tauri 2
- Rust

## 3D

- Three.js
- GLTFLoader
- GLTFExporter quando aplicável

## Pose

- MediaPipe Tasks
- ONNX Runtime

## ML

- ONNX
- ONNX Runtime
- WebGPU

## Processing

- Rust
- WASM
- SIMD

---

# 34. O que NÃO fazer no MVP

Não implementar inicialmente:

- treinamento próprio de IA;
- cloud inference;
- multi-camera;
- facial mocap;
- finger mocap avançado;
- auto-rigging perfeito;
- MetaHuman específico;
- plugin complexo para Unity;
- plugin complexo para Unreal;
- edição avançada de animação.

---

# 35. MVP

O MVP deve fazer somente:

```text
1. Abrir aplicação
2. Importar FBX
3. Detectar skeleton
4. Mapear skeleton humanoide
5. Abrir webcam
6. Detectar corpo
7. Gerar pose
8. Retarget
9. Mostrar personagem em tempo real
10. Gravar animação
11. Exportar FBX
```

---

# 36. MVP Web

A versão web deve fazer:

```text
Camera
 ↓
MediaPipe
 ↓
Canonical Pose
 ↓
Three.js Character
 ↓
Recording
 ↓
GLB / animation data
```

O web MVP não precisa inicialmente exportar FBX diretamente.

---

# 37. MVP Desktop

Desktop:

```text
Camera
 ↓
Native/Web-compatible Pose Runtime
 ↓
Canonical Pose
 ↓
Retarget
 ↓
IK
 ↓
Timeline
 ↓
FBX Export
```

---

# 38. Fase 2

Adicionar:

- OBJ;
- auto-rigging assistido;
- GLB;
- motion cleanup;
- foot lock;
- hand constraints;
- timeline;
- keyframe editing.

---

# 39. Fase 3

Adicionar:

- mãos;
- dedos;
- face;
- expressões;
- live streaming;
- Unity package;
- Unreal plugin;
- Blender addon.

---

# 40. Fase 4

Adicionar:

- multi-camera;
- melhor reconstrução 3D;
- modelos de maior qualidade;
- motion generation;
- pose correction;
- AI-assisted cleanup.

---

# 41. UX proposta

Tela principal:

```text
┌────────────────────────────────────────────────────────┐
│ MOTION FORGE                                           │
├──────────────┬─────────────────────────────┬───────────┤
│ CHARACTER    │                             │ SETTINGS  │
│              │                             │           │
│ Import FBX   │                             │ Pose      │
│ Import OBJ   │        3D VIEWPORT          │ Quality   │
│              │                             │           │
│ RIG          │            🧍               │ Smoothing │
│ Auto Detect  │                             │           │
│              │                             │           │
│ MOTION       │                             │           │
│ Webcam       │                             │           │
│ Record       │                             │           │
├──────────────┴─────────────────────────────┴───────────┤
│ Timeline                                                │
│ 0s ───────────────●────────────────────────────── 20s  │
│             ▶   ■   ↶   ↷                              │
└────────────────────────────────────────────────────────┘
```

---

# 42. Formato interno de projeto

Criar:

```text
.motionforge
```

Possivelmente como ZIP estruturado:

```text
project.motionforge
├── project.json
├── character/
│   └── character.glb
├── rig/
│   └── rig.json
├── motions/
│   ├── idle.motion
│   └── attack.motion
└── thumbnails/
```

O formato deve ser versionado:

```json
{
  "formatVersion": 1,
  "character": "...",
  "rig": "...",
  "animations": []
}
```

---

# 43. Animation Data

Representação independente de engine:

```text
AnimationClip
├── name
├── duration
├── sampleRate
├── tracks[]
│   ├── bone
│   ├── position
│   ├── rotation
│   └── scale
└── metadata
```

Isso facilita exportação para:

```text
Blender
Unity
Unreal
GLB
FBX
BVH
```

---

# 44. Live Link futuro

Futuramente:

```text
Motion Forge
      │
      ├── UDP
      ├── WebSocket
      └── OSC
```

Unity:

```text
Motion Forge
      ↓
Motion Stream
      ↓
Unity
      ↓
Character
```

Unreal:

```text
Motion Forge
      ↓
Motion Stream
      ↓
Unreal
      ↓
Control Rig
```

---

# 45. Web + Desktop com o mesmo código

Meta:

```text
             Shared Core
                 │
        ┌────────┴────────┐
        │                 │
     Desktop             Web
        │                 │
      Tauri             Browser
        │                 │
      Native             WASM
        │                 │
      Metal/D3D/Vulkan   WebGPU
```

A lógica de:

- skeleton;
- retarget;
- filtering;
- animation;

deve ser compartilhada.

---

# 46. Estratégia de implementação

## Sprint 1

Criar:

```text
Monorepo
React
Three.js
Tauri
Rust
```

## Sprint 2

Implementar:

```text
GLB loader
FBX research/prototype
Character viewer
```

## Sprint 3

Implementar:

```text
Pose Provider
MediaPipe
Canonical Skeleton
```

## Sprint 4

Implementar:

```text
Retargeting
```

## Sprint 5

Implementar:

```text
IK
Filtering
```

## Sprint 6

Implementar:

```text
Recording
Timeline
```

## Sprint 7

Implementar:

```text
Export
```

## Sprint 8

Criar:

```text
Web MVP
```

---

# 47. Critério de sucesso do MVP

O MVP será considerado funcional quando:

```text
FBX humanoid
     +
Webcam
     ↓
Real-time pose
     ↓
Character follows user
     ↓
Record
     ↓
Export FBX
     ↓
Import into Blender
```

e também:

```text
Export FBX
     ↓
Unity
     ↓
Humanoid Avatar
```

---

# 48. Decisão arquitetural principal

A arquitetura recomendada é:

```text
                 MOTION FORGE
                      │
          ┌───────────┴───────────┐
          │                       │
       Desktop                    Web
          │                       │
       Tauri                      │
       Rust                       │
          │                       │
          └───────────┬───────────┘
                      │
                 Shared Core
                      │
        ┌─────────────┼─────────────┐
        │             │             │
      Pose         Skeleton      Animation
        │             │             │
        └─────────────┼─────────────┘
                      │
                  Retarget
                      │
                     IK
                      │
                   Export
```

---

# 49. Decisão sobre Web vs Native

Não devemos escolher entre Web e Native.

Devemos construir:

> **um único produto com dois runtimes.**

### Web

Excelente para:

- demonstração;
- acesso instantâneo;
- colaboração;
- captura simples;
- usuários sem instalação.

### Desktop

Excelente para:

- arquivos grandes;
- processamento offline;
- GPU;
- exportação FBX;
- auto-rigging;
- processamento de alta qualidade;
- projetos profissionais.

---

# 50. Recomendação final

A arquitetura recomendada para a primeira versão é:

```text
Frontend:
React + TypeScript + Three.js

Desktop:
Tauri + Rust

Web:
React + WebGPU + Web Workers

Pose:
MediaPipe inicialmente

ML:
ONNX Runtime como camada de abstração

GPU:
Metal / Direct3D12 / Vulkan / WebGPU

Data:
GLB + formato interno próprio

Export:
FBX inicialmente
GLB/BVH posteriormente

Core:
Skeleton + Retarget + IK + Filtering

Plugins:
Blender → primeiro
Unity → segundo
Unreal → terceiro
```

A decisão mais importante é **não acoplar o produto ao MediaPipe, Three.js ou a uma única engine**. O projeto deve possuir interfaces abstratas para `PoseProvider`, `ModelRuntime`, `CharacterImporter`, `CharacterExporter` e `Retargeter`.

Dessa forma podemos começar com ferramentas gratuitas e leves, mas substituir componentes individuais por soluções de maior qualidade sem reconstruir o aplicativo.

---

# 51. Riscos técnicos

## Alto

- auto-rigging de OBJ;
- reconstrução 3D precisa usando uma única câmera;
- mãos/dedos;
- exportação FBX perfeita;
- retargeting de personagens não convencionais.

## Médio

- performance WebGPU;
- compatibilidade entre GPUs;
- diferentes hierarquias de bones;
- modelos estilizados.

## Baixo

- webcam pose tracking básico;
- preview 3D;
- gravação;
- filtering;
- canonical skeleton;
- exportação GLB.

---

# 52. Estratégia de produto

O produto deve nascer como:

> **Local-first AI Motion Capture para desenvolvedores de jogos.**

O diferencial não precisa ser "a melhor IA de mocap do mundo".

O diferencial inicial pode ser:

```text
Character
+
Webcam
+
1 click
=
Animation
```

com exportação direta para:

```text
Blender
Unity
Unreal
```

Isso torna o produto muito mais simples de entender e validar.

---

## 53. Estado desejado da arquitetura

```text
                  ┌─────────────────────┐
                  │       CAMERA        │
                  └──────────┬──────────┘
                             ▼
                  ┌─────────────────────┐
                  │     POSE ENGINE     │
                  │ MediaPipe / ONNX    │
                  └──────────┬──────────┘
                             ▼
                  ┌─────────────────────┐
                  │   CANONICAL POSE    │
                  └──────────┬──────────┘
                             ▼
┌─────────────┐    ┌─────────────────────┐
│ FBX / OBJ   │───►│   CHARACTER RIG     │
└─────────────┘    └──────────┬──────────┘
                               ▼
                     ┌─────────────────┐
                     │   RETARGETING   │
                     └────────┬────────┘
                              ▼
                     ┌─────────────────┐
                     │   IK + FILTER   │
                     └────────┬────────┘
                              ▼
                     ┌─────────────────┐
                     │   ANIMATION     │
                     └────────┬────────┘
                              ▼
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
              Blender       Unity       Unreal
```

**Conclusão:** construir primeiro o núcleo local e compartilhado, manter o browser como runtime de primeira classe e usar GPU sempre que disponível. Isso permite ter um MVP gratuito, rápido e offline, enquanto mantém espaço para modelos de IA mais avançados e plugins profissionais no futuro.
