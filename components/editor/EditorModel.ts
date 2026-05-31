import { MaterialPresetId } from "../3d/MaterialPresets"
import {
  EasingType,
  FillGradientType,
  FillKeyframe,
  FillStop,
  ShapeStop,
  TimelineTrack,
  applyEasing,
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
export type LightPosition = { x: number; y: number; z: number }
export const ROTATION_COLOR = "#ffd23f"

export type Vector3Keyframe = {
  id: string
  time: number
  value: LightPosition
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
  innerElementScale: LightPosition
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
  innerElementScale: LightPosition
  innerScaleKeyframes: Vector3Keyframe[]
  objectScale: number
  objectScaleAxes: LightPosition
  moveOffset: LightPosition
  moveKeyframes: Vector3Keyframe[]
  enableGradient: boolean
  fillMode: FillMode
  fillColor: string
  fillColorSecondary: string
  fillGradientType: FillGradientType
  fillStops?: FillStop[]
  fillKeyframes: FillKeyframe[]
  rotationOffset: LightPosition
  rotationAxisKeyframes: Vector3Keyframe[]
  keyLightColor: string
  keyLightIntensity: number
  keyLightPosition: LightPosition
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

export const AXIS_COLORS: Record<string, string> = {
  X: "#c4766f",
  Y: "#7dac8e",
  Z: "#7e9bbe",
}

export const MOTION_TRACK_NAMES: Record<MotionTrackId, string> = {
  extrusion: "Geometry",
  rotation: "Rotation",
  scale: "Scale",
  move: "Move",
  lighting: "Brightness",
}

export const makeFillStops = (
  color: string,
  colorSecondary: string,
  solid = false,
  positions: [number, number] = [0, 1]
): FillStop[] => [
  { id: "start", color, position: positions[0] },
  { id: "end", color: solid ? color : colorSecondary, position: positions[1] },
]

const GOOGLE_MESH_FILL_STOPS: FillStop[] = [
  { id: "google-top-left", color: "#FF9900", position: 0 },
  { id: "google-top-center", color: "#FF360A", position: 0.125 },
  { id: "google-top-right", color: "#D13AB3", position: 0.25 },
  { id: "google-middle-left", color: "#FFC700", position: 0.375 },
  { id: "google-center", color: "#807AFF", position: 0.5 },
  { id: "google-middle-right", color: "#1759FF", position: 0.625 },
  { id: "google-bottom-left", color: "#63E600", position: 0.75 },
  { id: "google-bottom-center", color: "#00C796", position: 0.875 },
  { id: "google-bottom-right", color: "#00ADF0", position: 1 },
]

export const googleMeshFillStops = (): FillStop[] =>
  GOOGLE_MESH_FILL_STOPS.map((stop) => ({ ...stop }))

export const normalizeFillStops = (
  stops: Array<{ id?: string; color: string; position: number }>
): FillStop[] => {
  const usedIds = new Set<string>()
  const nextStopId = (id: string | undefined, index: number) => {
    const baseId = id?.trim() || `stop-${index}`
    if (!usedIds.has(baseId)) {
      usedIds.add(baseId)
      return baseId
    }
    let suffix = 2
    let nextId = `${baseId}-${suffix}`
    while (usedIds.has(nextId)) {
      suffix += 1
      nextId = `${baseId}-${suffix}`
    }
    usedIds.add(nextId)
    return nextId
  }

  return stops
    .map((stop, index) => ({
      id: nextStopId(stop.id, index),
      color: stop.color.startsWith("#") ? stop.color : `#${stop.color}`,
      position: clampNumber(stop.position, 0, 1),
    }))
    .sort((a, b) => a.position - b.position)
}

export const stopsForGradientType = (
  current: {
    color: string
    colorSecondary: string
    gradientType?: FillGradientType
    stops?: FillStop[]
  },
  nextType: FillGradientType,
  solid = false
) => {
  const stops = normalizeFillStops(
    current.stops?.length
      ? current.stops
      : makeFillStops(current.color, current.colorSecondary, solid)
  )

  if (solid) return makeFillStops(current.color, current.color, true)
  return stops
}

export const interpolateLightPositionKeyframes = (
  time: number,
  fallback: LightPosition,
  keyframes: Vector3Keyframe[]
): LightPosition => {
  if (keyframes.length === 0) return fallback
  if (time <= keyframes[0].time) return keyframes[0].value
  if (time >= keyframes[keyframes.length - 1].time)
    return keyframes[keyframes.length - 1].value

  let previous = keyframes[0]
  let next = keyframes[keyframes.length - 1]
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      previous = keyframes[i]
      next = keyframes[i + 1]
      break
    }
  }
  if (!previous || !next || previous.id === next.id)
    return previous?.value ?? next?.value ?? fallback

  const rawProgress = (time - previous.time) / (next.time - previous.time)
  const eased = applyEasing(previous.easing, rawProgress)
  return {
    x: previous.value.x + (next.value.x - previous.value.x) * eased,
    y: previous.value.y + (next.value.y - previous.value.y) * eased,
    z: previous.value.z + (next.value.z - previous.value.z) * eased,
  }
}

export const interpolateScalarKeyframes = (
  time: number,
  fallback: number,
  keyframes: ScalarKeyframe[]
): number => {
  if (keyframes.length === 0) return fallback
  if (time <= keyframes[0].time) return keyframes[0].value
  if (time >= keyframes[keyframes.length - 1].time)
    return keyframes[keyframes.length - 1].value

  let previous = keyframes[0]
  let next = keyframes[keyframes.length - 1]
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      previous = keyframes[i]
      next = keyframes[i + 1]
      break
    }
  }
  if (!previous || !next || previous.id === next.id)
    return previous?.value ?? next?.value ?? fallback

  const eased = applyEasing(
    previous.easing,
    (time - previous.time) / (next.time - previous.time)
  )
  return previous.value + (next.value - previous.value) * eased
}

export const interpolateMaterialKeyframes = (
  time: number,
  fallback: MaterialSettings,
  keyframes: MaterialKeyframe[]
): MaterialSettings => {
  if (keyframes.length === 0) return fallback
  if (time <= keyframes[0].time) return keyframes[0].value
  if (time >= keyframes[keyframes.length - 1].time)
    return keyframes[keyframes.length - 1].value

  let previous = keyframes[0]
  let next = keyframes[keyframes.length - 1]
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      previous = keyframes[i]
      next = keyframes[i + 1]
      break
    }
  }
  if (!previous || !next || previous.id === next.id)
    return previous?.value ?? next?.value ?? fallback

  const eased = applyEasing(
    previous.easing,
    (time - previous.time) / (next.time - previous.time)
  )
  return (Object.keys(fallback) as MaterialSettingKey[]).reduce(
    (settings, key) => {
      settings[key] =
        previous.value[key] + (next.value[key] - previous.value[key]) * eased
      return settings
    },
    { ...fallback }
  )
}
