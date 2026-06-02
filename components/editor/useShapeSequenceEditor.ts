"use client"

import { useCallback, useRef, useState } from "react"
import type { PresetIcon } from "./IconLibrary"
import type { ShapeStop } from "./TimelineModel"
import {
  addShapeStopAtTime,
  applyShapeWipePair,
  createDefaultShapeSequence,
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
  const initialShapesRef = useRef<ShapeStop[] | null>(null)
  if (!initialShapesRef.current) {
    initialShapesRef.current = createDefaultShapeSequence()
  }
  const [shapes, setShapes] = useState<ShapeStop[]>(
    () => initialShapesRef.current ?? []
  )
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(
    () => initialShapesRef.current?.[0]?.id ?? null
  )
  const [openShapePicker, setOpenShapePicker] = useState<string | null>(null)
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null)

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
