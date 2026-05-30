import type { PathOverride } from "../3d/SvgTypes"

export type EasingType = "linear" | "ease-in-out" | "spring" | "bounce"

export interface Keyframe {
  id: string
  time: number
  value: number
  easing: EasingType
}

export interface FillStop {
  id: string
  color: string
  position: number
}

export type FillGradientType = "linear" | "radial" | "conic" | "mesh"

export interface FillKeyframe {
  id: string
  time: number
  stops: FillStop[]
  gradientType?: FillGradientType
  easing: EasingType
}

export interface TimelineTrack {
  id: string
  name: string
  color: string
  min: number
  max: number
  defaultValue: number
  keyframes: Keyframe[]
}

export interface TimelinePropertyRow {
  id: string
  name: string
  color: string
  keyframes: Array<{
    id: string
    time: number
    label?: string
    easing?: EasingType
  }>
}

export interface ShapeStop {
  id: string
  time: number
  iconId: string
  iconName?: string
  svgContent: string
  color: string
  colorSecondary: string
  fillStops?: FillStop[]
  fillGradientType?: FillGradientType
  fillKeyframes?: FillKeyframe[]
  pathOverrides?: PathOverride[]
  easing: EasingType
  transitionType: "none" | "wipe"
  wipeDirection: { x: number; y: number }
  transitionStart?: number
  transitionEnd?: number
}

// Where the morph window sits inside a shape gap, as fractions of the gap (0..1).
// Outside [start, end] the shape holds; inside it blends to the next shape.
export const DEFAULT_TRANSITION_START = 0.25
export const DEFAULT_TRANSITION_END = 0.75

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

const springEase = (t: number) => {
  if (t === 0 || t === 1) return t
  const c4 = (2 * Math.PI) / 3
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

const bounceEase = (t: number) => {
  const n1 = 7.5625
  const d1 = 2.75

  if (t < 1 / d1) {
    return n1 * t * t
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}

export const applyEasing = (easing: EasingType, t: number): number => {
  if (easing === "ease-in-out") return easeInOut(t)
  if (easing === "spring") return springEase(t)
  if (easing === "bounce") return bounceEase(t)
  return t
}

export const interpolateKeyframes = (
  time: number,
  track: TimelineTrack
): number => {
  const keyframes = track.keyframes

  if (keyframes.length === 0) return track.defaultValue
  if (time <= keyframes[0].time) return keyframes[0].value
  if (time >= keyframes[keyframes.length - 1].time)
    return keyframes[keyframes.length - 1].value

  let prev = keyframes[0]
  let next = keyframes[keyframes.length - 1]
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      prev = keyframes[i]
      next = keyframes[i + 1]
      break
    }
  }

  const timeDiff = next.time - prev.time
  if (timeDiff === 0) return prev.value

  const ratio = (time - prev.time) / timeDiff
  const easedRatio = applyEasing(prev.easing, ratio)
  return prev.value + (next.value - prev.value) * easedRatio
}

const parseHexColor = (
  value: string
): { r: number; g: number; b: number } | null => {
  let hex = value.trim().replace(/^#/, "")
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("")
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

const toHexColor = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const channel = (next: number) =>
    Math.max(0, Math.min(255, Math.round(next)))
      .toString(16)
      .padStart(2, "0")
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

const interpolateColorKeyframes = (
  time: number,
  fallback: string,
  keyframes: Array<{ time: number; value: string; easing: EasingType }> = []
): string => {
  const sorted = keyframes
    .filter((keyframe) => parseHexColor(keyframe.value))
    .sort((a, b) => a.time - b.time)

  if (sorted.length === 0) return fallback
  if (time <= sorted[0].time) return sorted[0].value
  if (time >= sorted[sorted.length - 1].time)
    return sorted[sorted.length - 1].value

  let prev = sorted[0]
  let next = sorted[0]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i]
      next = sorted[i + 1]
      break
    }
  }

  const prevColor = parseHexColor(prev.value)
  const nextColor = parseHexColor(next.value)
  if (!prevColor || !nextColor) return fallback

  const span = next.time - prev.time
  const ratio = span > 0 ? (time - prev.time) / span : 0
  const eased = applyEasing(prev.easing, ratio)

  return toHexColor({
    r: prevColor.r + (nextColor.r - prevColor.r) * eased,
    g: prevColor.g + (nextColor.g - prevColor.g) * eased,
    b: prevColor.b + (nextColor.b - prevColor.b) * eased,
  })
}

const interpolateNumericKeyframes = (
  time: number,
  fallback: number,
  keyframes: Array<{ time: number; value: number; easing: EasingType }> = []
) => {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  if (sorted.length === 0) return fallback
  if (time <= sorted[0].time) return sorted[0].value
  if (time >= sorted[sorted.length - 1].time)
    return sorted[sorted.length - 1].value

  let prev = sorted[0]
  let next = sorted[0]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prev = sorted[i]
      next = sorted[i + 1]
      break
    }
  }

  const span = next.time - prev.time
  const ratio = span > 0 ? (time - prev.time) / span : 0
  const eased = applyEasing(prev.easing, ratio)
  return prev.value + (next.value - prev.value) * eased
}

export const interpolateFillKeyframes = (
  time: number,
  fallback: {
    color: string
    colorSecondary: string
    gradientType?: FillGradientType
    stops?: FillStop[]
  },
  keyframes: FillKeyframe[] = []
) => {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)
  const fallbackStops: FillStop[] = fallback.stops?.length
    ? fallback.stops
    : [
        { id: "start", color: fallback.color, position: 0 },
        { id: "end", color: fallback.colorSecondary, position: 1 },
      ]

  const stopsAt = (index: number) =>
    sorted[index]?.stops?.length ? sorted[index].stops : fallbackStops
  const maxStops = Math.max(
    fallbackStops.length,
    ...sorted.map((keyframe) => keyframe.stops?.length ?? 0)
  )
  const stopIdAt = (index: number) =>
    sorted.find((keyframe) => keyframe.stops?.[index])?.stops[index].id ??
    fallbackStops[index]?.id ??
    `stop-${index}`
  const stops = Array.from({ length: maxStops }).map((_, index) => {
    const fallbackStop =
      fallbackStops[index] ?? fallbackStops[fallbackStops.length - 1]
    return {
      id: stopIdAt(index),
      position: interpolateNumericKeyframes(
        time,
        fallbackStop.position,
        sorted.map((keyframe, keyframeIndex) => {
          const stop =
            stopsAt(keyframeIndex)[index] ??
            stopsAt(keyframeIndex)[stopsAt(keyframeIndex).length - 1] ??
            fallbackStop
          return {
            time: keyframe.time,
            value: stop.position,
            easing: keyframe.easing,
          }
        })
      ),
      color: interpolateColorKeyframes(
        time,
        fallbackStop.color,
        sorted.map((keyframe, keyframeIndex) => {
          const stop =
            stopsAt(keyframeIndex)[index] ??
            stopsAt(keyframeIndex)[stopsAt(keyframeIndex).length - 1] ??
            fallbackStop
          return {
            time: keyframe.time,
            value: stop.color,
            easing: keyframe.easing,
          }
        })
      ),
    }
  })

  return {
    color: stops[0]?.color ?? fallback.color,
    colorSecondary:
      stops[1]?.color ?? stops[0]?.color ?? fallback.colorSecondary,
    gradientType:
      [...sorted].reverse().find((keyframe) => keyframe.time <= time)
        ?.gradientType ??
      fallback.gradientType ??
      "linear",
    stops,
  }
}
