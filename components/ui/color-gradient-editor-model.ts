import {
  colorAtGradientPoint,
  colorAtStopPosition,
  gradientPreviewCss,
} from "./color-picker-utils"
import type { GradientType } from "./color-gradient-mode-toggle"
import type { NormalizedColorStop } from "./color-stop-model"

export const gradientEditorPreviewCss = ({
  gradientType,
  stops,
  fallback,
}: {
  gradientType: GradientType
  stops: NormalizedColorStop[]
  fallback: string
}) => {
  const gradientStopsCss = stops
    .map((stop) => `${stop.color} ${Math.round(stop.position * 100)}%`)
    .join(", ")

  if (stops.length <= 1) return fallback
  if (gradientType === "mesh") return gradientPreviewCss("mesh", stops)
  if (gradientType === "radial")
    return `radial-gradient(circle at 35% 35%, ${gradientStopsCss})`
  if (gradientType === "conic")
    return `conic-gradient(from 45deg, ${gradientStopsCss}, ${stops[0]?.color ?? fallback})`
  return `linear-gradient(90deg, ${gradientStopsCss})`
}

export const createGradientStopAtPoint = ({
  gradientType,
  stops,
  point,
  fallback,
}: {
  gradientType: GradientType
  stops: NormalizedColorStop[]
  point: { x: number; y: number }
  fallback: string
}) => ({
  color: colorAtGradientPoint(gradientType, stops, point, fallback),
  position: Number(Math.max(0, Math.min(1, point.x)).toFixed(3)),
})

export const createGradientStopAtPosition = ({
  stops,
  position,
  fallback,
}: {
  stops: NormalizedColorStop[]
  position: number
  fallback: string
}) => ({
  color: colorAtStopPosition(stops, position, fallback),
  position,
})

export const insertGradientStop = (
  stops: NormalizedColorStop[],
  stop: { color: string; position: number }
) => [...stops, stop].sort((a, b) => a.position - b.position)

export const findInsertedGradientStopIndex = (
  stops: Array<{ color: string; position: number }>,
  stop: { color: string; position: number }
) =>
  stops.findIndex(
    (item) =>
      Math.abs(item.position - stop.position) < 0.0005 &&
      item.color.toLowerCase() === stop.color.toLowerCase()
  )

export const normalizedGradientPosition = (position: number) =>
  Number(Math.max(0, Math.min(1, position)).toFixed(3))

export const updateGradientStopPositionById = (
  stops: NormalizedColorStop[],
  stopId: string,
  position: number
) =>
  stops
    .map((stop) =>
      stop.id === stopId
        ? { ...stop, position: normalizedGradientPosition(position) }
        : stop
    )
    .sort((a, b) => a.position - b.position)

export const updateGradientStopColorById = (
  stops: NormalizedColorStop[],
  stopId: string,
  color: string
) => stops.map((stop) => (stop.id === stopId ? { ...stop, color } : stop))

export const parseGradientStopPositionInput = (rawValue: string) => {
  const parsed = Number.parseFloat(rawValue.replace("%", ""))
  return Number.isFinite(parsed) ? parsed / 100 : null
}

export const gradientRailPointFromClient = ({
  rect,
  clientX,
  clientY,
}: {
  rect: DOMRect
  clientX: number
  clientY?: number
}) => {
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const y =
    clientY === undefined
      ? 0.5
      : Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

  return {
    x: normalizedGradientPosition(x),
    y,
  }
}
