export {
  ALL_LAYERS_ID,
  completePathOverride,
  getLayerSelectionOverride,
  getLayerSelectionTargets,
  getPathOverride,
  sortPathOverrides,
  updatePathOverridesForLayers,
} from "./SvgLayerOverrideModel"

export type SvgLayer = {
  id: string
  name: string
  color: string
}

const DEFAULT_LAYER_COLOR = "#ffffff"
const PATH_ELEMENT_PATTERN = /<path\b([^>]*)>/gi
const ATTRIBUTE_PATTERN = /([\w:-]+)\s*=\s*["']([^"']*)["']/g
const SUBPATH_PATTERN = /(^|[\s,])m\s*[-+.0-9]/gi

export const svgLayerId = (pathIndex: number, shapeIndex: number) =>
  `${pathIndex}:${shapeIndex}`

const parsePathAttributes = (source: string) => {
  const attrs: Record<string, string> = {}
  ATTRIBUTE_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ATTRIBUTE_PATTERN.exec(source))) {
    attrs[match[1].toLowerCase()] = match[2]
  }
  return attrs
}

const normalizeColor = (value: string | undefined) => {
  if (!value || value === "none" || value.startsWith("url(")) {
    return DEFAULT_LAYER_COLOR
  }
  return value.startsWith("#") ? value : DEFAULT_LAYER_COLOR
}

const layerNameFromAttributes = (
  attrs: Record<string, string>,
  fallback: string
) => {
  const explicitName = attrs["data-name"] || attrs["aria-label"] || attrs.id

  return explicitName?.trim() || fallback
}

const countPathSubpaths = (pathData: string) => {
  SUBPATH_PATTERN.lastIndex = 0
  const matches = pathData.match(SUBPATH_PATTERN)
  return Math.max(1, matches?.length ?? 0)
}

export const extractSvgLayers = (svgContent: string): SvgLayer[] => {
  if (!svgContent.trim()) return []

  const layers: SvgLayer[] = []
  PATH_ELEMENT_PATTERN.lastIndex = 0
  let pathMatch: RegExpExecArray | null
  let pathIndex = 0

  while ((pathMatch = PATH_ELEMENT_PATTERN.exec(svgContent))) {
    const attrs = parsePathAttributes(pathMatch[1])
    const pathData = attrs.d?.trim()
    if (!pathData) {
      pathIndex += 1
      continue
    }

    const shapeCount = countPathSubpaths(pathData)
    const explicitName = layerNameFromAttributes(attrs, "")
    const color = normalizeColor(attrs.fill)

    for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex += 1) {
      const hasSiblingShapes = shapeCount > 1
      const name = explicitName
        ? hasSiblingShapes
          ? `${explicitName} ${shapeIndex + 1}`
          : explicitName
        : `Layer ${layers.length + 1}`

      layers.push({
        id: svgLayerId(pathIndex, shapeIndex),
        name,
        color,
      })
    }
    pathIndex += 1
  }

  return layers
}
