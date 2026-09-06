# PROJECT_EVOLUTION.md
# Motion Forge — Roadmap de Evolução
## Webcam → Pose 3D → Auto-Rig → IK → Motion Cleanup → Blender / Unity / Unreal

> Documento de evolução técnica do projeto.
>
> Objetivo: transformar uma webcam comum em uma ferramenta local-first de captura de movimento capaz de gerar animações reutilizáveis em personagens 3D e exportá-las para Blender, Unity e Unreal.

---

# 1. Visão de longo prazo

O produto deve evoluir por camadas, evitando tentar resolver todos os problemas de motion capture simultaneamente.

```text
WEBCAM
  ↓
POSE 2D
  ↓
POSE 3D
  ↓
BODY MODEL
  ↓
CANONICAL SKELETON
  ↓
AUTO-RIG
  ↓
RETARGET
  ↓
IK
  ↓
MOTION CLEANUP
  ↓
ANIMATION CLIP
  ↓
EXPORT
  ├── Blender
  ├── Unity
  └── Unreal
```

A aplicação deverá possuir dois runtimes:

```text
                    MOTION FORGE
                         │
             ┌───────────┴───────────┐
             │                       │
          DESKTOP                    WEB
       macOS / Windows           Browser
             │                       │
        Tauri + Rust            WebGPU/WASM
             │                       │
             └───────────┬───────────┘
                         │
                    SHARED CORE
```

O núcleo compartilhado deve concentrar:

- representação de pose;
- skeleton;
- retargeting;
- IK;
- filtering;
- animation data;
- validação;
- projeto interno.

---

# 2. Princípios de evolução

## 2.1 Não treinar uma IA própria inicialmente

O projeto deve começar utilizando modelos existentes.

Primeiro:

```text
MediaPipe Pose Landmarker
```

Depois:

```text
ONNX Runtime
```

E somente posteriormente considerar:

```text
Custom Pose Model
```

A documentação do MediaPipe Pose Landmarker indica que o sistema fornece landmarks corporais e coordenadas 3D de mundo, inclusive no ambiente Web. citeturn0search11

---

## 2.2 Local-first

O vídeo da câmera deve permanecer no dispositivo por padrão.

```text
Camera
  ↓
Local inference
  ↓
Pose
  ↓
Animation
```

Não:

```text
Camera
  ↓
Cloud
  ↓
AI
```

O processamento local também reduz latência, custo e dependência de internet. ONNX Runtime Web documenta execução no navegador com WebGPU/WebGL/WebAssembly. citeturn0search16

---

## 2.3 Evoluir sem quebrar o core

Cada estágio deve possuir uma interface estável.

Exemplo:

```text
PoseProvider
SkeletonSolver
RigProvider
Retargeter
IKSolver
MotionProcessor
AnimationExporter
```

Podemos substituir a implementação sem alterar o restante do pipeline.

---

# 3. Roadmap geral

| Fase | Objetivo | Resultado |
|---|---|---|
| 0 | Foundation | Core e viewer |
| 1 | Webcam | Captura de câmera |
| 2 | Pose 2D | Landmarks corporais |
| 3 | Pose 3D | Skeleton 3D |
| 4 | Character Rig | Importação e mapeamento |
| 5 | Auto-Rig | Rig automático |
| 6 | Retarget | Pose → personagem |
| 7 | IK | Mãos/pés estáveis |
| 8 | Motion Cleanup | Animação limpa |
| 9 | Recording | Animation clips |
| 10 | Export | FBX/GLB/BVH |
| 11 | Blender | Pipeline Blender |
| 12 | Unity | Humanoid |
| 13 | Unreal | IK Rig / Retargeter |
| 14 | Advanced Mocap | mãos/face/multicamera |

---

# 4. FASE 0 — Foundation

## Objetivo

Criar a infraestrutura antes de desenvolver IA.

### Stack

