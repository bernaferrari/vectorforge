"use client"

import { useMemo, type Dispatch, type SetStateAction } from "react"
import { ALL_LAYERS_ID } from "./SvgLayerModel"
import type { ShapeStop } from "./TimelineModel"

export type ShapeNavigationModel = {
  label: string
  index: number
  total: number
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
    const selectedIndex = sortedShapes.findIndex(
      (shape) => shape.id === selectedShapeId
    )
    if (selectedIndex < 0 || sortedShapes.length <= 1) return undefined

    const selectShapeAt = (index: number) => {
      const next =
        sortedShapes[(index + sortedShapes.length) % sortedShapes.length]
      if (!next) return
      setSelectedShapeId(next.id)
      setSelectedLayerId(ALL_LAYERS_ID)
    }

    return {
      label: sortedShapes[selectedIndex]?.iconName ?? "Shape",
      index: selectedIndex,
      total: sortedShapes.length,
      onPrevious: () => selectShapeAt(selectedIndex - 1),
      onNext: () => selectShapeAt(selectedIndex + 1),
    }
  }, [selectedShapeId, setSelectedLayerId, setSelectedShapeId, sortedShapes])
}
