import * as THREE from "three"
import type { GradientStop, GradientType } from "./SvgTypes"

const finiteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const GOOGLE_MESH_PALETTE = [
  ["#FF9900", "#FF360A", "#D13AB3"],
  ["#FFC700", "#807AFF", "#1759FF"],
  ["#63E600", "#00C796", "#00ADF0"],
] as const

export const fallbackGoogleMeshStops: GradientStop[] =
  GOOGLE_MESH_PALETTE.flatMap((row, rowIndex) =>
    row.map((color, columnIndex) => ({
      color,
      position: (rowIndex * 3 + columnIndex) / 8,
    }))
  )

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return x * x * (3 - 2 * x)
}

const mixColor = (a: THREE.Color, b: THREE.Color, t: number) =>
  a.clone().lerp(b, t)

const bezierColor = (
  a: THREE.Color,
  b: THREE.Color,
  c: THREE.Color,
  t: number
) => mixColor(mixColor(a, b, t), mixColor(b, c, t), t)

const clampColor = (color: THREE.Color) =>
  new THREE.Color(
    Math.max(0, Math.min(1, color.r)),
    Math.max(0, Math.min(1, color.g)),
    Math.max(0, Math.min(1, color.b))
  )

const saturateIcon3DColor = (color: THREE.Color) => {
  const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
  const saturated = mixColor(
    new THREE.Color(luminance, luminance, luminance),
    color,
    1.6
  )
  return clampColor(
    new THREE.Color(
      (saturated.r - 0.5) * 1.2 + 0.5,
      (saturated.g - 0.5) * 1.2 + 0.5,
      (saturated.b - 0.5) * 1.2 + 0.5
    )
  )
}

export const meshGradientColor = (u: number, v: number) => {
  const x = smoothstep(0.02, 0.98, u)
  const y = smoothstep(0.02, 0.98, v)
  const rows = GOOGLE_MESH_PALETTE.map((row) =>
    bezierColor(
      new THREE.Color(row[0]),
      new THREE.Color(row[1]),
      new THREE.Color(row[2]),
      x
    )
  )
  const body = bezierColor(rows[0], rows[1], rows[2], y)
  return saturateIcon3DColor(body)
}

const colorAtPalettePosition = (palette: THREE.Color[], t: number) => {
  if (palette.length === 0) return new THREE.Color("#ffffff")
  if (palette.length === 1) return palette[0].clone()

  const scaled = Math.max(0, Math.min(1, t)) * Math.max(1, palette.length - 1)
  const start = Math.max(0, Math.min(palette.length - 1, Math.floor(scaled)))
  const end = Math.min(palette.length - 1, start + 1)
  return palette[start].clone().lerp(palette[end], scaled - start)
}

const meshGradientColorFromPalette = (
  palette: THREE.Color[],
  u: number,
  v: number
) => {
  const grid = Array.from({ length: 9 }, (_, index) =>
    palette.length >= 9
      ? palette[index]
      : colorAtPalettePosition(palette, index / 8)
  )
  const x = smoothstep(0.02, 0.98, u)
  const y = smoothstep(0.02, 0.98, v)
  const topRow = bezierColor(grid[0], grid[1], grid[2], x)
  const midRow = bezierColor(grid[3], grid[4], grid[5], x)
  const bottomRow = bezierColor(grid[6], grid[7], grid[8], x)
  return saturateIcon3DColor(bezierColor(topRow, midRow, bottomRow, y))
}

const gradientColorFromStops = (
  stops: Array<{ color: string; position: number }>,
  t: number
) => {
  if (stops.length === 0) return new THREE.Color("#ffffff")
  if (stops.length === 1) return new THREE.Color(stops[0].color)

  const position = Math.max(0, Math.min(1, t))
  const previous =
    [...stops].reverse().find((stop) => stop.position <= position) ?? stops[0]
  const next =
    stops.find((stop) => stop.position >= position) ?? stops[stops.length - 1]
  const span = Math.max(0.0001, next.position - previous.position)
  const localT = previous === next ? 0 : (position - previous.position) / span
  return new THREE.Color(previous.color).lerp(
    new THREE.Color(next.color),
    localT
  )
}

const iconSpaceGradientColor = (
  type: GradientType,
  stops: Array<{ color: string; position: number }>,
  u: number,
  v: number
) => {
  if (type === "mesh") {
    return meshGradientColorFromPalette(
      stops.map((stop) => new THREE.Color(stop.color)),
      u,
      v
    )
  }
  if (type === "radial") {
    const cx = 0.5
    const cy = 0.5
    const farthest = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(1 - cx, cy),
      Math.hypot(cx, 1 - cy),
      Math.hypot(1 - cx, 1 - cy)
    )
    return gradientColorFromStops(stops, Math.hypot(u - cx, v - cy) / farthest)
  }
  if (type === "conic") {
    const angle = Math.atan2(v - 0.5, u - 0.5) / (Math.PI * 2) + 0.5
    return gradientColorFromStops(stops, angle - Math.floor(angle))
  }

  const angle = THREE.MathUtils.degToRad(35)
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const projection = u * dx + (1 - v) * dy
  const corners = [0, dx, dy, dx + dy]
  const min = Math.min(...corners)
  const max = Math.max(...corners)
  return gradientColorFromStops(
    stops,
    (projection - min) / Math.max(0.0001, max - min)
  )
}

export const paletteFromStops = (
  stops: GradientStop[] | undefined,
  fallbackA: string,
  fallbackB: string
) => {
  const source = stops?.length
    ? stops
    : [
        { color: fallbackA, position: 0 },
        { color: fallbackB, position: 1 },
      ]
  return [...source]
    .sort((a, b) => a.position - b.position)
    .map(
      (stop) =>
        new THREE.Color(
          stop.color.startsWith("#") ? stop.color : `#${stop.color}`
        )
    )
}

export const gradientStopsFromFill = (
  stops: GradientStop[] | undefined,
  fallbackA: string,
  fallbackB: string
) => {
  const source = stops?.length
    ? stops
    : [
        { color: fallbackA, position: 0 },
        { color: fallbackB, position: 1 },
      ]
  return [...source]
    .map((stop) => ({
      color: stop.color.startsWith("#") ? stop.color : `#${stop.color}`,
      position: Math.max(0, Math.min(1, finiteNumber(stop.position, 0))),
    }))
    .sort((a, b) => a.position - b.position)
}

export const applyGradientVertexColors = (
  geometry: THREE.BufferGeometry,
  type: "linear" | "radial" | "conic" | "mesh",
  stops: Array<{ color: string; position: number }>,
  iconBounds: THREE.Box2
) => {
  const position = geometry.getAttribute("position") as
    | THREE.BufferAttribute
    | undefined
  if (!position) return
  const width = Math.max(0.0001, iconBounds.max.x - iconBounds.min.x)
  const height = Math.max(0.0001, iconBounds.max.y - iconBounds.min.y)

  const colors = new Float32Array(position.count * 3)
  for (let index = 0; index < position.count; index += 1) {
    const u = Math.max(
      0,
      Math.min(1, (position.getX(index) - iconBounds.min.x) / width)
    )
    const v = Math.max(
      0,
      Math.min(1, (position.getY(index) - iconBounds.min.y) / height)
    )
    const color = iconSpaceGradientColor(type, stops, u, v)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
}
