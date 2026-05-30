"use client"

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ShapeStop } from "./TimelineModel"
import {
  ALL_LAYERS_ID,
  extractSvgLayers,
  getLayerSelectionOverride,
  getLayerSelectionTargets,
  getSelectedLayer,
  updatePathOverridesForLayers,
} from "./SvgLayerModel"
import { clampNumber } from "./EditorModel"

export const useLayerEditor = ({
  shapes,
  selectedShapeId,
  setShapes,
  onEdit,
}: {
  shapes: ShapeStop[]
  selectedShapeId: string | null
  setShapes: Dispatch<SetStateAction<ShapeStop[]>>
  onEdit: () => void
}) => {
  const [selectedLayerId, setSelectedLayerId] = useState(ALL_LAYERS_ID)
  const sortedShapes = useMemo(
    () => [...shapes].sort((a, b) => a.time - b.time),
    [shapes]
  )
  const selectedShape = useMemo(
    () =>
      shapes.find((shape) => shape.id === selectedShapeId) ??
      sortedShapes[0] ??
      null,
    [selectedShapeId, shapes, sortedShapes]
  )
  const layers = useMemo(
    () => extractSvgLayers(selectedShape?.svgContent ?? ""),
    [selectedShape?.svgContent]
  )
  const selectedLayer = useMemo(
    () => getSelectedLayer(layers, selectedLayerId),
    [layers, selectedLayerId]
  )
  const selectedLayerOverride = useMemo(
    () =>
      selectedShape
        ? getLayerSelectionOverride({
            layers,
            selectedLayer,
            selectedLayerId,
            overrides: selectedShape.pathOverrides,
          })
        : null,
    [layers, selectedLayer, selectedLayerId, selectedShape]
  )

  const selectedLayerTargets = useMemo(
    () =>
      getLayerSelectionTargets({
        layers,
        selectedLayer,
        selectedLayerId,
      }),
    [layers, selectedLayer, selectedLayerId]
  )

  useEffect(() => {
    if (
      selectedLayerId !== ALL_LAYERS_ID &&
      layers.length > 0 &&
      !layers.some((layer) => layer.id === selectedLayerId)
    ) {
      setSelectedLayerId(ALL_LAYERS_ID)
    }
  }, [layers, selectedLayerId])

  const updateSelectedLayerOverride = useCallback(
    (
      updater: Parameters<typeof updatePathOverridesForLayers>[0]["updater"]
    ) => {
      if (!selectedShape || selectedLayerTargets.length === 0) return
      onEdit()
      setShapes((prev) =>
        prev.map((shape) =>
          shape.id === selectedShape.id
            ? {
                ...shape,
                pathOverrides: updatePathOverridesForLayers({
                  overrides: shape.pathOverrides,
                  layers: selectedLayerTargets,
                  updater,
                }),
              }
            : shape
        )
      )
    },
    [onEdit, selectedLayerTargets, selectedShape, setShapes]
  )

  const updateSelectedLayerScale = useCallback(
    (value: number) => {
      const clamped = clampNumber(value, 0.1, 2.25)
      updateSelectedLayerOverride((override) => ({
        ...override,
        scale: { x: clamped, y: clamped, z: clamped },
      }))
    },
    [updateSelectedLayerOverride]
  )

  const updateSelectedLayerDepth = useCallback(
    (value: number) => {
      const clamped = clampNumber(value, 0.05, 2.5)
      updateSelectedLayerOverride((override) => ({
        ...override,
        depthMultiplier: clamped,
      }))
    },
    [updateSelectedLayerOverride]
  )

  const toggleSelectedLayerVisibility = useCallback(() => {
    updateSelectedLayerOverride((override) => ({
      ...override,
      visible: !override.visible,
    }))
  }, [updateSelectedLayerOverride])

  return {
    layers,
    selectedLayer,
    selectedLayerOverride,
    selectedLayerId,
    setSelectedLayerId,
    updateSelectedLayerScale,
    updateSelectedLayerDepth,
    toggleSelectedLayerVisibility,
  }
}
