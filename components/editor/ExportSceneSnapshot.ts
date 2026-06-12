import type { MaterialPresetId } from "../3d/MaterialPresets"
import type {
  LightPosition,
  MaterialKeyframe,
  MaterialSettings,
  Vector3Keyframe,
} from "./EditorModel"
import type { FillKeyframe, ShapeStop, TimelineTrack } from "./TimelineModel"

export interface ExportSceneSnapshot {
  duration: number
  materialPreset: MaterialPresetId
  colorA: string
  colorB: string
  fillKeyframes: FillKeyframe[]
  materialSettings: MaterialSettings
  materialKeyframes: MaterialKeyframe[]
  roughness: number
  metalness: number
  reflectance: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  thickness: number
  emissiveIntensity: number
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  layerSpacing: number
  ambientIntensity: number
  keyLightIntensity: number
  rimLightIntensity: number
  svgPathA: string
  svgPathB: string
  shapes: ShapeStop[]
  tracks: TimelineTrack[]
  rotationOffset: LightPosition
  rotationAxisKeyframes: Vector3Keyframe[]
  objectScale: number
  objectScaleAxes: LightPosition
  moveOffset: LightPosition
  moveKeyframes: Vector3Keyframe[]
  keyLightPosition: LightPosition
  keyLightPositionKeyframes: Vector3Keyframe[]
}
