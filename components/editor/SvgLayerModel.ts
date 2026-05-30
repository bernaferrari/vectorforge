import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js"
import { normalizeSvgToIconViewBox } from "../3d/SvgGeometry"
export {
  ALL_LAYERS_ID,
  completePathOverride,
  getLayerSelectionOverride,
  getLayerSelectionTargets,
  getPathOverride,
  getSelectedLayer,
  sortPathOverrides,
  updatePathOverridesForLayers,
} from "./SvgLayerOverrideModel"

export type SvgLayer = {
  id: string
  name: string
  color: string
}

const DEFAULT_LAYER_COLOR = "#ffffff"

export const svgLayerId = (pathIndex: number, shapeIndex: number) =>
  `${pathIndex}:${shapeIndex}`

const layerNameFromNode = (node: unknown, fallback: string) => {
  const element = node as Element | undefined
  const explicitName =
    element?.getAttribute?.("data-name") ||
    element?.getAttribute?.("aria-label") ||
    element?.getAttribute?.("id")

  return explicitName?.trim() || fallback
}

export const extractSvgLayers = (svgContent: string): SvgLayer[] => {
  if (!svgContent.trim()) return []

  try {
    const loader = new SVGLoader()
    const parsed = loader.parse(normalizeSvgToIconViewBox(svgContent))
    const layers: SvgLayer[] = []

    parsed.paths.forEach((path, pathIndex) => {
      const shapes = SVGLoader.createShapes(path)
      const baseName = layerNameFromNode(
        path.userData?.node,
        `Layer ${layers.length + 1}`
      )

      shapes.forEach((_shape, shapeIndex) => {
        const hasSiblingShapes = shapes.length > 1
        layers.push({
          id: svgLayerId(pathIndex, shapeIndex),
          name: hasSiblingShapes ? `${baseName} ${shapeIndex + 1}` : baseName,
          color: path.color
            ? `#${path.color.getHexString()}`
            : DEFAULT_LAYER_COLOR,
        })
      })
    })

    return layers
  } catch {
    return []
  }
}