```text
Frontend:
React
TypeScript
Vite
Three.js

Desktop:
Tauri
Rust

Web:
Browser
WebGPU
Web Workers
WASM

Package manager:
pnpm

Repository:
Monorepo
```

### Estrutura

```text
motion-forge/
├── apps/
│   ├── desktop/
│   └── web/
│
├── packages/
│   ├── core/
│   ├── pose/
│   ├── skeleton/
│   ├── rig/
│   ├── retarget/
│   ├── ik/
│   ├── motion/
│   ├── animation/
│   ├── formats/
│   ├── renderer/
│   └── ui/
│
├── native/
│   ├── importer/
│   ├── exporter/
│   └── runtime/
│
├── models/
├── plugins/
│   ├── blender/
│   ├── unity/
│   └── unreal/
│
└── tests/
```

---

# 5. FASE 1 — Webcam

## Objetivo

Capturar vídeo em tempo real.

### Desktop

```text
Webcam
 ↓
Native / Web camera API
 ↓
Frame pipeline
```

### Web

```text
navigator.mediaDevices
 ↓
VideoFrame
 ↓
Pose Worker
```

### Requisitos

- seleção de câmera;
- resolução;
- FPS;
- espelhamento;
- exposição opcional;
- preview;
- permissões.

### Configurações

```text
Camera:
720p / 1080p

Processing:
30 FPS

Preview:
60 FPS
```

O processamento da câmera não deve bloquear a UI.

No Web, o Pose Landmarker pode bloquear a thread principal se executado diretamente; a própria documentação recomenda utilizar Web Workers para processamento de vídeo. citeturn0search12

---

# 6. FASE 2 — Pose 2D

## Objetivo

Detectar os principais landmarks humanos.

Inicialmente:

```text
Head
Neck
Shoulders
Elbows
Wrists
Hips
Knees
Ankles
Feet
```

Pipeline:

```text
Camera Frame
 ↓
Pose Model
 ↓
2D Landmarks
 ↓
Confidence
```

Representação:

```typescript
Landmark2D {
    x: number
    y: number
    confidence: number
}
```

---

# 7. FASE 3 — Pose 3D

## Objetivo

Transformar os landmarks em um corpo 3D utilizável.

O MediaPipe Pose Landmarker já disponibiliza landmarks em coordenadas 3D de mundo, o que permite utilizá-lo como primeiro backend do projeto. citeturn0search11

Pipeline:

```text
2D Landmarks
      ↓
Depth Estimation
      ↓
3D Landmarks
      ↓
Body Reconstruction
```

Representação:

```typescript
Landmark3D {
    x: number
    y: number
    z: number
    confidence: number
}
```

---

# 8. Normalização da pose

A pose capturada não deve ser aplicada diretamente ao personagem.

Primeiro:

```text
Camera Space
    ↓
World Space
    ↓
Body Space
    ↓
Canonical Space
```

Normalizar:

- escala;
- orientação;
- posição;
- altura;
- centro de massa;
- comprimento dos membros.

---

# 9. Root / Pelvis

O quadril será inicialmente tratado como root corporal.

```text
Root
 ↓
Pelvis
 ↓
Spine
```

A posição do root deverá ser separada da rotação dos ossos.

Isso permite:

```text
Root Motion
```

e

```text
In-place Animation
```

como opções independentes.

---

# 10. FASE 4 — Canonical Skeleton

Criar um skeleton interno.

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

O canonical skeleton será o idioma intermediário do projeto.

```text
Pose AI
   ↓
Canonical Skeleton
   ↓
Any Character Rig
```

---

# 11. FASE 5 — Character Import

## Prioridade

Primeiro:

```text
FBX com skeleton
```

Depois:

```text
GLB com skeleton
```

Depois:

```text
OBJ sem skeleton
```

---

# 12. FBX com skeleton

Fluxo:

```text
FBX
 ↓
Skeleton Detection
 ↓
Bone Name Analysis
 ↓
Hierarchy Analysis
 ↓
Humanoid Mapping
```

