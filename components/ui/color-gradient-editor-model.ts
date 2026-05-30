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
