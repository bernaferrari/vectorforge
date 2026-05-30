import { hexToHsv, hsvToHex, type GradientType } from "./color-picker-utils"

export type GradientStop = {
  id?: string
  color: string
  position: number
}

export type GradientPreset = {
  name: string
  type: GradientType
  stops: GradientStop[]
}

const GOOGLE_MESH_STOPS: GradientStop[] = [
  { color: "#FF9900", position: 0 },
  { color: "#FF360A", position: 0.125 },
  { color: "#D13AB3", position: 0.25 },
  { color: "#FFC700", position: 0.375 },
  { color: "#807AFF", position: 0.5 },
  { color: "#1759FF", position: 0.625 },
  { color: "#63E600", position: 0.75 },
  { color: "#00C796", position: 0.875 },
  { color: "#00ADF0", position: 1 },
]

const AURORA_MESH_STOPS: GradientStop[] = [
  { color: "#FFF6E8", position: 0 },
  { color: "#EFC7A8", position: 0.125 },
  { color: "#D98F76", position: 0.25 },
  { color: "#DCE8C8", position: 0.375 },
  { color: "#AFC7A3", position: 0.5 },
  { color: "#8FCFC1", position: 0.625 },
  { color: "#F6D5BA", position: 0.75 },
  { color: "#C7B8D9", position: 0.875 },
  { color: "#F2BBAA", position: 1 },
]

const CANDY_MESH_STOPS: GradientStop[] = [
  { color: "#FFF7AD", position: 0 },
  { color: "#FF8BC7", position: 0.125 },
  { color: "#C9A7FF", position: 0.25 },
  { color: "#FFB86B", position: 0.375 },
  { color: "#FF4FA3", position: 0.5 },
  { color: "#8B6DFF", position: 0.625 },
  { color: "#62EAD9", position: 0.75 },
  { color: "#29C7FF", position: 0.875 },
  { color: "#6E7BFF", position: 1 },
]

const LAGOON_MESH_STOPS: GradientStop[] = [
  { color: "#FFF7F1", position: 0 },
  { color: "#FFD6E8", position: 0.125 },
  { color: "#BBA7FF", position: 0.25 },
  { color: "#D9F8CF", position: 0.375 },
  { color: "#9FF0D1", position: 0.5 },
  { color: "#88D8FF", position: 0.625 },
  { color: "#7DEBD7", position: 0.75 },
  { color: "#8BB8FF", position: 0.875 },
  { color: "#D7B5FF", position: 1 },
]

const EMBER_MESH_STOPS: GradientStop[] = [
  { color: "#F7F2E8", position: 0 },
  { color: "#D6C7A8", position: 0.125 },
  { color: "#A68C6D", position: 0.25 },
  { color: "#DDE2D0", position: 0.375 },
  { color: "#8FA996", position: 0.5 },
  { color: "#6CA6A4", position: 0.625 },
  { color: "#CDBFA8", position: 0.75 },
  { color: "#9FB6C3", position: 0.875 },
  { color: "#B8A6C7", position: 1 },
]

const ORCHID_MESH_STOPS: GradientStop[] = [
  { color: "#FDF2F8", position: 0 },
  { color: "#FDA4D9", position: 0.125 },
  { color: "#B999FF", position: 0.25 },
  { color: "#F5B8FF", position: 0.375 },
  { color: "#9A5CFF", position: 0.5 },
  { color: "#35D8F0", position: 0.625 },
  { color: "#D879FF", position: 0.75 },
  { color: "#2FC4D9", position: 0.875 },
  { color: "#8F7DFF", position: 1 },
]

const OPAL_MESH_STOPS: GradientStop[] = [
  { color: "#FFF4B8", position: 0 },
  { color: "#FFD166", position: 0.125 },
  { color: "#FFB15E", position: 0.25 },
  { color: "#E8F56C", position: 0.375 },
  { color: "#9CF27A", position: 0.5 },
  { color: "#52E6B8", position: 0.625 },
  { color: "#B8F7D4", position: 0.75 },
  { color: "#65D6D2", position: 0.875 },
  { color: "#46C8B8", position: 1 },
]

const NIGHT_MESH_STOPS: GradientStop[] = [
  { color: "#FFF06A", position: 0 },
  { color: "#FF7A59", position: 0.125 },
  { color: "#FF4FB8", position: 0.25 },
  { color: "#B7F55E", position: 0.375 },
  { color: "#2EE6A6", position: 0.5 },
  { color: "#00C2FF", position: 0.625 },
  { color: "#F4FF8A", position: 0.75 },
  { color: "#72F2E8", position: 0.875 },
  { color: "#FFB84D", position: 1 },
]

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: "Google Mesh", type: "mesh", stops: GOOGLE_MESH_STOPS },
  { name: "Ceramic Mesh", type: "mesh", stops: AURORA_MESH_STOPS },
  { name: "Candy Mesh", type: "mesh", stops: CANDY_MESH_STOPS },
  { name: "Lagoon Mesh", type: "mesh", stops: LAGOON_MESH_STOPS },
  { name: "Mineral Mesh", type: "mesh", stops: EMBER_MESH_STOPS },
  { name: "Orchid Mesh", type: "mesh", stops: ORCHID_MESH_STOPS },
  { name: "Opal Mesh", type: "mesh", stops: OPAL_MESH_STOPS },
  { name: "Tropic Mesh", type: "mesh", stops: NIGHT_MESH_STOPS },
]

const MESH_POSITION_PERMUTATIONS = [
  [2, 5, 8, 1, 4, 7, 0, 3, 6],
  [6, 3, 0, 7, 4, 1, 8, 5, 2],
  [8, 7, 6, 5, 4, 3, 2, 1, 0],
  [1, 2, 5, 0, 4, 8, 3, 6, 7],
  [3, 0, 1, 6, 4, 2, 7, 8, 5],
]

export const shuffledMeshColors = (stops: GradientStop[]): GradientStop[] => {
  const palette =
    stops.length >= 9
      ? stops
      : GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)]
          .stops
  const offset = Math.floor(Math.random() * palette.length)
  const hueShift = Math.floor(24 + Math.random() * 96)
  const shouldShiftHue = Math.random() > 0.35

  return stops.map((stop, index) => {
    const source = palette[(index + offset) % palette.length] ?? stop
    const hsv = hexToHsv(source.color)
    return {
      ...stop,
      color: shouldShiftHue
        ? hsvToHex((hsv.h + hueShift) % 360, hsv.s, hsv.v)
        : source.color,
    }
  })
}

export const shuffledMeshPositions = (
  stops: GradientStop[]
): GradientStop[] => {
  if (stops.length < 2) return stops

  const positions = stops.map((stop) => stop.position).sort((a, b) => a - b)
  const permutation =
    MESH_POSITION_PERMUTATIONS[
      Math.floor(Math.random() * MESH_POSITION_PERMUTATIONS.length)
    ]

  return stops.map((stop, index) => ({
    ...stop,
    position:
      positions[permutation[index % permutation.length] % positions.length] ??
      stop.position,
  }))
}