Exemplos:

```text
Hips
Pelvis
Root
```

podem representar:

```text
Canonical.Hips
```

Da mesma forma:

```text
UpperArm_L
LeftArm
LeftUpperArm
```

podem ser mapeados para:

```text
Canonical.LeftUpperArm
```

---

# 13. Rig Profile

Cada personagem deverá gerar:

```json
{
  "rigVersion": 1,
  "root": "Armature",
  "hips": "Hips",
  "bones": {
    "spine": "Spine",
    "chest": "Chest",
    "neck": "Neck",
    "head": "Head",
    "leftUpperArm": "LeftArm",
    "leftLowerArm": "LeftForeArm",
    "leftHand": "LeftHand"
  }
}
```

Também:

```text
restPose
boneLengths
boneAxes
scale
forwardAxis
upAxis
```

---

# 14. FASE 6 — Auto-Rigging

Esta fase deve ser dividida em três níveis.

## Nível 1 — Auto Mapping

Personagem já possui skeleton.

```text
FBX
 ↓
Existing Skeleton
 ↓
Bone Detection
 ↓
Automatic Mapping
```

Meta:

```text
80–95% dos personagens humanoides
```

---

## Nível 2 — Assisted Rigging

Quando a IA não tiver certeza:

```text
Detected:
Left Arm 82%

User:
Confirm / Correct
```

Interface:

```text
HEAD       ●
NECK       ●
LEFT ARM   ●
RIGHT ARM  ●
LEFT LEG   ●
RIGHT LEG  ●
```

O usuário poderá clicar em um bone no viewport.

---

## Nível 3 — OBJ Auto-Rig

Somente depois.

```text
OBJ
 ↓
Mesh Analysis
 ↓
Human Shape Detection
 ↓
Skeleton Placement
 ↓
Bone Creation
 ↓
Skinning
 ↓
Weight Paint
```

Este será um dos componentes mais complexos do projeto.

---

# 15. Skinning

Para OBJ:

```text
Mesh
 ↓
Skeleton
 ↓
Bone Influence
 ↓
Skin Weights
 ↓
Skinned Mesh
```

A qualidade do skinning deverá possuir uma etapa de validação:

```text
Shoulder Test
Elbow Test
Hip Test
Knee Test
```

---

# 16. T-Pose / Rest Pose

O projeto deverá tentar normalizar personagens para uma pose de referência.

Preferência:

```text
T-Pose
```

ou:

```text
A-Pose
```

internamente.

O personagem será convertido para:

```text
Canonical Rest Pose
```

antes do retarget.

Unity utiliza um Avatar para identificar a estrutura humanoide e permitir retargeting e IK; essa mesma ideia de uma representação humanoide intermediária é importante para o Motion Forge. citeturn0search2

---

# 17. FASE 7 — Retargeting

Pipeline:

```text
Captured Pose
      ↓
Canonical Skeleton
      ↓
Character Rest Pose
      ↓
Bone Mapping
      ↓
Rotation Conversion
      ↓
Character Pose
```

Nunca copiar diretamente:

```text
MediaPipe Bone
        ↓
Character Bone
```

Sempre:

```text
MediaPipe
   ↓
Canonical
   ↓
Character
```

---

# 18. Retarget por rotação

Para cada osso:

```text
CharacterRotation =
    RestCorrection *
    CapturedRotation
```

O sistema deverá calcular:

- orientação local;
- parent orientation;
- rest orientation;
- axis correction.

---

# 19. Retarget por proporção

Personagens podem possuir:

```text
Braços longos
Pernas curtas
Cabeça grande
Torso pequeno
```

Portanto o retarget precisa ser proporcional.

```text
Captured Body
      ↓
Normalized Body
      ↓
Character Scale
```

---

# 20. FASE 8 — IK

A primeira implementação deverá utilizar IK para:

```text
Feet
Hands
Elbows
Knees
```

---

# 21. Foot IK

Problema:

