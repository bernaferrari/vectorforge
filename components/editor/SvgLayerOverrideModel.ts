import type { PathOverride } from "../3d/SvgTypes"
import type { SvgLayer } from "./SvgLayerModel"

const DEFAULT_LAYER_COLOR = "#ffffff"
const DEFAULT_LAYER_SCALE = { x: 1, y: 1, z: 1 }
export const ALL_LAYERS_ID = "all"

export const completePathOverride = (
  id: string,
  baseColor = DEFAULT_LAYER_COLOR,
  override?: Partial<PathOverride>
): PathOverride => ({
  id,
  visible: override?.visible ?? true,
  color: override?.color ?? baseColor,
  depthMultiplier: override?.depthMultiplier ?? 1,
  scale: override?.scale ?? DEFAULT_LAYER_SCALE,
})

export const getPathOverride = (
  layer: SvgLayer,
  overrides: PathOverride[] | undefined
) =>
  completePathOverride(
    layer.id,
    layer.color,
    overrides?.find((override) => override.id === layer.id)
  )

const average = (values: number[], fallback: number) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback

export const sortPathOverrides = (overrides: PathOverride[]) =>
  overrides.toSorted((a, b) => {
    const [aPath, aShape = "0"] = a.id.split(":")
    const [bPath, bShape = "0"] = b.id.split(":")
    return Number(aPath) - Number(bPath) || Number(aShape) - Number(bShape)
  })

const getSelectedLayer = (layers: SvgLayer[], selectedLayerId: string) =>
  selectedLayerId === ALL_LAYERS_ID
    ? null
    : (layers.find((layer) => layer.id === selectedLayerId) ?? null)

export const getLayerSelectionOverride = ({
  layers,
  selectedLayerId,
  overrides,
}: {
  layers: SvgLayer[]
  selectedLayerId: string
  overrides: PathOverride[] | undefined
}) => {
  const selectedLayer = getSelectedLayer(layers, selectedLayerId)
  if (selectedLayer) return getPathOverride(selectedLayer, overrides)
  if (selectedLayerId !== ALL_LAYERS_ID || layers.length === 0) return null

  const layerOverrides = layers.map((layer) =>
    getPathOverride(layer, overrides)
  )
  const scale = average(
    layerOverrides.map((override) => override.scale?.x ?? 1),
    1
  )

  return completePathOverride(ALL_LAYERS_ID, DEFAULT_LAYER_COLOR, {
    visible: layerOverrides.every((override) => override.visible),
    depthMultiplier: average(
      layerOverrides.map((override) => override.depthMultiplier),
      1
    ),
    scale: { x: scale, y: scale, z: scale },
  })
}

export const getLayerSelectionTargets = ({
  layers,
  selectedLayerId,
}: {
  layers: SvgLayer[]
  selectedLayerId: string
}) => {
  if (selectedLayerId === ALL_LAYERS_ID) return layers
  const selectedLayer = getSelectedLayer(layers, selectedLayerId)
  return selectedLayer ? [selectedLayer] : []
}

export const updatePathOverridesForLayers = ({
  overrides = [],
  layers,
  updater,
}: {
  overrides?: PathOverride[]
  layers: SvgLayer[]
  updater: (override: PathOverride) => PathOverride
}) => {
  if (layers.length === 0) return overrides

  const nextById = new Map(
    layers.map((layer) => {
      const current = completePathOverride(
        layer.id,
        layer.color,
        overrides.find((override) => override.id === layer.id)
      )
      return [layer.id, updater(current)]
    })
  )

  return sortPathOverrides([
    ...overrides.filter((override) => !nextById.has(override.id)),
    ...nextById.values(),
  ])
}
