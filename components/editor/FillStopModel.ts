import type { FillGradientType, FillStop } from "./TimelineModel"
import { clampNumber } from "./EditorModel"

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