```text
Pose AI
   ↓
Foot jitter
```

Solução:

```text
Foot Position
 ↓
Ground Detection
 ↓
Foot Lock
 ↓
Leg IK
```

Objetivo:

```text
pé permanece no chão
```

quando a pessoa está parada.

---

# 22. Foot Lock

Detectar:

```text
velocity ≈ 0
height stable
direction stable
```

Então:

```text
LOCK FOOT
```

Quando o pé começar a se mover:

```text
UNLOCK FOOT
```

---

# 23. Hand IK

Para mãos:

```text
Wrist Position
 ↓
Arm IK
 ↓
Elbow Constraint
 ↓
Hand Orientation
```

Futuramente:

```text
Finger IK
```

---

# 24. Elbow / Knee Pole Vectors

Para evitar inversão:

```text
Arm
 ├── Shoulder
 ├── Elbow
 └── Hand
```

usar:

```text
Pole Vector
```

O mesmo para:

```text
Hip
 ↓
Knee
 ↓
Foot
```

---

# 25. Coluna

A coluna não deve receber somente uma rotação.

Distribuir:

```text
Pelvis
 ↓
Spine
 ↓
Chest
 ↓
Neck
```

Isso gera movimento mais natural.

---

# 26. FASE 9 — Motion Cleanup

A captura bruta deverá ser armazenada.

```text
RAW
 ↓
CLEAN
```

Nunca destruir o original.

---

# 27. Motion Cleanup Pipeline

```text
Raw Motion
   ↓
Confidence Filter
   ↓
Outlier Removal
   ↓
Temporal Filter
   ↓
Velocity Filter
   ↓
Foot Lock
   ↓
IK Correction
   ↓
Bone Constraint
   ↓
Final Motion
```

---

# 28. Confidence Filter

Se:

```text
confidence < threshold
```

não aceitar diretamente a posição.

Usar:

```text
previous valid pose
```

ou interpolação.

---

# 29. Outlier Detection

Detectar:

```text
position jump
rotation jump
velocity spike
acceleration spike
```

Exemplo:

```text
Frame 100
Hand = X

Frame 101
Hand = X + 2m

Frame 102
Hand = X
```

Frame 101 é provavelmente um outlier.

---

# 30. Temporal Filtering

Implementar inicialmente:

```text
Exponential Smoothing
```

Depois:

```text
One Euro Filter
```

Opcionalmente:

```text
Kalman Filter
```

para processamento offline.

---

# 31. Offline Cleanup

Após gravar:

```text
Raw Animation
       ↓
High Quality Cleanup
       ↓
Final Animation
```

O modo offline poderá gastar mais tempo para produzir uma animação melhor.

---

# 32. Dois modos

## Live

Prioridade:

```text
latency
```

Configuração:

```text
30 FPS inference
60 FPS render
minimal smoothing
```

## Studio

Prioridade:

```text
quality
```

Pode executar:

```text
offline reconstruction
advanced filtering
IK optimization
foot cleanup
```

---

# 33. FASE 10 — Recording

Criar:

```text
Record
Stop
Pause
Resume
```

Dados:

```text
AnimationClip
```

Estrutura:

```text
AnimationClip
├── name
├── duration
├── sampleRate
├── rootMotion
├── tracks
│   ├── position
│   ├── rotation
│   └── scale
└── metadata
```

---

# 34. Sample Rate

Captura:

```text
30 FPS
```

Export:

```text
30 FPS
60 FPS
```

O sistema deve permitir resampling.

```text
30 FPS capture
      ↓
Interpolation
      ↓
60 FPS animation
```

---

# 35. Animation Compression

Para reduzir tamanho:

```text
Keyframe Reduction
```

Remover keyframes quando:

```text
error < threshold
```

Exemplo:

```text
Position Error < 0.001
Rotation Error < 0.1°
```

Os valores devem ser configuráveis.

---

# 36. Root Motion

Oferecer:

```text
Root Motion:
ON
OFF
```

