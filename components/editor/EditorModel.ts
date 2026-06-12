import { MaterialPresetId } from "../3d/MaterialPresets"
import {
  EasingType,
  FillGradientType,
  FillKeyframe,
  FillStop,
  ShapeStop,
  TimelineTrack,
} from "./TimelineModel"

export const finiteNumber = (value: number | undefined | null, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

export const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export const TIMELINE_FRAME_RATE = 60
export const quantizeTimeToFrame = (time: number) =>
  Number(
    (Math.round(time * TIMELINE_FRAME_RATE) / TIMELINE_FRAME_RATE).toFixed(3)
  )

export const isEditableShortcutTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  )

export const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360

export const createEditorId = (prefix: string) => {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${id}`
}

export type FillMode = "solid" | "gradient"
export type MotionTrackId =
  | "extrusion"
  | "rotation"
  | "scale"
  | "move"
  | "lighting"
export type Vec3 = { x: number; y: number; z: number }
export type LightPosition = Vec3
export const ROTATION_COLOR = "#ffd23f"

export type Vector3Keyframe = {
  id: string
  time: number
  value: Vec3
  easing: EasingType
}

export type LightPositionKeyframe = Vector3Keyframe

export type ScalarKeyframe = {
  id: string
  time: number
  value: number
  easing: EasingType
}

export type MaterialSettings = {
  roughness: number
  metalness: number
  reflectance: number
  clearcoat: number
  clearcoatRoughness: number
  transmission: number
  thickness: number
  emissiveIntensity: number
}

export type MaterialSettingKey = keyof MaterialSettings

export type MaterialKeyframe = {
  id: string
  time: number
  value: MaterialSettings
  easing: EasingType
}

export type GeometrySettings = {
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  geometryQuality: number
  layerSpacing: number
  innerElementScale: Vec3
}

export type LightSettings = {
  keyLightColor: string
  keyLightIntensity: number
  keyLightPosition: Vec3
  keyLightSoftness: number
}

export type TransformSettings = {
  objectScale: number
  objectScaleAxes: Vec3
  moveOffset: Vec3
  rotationOffset: Vec3
  previewRotationOffset: Vec3 | null
  isScaleLocked: boolean
}

export type TimeKeyframe = { time: number }

export type EditorSnapshot = {
  activeRecipeId: string | null
  shapes: ShapeStop[]
  duration: number
  materialPreset: MaterialPresetId
  materialSettings: MaterialSettings
  materialKeyframes: MaterialKeyframe[]
  extrusionDepth: number
  bevelEnabled: boolean
  bevelThickness: number
  bevelSize: number
  bevelSegments: number
  geometryQuality: number
  qualityKeyframes: ScalarKeyframe[]
  layerSpacing: number
  innerElementScale: Vec3
  innerScaleKeyframes: Vector3Keyframe[]
  objectScale: number
  objectScaleAxes: Vec3
  moveOffset: Vec3
  moveKeyframes: Vector3Keyframe[]
  enableGradient: boolean
  fillMode: FillMode
  fillColor: string
  fillColorSecondary: string
  fillGradientType: FillGradientType
  fillStops?: FillStop[]
  fillKeyframes: FillKeyframe[]
  rotationOffset: Vec3
  rotationAxisKeyframes: Vector3Keyframe[]
  keyLightColor: string
  keyLightIntensity: number
  keyLightPosition: Vec3
  keyLightSoftness: number
  keyLightPositionKeyframes: LightPositionKeyframe[]
  tracks: TimelineTrack[]
}

export const FILL_MODES: Array<{ id: FillMode; label: string }> = [
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
]

export const EXTRUDE_DEFAULT = 10
export const EXTRUDE_MAX = 60
export const SCALE_DEFAULT = 1
export const SCALE_MAX = 3
export const GEOMETRY_QUALITY_DEFAULT = 0.045
export const LIGHT_MAX = 25
export const MAX_BEVEL_SEGMENTS = 24
export const DEFAULT_ROTATION_START = 0
export const DEFAULT_ROTATION_END = 360
export const ROTATION_MIN = -100000
export const ROTATION_MAX = 100000
export const MOVE_COLOR = "#38bdf8"
export const MAX_UNDO_STEPS = 80

export const DEFAULT_GEOMETRY_SETTINGS: GeometrySettings = {
  extrusionDepth: EXTRUDE_DEFAULT,
  bevelEnabled: true,
  bevelThickness: 0.12,
  bevelSize: 0.06,
  bevelSegments: 4,
  geometryQuality: GEOMETRY_QUALITY_DEFAULT,
  layerSpacing: 0.16,
  innerElementScale: { x: 1, y: 1, z: 1 },
}

export const DEFAULT_TRANSFORM_SETTINGS: TransformSettings = {
  objectScale: SCALE_DEFAULT,
  objectScaleAxes: { x: 1, y: 1, z: 1 },
  moveOffset: { x: 0, y: 0, z: 0 },
  rotationOffset: { x: 0, y: 0, z: 0 },
  previewRotationOffset: null,
  isScaleLocked: true,
}

export const DEFAULT_LIGHT_SETTINGS: LightSettings = {
  keyLightColor: "#ffffff",
  keyLightIntensity: 1.08,
  keyLightPosition: { x: 5, y: 5, z: 4 },
  keyLightSoftness: 0.35,
}

export const AXIS_COLORS: Record<string, string> = {
  X: "#c4766f",
  Y: "#7dac8e",
  Z: "#7e9bbe",
}

export const MOTION_TRACK_NAMES: Record<MotionTrackId, string> = {
  extrusion: "Depth",
  rotation: "Rotation",
  scale: "Scale",
  move: "Move",
  lighting: "Brightness",
}
