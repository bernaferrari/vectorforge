import type { MaterialPresetId } from "./MaterialPresets"

export type GradientType = "linear" | "radial" | "conic" | "mesh"

export type Vector3Value = { x: number; y: number; z: number }

export interface PathOverride {
  id: string
  visible: boolean
  color: string
  depthMultiplier: number
  scale?: Vector3Value
}

export interface GradientStop {
  id?: string
  color: string
  position: number
}

export interface SvgCanvasProps {
  iconAContent: string
  iconBContent: string
  materialPreset: MaterialPresetId
  colorA: string
  colorB: string
  colorASecondary?: string
  colorBSecondary?: string
  colorAStops?: GradientStop[]
  colorBStops?: GradientStop[]
  enableGradient?: boolean
  gradientType?: GradientType
  roughness: number
  metalness: number
  reflectance: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  thickness: number
  emissiveIntensity: number
  wireframe: boolean
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  geometryQuality: number
  layerSpacing: number
  innerElementScale: Vector3Value
  transitionType: "none" | "wipe"
  wipeDirection: { x: number; y: number }
  transitionProgress: number
  rotationOffset: Vector3Value
  objectScale: number
  objectScaleAxes?: Vector3Value
  moveOffset: Vector3Value
  isPlaying: boolean
  ambientColor: string
  ambientIntensity: number
  keyLightColor: string
  keyLightIntensity: number
  keyLightPosition: Vector3Value
  keyLightSoftness: number
  rimLightColor: string
  rimLightIntensity: number
  zoom: number
  viewInertiaEnabled?: boolean
  showCenterPoint?: boolean
  showTransformGizmo?: boolean
  selectedLayerId?: string | null
  pathOverridesA?: PathOverride[]
  pathOverridesB?: PathOverride[]
  onZoomChange?: (zoom: number) => void
  onViewRotationCommit?: (rotationDelta: Vector3Value) => void
  onViewRotationSet?: (
    rotation: Partial<Vector3Value>,
    options?: { commit?: boolean; updateTimeline?: boolean }
  ) => void
  onObjectScaleChange?: (scale: number) => void
  onObjectScaleAxisChange?: (
    axis: keyof NonNullable<SvgCanvasProps["objectScaleAxes"]>,
    value: number
  ) => void
  onMoveOffsetChange?: (
    axis: keyof SvgCanvasProps["moveOffset"],
    value: number
  ) => void
  onRotationAxisChange?: (
    axis: keyof SvgCanvasProps["rotationOffset"],
    value: number
  ) => void
  onModelReadyChange?: (ready: boolean) => void
}

export interface SvgCanvasRef {
  exportGltf: () => void
  startRecording: () => void
  stopRecording: (callback: (blob: Blob) => void) => void
  resetRotation: () => void
}