### ON

A animação contém deslocamento.

### OFF

O personagem permanece no lugar.

---

# 37. FASE 11 — Export

Prioridade:

```text
FBX
GLB
BVH
```

### FBX

Principal formato para pipeline profissional e engines.

Unity documenta FBX como formato recomendado para esse fluxo e permite exportar mesh, skeleton, materiais e animações. citeturn0search6

### GLB

Principal formato para Web.

### BVH

Formato simples para motion capture.

---

# 38. Blender Pipeline

Primeira integração:

```text
Motion Forge
 ↓
FBX
 ↓
Blender
```

Segunda integração:

```text
Motion Forge
 ↓
Blender Add-on
```

Addon:

```text
Import Motion
Retarget
Bake
Cleanup
Export
```

A própria extensão de retargeting do Blender demonstra a viabilidade de operações como alinhamento de bones, bake de constraints e transferência de root motion. citeturn0search9

---

# 39. Unity Pipeline

Objetivo:

```text
FBX
 ↓
Unity Import
 ↓
Humanoid Avatar
 ↓
Animation Clip
```

O Unity usa o Avatar para mapear a estrutura humanoide e permite retargeting entre personagens humanoides. citeturn0search0

Export profile:

```text
UnityHumanoid
```

Configurações:

```text
Scale
Root Bone
Humanoid Bone Mapping
T-Pose
Animation Type
```

---

# 40. Unity Plugin

Fase posterior:

```text
Motion Forge
      ↓
Live Link
      ↓
Unity
```

Possíveis protocolos:

```text
UDP
WebSocket
OSC
```

O plugin poderá receber:

```text
Pose
Root Motion
Hands
Face
```

em tempo real.

---

# 41. Unreal Pipeline

Objetivo:

```text
FBX
 ↓
Unreal
 ↓
IK Rig
 ↓
IK Retargeter
 ↓
Animation Sequence
```

O sistema IK Rig/Retargeting da Unreal foi projetado justamente para transferir animações entre personagens com proporções diferentes e aplicar ajustes procedurais por IK. citeturn0search7

---

# 42. Unreal Plugin

Fase posterior:

```text
Motion Forge
      ↓
Live Link / custom stream
      ↓
Unreal
      ↓
IK Rig
```

Objetivo:

```text
Camera
 ↓
Motion Forge
 ↓
Unreal Character
```

em tempo real.

---

# 43. FASE 12 — Hands

Depois do corpo:

```text
Body
 ↓
Hands
```

Adicionar:

```text
Thumb
Index
Middle
Ring
Pinky
```

Cada mão:

```text
21 landmarks
```

Pipeline:

```text
Camera
 ↓
Body Pose
 ↓
Hand Detection
 ↓
Finger Skeleton
```

---

# 44. FASE 13 — Face

Depois das mãos:

```text
Face Landmarks
 ↓
Facial Rig
 ↓
BlendShapes
```

Export:

```text
Unity BlendShapes
Unreal Morph Targets
Blender Shape Keys
```

---

# 45. FASE 14 — Multi-camera

Somente depois do pipeline monocular estar estável.

```text
Camera A ─┐
Camera B ─┼──► Multi-view Reconstruction
Camera C ─┘
                  ↓
               Pose 3D
```

Benefícios:

- menor ambiguidade de profundidade;
- melhor oclusão;
- melhor movimento lateral;
- maior qualidade offline.

---

# 46. FASE 15 — Advanced AI

Somente quando o pipeline tradicional estiver funcionando.

Possibilidades:

```text
Pose Refinement
Motion Prediction
Motion Completion
Foot Contact Prediction
Occlusion Recovery
Motion Denoising
```

---

# 47. Pose Refinement

```text
Pose AI
 ↓
Initial Pose
 ↓
Refinement Model
 ↓
High Quality Pose
```

O refinement model não precisa detectar o corpo do zero.

Ele apenas melhora:

```text
joints
depth
rotation
```

