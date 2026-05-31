"use client"

import { useMemo, type Dispatch, type SetStateAction } from "react"
import { ALL_LAYERS_ID } from "./SvgLayerModel"
import type { ShapeStop } from "./TimelineModel"

export type ShapeNavigationModel = {
  label: string
  color: string
  svgContent: string
  index: number
  total: number
  canNavigate: boolean
  onPrevious: () => void
  onNext: () => void
}

export function useShapeNavigation({
  sortedShapes,
  selectedShapeId,
  setSelectedShapeId,
  setSelectedLayerId,
}: {
  sortedShapes: ShapeStop[]
  selectedShapeId: string | null
  setSelectedShapeId: Dispatch<SetStateAction<string | null>>
  setSelectedLayerId: Dispatch<SetStateAction<string>>
}): ShapeNavigationModel | undefined {
  return useMemo(() => {
    if (sortedShapes.length === 0) return undefined

    const explicitSelectedIndex = sortedShapes.findIndex(
      (shape) => shape.id === selectedShapeId
    )
    const selectedIndex = explicitSelectedIndex >= 0 ? explicitSelectedIndex : 0

    const selectShapeAt = (index: number) => {
      if (sortedShapes.length <= 1) return
      const next =
        sortedShapes[(index + sortedShapes.length) % sortedShapes.length]
      if (!next) return
      setSelectedShapeId(next.id)
      setSelectedLayerId(ALL_LAYERS_ID)
    }

    return {
      label: sortedShapes[selectedIndex]?.iconName ?? "Shape",
      color: sortedShapes[selectedIndex]?.color ?? "currentColor",
      svgContent: sortedShapes[selectedIndex]?.svgContent ?? "",
      index: selectedIndex,
      total: sortedShapes.length,
      canNavigate: sortedShapes.length > 1,
      onPrevious: () => selectShapeAt(selectedIndex - 1),
      onNext: () => selectShapeAt(selectedIndex + 1),
    }
  }, [selectedShapeId, setSelectedLayerId, setSelectedShapeId, sortedShapes])
}
