"use client"

import { useCallback, useState } from "react"
import type { PresetIcon } from "./IconLibrary"
import type { ShapeStop } from "./TimelineModel"
import {
  addShapeStopAtTime,
  applyShapeWipePair,
  removeShapeStopById,
  replaceShapeIcon,
} from "./ShapeSequenceModel"

type ShapeSequenceEditorOptions = {
  currentTime: number
  duration: number
}

export function useShapeSequenceEditor({
  currentTime,
  duration,
}: ShapeSequenceEditorOptions) {
  const [shapes, setShapes] = useState<ShapeStop[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [openShapePicker, setOpenShapePicker] = useState<string | null>(null)
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(
    "google-metal"
  )

  const markCustom = useCallback(() => setActiveRecipeId(null), [])

  const setShapeIcon = useCallback(
    (shapeId: string, icon: PresetIcon) => {
      markCustom()
      setShapes((prev) => replaceShapeIcon(prev, shapeId, icon))
    },
    [markCustom]
  )

  const setShapeWipePair = useCallback(
    (shapeId: string, enabled: PresetIcon, disabled: PresetIcon) => {
      markCustom()
      setShapes((prev) =>
        applyShapeWipePair({
          shapes: prev,
          shapeId,
          enabled,
          disabled,
          duration,
        })
      )
      setSelectedShapeId(shapeId)
    },
    [duration, markCustom]
  )

  const addShapeAtPlayhead = useCallback(() => {
    markCustom()
    setShapes((prev) => {
      const result = addShapeStopAtTime({
        shapes: prev,
        time: currentTime,
        duration,
      })
      setSelectedShapeId(result.addedShapeId)
      setOpenShapePicker(result.addedShapeId)
      return result.shapes
    })
  }, [currentTime, duration, markCustom])

  const removeShape = useCallback(
    (shapeId: string) => {
      setShapes((prev) => {
        const result = removeShapeStopById(prev, shapeId, selectedShapeId)
        if (!result.removed) return prev
        markCustom()
        setOpenShapePicker(null)
        setSelectedShapeId(result.selectedShapeId)
        return result.shapes
      })
    },
    [markCustom, selectedShapeId]
  )

  return {
    shapes,
    setShapes,
    selectedShapeId,
    setSelectedShapeId,
    openShapePicker,
    setOpenShapePicker,
    activeRecipeId,
    setActiveRecipeId,
    markCustom,
    setShapeIcon,
    setShapeWipePair,
    addShapeAtPlayhead,
    removeShape,
  }
}