Isso reduz custo computacional.

---

# 48. Motion Completion

Se a IA perder uma mão:

```text
Frame 100 ✓
Frame 101 ✓
Frame 102 ✗
Frame 103 ✗
Frame 104 ✓
```

O sistema pode reconstruir:

```text
Frame 102
Frame 103
```

por interpolação ou modelo de motion completion.

---

# 49. Performance Architecture

## Desktop

```text
Camera
 ↓
GPU inference
 ↓
Compact Pose Buffer
 ↓
CPU Retarget
 ↓
GPU Render
```

Evitar:

```text
GPU → CPU → GPU
```

sempre que possível.

---

# 50. Apple Silicon

Prioridade:

```text
Metal
```

No macOS:

```text
M-series
 ↓
GPU
 ↓
Pose
 ↓
Render
```

O runtime deve detectar automaticamente o backend disponível.

---

# 51. Windows

Prioridade:

```text
DirectML / Direct3D / ONNX Runtime
```

Fallback:

```text
CPU
```

A arquitetura deve manter o backend de inferência desacoplado.

---

# 52. WebGPU

No browser:

```text
WebGPU
 ↓
Inference
 ↓
Three.js
```

Fallback:

```text
WebGL
 ↓
WASM
```

---

# 53. Web Worker Architecture

```text
Main Thread
 ├── UI
 └── Rendering

Pose Worker
 └── Pose inference

Motion Worker
 ├── Filtering
 ├── Retarget
 └── IK

Export Worker
 └── File generation
```

---

# 54. Shared Core

Idealmente:

```text
Rust Core
```

ou:

```text
WASM Core
```

poderá ser utilizado tanto por:

```text
Desktop
```

quanto:

```text
Web
```

O objetivo é compartilhar matemática e processamento sempre que isso não prejudicar a performance nativa.

---

# 55. Fallback Strategy

Sempre:

```text
GPU
 ↓
Alternative GPU backend
 ↓
WASM SIMD
 ↓
CPU
```

Nunca bloquear a aplicação por falta de GPU.

---

# 56. Quality Profiles

## LOW

```text
Pose Lite
30 FPS
low smoothing
```

## BALANCED

```text
Pose Full
30 FPS
medium filtering
IK
```

## HIGH

```text
higher quality model
offline cleanup
advanced IK
```

## ULTRA

```text
multi-pass processing
high quality refinement
advanced cleanup
```

---

# 57. UX de evolução

A interface deve revelar complexidade progressivamente.

## Modo Simple

```text
1. Import Character
2. Start Camera
3. Record
4. Export
```

## Modo Advanced

```text
Pose
Rig
Retarget
IK
Filters
Keyframes
Export
```

---

# 58. Diagnóstico automático

Antes de capturar:

```text
✓ Camera detected
✓ Body detected
✓ Character loaded
✓ Humanoid rig detected
✓ Bone mapping valid
✓ T-Pose calibrated
✓ FPS sufficient
```

Se houver problema:

```text
⚠ Left arm uncertain
⚠ Character has no foot bones
⚠ Camera lighting poor
```

---

# 59. Calibration

Antes da captura:

```text
Stand in T-Pose
        ↓
3 seconds
        ↓
Calibrate
```

Calcular:

```text
height
shoulder width
arm length
leg length
body orientation
camera orientation
```

---

# 60. Capture Protocol

Recomendado:

```text
1. Stand neutral
2. T-Pose
3. Arms down
4. Start recording
```

Isso fornece uma referência para o retarget.

---

# 61. Motion Quality Metrics

Cada captura deve receber métricas:

```text
Pose Confidence
Motion Smoothness
Foot Stability
Bone Stability
Dropped Frames
Latency
```

Exemplo:

```text
Motion Quality
██████████████████░░ 91%

Pose Confidence     96%
Foot Stability      88%
Smoothness          93%
Dropped Frames       0%
```

---

# 62. Test Dataset

Criar dataset interno de testes:

```text
idle
walk
run
jump
squat
attack
dance
turn
wave
punch
kick
```

Cada movimento deverá testar problemas diferentes.

---

# 63. Automated Tests

## Pose

```text
landmark validity
confidence
scale
orientation
```

## Retarget

```text
T-Pose
arm rotation
leg rotation
spine rotation
```

## IK

```text
foot lock
hand target
knee pole
elbow pole
```

## Export

```text
FBX import
GLB import
Blender
Unity
Unreal
```

---

# 64. Definition of Done — Fase 1

```text
[ ] Webcam funciona
[ ] Pose 2D funciona
[ ] Pose 3D funciona
[ ] FPS medido
[ ] Worker separado
[ ] Fallback CPU
```

---

# 65. Definition of Done — Fase 2

```text
[ ] FBX carregado
[ ] Skeleton detectado
[ ] Humanoid mapping
[ ] Canonical skeleton
[ ] T-Pose calibration
```

---

# 66. Definition of Done — Fase 3

```text
[ ] Retarget
[ ] Character follows user
[ ] Arm movement
[ ] Leg movement
[ ] Spine movement
[ ] Head movement
```

---

# 67. Definition of Done — Fase 4

```text
[ ] Foot IK
[ ] Hand IK
[ ] Knee constraints
[ ] Elbow constraints
[ ] Foot lock
```

---

# 68. Definition of Done — Fase 5

```text
[ ] Recording
[ ] Timeline
[ ] Raw animation
[ ] Clean animation
[ ] Filtering
[ ] Keyframe reduction
```

---

# 69. Definition of Done — Fase 6

```text
[ ] FBX export
[ ] GLB export
[ ] Blender validation
[ ] Unity validation
[ ] Unreal validation
```

---

# 70. Definition of Done — Auto-Rig

```text
[ ] Existing skeleton detection
[ ] Automatic bone mapping
[ ] Assisted correction
[ ] Rest pose generation
[ ] Skinning
[ ] OBJ support
```

---

# 71. Definition of Done — Professional MVP

O MVP profissional será considerado concluído quando:

```text
Character FBX
       +
Webcam
       ↓
Pose 3D
       ↓
Auto Mapping
       ↓
Retarget
       ↓
IK
       ↓
Motion Cleanup
       ↓
Animation Clip
       ↓
FBX
       ↓
Blender / Unity / Unreal
```

funcionar de maneira reproduzível.

---

# 72. Ordem recomendada de desenvolvimento

Não implementar na ordem visual do produto.

Implementar:

```text
1. Core math
2. Canonical skeleton
3. Pose provider
4. Character importer
5. Bone mapping
6. Retarget
7. IK
8. Filtering
9. Recording
10. Export
11. UI polish
12. Auto-rig
13. Plugins
14. Hands
15. Face
16. Multi-camera
17. Advanced AI
```

---

# 73. O que deve ser evitado

Não começar por:

```text
❌ Auto-rig de OBJ
❌ Face mocap
❌ Finger tracking
❌ Multi-camera
❌ Cloud AI
❌ Treinamento próprio
❌ Plugin Unreal
❌ Plugin Unity
```

antes de provar:

```text
Webcam
 ↓
Pose 3D
 ↓
Retarget
 ↓
IK
 ↓
Export
```

---

# 74. Marco estratégico

O primeiro grande marco deve ser:

> **"A pessoa fica na frente da webcam e o personagem FBX acompanha seus movimentos em tempo real."**

O segundo:

> **"Eu aperto Record e obtenho uma animação reutilizável."**

O terceiro:

> **"Eu exporto e abro a animação no Blender, Unity ou Unreal."**

Somente depois:

> **"Eu jogo um OBJ sem rig e o sistema cria tudo automaticamente."**

---

# 75. Arquitetura final desejada

```text
                           CAMERA
                              │
                              ▼
                    ┌──────────────────┐
                    │   POSE ENGINE    │
                    │ MediaPipe/ONNX   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    POSE 3D       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ CANONICAL BODY   │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
          EXISTING RIG              RAW MESH
                 │                       │
                 │                 AUTO-RIG
                 │                       │
                 └───────────┬───────────┘
                             ▼
                    ┌──────────────────┐
                    │    RETARGET      │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │       IK         │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ MOTION CLEANUP   │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ ANIMATION CLIP   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
           BLENDER         UNITY          UNREAL
```

---

# 76. Resultado esperado

Ao final da evolução, o usuário deverá conseguir:

```text
1. Abrir Motion Forge
2. Importar FBX ou OBJ
3. Detectar/gerar rig
4. Calibrar T-Pose
5. Ativar webcam
6. Visualizar personagem em tempo real
7. Gravar movimento
8. Corrigir IK
9. Limpar movimento
10. Editar timeline
11. Exportar animação
12. Abrir no Blender
13. Usar no Unity
14. Usar no Unreal
```

---

# 77. Visão futura

A arquitetura deverá permitir evoluir para:

```text
                    MOTION FORGE
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
      BODY             HANDS             FACE
        │                │                 │
        └────────────────┼─────────────────┘
                         │
                    FULL BODY
                         │
                  MOTION CAPTURE
                         │
              ┌──────────┴──────────┐
              │                     │
           OFFLINE                LIVE
              │                     │
              ▼                     ▼
          Animation              Engine
          Studio                 Streaming
              │                     │
       ┌──────┼──────┐       ┌──────┼──────┐
       ▼      ▼      ▼       ▼      ▼      ▼
    Blender Unity Unreal  Unity Unreal Blender
```

O objetivo não é criar apenas um "filtro de webcam".

O objetivo arquitetural é criar um **pipeline completo de produção de animação para jogos**, no qual a webcam é apenas a entrada inicial e o produto final é uma animação limpa, retargetável e utilizável diretamente em ferramentas de desenvolvimento de jogos.

---

# 78. Prioridade absoluta

Se houver limitação de tempo, equipe ou capacidade computacional, manter esta ordem:

```text
★★★★★ Pose 3D
★★★★★ Canonical Skeleton
★★★★★ Retarget
★★★★★ IK
★★★★★ Motion Cleanup
★★★★★ Export

★★★★☆ Auto Mapping
★★★★☆ FBX
★★★★☆ Blender
★★★★☆ Unity
★★★★☆ Unreal

★★★☆☆ Auto-Rig
★★★☆☆ OBJ
★★★☆☆ Hands

★★☆☆☆ Face
★★☆☆☆ Multi-camera

★☆☆☆☆ Custom AI
★☆☆☆☆ Cloud inference
```

A qualidade do produto dependerá mais de um **pipeline sólido de pose → skeleton → retarget → IK → cleanup** do que de adicionar rapidamente mais modelos de IA.

---

# 79. Primeira implementação recomendada

O primeiro protótipo real deve ser deliberadamente pequeno:

```text
React
+
Three.js
+
MediaPipe Pose
+
Canonical Skeleton
+
One humanoid GLB
```

Depois:

```text
Retarget
```

Depois:

```text
IK
```

Depois:

```text
Record
```

Depois:

```text
FBX Export
```

Somente quando isso estiver funcionando:

```text
FBX arbitrary character
OBJ
Auto-Rig
```

---

# 80. Critério final de arquitetura

A arquitetura está correta se conseguirmos trocar:

```text
MediaPipe
```

por:

```text
ONNX Model
```

sem modificar:

```text
Retarget
IK
Motion Cleanup
Export
```

e se conseguirmos trocar:

```text
Three.js
```

por outro renderer sem modificar:

```text
Pose
Skeleton
Animation
```

e se conseguirmos adicionar:

```text
Blender
Unity
Unreal
```

sem modificar:

```text
Canonical Animation
```

Essa separação é o principal mecanismo para manter o projeto sustentável durante sua evolução.
